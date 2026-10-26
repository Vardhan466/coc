/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Attempt,
  AuditLogEntry,
  LanguageCode,
  QuestionAnalytic,
  SubjectTag,
  TestPaper,
  UserProfile,
  UserRole,
} from './types';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_DAILY_AGGREGATE,
  INITIAL_QUESTION_ANALYTICS,
  INITIAL_SAMPLE_ATTEMPTS,
  INITIAL_STUDENT_PROGRESS,
  INITIAL_TEST_PAPERS,
  INITIAL_USER_PROFILE,
  SAMPLE_40_QUESTIONS,
} from './data/mockExamData';
import { calculateTieBreakerRank, calculateScore, calculateNegativeMarkLoss } from './utils/scoring';

import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { TestsView } from './components/TestsView';
import { ResultsView } from './components/ResultsView';
import { ProgressView } from './components/ProgressView';
import { PracticeView } from './components/PracticeView';
import { ProfileView } from './components/ProfileView';
import { ExamRunner } from './components/ExamRunner';
import { AdminDashboard } from './components/AdminDashboard';
import { SettingsModal } from './components/SettingsModal';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';

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

  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const stored = localStorage.getItem('coc_auth_user');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return INITIAL_USER_PROFILE;
  });

  // Current role is derived 100% strictly from user profile (no out-of-sync simulation state)
  const currentRole: UserRole = user?.role || 'student';
  const isAdminRole = currentRole !== 'student';

  const [currentSimulatedTime, setCurrentSimulatedTime] = useState<string>('19:02');

  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      return localStorage.getItem('coc_active_tab') || 'tests';
    } catch {
      return 'tests';
    }
  });

  const handleSetActiveTab = (tab: string) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('coc_active_tab', tab);
    } catch {}
  };

  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [testPapers, setTestPapers] = useState<TestPaper[]>(INITIAL_TEST_PAPERS);
  const [leaderboardAttempts, setLeaderboardAttempts] = useState<Attempt[]>(() =>
    calculateTieBreakerRank(INITIAL_SAMPLE_ATTEMPTS as Attempt[])
  );
  const [userAttempt, setUserAttempt] = useState<Attempt | undefined>(undefined);
  const [studentProgress, setStudentProgress] = useState(INITIAL_STUDENT_PROGRESS);
  const [analytics, setAnalytics] = useState<QuestionAnalytic[]>(INITIAL_QUESTION_ANALYTICS);
  const [dailyAggregate, setDailyAggregate] = useState(INITIAL_DAILY_AGGREGATE);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  // Dedicated Exam Screen active state
  const [isExamActive, setIsExamActive] = useState<boolean>(false);
  const [activeExamTest, setActiveExamTest] = useState<TestPaper>(testPapers[0]);

  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (newUser: UserProfile) => {
    setUser(newUser);
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
    try {
      localStorage.setItem('coc_is_authenticated', 'true');
      localStorage.setItem('coc_auth_user', JSON.stringify(newUser));
    } catch (err) {
      console.error('Failed to persist session', err);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('coc_is_authenticated');
      localStorage.removeItem('coc_auth_user');
      localStorage.removeItem('coc_active_admin_tab');
      localStorage.removeItem('coc_active_tab');
    } catch (err) {
      console.error('Failed to clear session', err);
    }
  };

  const handleStartExam = (test: TestPaper) => {
    setActiveExamTest(test);
    setIsExamActive(true);
  };

  const handleCompleteExam = (newAttempt: Attempt) => {
    setUserAttempt(newAttempt);

    // Merge student's attempt into leaderboard and compute deterministic tie-breaker rankings
    const updatedAttempts = [
      ...leaderboardAttempts.filter((a) => a.studentId !== newAttempt.studentId),
      newAttempt,
    ];
    const reranked = calculateTieBreakerRank(updatedAttempts);
    setLeaderboardAttempts(reranked);

    const myRanked = reranked.find((a) => a.studentId === newAttempt.studentId);
    if (myRanked) {
      setUserAttempt(myRanked);
    }

    // Update progress stats
    setStudentProgress((prev) => {
      const newScore = newAttempt.score;
      const testsCount = prev.testsTaken + 1;
      const newAvg = Number(((prev.averageScore * prev.testsTaken + newScore) / testsCount).toFixed(2));
      const newHigh = Math.max(prev.highestScore, newScore);
      const newNegatives = prev.marksLostToNegatives + calculateNegativeMarkLoss(newAttempt.incorrectCount);

      return {
        ...prev,
        testsTaken: testsCount,
        averageScore: newAvg,
        highestScore: newHigh,
        currentStreak: prev.currentStreak + 1,
        marksLostToNegatives: Number(newNegatives.toFixed(2)),
        recentAttempts: [
          ...prev.recentAttempts,
          {
            testDate: 'Oct 24',
            testTitle: '#298',
            score: newScore,
            peerAvgScore: 23.4,
            rank: myRanked?.rank || 28,
            percentile: myRanked?.percentile || 99.3,
            accuracy: Math.round(
              (newAttempt.correctCount / Math.max(1, newAttempt.correctCount + newAttempt.incorrectCount)) * 100
            ),
          },
        ],
      };
    });

    handleAddAuditLog(
      'ATTEMPT_FINALIZED',
      `Student ${user.studentId} (${user.fullName}) completed test ${activeExamTest.testCode}. Score: ${newAttempt.score}, Rank: #${myRanked?.rank ?? 28}`
    );
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
      `Question ${questionId} answer key amended to Option ${String.fromCharCode(65 + correctedIndex)}. Batch re-evaluation of 4,120 attempts complete.`
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

  const handleStartPracticeSprint = (subject: SubjectTag) => {
    const filteredQs = SAMPLE_40_QUESTIONS.filter((q) => q.subject === subject).slice(0, 10);
    const sprintTest: TestPaper = {
      ...testPapers[0],
      id: `practice_${Date.now()}`,
      title: `${subject} 12-Second Speed Drill`,
      description: `Rapid conditioning sprint: 10 targeted questions, 12 seconds per question.`,
      questions: filteredQs.length === 10 ? filteredQs : SAMPLE_40_QUESTIONS.slice(0, 10),
      totalQuestions: 10,
      totalDurationSeconds: 120,
    };
    handleStartExam(sprintTest);
  };

  // 1. Dedicated Exam Runner (No surrounding clutter or navigation)
  if (isExamActive) {
    return (
      <ExamRunner
        test={activeExamTest}
        studentId={user.studentId}
        studentName={user.fullName}
        studentState={user.address.state}
        language={user.language}
        onCompleteExam={handleCompleteExam}
        onExit={() => {
          setIsExamActive(false);
          handleSetActiveTab('results');
        }}
        onLogAudit={handleAddAuditLog}
      />
    );
  }

  // 2. Public Landing Page shown before Login/Signup
  if (!isAuthenticated) {
    return (
      <>
        <LandingPage
          onOpenAuth={handleOpenAuth}
          onEnterAsDemo={() => handleLoginSuccess(INITIAL_USER_PROFILE)}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authModalMode}
          onLoginSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans pb-20 md:pb-8">
      {/* Main Header with Settings Trigger & Sign Out */}
      <Header
        user={user}
        currentRole={currentRole}
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
      />

      {/* Settings Modal (Language & Preferences) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentLanguage={user.language}
        onSelectLanguage={handleSelectLanguage}
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
            onTriggerReevaluation={handleTriggerReevaluation}
            onPreviewStudentExam={handleStartExam}
            onAddAuditLog={handleAddAuditLog}
            onLogout={handleLogout}
          />
        ) : (
          <>
            {activeTab === 'tests' && (
              <TestsView
                testPapers={testPapers}
                user={user}
                userAttempt={userAttempt}
                currentSimulatedTime={currentSimulatedTime}
                onStartExam={handleStartExam}
                onNavigateToProfile={() => handleSetActiveTab('profile')}
                onNavigateToResults={() => handleSetActiveTab('results')}
              />
            )}

            {activeTab === 'results' && (
              <ResultsView
                test={testPapers[0]}
                user={user}
                userAttempt={userAttempt}
                leaderboardAttempts={leaderboardAttempts}
                currentSimulatedTime={currentSimulatedTime}
              />
            )}

            {activeTab === 'progress' && (
              <ProgressView
                stats={studentProgress}
                user={user}
                onLaunchPracticeTopic={(topic) => {
                  handleStartPracticeSprint('Quantitative Aptitude');
                }}
              />
            )}

            {activeTab === 'practice' && (
              <PracticeView onStartSprint={handleStartPracticeSprint} />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                user={user}
                onUpdateProfile={handleUpdateProfile}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        isExamActive={isExamActive}
        language={user.language}
      />
    </div>
  );
}
