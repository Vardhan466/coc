/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Attempt,
  AuditLogEntry,
  DiagnosticResult,
  LanguageCode,
  PreviousYearPaper,
  QuestionAnalytic,
  SmartTriggerNotification,
  StudentProgressStats,
  SubjectTag,
  TestPaper,
  UserProfile,
  UserRole,
} from './types';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_DAILY_AGGREGATE,
  INITIAL_QUESTION_ANALYTICS,
  INITIAL_TEST_PAPERS,
  INITIAL_USER_PROFILE,
  SAMPLE_40_QUESTIONS,
} from './data/mockExamData';
import {
  TARGET_LEADERBOARD_COHORT_SIZE,
  buildDynamicDailyLeaderboard,
  loadLocalRealLeaderboardAttempts,
  mergeLiveLeaderboardAttempts,
  saveLocalRealLeaderboardAttempt,
} from './utils/dailyLeaderboard';
import { addMistakesFromAttempt } from './utils/errorBookStorage';
import { getISTNowParts, getTodayIsoDateIST } from './utils/istTime';
import { getUploadedPQPs, saveUploadedPQPs } from './utils/keySheetStorage';
import {
  saveAttemptToFirestore,
  syncUserProfileToFirestore,
  syncUserProgressToFirestore,
  getUserProgressFromFirestore,
  subscribeToPQPs,
  savePQPToFirestore,
  deletePQPFromFirestore,
  subscribeToAuthChanges,
  signOutFirebase,
  completeGoogleRedirectSignIn,
  hydrateProfileForSignedInFirebaseUser,
  isInteractiveFirebaseAuthActive,
  saveSpeedPracticeSessionToFirestore,
  publishLeaderboardEntry,
  subscribeToDailyLeaderboard,
} from './utils/firebaseAuth';
import { isBuiltInLocalAccountUid } from './utils/googleAuthHelpers';
import { auth } from './firebase';
import { applyReferralReward } from './utils/gamification';
import { generateSmartTriggers } from './utils/smartTriggers';
import {
  applyReadStateToNotifications,
  loadReadNotificationIds,
  markNotificationIdsRead,
} from './utils/notificationState';
import { stopMediaStreamTracks } from './utils/proctoring';
import {
  fetchPublicSystemConfig,
  fetchCurrentDailyExamPaper,
  gradeDailyExamServer,
  fetchScheduledTests,
  createAdminScheduledTest,
  deleteAdminScheduledTest,
  type PublicSystemConfigResponse,
} from './utils/aiApiClient';
import { evaluateDueNotifications } from './utils/notificationScheduler';
import {
  dispatchAppNotification,
  getNotificationPrefs,
  getSentNotificationLog,
  markNotificationSent,
} from './utils/notifications';
import {
  getSpeedPracticeSessions,
  saveSpeedPracticeSession,
} from './utils/speedPracticeStorage';
import type {
  DailyExamScheduleConfig,
  SpeedPracticeSessionRecord,
} from './types/aiSystem';
import {
  getStudentProgressForUser,
  saveStudentProgressForUser,
  recordTestAttemptInProgress,
  mergeDiagnosticIntoProgress,
  activateStreakFreezeForDate,
  claimStreakMilestoneReward,
  EMPTY_STUDENT_PROGRESS,
} from './utils/studentProgressStorage';

import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { TestsView } from './components/TestsView';
import { ResultsView } from './components/ResultsView';
import { ProgressView } from './components/ProgressView';
import {
  PracticeView,
  type DifficultyFilter,
  type PracticeSubTab,
} from './components/PracticeView';
import { ProfileView } from './components/ProfileView';
import { ExamRunner } from './components/ExamRunner';
import { AdminDashboard } from './components/AdminDashboard';
import { SettingsModal, ThemeMode } from './components/SettingsModal';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { DiagnosticQuizModal } from './components/DiagnosticQuizModal';
import { CustomTestResultsView } from './components/CustomTestResultsView';
import { NotificationBanner } from './components/NotificationBanner';
import { CameraProctoringModal } from './components/CameraProctoringModal';

const getUserStorageId = (u?: UserProfile | null): string =>
  u?.uid || u?.studentId || 'guest';

const readCustomAttemptsForUser = (userKey: string): Record<string, Attempt> => {
  try {
    const stored = localStorage.getItem(`coc_custom_attempts_${userKey}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return {};
};

export default function App() {
  // Authentication & Session Persistence
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('coc_is_authenticated') === 'true';
    } catch {
      return false;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState<boolean>(false);
  const [pendingDiagnosticResult, setPendingDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [incomingReferralCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('ref') || params.get('challenge');
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const stored = localStorage.getItem('coc_auth_user');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return INITIAL_USER_PROFILE;
  });

  const isAuthenticatedRef = useRef(isAuthenticated);
  const userRef = useRef(user);
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
    userRef.current = user;
  }, [isAuthenticated, user]);

  // Current role is derived 100% strictly from user profile (no out-of-sync simulation state)
  const currentRole: UserRole = user?.role || 'student';
  const isAdminRole = currentRole !== 'student';
  const activeUserId = getUserStorageId(user);
  const [readTriggerIds, setReadTriggerIds] = useState<string[]>(() =>
    loadReadNotificationIds(getUserStorageId(user))
  );

  useEffect(() => {
    setReadTriggerIds(loadReadNotificationIds(activeUserId));
  }, [activeUserId]);

  const [currentSimulatedTime, setCurrentSimulatedTime] = useState<string>(
    () => getISTNowParts().hhmm
  );

  useEffect(() => {
    const syncClock = () => setCurrentSimulatedTime(getISTNowParts().hhmm);
    syncClock();
    const timer = window.setInterval(syncClock, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      return localStorage.getItem('coc_active_tab') || 'tests';
    } catch {
      return 'tests';
    }
  });
  const [practiceSubTab, setPracticeSubTab] = useState<PracticeSubTab>('daily_mocks');
  const [publicConfig, setPublicConfig] = useState<PublicSystemConfigResponse | null>(null);
  const [speedSessions, setSpeedSessions] = useState<SpeedPracticeSessionRecord[]>(() =>
    getSpeedPracticeSessions(activeUserId)
  );

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const handleSetActiveTab = (tab: string) => {
    setViewingCustomResultTest(null);
    setActiveTab(tab);
    scrollToTop();
    try {
      localStorage.setItem('coc_active_tab', tab);
    } catch {}
  };

  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Global Theme Mode ('light' | 'dark' | 'system')
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem('coc_theme');
      if (stored === 'dark' || stored === 'light' || stored === 'system') {
        return stored;
      }
    } catch {}
    return 'light';
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem('coc_theme');
      if (stored === 'dark') return true;
      if (stored === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {}
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    const computeDark = () => {
      if (theme === 'dark') return true;
      if (theme === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    };

    const isDark = computeDark();
    setIsDarkMode(isDark);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    try {
      localStorage.setItem('coc_theme', theme);
    } catch {}

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Initial Sample Custom Scheduled Test (for immediate out-of-the-box experience)
  const todayIstIso = getTodayIsoDateIST();
  const defaultSampleCustomTest: TestPaper = {
    id: 'custom_test_2026_evening',
    testCode: 'COC-SCHED-01',
    title: 'Special 8:30 PM Reasoning & Quantitative Speed Sprint',
    description: 'Ad-hoc timed challenge scheduled by Dr. K. Srinivas. 30 questions under strict 10s rule. Independent scorecard.',
    category: 'Special Practice Drill',
    date: todayIstIso,
    windowStart: '20:30',
    windowEnd: '21:00',
    scheduledDate: todayIstIso,
    scheduledStartTime: '20:30',
    scheduledEndTime: '21:00',
    windowMinutes: 30,
    answerKeyReleaseTime: '21:00',
    totalQuestions: 30,
    totalDurationSeconds: 300,
    questionDurationSeconds: 10,
    status: 'scheduled',
    questions: SAMPLE_40_QUESTIONS.slice(0, 30),
    lockedForEditing: false,
    totalSubscribers: 1420,
    isCustomScheduled: true,
  };

  const [testPapers, setTestPapers] = useState<TestPaper[]>(() => {
    try {
      const stored = localStorage.getItem('coc_custom_tests');
      if (stored) {
        const parsed = JSON.parse(stored);
        return [INITIAL_TEST_PAPERS[0], ...parsed];
      }
    } catch {}
    return [INITIAL_TEST_PAPERS[0], defaultSampleCustomTest];
  });

  const refreshServerExamState = useCallback(async () => {
    try {
      const [pubCfg, dailyPaper, serverSchedTests] = await Promise.all([
        fetchPublicSystemConfig().catch(() => null),
        fetchCurrentDailyExamPaper().catch(() => null),
        fetchScheduledTests().catch(() => []),
      ]);
      if (pubCfg) {
        setPublicConfig(pubCfg);
      }
      setTestPapers((prev) => {
        const localCustom = prev.filter((p) => p.isCustomScheduled);
        // Map to deduplicate by id
        const map = new Map<string, TestPaper>();
        localCustom.forEach((t) => map.set(t.id, t));
        (serverSchedTests || []).forEach((t) => map.set(t.id, t));
        const combinedCustom = Array.from(map.values());

        const basePrimary: TestPaper =
          dailyPaper && Array.isArray(dailyPaper.questions) && dailyPaper.questions.length > 0
            ? { ...INITIAL_TEST_PAPERS[0], ...dailyPaper, isCustomScheduled: false }
            : prev[0];

        return [basePrimary, ...combinedCustom];
      });
    } catch {
      // Offline paper fallback active
    }
  }, []);

  useEffect(() => {
    void refreshServerExamState();
  }, [refreshServerExamState]);

  useEffect(() => {
    setSpeedSessions(getSpeedPracticeSessions(activeUserId));
  }, [activeUserId]);

  const handleScheduleConfigUpdated = useCallback(
    (cfg: DailyExamScheduleConfig) => {
      setPublicConfig((prev) => (prev ? { ...prev, scheduleConfig: cfg } : prev));
      void refreshServerExamState();
    },
    [refreshServerExamState]
  );

  const handleSaveSpeedSession = useCallback((rec: SpeedPracticeSessionRecord) => {
    const currentUser = userRef.current;
    const storageId = getUserStorageId(currentUser);
    const next = saveSpeedPracticeSession(storageId, rec);
    setSpeedSessions(next);
    if (auth.currentUser && auth.currentUser.uid === currentUser?.uid) {
      void saveSpeedPracticeSessionToFirestore(currentUser.uid, rec);
    }
  }, []);

  // Uploaded Previous Year Question Papers (PQP) Archive
  const [uploadedPQPs, setUploadedPQPs] = useState<PreviousYearPaper[]>(() => getUploadedPQPs());

  useEffect(() => {
    if (!isAuthenticated || !auth.currentUser) return;
    const unsubscribe = subscribeToPQPs(
      (cloudPqps) => {
        if (cloudPqps.length > 0) {
          setUploadedPQPs(cloudPqps);
          saveUploadedPQPs(cloudPqps);
        }
      },
      (err) => {
        console.warn('PQP Firestore sync skipped:', err);
      }
    );
    return () => unsubscribe();
  }, [isAuthenticated, user.uid]);

  const handleAddPQP = (newPqp: PreviousYearPaper) => {
    setUploadedPQPs((prev) => {
      const next = [newPqp, ...prev.filter((p) => p.id !== newPqp.id)];
      saveUploadedPQPs(next);
      return next;
    });
    if (auth.currentUser) {
      savePQPToFirestore(newPqp, auth.currentUser.uid).catch((err) => {
        console.warn('Firestore PQP save skipped:', err);
      });
    }
  };

  const handleDeletePQP = (pqpId: string) => {
    setUploadedPQPs((prev) => {
      const next = prev.filter((p) => p.id !== pqpId);
      saveUploadedPQPs(next);
      return next;
    });
    if (auth.currentUser) {
      deletePQPFromFirestore(pqpId).catch((err) => {
        console.warn('Firestore PQP delete skipped:', err);
      });
    }
  };

  // Isolated attempts for custom scheduled exams (scoped per user, does NOT mix with main 7 PM leaderboard)
  const [customTestAttempts, setCustomTestAttempts] = useState<Record<string, Attempt>>(() =>
    readCustomAttemptsForUser(activeUserId)
  );

  // Dedicated custom test results page active state
  const [viewingCustomResultTest, setViewingCustomResultTest] = useState<TestPaper | null>(null);

  const todayIsoDate = getTodayIsoDateIST();
  const [realLeaderboardAttempts, setRealLeaderboardAttempts] = useState<Attempt[]>(() =>
    loadLocalRealLeaderboardAttempts(getTodayIsoDateIST())
  );
  const leaderboardAttempts = useMemo<Attempt[]>(
    () =>
      buildDynamicDailyLeaderboard(
        realLeaderboardAttempts,
        todayIsoDate,
        TARGET_LEADERBOARD_COHORT_SIZE
      ),
    [realLeaderboardAttempts, todayIsoDate]
  );
  const [userAttempt, setUserAttempt] = useState<Attempt | undefined>(undefined);
  const [studentProgress, setStudentProgress] = useState<StudentProgressStats>(() =>
    getStudentProgressForUser(user)
  );
  const [analytics, setAnalytics] = useState<QuestionAnalytic[]>(INITIAL_QUESTION_ANALYTICS);
  const [dailyAggregate, setDailyAggregate] = useState(INITIAL_DAILY_AGGREGATE);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  // Dedicated Exam Screen & Pre-Exam Camera Proctoring Gate State
  const [pendingExamTest, setPendingExamTest] = useState<TestPaper | null>(null);
  const [isExamActive, setIsExamActive] = useState<boolean>(false);
  const [activeExamTest, setActiveExamTest] = useState<TestPaper>(testPapers[0]);
  const [activeExamCameraStream, setActiveExamCameraStream] = useState<MediaStream | null>(null);
  const [activeExamCameraEnabled, setActiveExamCameraEnabled] = useState<boolean>(false);

  const handleAddNewTestPaper = (newTest: TestPaper) => {
    setTestPapers((prev) => {
      const updated = [prev[0], newTest, ...prev.slice(1).filter((t) => t.id !== newTest.id)];
      try {
        const customOnly = updated.filter((t) => t.isCustomScheduled);
        localStorage.setItem('coc_custom_tests', JSON.stringify(customOnly));
      } catch {}
      return updated;
    });
    if (newTest.isCustomScheduled && auth.currentUser?.emailVerified) {
      createAdminScheduledTest(newTest).catch((err) => {
        console.warn('Backend scheduled test sync skipped:', err);
      });
    }
  };

  const handleDeleteTestPaper = (testId: string) => {
    setTestPapers((prev) => {
      const updated = prev.filter((t) => t.id !== testId && t.testCode !== testId);
      try {
        const customOnly = updated.filter((t) => t.isCustomScheduled);
        localStorage.setItem('coc_custom_tests', JSON.stringify(customOnly));
      } catch {}
      return updated;
    });
    if (auth.currentUser?.emailVerified) {
      deleteAdminScheduledTest(testId).catch((err) => {
        console.warn('Backend scheduled test delete skipped:', err);
      });
    }
  };

  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  useEffect(() => {
    setRealLeaderboardAttempts(loadLocalRealLeaderboardAttempts(todayIsoDate));
  }, [todayIsoDate]);

  useEffect(() => {
    if (!isAuthenticated || !auth.currentUser) return;
    const unsubscribe = subscribeToDailyLeaderboard(
      todayIsoDate,
      (cloudItems) => {
        const cleanCloud = cloudItems.map((item) => ({
          ...item,
          isSeededBenchmark: false,
        }));
        setRealLeaderboardAttempts((prev) => {
          const merged = mergeLiveLeaderboardAttempts(prev, cleanCloud);
          try {
            localStorage.setItem(`coc_real_daily_lb_${todayIsoDate}`, JSON.stringify(merged));
          } catch {}
          return merged;
        });
      },
      (err) => {
        console.warn('Daily leaderboard Firestore sync skipped:', err);
      }
    );
    return () => unsubscribe();
  }, [isAuthenticated, todayIsoDate, user.uid]);

  useEffect(() => {
    if (!isAuthenticated || !user?.studentId) return;
    const mine = leaderboardAttempts.find(
      (a) => !a.isSeededBenchmark && a.studentId === user.studentId
    );
    if (mine) {
      setUserAttempt((prev) => {
        if (!prev) return mine;
        if (
          prev.rank !== mine.rank ||
          prev.score !== mine.score ||
          prev.percentile !== mine.percentile
        ) {
          return {
            ...prev,
            ...mine,
            answers: mine.answers?.length ? mine.answers : prev.answers,
          };
        }
        return prev;
      });
    }
  }, [isAuthenticated, user?.studentId, leaderboardAttempts]);

  const smartNotifications: SmartTriggerNotification[] = useMemo(() => {
    const generated = generateSmartTriggers({
      progress: studentProgress,
      leaderboardAttempts,
      userAttempt,
      user,
      todayIsoDate,
    });
    return applyReadStateToNotifications(generated, readTriggerIds);
  }, [studentProgress, leaderboardAttempts, userAttempt, user, todayIsoDate, readTriggerIds]);

  const handleMarkNotificationsRead = () => {
    const allIds = smartNotifications.map((n) => n.id);
    setReadTriggerIds((prev) => markNotificationIdsRead(activeUserId, prev, allIds));
  };

  const handleMarkSingleNotificationRead = (notifId: string) => {
    setReadTriggerIds((prev) => markNotificationIdsRead(activeUserId, prev, [notifId]));
  };

  const handleTriggerNotificationAction = (notif: SmartTriggerNotification) => {
    setReadTriggerIds((prev) => markNotificationIdsRead(activeUserId, prev, [notif.id]));
    handleSetActiveTab(notif.targetTab);
  };

  const handleLoginSuccess = useCallback(
    (newUser: UserProfile, explicitDiag?: DiagnosticResult) => {
      const diagToMerge = explicitDiag || pendingDiagnosticResult;
      const referredBy = newUser.referredBy || incomingReferralCode || undefined;

      let baseProgress = getStudentProgressForUser(newUser);
      if (diagToMerge) {
        baseProgress = mergeDiagnosticIntoProgress(
          baseProgress,
          diagToMerge,
          newUser,
          Boolean(referredBy)
        );
      } else if (referredBy && !baseProgress.badges?.includes('Challenger')) {
        baseProgress = applyReferralReward(baseProgress);
        saveStudentProgressForUser(newUser, baseProgress);
      }

      const enrichedUser: UserProfile = {
        ...newUser,
        referralCode: newUser.referralCode || newUser.studentId,
        referredBy,
        skillTier: baseProgress.skillTier || diagToMerge?.assignedTier || newUser.skillTier || 'Bronze',
        badges: baseProgress.badges && baseProgress.badges.length > 0 ? baseProgress.badges : newUser.badges,
      };

      const loggedUserId = getUserStorageId(enrichedUser);

      setUser(enrichedUser);
      setIsAuthenticated(true);
      setIsAuthModalOpen(false);
      setIsDiagnosticOpen(false);
      setPendingDiagnosticResult(null);
      setUserAttempt(undefined);
      setViewingCustomResultTest(null);
      setPendingExamTest(null);
      setActiveExamCameraStream((prev) => {
        stopMediaStreamTracks(prev);
        return null;
      });
      setActiveExamCameraEnabled(false);
      setIsExamActive(false);
      setReadTriggerIds(loadReadNotificationIds(loggedUserId));
      setRealLeaderboardAttempts(loadLocalRealLeaderboardAttempts(getTodayIsoDateIST()));
      setCustomTestAttempts(readCustomAttemptsForUser(loggedUserId));
      setSpeedSessions(getSpeedPracticeSessions(loggedUserId));
      setStudentProgress(baseProgress);
      saveStudentProgressForUser(enrichedUser, baseProgress);

      try {
        localStorage.setItem('coc_is_authenticated', 'true');
        localStorage.setItem('coc_auth_user', JSON.stringify(enrichedUser));
      } catch (err) {
        console.error('Failed to persist session', err);
      }

      if (auth.currentUser && auth.currentUser.uid === enrichedUser.uid) {
        void (async () => {
          try {
            await syncUserProfileToFirestore(enrichedUser, {
              dailyStreak: baseProgress.currentStreak,
              streakFreezes: baseProgress.streakFreezesAvailable,
            });
          } catch (err) {
            console.warn('Firestore profile sync skipped:', err);
          }

          try {
            const cloudProg = await getUserProgressFromFirestore(enrichedUser.uid);
            if (cloudProg && cloudProg.testsTaken >= baseProgress.testsTaken) {
              const finalProg = diagToMerge
                ? mergeDiagnosticIntoProgress(cloudProg, diagToMerge, enrichedUser, Boolean(referredBy))
                : cloudProg;
              setStudentProgress(finalProg);
              saveStudentProgressForUser(enrichedUser, finalProg);
            } else {
              await syncUserProgressToFirestore(enrichedUser.uid, baseProgress);
            }
          } catch (err) {
            console.warn('Firestore progress sync skipped:', err);
          }
        })();
      }
      scrollToTop();
    },
    [incomingReferralCode, pendingDiagnosticResult]
  );

  const handleLogout = useCallback(() => {
    void signOutFirebase();
    setIsAuthenticated(false);
    setUser(INITIAL_USER_PROFILE);
    setUserAttempt(undefined);
    setViewingCustomResultTest(null);
    setPendingExamTest(null);
    setActiveExamCameraStream((prev) => {
      stopMediaStreamTracks(prev);
      return null;
    });
    setActiveExamCameraEnabled(false);
    setIsExamActive(false);
    setCustomTestAttempts({});
    setSpeedSessions([]);
    setReadTriggerIds([]);
    setRealLeaderboardAttempts(loadLocalRealLeaderboardAttempts(getTodayIsoDateIST()));
    setStudentProgress(EMPTY_STUDENT_PROGRESS);
    scrollToTop();
    try {
      localStorage.removeItem('coc_is_authenticated');
      localStorage.removeItem('coc_auth_user');
      localStorage.removeItem('coc_active_admin_tab');
      localStorage.removeItem('coc_active_tab');
    } catch (err) {
      console.error('Failed to clear session', err);
    }
  }, []);

  // Reconcile Google OAuth redirect return & persisted Firebase Auth session on boot
  useEffect(() => {
    let cancelled = false;

    void completeGoogleRedirectSignIn()
      .then((res) => {
        if (!cancelled && res?.success && res.user) {
          handleLoginSuccess(res.user);
        }
      })
      .catch(() => {});

    const unsubscribe = subscribeToAuthChanges((fbUser) => {
      if (cancelled || isInteractiveFirebaseAuthActive()) return;
      if (fbUser) {
        const currentUser = userRef.current;
        if (!isAuthenticatedRef.current || currentUser?.uid !== fbUser.uid) {
          void hydrateProfileForSignedInFirebaseUser(fbUser)
            .then((hydrated) => {
              if (!cancelled && hydrated) {
                handleLoginSuccess(hydrated);
              }
            })
            .catch(() => {});
        }
      } else if (isAuthenticatedRef.current && !isBuiltInLocalAccountUid(userRef.current?.uid)) {
        // Stale Firebase session in localStorage after external/expired Firebase sign-out
        handleLogout();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [handleLoginSuccess, handleLogout]);

  const handleStartExam = (test: TestPaper) => {
    setPendingExamTest(test);
  };

  const handleConfirmProctoredExamStart = (
    cameraStream: MediaStream | null,
    cameraEnabled: boolean
  ) => {
    if (!pendingExamTest) {
      stopMediaStreamTracks(cameraStream);
      return;
    }
    setActiveExamTest(pendingExamTest);
    setActiveExamCameraStream(cameraStream);
    setActiveExamCameraEnabled(cameraEnabled);
    setPendingExamTest(null);
    setIsExamActive(true);
    scrollToTop();
  };

  const applyProgressAndSyncUser = (attemptToRecord: Attempt, test: TestPaper) => {
    const updatedProgress = recordTestAttemptInProgress(
      studentProgress,
      attemptToRecord,
      test.title,
      user,
      test.questions
    );
    setStudentProgress(updatedProgress);

    const nextUser: UserProfile = {
      ...user,
      skillTier: updatedProgress.skillTier || user.skillTier,
      badges: updatedProgress.badges || user.badges,
    };
    setUser(nextUser);
    try {
      localStorage.setItem('coc_auth_user', JSON.stringify(nextUser));
    } catch {}

    if (auth.currentUser && auth.currentUser.uid === user.uid) {
      syncUserProgressToFirestore(user.uid, updatedProgress).catch((err) => {
        console.warn('Firestore progress sync skipped:', err);
      });
      syncUserProfileToFirestore(nextUser, {
        dailyStreak: updatedProgress.currentStreak,
        streakFreezes: updatedProgress.streakFreezesAvailable,
      }).catch(() => {});
    }
  };

  const handleCompleteExam = (newAttempt: Attempt) => {
    const userKey = getUserStorageId(user);

    // Check if this was an on-demand custom scheduled test, speed sprint, mock, or PQP
    if (activeExamTest.isCustomScheduled) {
      const customAttempt: Attempt = {
        ...newAttempt,
        testId: activeExamTest.id,
        isCustomTest: true,
        customTestTitle: activeExamTest.title,
      };

      setCustomTestAttempts((prev) => {
        const next = { ...prev, [activeExamTest.id]: customAttempt };
        try {
          localStorage.setItem(`coc_custom_attempts_${userKey}`, JSON.stringify(next));
        } catch {}
        return next;
      });

      // Auto-populate mistakes into student's user-scoped Error Book
      addMistakesFromAttempt(customAttempt, activeExamTest.questions, activeExamTest.title, userKey);

      // Update student's dynamic progress, subject accuracy, weakest topics, tier & streak
      applyProgressAndSyncUser(customAttempt, activeExamTest);

      if (auth.currentUser && auth.currentUser.uid === user.uid) {
        saveAttemptToFirestore(user.uid, customAttempt).catch((err) => {
          console.warn('Firestore custom attempt sync skipped:', err);
        });
      }

      // Exit exam runner and immediately route to the dedicated results page for this exam
      setIsExamActive(false);
      setViewingCustomResultTest(activeExamTest);
      scrollToTop();

      handleAddAuditLog(
        'CUSTOM_TEST_COMPLETED',
        `Student ${user.studentId} (${user.fullName}) completed scheduled exam "${activeExamTest.title}". Score: ${newAttempt.score}. Results recorded on isolated scorecard.`
      );
      return;
    }

    // Otherwise, this is the official 7 PM daily All-India Exam
    const studentAttemptWithLoc: Attempt = {
      ...newAttempt,
      studentCity: newAttempt.studentCity || user.address.district || 'Guntur',
      batch: newAttempt.batch || 'Morning Prelims Alpha',
      isSeededBenchmark: false,
    };

    // Persist real attempt for today and replace seeded slots dynamically
    const updatedRealAttempts = saveLocalRealLeaderboardAttempt(todayIsoDate, studentAttemptWithLoc);
    setRealLeaderboardAttempts(updatedRealAttempts);

    const reranked = buildDynamicDailyLeaderboard(
      updatedRealAttempts,
      todayIsoDate,
      TARGET_LEADERBOARD_COHORT_SIZE
    );
    const myRanked = reranked.find((a) => a.studentId === studentAttemptWithLoc.studentId);
    setUserAttempt(myRanked || studentAttemptWithLoc);

    // Auto-populate mistakes into student's user-scoped Error Book
    addMistakesFromAttempt(studentAttemptWithLoc, activeExamTest.questions, activeExamTest.title, userKey);

    // Update progress stats dynamically
    applyProgressAndSyncUser(myRanked || studentAttemptWithLoc, activeExamTest);

    // Backup attempt & publish public leaderboard entry to Firebase Firestore for verified users
    if (auth.currentUser && auth.currentUser.uid === user.uid) {
      saveAttemptToFirestore(user.uid, studentAttemptWithLoc).catch((err) => {
        console.warn('Firestore attempt sync error:', err);
      });
      if (auth.currentUser.emailVerified) {
        publishLeaderboardEntry(
          todayIsoDate,
          myRanked || studentAttemptWithLoc,
          user.skillTier
        ).catch((err) => {
          console.warn('Firestore leaderboard publish skipped:', err);
        });
      }
    }

    handleAddAuditLog(
      'ATTEMPT_FINALIZED',
      `Student ${user.studentId} (${user.fullName}) completed test ${activeExamTest.testCode}. Score: ${newAttempt.score}, Rank: #${myRanked?.rank ?? 1}`
    );

    // Background server-authoritative grading reconciliation for daily official exam
    void gradeDailyExamServer(studentAttemptWithLoc.answers, activeExamTest.date)
      .then((serverGrade) => {
        const reconciledAttempt: Attempt = {
          ...studentAttemptWithLoc,
          score: serverGrade.score,
          correctCount: serverGrade.correctCount,
          incorrectCount: serverGrade.incorrectCount,
          unattemptedCount: serverGrade.unattemptedCount,
          answers:
            Array.isArray(serverGrade.gradedAnswers) && serverGrade.gradedAnswers.length > 0
              ? serverGrade.gradedAnswers
              : studentAttemptWithLoc.answers,
          isSeededBenchmark: false,
        };

        const nextReal = saveLocalRealLeaderboardAttempt(todayIsoDate, reconciledAttempt);
        setRealLeaderboardAttempts(nextReal);
        const nextRanked = buildDynamicDailyLeaderboard(
          nextReal,
          todayIsoDate,
          TARGET_LEADERBOARD_COHORT_SIZE
        );
        const nextMe = nextRanked.find((a) => a.studentId === reconciledAttempt.studentId);
        setUserAttempt(nextMe || reconciledAttempt);

        if (auth.currentUser && auth.currentUser.uid === user.uid) {
          saveAttemptToFirestore(user.uid, reconciledAttempt).catch(() => {});
          if (auth.currentUser.emailVerified) {
            publishLeaderboardEntry(
              todayIsoDate,
              nextMe || reconciledAttempt,
              user.skillTier
            ).catch(() => {});
          }
        }
      })
      .catch(() => {
        // Offline client scoring remains seamless
      });
  };

  const handleTriggerReevaluation = (questionId: string, correctedIndex: number) => {
    setAnalytics((prev) =>
      prev.map((q) =>
        q.questionId === questionId
          ? {
              ...q,
              discriminationIndex: 0.38,
              isDefective: false,
              correctRate: 68,
              defectReason: undefined,
            }
          : q
      )
    );

    handleAddAuditLog(
      'REEVALUATION_APPLIED',
      `Question ${questionId} answer key amended to Option ${String.fromCharCode(65 + correctedIndex)}. Batch re-evaluation across recorded attempts complete.`
    );
  };

  const handleAddAuditLog = (action: string, details: string) => {
    const newEntry: AuditLogEntry = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      adminName:
        currentRole === 'superAdmin'
          ? 'Dr. K. Srinivas (Super Admin)'
          : currentRole === 'contentAdmin'
          ? 'Content Lead (Admin)'
          : currentRole === 'analyst'
          ? 'Data Analyst'
          : `${user.fullName} (${user.studentId})`,
      adminRole: currentRole,
      action,
      details,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const handleUpdateProfile = (updated: Partial<UserProfile>) => {
    setUser((prev) => {
      const next = { ...prev, ...updated };
      try {
        localStorage.setItem('coc_auth_user', JSON.stringify(next));
      } catch {}
      if (auth.currentUser && auth.currentUser.uid === next.uid) {
        syncUserProfileToFirestore(next).catch((err) => {
          console.warn('Firestore profile sync error:', err);
        });
      }
      return next;
    });
  };

  const handleSelectLanguage = (lang: LanguageCode) => {
    setUser((prev) => {
      const next = { ...prev, language: lang };
      try {
        localStorage.setItem('coc_auth_user', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleStartPracticeSprint = (
    subject: SubjectTag | 'all',
    difficulty: DifficultyFilter = 'all'
  ) => {
    let filteredQs = SAMPLE_40_QUESTIONS.filter((q) => {
      const topicMatch = subject === 'all' || q.subject === subject;
      const diffMatch = difficulty === 'all' || q.difficulty === difficulty;
      return topicMatch && diffMatch;
    });

    if (filteredQs.length < 3) {
      const fallbackPool =
        subject === 'all'
          ? SAMPLE_40_QUESTIONS
          : SAMPLE_40_QUESTIONS.filter((q) => q.subject === subject);
      const pickedIds = new Set(filteredQs.map((q) => q.id));
      for (const q of fallbackPool) {
        if (!pickedIds.has(q.id)) {
          filteredQs.push(q);
          pickedIds.add(q.id);
        }
        if (filteredQs.length >= 10) break;
      }
      if (filteredQs.length < 3) {
        for (const q of SAMPLE_40_QUESTIONS) {
          if (!pickedIds.has(q.id)) {
            filteredQs.push(q);
            pickedIds.add(q.id);
          }
          if (filteredQs.length >= 10) break;
        }
      }
    }

    const finalQs = filteredQs.slice(0, 10);
    const topicLabel = subject === 'all' ? 'Mixed Syllabus' : subject;
    const diffLabel = difficulty === 'all' ? '' : ` · ${difficulty.toUpperCase()}`;

    const sprintTest: TestPaper = {
      ...testPapers[0],
      id: `practice_${Date.now()}`,
      testCode: `COC-SPRINT-${finalQs.length}`,
      title: `${topicLabel}${diffLabel} · Speed Practice`,
      description: `Untimed speed practice drill: ${finalQs.length} targeted questions with flexible self-paced progression.`,
      questions: finalQs,
      totalQuestions: finalQs.length,
      totalDurationSeconds: finalQs.length * 10,
      questionDurationSeconds: 10,
      isCustomScheduled: true,
      isSpeedPractice: true,
    };
    handleStartExam(sprintTest);
  };

  const handleLaunchPracticeTopic = (topicOrSubject: string) => {
    const query = topicOrSubject.trim().toLowerCase();
    const matchedSubject = (
      [
        'Quantitative Aptitude',
        'Reasoning & Intelligence',
        'General Awareness',
        'English Comprehension',
      ] as SubjectTag[]
    ).find((s) => s.toLowerCase() === query);

    if (matchedSubject) {
      handleStartPracticeSprint(matchedSubject);
      return;
    }

    const topicQuestion = SAMPLE_40_QUESTIONS.find((q) =>
      q.topic.toLowerCase().includes(query)
    );
    handleStartPracticeSprint(topicQuestion?.subject || 'Quantitative Aptitude');
  };

  const userAttemptsList = useMemo<Attempt[]>(() => {
    const map = new Map<string, Attempt>();
    if (userAttempt) {
      map.set(userAttempt.id || userAttempt.testId, userAttempt);
    }
    for (const att of Object.values(customTestAttempts)) {
      if (att) {
        map.set(att.id || att.testId, att);
      }
    }
    if (user.uid === 'demo_user_001' && !userAttempt) {
      const demoLb = leaderboardAttempts.find((a) => a.studentId === user.studentId);
      if (demoLb) map.set(demoLb.id || demoLb.testId, demoLb);
    }
    return Array.from(map.values());
  }, [userAttempt, customTestAttempts, user.uid, user.studentId, leaderboardAttempts]);

  // Scheduled IST notification evaluator (runs every 20 seconds when signed in)
  useEffect(() => {
    if (!isAuthenticated || isExamActive) return;

    const activeSchedule: DailyExamScheduleConfig = publicConfig?.scheduleConfig || {
      timezone: 'Asia/Kolkata',
      questionGenerationTime: '18:00',
      examStartTime: testPapers[0]?.windowStart || '19:00',
      examEndTime: testPapers[0]?.windowEnd || '19:15',
      answerKeyReleaseTime: testPapers[0]?.answerKeyReleaseTime || '20:00',
      totalQuestions: testPapers[0]?.totalQuestions || 30,
      examDurationSeconds: testPapers[0]?.totalDurationSeconds || 300,
      questionDurationSeconds: testPapers[0]?.questionDurationSeconds || 10,
      cohortStartDate: '2026-01-01',
      leaderboardVisibility: 'public',
      updatedAt: new Date().toISOString(),
    };

    const checkScheduleNotifications = () => {
      const prefs = getNotificationPrefs();
      const due = evaluateDueNotifications(
        prefs,
        activeSchedule,
        publicConfig?.todayTopic,
        getSentNotificationLog()
      );
      for (const item of due) {
        markNotificationSent(item.istDate, item.id);
        void dispatchAppNotification({
          id: `${item.istDate}_${item.id}`,
          title: item.title,
          body: item.body,
          targetTab: item.targetTab,
          soundEnabled: prefs.soundEnabled,
        });
      }
    };

    checkScheduleNotifications();
    const intervalId = window.setInterval(checkScheduleNotifications, 20000);
    return () => window.clearInterval(intervalId);
  }, [isAuthenticated, isExamActive, publicConfig, testPapers]);

  // 1. Dedicated Exam Runner (No surrounding clutter or navigation)
  if (isExamActive) {
    return (
      <ExamRunner
        test={activeExamTest}
        studentId={user.studentId}
        studentName={user.fullName}
        studentState={user.address.state}
        language={user.language}
        initialCameraStream={activeExamCameraStream}
        initialCameraEnabled={activeExamCameraEnabled}
        onCompleteExam={handleCompleteExam}
        onExit={() => {
          stopMediaStreamTracks(activeExamCameraStream);
          setActiveExamCameraStream(null);
          setActiveExamCameraEnabled(false);
          setIsExamActive(false);
          if (!activeExamTest.isCustomScheduled) {
            handleSetActiveTab('results');
          }
        }}
        onLogAudit={handleAddAuditLog}
      />
    );
  }

  // 2. Public Landing Page shown before Login/Signup
  if (!isAuthenticated) {
    return (
      <>
        <NotificationBanner />
        <LandingPage
          onOpenAuth={handleOpenAuth}
          onEnterAsDemo={() =>
            handleLoginSuccess({
              ...INITIAL_USER_PROFILE,
              uid: 'demo_user_001',
              studentId: 'COC-2026-000615',
              fullName: 'Karthikeya Reddy',
            })
          }
          onStartDiagnostic={() => setIsDiagnosticOpen(true)}
          referralCode={incomingReferralCode}
          isDark={isDarkMode}
          onToggleTheme={handleToggleTheme}
        />
        <DiagnosticQuizModal
          isOpen={isDiagnosticOpen}
          onClose={() => setIsDiagnosticOpen(false)}
          referralCode={incomingReferralCode}
          onCompleteWithGoogle={(googleUser, diagResult) => {
            handleLoginSuccess(googleUser, diagResult);
          }}
          onOpenSignupWithResult={(diagResult) => {
            setPendingDiagnosticResult(diagResult);
            setIsDiagnosticOpen(false);
            setAuthModalMode('signup');
            setIsAuthModalOpen(true);
          }}
        />
        {isAuthModalOpen && (
          <AuthModal
            key={authModalMode}
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            initialMode={authModalMode}
            onLoginSuccess={(loggedInUser) => handleLoginSuccess(loggedInUser)}
            pendingDiagnostic={pendingDiagnosticResult}
            referralCode={incomingReferralCode}
          />
        )}
      </>
    );
  }

  return (
    <div className={`min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors ${isAdminRole ? 'pb-8' : 'pb-20 md:pb-8'}`}>
      <NotificationBanner onNavigate={(tab) => handleSetActiveTab(tab)} />

      {/* Main Header with Settings Trigger, Smart Alerts & Sign Out */}
      <Header
        user={user}
        currentRole={currentRole}
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        streak={studentProgress.currentStreak}
        streakFreezes={studentProgress.streakFreezesAvailable ?? 1}
        notifications={smartNotifications}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onMarkSingleNotificationRead={handleMarkSingleNotificationRead}
        onTriggerNotificationAction={handleTriggerNotificationAction}
        isDark={isDarkMode}
        onToggleTheme={handleToggleTheme}
      />

      {/* Pre-Exam Camera Proctoring Gate Modal */}
      <CameraProctoringModal
        test={pendingExamTest}
        onCancel={() => setPendingExamTest(null)}
        onConfirmStart={handleConfirmProctoredExamStart}
      />

      {/* Settings Modal (Language, Appearance & Preferences) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentLanguage={user.language}
        onSelectLanguage={handleSelectLanguage}
        theme={theme}
        onSelectTheme={setTheme}
      />

      {/* Primary Content View */}
      <main className="flex-1">
        {isAdminRole ? (
          <AdminDashboard
            currentRole={currentRole}
            testPapers={testPapers}
            analytics={analytics}
            dailyAggregate={dailyAggregate}
            auditLogs={auditLogs}
            uploadedPQPs={uploadedPQPs}
            scheduleConfig={publicConfig?.scheduleConfig}
            onScheduleConfigUpdated={handleScheduleConfigUpdated}
            onTriggerReevaluation={handleTriggerReevaluation}
            onPreviewStudentExam={handleStartExam}
            onAddAuditLog={handleAddAuditLog}
            onUpdateTestPaper={(updated) =>
              setTestPapers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
            }
            onAddTestPaper={handleAddNewTestPaper}
            onDeleteTestPaper={handleDeleteTestPaper}
            onAddPQP={handleAddPQP}
            onDeletePQP={handleDeletePQP}
            onLogout={handleLogout}
          />
        ) : (
          <>
            {viewingCustomResultTest && customTestAttempts[viewingCustomResultTest.id] ? (
              <CustomTestResultsView
                test={viewingCustomResultTest}
                attempt={customTestAttempts[viewingCustomResultTest.id]}
                user={user}
                onBackToTests={() => {
                  setViewingCustomResultTest(null);
                  handleSetActiveTab('tests');
                }}
                onGoToMainLeaderboard={() => {
                  setViewingCustomResultTest(null);
                  handleSetActiveTab('results');
                }}
              />
            ) : (
              <>
                {activeTab === 'tests' && (
                  <TestsView
                    testPapers={testPapers}
                    user={user}
                    userAttempt={userAttempt}
                    customTestAttempts={customTestAttempts}
                    currentSimulatedTime={currentSimulatedTime}
                    scheduleConfig={publicConfig?.scheduleConfig}
                    todayStudyTopic={publicConfig?.todayTopic}
                    nextDayStudyTopic={publicConfig?.nextDayTopic}
                    onStartExam={handleStartExam}
                    onNavigateToProfile={() => handleSetActiveTab('profile')}
                    onNavigateToResults={() => handleSetActiveTab('results')}
                    onNavigateToPractice={(target) => {
                      setPracticeSubTab(target || 'daily_mocks');
                      handleSetActiveTab('practice');
                    }}
                    onViewCustomResult={(test) => {
                      setViewingCustomResultTest(test);
                      scrollToTop();
                    }}
                    onDeleteCustomTest={handleDeleteTestPaper}
                  />
                )}

                {activeTab === 'results' && (
                  <ResultsView
                    test={testPapers[0]}
                    user={user}
                    userAttempt={userAttempt}
                    leaderboardAttempts={leaderboardAttempts}
                    currentSimulatedTime={currentSimulatedTime}
                    scheduleConfig={publicConfig?.scheduleConfig}
                    nextDayStudyTopic={publicConfig?.nextDayTopic}
                    onNavigateToErrorBook={() => {
                      setPracticeSubTab('error_book');
                      handleSetActiveTab('practice');
                    }}
                    onNavigateToDailyTest={() => handleSetActiveTab('tests')}
                  />
                )}

                {activeTab === 'progress' && (
                  <ProgressView
                    stats={studentProgress}
                    user={user}
                    attempts={userAttemptsList}
                    speedSessions={speedSessions}
                    todayTopic={publicConfig?.todayTopic}
                    onLaunchPracticeTopic={handleLaunchPracticeTopic}
                    onUpdateDailyGoal={(newGoal) => {
                      setStudentProgress((prev) => {
                        const updated = { ...prev, dailyGoalScore: newGoal };
                        saveStudentProgressForUser(user, updated);
                        return updated;
                      });
                    }}
                    onActivateStreakFreeze={(targetIsoDate) => {
                      setStudentProgress((prev) => {
                        const updated = activateStreakFreezeForDate(prev, user, targetIsoDate);
                        if (auth.currentUser && auth.currentUser.uid === user.uid) {
                          syncUserProfileToFirestore(user, {
                            dailyStreak: updated.currentStreak,
                            streakFreezes: updated.streakFreezesAvailable ?? 0,
                          }).catch(() => {});
                        }
                        return updated;
                      });
                    }}
                    onClaimMilestoneReward={(milestoneDays) => {
                      setStudentProgress((prev) => {
                        const updated = claimStreakMilestoneReward(prev, milestoneDays, user);
                        if (auth.currentUser && auth.currentUser.uid === user.uid) {
                          syncUserProfileToFirestore(user, {
                            dailyStreak: updated.currentStreak,
                            streakFreezes: updated.streakFreezesAvailable ?? 0,
                          }).catch(() => {});
                        }
                        return updated;
                      });
                    }}
                  />
                )}

                {activeTab === 'practice' && (
                  <PracticeView
                    userId={activeUserId}
                    user={user}
                    language={user.language}
                    studentProgress={studentProgress}
                    userAttempt={userAttempt}
                    userAttempts={userAttemptsList}
                    speedSessions={speedSessions}
                    todayStudyTopic={publicConfig?.todayTopic}
                    scheduleConfig={publicConfig?.scheduleConfig}
                    uploadedPQPs={uploadedPQPs}
                    initialSubTab={practiceSubTab}
                    onStartSprint={handleStartPracticeSprint}
                    onStartMockExam={handleStartExam}
                    onSaveSpeedSession={handleSaveSpeedSession}
                  />
                )}

                {activeTab === 'profile' && (
                  <ProfileView
                    user={user}
                    progress={studentProgress}
                    onUpdateProfile={handleUpdateProfile}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation (Student Portal Only) */}
      {!isAdminRole && (
        <BottomNav
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          isExamActive={isExamActive}
          language={user.language}
        />
      )}
    </div>
  );
}
