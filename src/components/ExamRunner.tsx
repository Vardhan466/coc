import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Attempt, AttemptAnswer, LanguageCode, Question, TestPaper } from '../types';
import {
  ExamSessionState,
  QuestionStatus,
  QuestionUserAttempt,
  QuestionSchema,
  ExamSubject,
} from '../types/exam';
import { transitionQuestionState, computePaletteSummary } from '../fsm/questionFSM';
import {
  saveExamSession,
  saveExamSessionSync,
  loadExamSession,
  clearExamSession,
} from '../utils/idbStorage';
import { generateTelemetryReport } from '../analytics/telemetryEngine';
import { MathRenderer } from './MathRenderer';
import { calculateScore } from '../utils/scoring';
import { getTranslation } from '../utils/i18n';
import { FeedbackModal } from './FeedbackModal';
import {
  CameraProctoringStatus,
  getProctoringBadgeMeta,
  mapCameraAccessError,
  stopMediaStreamTracks,
} from '../utils/proctoring';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Clock,
  ShieldAlert,
  XCircle,
  ChevronRight,
  Send,
  RotateCcw,
  Bookmark,
  Grid,
  X,
  Keyboard,
  Info,
  Timer as TimerIcon,
  Lock,
} from 'lucide-react';

interface ExamRunnerProps {
  test: TestPaper;
  studentId: string;
  studentName: string;
  studentState: string;
  language: LanguageCode;
  initialCameraStream?: MediaStream | null;
  initialCameraEnabled?: boolean;
  onCompleteExam: (attempt: Attempt) => void;
  onExit: () => void;
  onLogAudit?: (action: string, details: string) => void;
}

export const ExamRunner: React.FC<ExamRunnerProps> = ({
  test,
  studentId,
  studentName,
  studentState,
  language,
  initialCameraStream = null,
  initialCameraEnabled = false,
  onCompleteExam,
  onExit,
  onLogAudit,
}) => {
  const t = getTranslation(language);

  const isSpeedPracticeMode = Boolean(test.isSpeedPractice || test.id.startsWith('practice_'));

  // Competition Rules: Strictly 10s per question by default, dynamic length for micro/custom tests
  const QUESTION_DURATION_SECONDS = test.questionDurationSeconds || 10;
  const totalQuestionsCount = test.questions.length || test.totalQuestions || 30;
  const TOTAL_DURATION_SECONDS =
    test.totalDurationSeconds || totalQuestionsCount * QUESTION_DURATION_SECONDS;

  // Current question index
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);

  // Dual Timers:
  // 1. Total Exam countdown
  const [totalSecondsLeft, setTotalSecondsLeft] = useState<number>(TOTAL_DURATION_SECONDS);
  // 2. Per-Question countdown (10s)
  const [questionSecondsLeft, setQuestionSecondsLeft] = useState<number>(QUESTION_DURATION_SECONDS);
  const [questionMsLeft, setQuestionMsLeft] = useState<number>(QUESTION_DURATION_SECONDS * 1000);

  // User attempts map
  const [attempts, setAttempts] = useState<Record<string, QuestionUserAttempt>>(() => {
    const init: Record<string, QuestionUserAttempt> = {};
    test.questions.forEach((q, idx) => {
      init[q.id] = {
        questionId: q.id,
        selectedOptionId: null,
        status: idx === 0 ? 'NOT_ANSWERED' : 'NOT_VISITED',
        timeSpentMs: 0,
        visitCount: idx === 0 ? 1 : 0,
        lastVisitedTimestamp: Date.now(),
      };
    });
    return init;
  });

  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [restoredBanner, setRestoredBanner] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [finalAttempt, setFinalAttempt] = useState<Attempt | null>(null);

  // References
  const sessionStartTimeRef = useRef<string>(new Date().toISOString());
  const questionStartTimeRef = useRef<number>(Date.now());
  const examDeadlineMsRef = useRef<number>(Date.now() + TOTAL_DURATION_SECONDS * 1000);
  const isFinishedRef = useRef<boolean>(false);
  const currentQIndexRef = useRef<number>(0);
  const attemptsRef = useRef<Record<string, QuestionUserAttempt>>(attempts);
  const totalSecondsRef = useRef<number>(TOTAL_DURATION_SECONDS);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastViolationAtRef = useRef<number>(0);

  currentQIndexRef.current = currentQIndex;
  attemptsRef.current = attempts;
  totalSecondsRef.current = totalSecondsLeft;

  const currentQuestion: Question = test.questions[currentQIndex] || test.questions[0];

  // Direct Anti-Cheat Tab Switch & Window Blur Monitor
  const [violationCount, setViolationCount] = useState<number>(0);
  const [warningToast, setWarningToast] = useState<{
    show: boolean;
    message: string;
    violationNumber: number;
  } | null>(null);
  const [isDisqualified, setIsDisqualified] = useState<boolean>(false);
  const [disqualificationReason, setDisqualificationReason] = useState<string>('');
  const violationCountRef = useRef<number>(0);

  // Camera Anti-Cheat Proctoring Monitor State
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(initialCameraStream);
  const [cameraStatus, setCameraStatus] = useState<CameraProctoringStatus>(() =>
    initialCameraEnabled && initialCameraStream ? 'active' : 'off'
  );
  const [cameraErrorMsg, setCameraErrorMsg] = useState<string | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(initialCameraStream);
  const desktopVideoRef = useRef<HTMLVideoElement | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  const ignoreBlurUntilRef = useRef<number>(0);
  const loggedInitialProctorRef = useRef<boolean>(false);
  const onLogAuditRef = useRef(onLogAudit);

  useEffect(() => {
    onLogAuditRef.current = onLogAudit;
  }, [onLogAudit]);

  const releaseCameraTracks = useCallback(() => {
    stopMediaStreamTracks(cameraStreamRef.current);
    cameraStreamRef.current = null;
    setCameraStream(null);
  }, []);

  useEffect(() => {
    if (!loggedInitialProctorRef.current) {
      loggedInitialProctorRef.current = true;
      onLogAuditRef.current?.(
        initialCameraEnabled && initialCameraStream
          ? 'CAMERA_PROCTORING_ENABLED'
          : 'CAMERA_PROCTORING_SKIPPED',
        initialCameraEnabled && initialCameraStream
          ? `Live camera anti-cheat monitor active for ${studentId} on ${test.testCode}.`
          : `Exam started with tab-switch proctoring only (camera not enabled) for ${studentId}.`
      );
    }
  }, [initialCameraEnabled, initialCameraStream, studentId, test.testCode]);

  useEffect(() => {
    return () => {
      stopMediaStreamTracks(cameraStreamRef.current);
      cameraStreamRef.current = null;
    };
  }, []);

  useEffect(() => {
    cameraStreamRef.current = cameraStream;
    const attach = (el: HTMLVideoElement | null) => {
      if (!el) return;
      if (cameraStream) {
        el.srcObject = cameraStream;
        void el.play().catch(() => {});
      } else {
        el.srcObject = null;
      }
    };
    attach(desktopVideoRef.current);
    attach(mobileVideoRef.current);

    if (!cameraStream) return;
    const tracks = cameraStream.getVideoTracks();
    const handleTrackEnded = () => {
      if (!isFinishedRef.current) {
        setCameraStatus('interrupted');
        onLogAuditRef.current?.(
          'CAMERA_PROCTORING_INTERRUPTED',
          `Camera feed stopped unexpectedly during exam for ${studentId}.`
        );
      }
    };
    tracks.forEach((tr) => tr.addEventListener('ended', handleTrackEnded));
    return () => {
      tracks.forEach((tr) => tr.removeEventListener('ended', handleTrackEnded));
    };
  }, [cameraStream, studentId]);

  const handleEnableCameraInExam = async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setCameraStatus('unsupported');
      setCameraErrorMsg('Camera API unavailable in this browser.');
      return;
    }
    ignoreBlurUntilRef.current = Date.now() + 4000;
    setCameraStatus('requesting');
    setCameraErrorMsg(null);
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });
      if (isFinishedRef.current) {
        stopMediaStreamTracks(nextStream);
        return;
      }
      stopMediaStreamTracks(cameraStreamRef.current);
      cameraStreamRef.current = nextStream;
      setCameraStream(nextStream);
      setCameraStatus('active');
      onLogAuditRef.current?.(
        'CAMERA_PROCTORING_ENABLED',
        `Student ${studentId} enabled live camera proctoring during exam.`
      );
    } catch (err) {
      const mapped = mapCameraAccessError(err);
      setCameraStatus(mapped.status);
      setCameraErrorMsg(mapped.message);
    } finally {
      ignoreBlurUntilRef.current = Date.now() + 800;
    }
  };

  const finishExamAsDisqualified = useCallback(
    (reason: string) => {
      if (isFinishedRef.current) return;
      isFinishedRef.current = true;
      setWarningToast(null);
      setIsDisqualified(true);
      setDisqualificationReason(reason);
      setExamFinished(true);
      releaseCameraTracks();

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      clearExamSession(test.id);

      const elapsedSec = Math.max(
        1,
        TOTAL_DURATION_SECONDS - Math.max(0, totalSecondsRef.current)
      );
      const disqAttempt: Attempt = {
        id: `att_disq_${Date.now()}`,
        attemptId: `att_disq_${Date.now()}`,
        testId: test.id,
        studentId,
        studentName,
        studentState,
        startedAt: sessionStartTimeRef.current,
        submittedAt: new Date().toISOString(),
        score: -10,
        correctCount: 0,
        incorrectCount: totalQuestionsCount,
        unattemptedCount: 0,
        timeTakenSeconds: elapsedSec,
        totalTimeSeconds: elapsedSec,
        answers: [],
        isDisqualified: true,
        disqualificationReason: reason,
      };

      setFinalAttempt(disqAttempt);
      onCompleteExam(disqAttempt);
      onLogAuditRef.current?.(
        'EXAM_DISQUALIFIED',
        `Student ${studentId} force-submitted & disqualified: ${reason}`
      );
    },
    [
      TOTAL_DURATION_SECONDS,
      onCompleteExam,
      releaseCameraTracks,
      studentId,
      studentName,
      studentState,
      test.id,
      totalQuestionsCount,
    ]
  );

  useEffect(() => {
    if (examFinished || isFinishedRef.current || isDisqualified) return;

    const handleViolation = (type: 'tab_switch' | 'window_blur') => {
      if (examFinished || isFinishedRef.current || isDisqualified) return;
      if (type === 'window_blur' && Date.now() < ignoreBlurUntilRef.current) return;

      // Deduplicate simultaneous window blur + visibilitychange for a single user tab switch
      const now = Date.now();
      if (now - lastViolationAtRef.current < 700) {
        return;
      }
      lastViolationAtRef.current = now;

      violationCountRef.current += 1;
      const count = violationCountRef.current;
      setViolationCount(count);

      onLogAuditRef.current?.(
        'INTEGRITY_VIOLATION_RECORDED',
        `Violation #${count} (${
          type === 'tab_switch' ? 'visibilitychange / Tab Switch' : 'window_blur / Focus Lost'
        }) detected on Question ${currentQIndexRef.current + 1}. Total count: ${count}`
      );

      if (count === 1) {
        setWarningToast({
          show: true,
          violationNumber: 1,
          message:
            'Anti-Cheat Warning: Tab switch or window blur detected! (Violation 1 of 2). One more switch will immediately force-submit and disqualify your examination.',
        });
      } else if (count >= 2) {
        finishExamAsDisqualified(
          `Disqualified: Student switched tabs / blurred window during active test (${count} violations detected).`
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('tab_switch');
      }
    };

    const handleWindowBlur = () => {
      handleViolation('window_blur');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [examFinished, finishExamAsDisqualified, isDisqualified]);

  // Unique Subjects / Sections
  const subjects = Array.from(new Set(test.questions.map((q) => q.subject)));

  // 1. Initial State Hydration from IndexedDB / LocalStorage
  useEffect(() => {
    let mounted = true;
    let bannerTimeoutId: number | null = null;

    loadExamSession(test.id).then((saved) => {
      if (!mounted || !saved || saved.isSubmitted) return;

      if (saved.timeRemainingSeconds > 0) {
        examDeadlineMsRef.current = Date.now() + saved.timeRemainingSeconds * 1000;
        setTotalSecondsLeft(saved.timeRemainingSeconds);
        totalSecondsRef.current = saved.timeRemainingSeconds;

        if (saved.attempts && Object.keys(saved.attempts).length > 0) {
          setAttempts(saved.attempts);
          attemptsRef.current = saved.attempts;
        }

        const savedIdx = test.questions.findIndex((q) => q.id === saved.activeQuestionId);
        if (savedIdx >= 0) {
          setCurrentQIndex(savedIdx);
          currentQIndexRef.current = savedIdx;
        }

        setRestoredBanner(true);
        bannerTimeoutId = window.setTimeout(() => {
          if (mounted) setRestoredBanner(false);
        }, 3500);
      }
    });

    return () => {
      mounted = false;
      if (bannerTimeoutId !== null) window.clearTimeout(bannerTimeoutId);
    };
  }, [test.id, test.questions]);

  // 2. Synchronous persistence on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isFinishedRef.current) return;
      const curQ = test.questions[currentQIndexRef.current] || test.questions[0];
      const stateToSave: ExamSessionState = {
        examId: test.id,
        activeSectionId: curQ.subject,
        activeQuestionId: curQ.id,
        timeRemainingSeconds: totalSecondsRef.current,
        isSubmitted: false,
        attempts: attemptsRef.current,
      };
      saveExamSessionSync(stateToSave);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [test.id, test.questions]);

  // Forward declaration of triggerCompletion
  const triggerCompletion = useCallback(() => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    setExamFinished(true);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Build QuestionSchema array for Telemetry Engine
    const questionSchemas: QuestionSchema[] = test.questions.map((q) => {
      let subj: ExamSubject = 'GENERAL_AWARENESS';
      if (q.subject === 'Quantitative Aptitude') subj = 'QUANTITATIVE_APTITUDE';
      else if (q.subject === 'Reasoning & Intelligence') subj = 'REASONING';
      else if (q.subject === 'English Comprehension') subj = 'ENGLISH';

      return {
        id: q.id,
        sectionId: q.subject,
        subject: subj,
        topic: q.topic,
        prompt: q.text,
        options: q.options.map((opt, idx) => ({ id: `opt_${idx}`, text: opt })),
        correctOptionId: `opt_${q.correctIndex}`,
        positiveMarks: 1.0,
        negativeMarks: 0.25,
        explanation: q.explanation,
      };
    });

    // Run Telemetry Engine
    const telemetryReport = generateTelemetryReport(
      test.id,
      questionSchemas,
      attemptsRef.current,
      TOTAL_DURATION_SECONDS,
      totalSecondsRef.current
    );

    // Build recorded answers
    const recordedAnswers: AttemptAnswer[] = test.questions.map((q, idx) => {
      const att = attemptsRef.current[q.id];
      const selectedOptIdx =
        att && att.selectedOptionId ? parseInt(att.selectedOptionId.replace('opt_', ''), 10) : null;
      const isCorrect = selectedOptIdx !== null ? selectedOptIdx === q.correctIndex : false;

      return {
        questionId: q.id,
        questionIndex: idx,
        selectedOptionIndex: selectedOptIdx,
        selectedOption: selectedOptIdx,
        timeSpentSeconds: Number(((att?.timeSpentMs || 0) / 1000).toFixed(1)),
        isCorrect,
        timestamp: new Date().toISOString(),
      };
    });

    const answeredCount = recordedAnswers.filter((a) => a.selectedOption !== null).length;
    const correctCount = recordedAnswers.filter((a) => a.isCorrect).length;
    const incorrectCount = recordedAnswers.filter((a) => a.selectedOption !== null && !a.isCorrect).length;
    const unattemptedCount = test.questions.length - answeredCount;
    const rawScore = calculateScore(correctCount, incorrectCount);
    const totalTimeSec = TOTAL_DURATION_SECONDS - Math.max(0, totalSecondsRef.current);

    const attempt: Attempt = {
      id: `att_${Date.now()}`,
      attemptId: `att_${Date.now()}`,
      testId: test.id,
      studentId,
      studentName,
      studentState,
      startedAt: sessionStartTimeRef.current,
      submittedAt: new Date().toISOString(),
      score: rawScore,
      correctCount,
      incorrectCount,
      unattemptedCount,
      timeTakenSeconds: Math.max(1, totalTimeSec),
      totalTimeSeconds: Math.max(1, totalTimeSec),
      answers: recordedAnswers,
      telemetry: telemetryReport,
      isDisqualified: false,
    };

    clearExamSession(test.id);
    releaseCameraTracks();
    setFinalAttempt(attempt);
  }, [TOTAL_DURATION_SECONDS, releaseCameraTracks, studentId, studentName, studentState, test.id, test.questions]);

  // Advance to next question (Forward-only; no previous navigation allowed!)
  const advanceToNextQuestion = useCallback(() => {
    if (isFinishedRef.current) return;

    const curQ = test.questions[currentQIndexRef.current];
    const timeSpentOnThisQ = Math.min(
      QUESTION_DURATION_SECONDS * 1000,
      Date.now() - questionStartTimeRef.current
    );

    // Update time spent on current question
    setAttempts((prev) => {
      const current = prev[curQ.id];
      if (!current) return prev;
      return {
        ...prev,
        [curQ.id]: {
          ...current,
          timeSpentMs: (current.timeSpentMs || 0) + timeSpentOnThisQ,
        },
      };
    });

    // Check if this was the last question (Question 30)
    if (currentQIndexRef.current >= test.questions.length - 1) {
      triggerCompletion();
    } else {
      const nextIndex = currentQIndexRef.current + 1;
      const nextQ = test.questions[nextIndex];

      setCurrentQIndex(nextIndex);
      currentQIndexRef.current = nextIndex;

      setAttempts((prev) => {
        const nextAttempt = prev[nextQ.id] || {
          questionId: nextQ.id,
          selectedOptionId: null,
          status: 'NOT_VISITED',
          timeSpentMs: 0,
          visitCount: 0,
          lastVisitedTimestamp: Date.now(),
        };

        const updated = transitionQuestionState(nextAttempt, { type: 'VISIT' });
        return {
          ...prev,
          [nextQ.id]: updated,
        };
      });
    }
  }, [QUESTION_DURATION_SECONDS, test.questions, triggerCompletion]);

  // 3. Dual Timer Core Loop: per-question countdown & drift-free wall-clock overall exam countdown (disabled in Speed Practice mode)
  useEffect(() => {
    if (isSpeedPracticeMode || examFinished || isFinishedRef.current || isDisqualified) return;

    questionStartTimeRef.current = Date.now();
    setQuestionSecondsLeft(QUESTION_DURATION_SECONDS);
    setQuestionMsLeft(QUESTION_DURATION_SECONDS * 1000);

    const timer = setInterval(() => {
      if (isFinishedRef.current) {
        clearInterval(timer);
        return;
      }

      const now = Date.now();
      const elapsedMs = now - questionStartTimeRef.current;
      const remainingMs = Math.max(0, QUESTION_DURATION_SECONDS * 1000 - elapsedMs);
      const remainingSec = Math.ceil(remainingMs / 1000);

      setQuestionMsLeft(remainingMs);
      setQuestionSecondsLeft(remainingSec);

      // Drift-free total exam countdown anchored to wall-clock deadline
      const nextTotalSec = Math.max(0, Math.ceil((examDeadlineMsRef.current - now) / 1000));
      totalSecondsRef.current = nextTotalSec;
      setTotalSecondsLeft(nextTotalSec);

      if (nextTotalSec <= 0) {
        clearInterval(timer);
        triggerCompletion();
        return;
      }

      // When per-question time expires -> AUTO-ADVANCE to next question!
      if (remainingMs <= 0) {
        clearInterval(timer);
        advanceToNextQuestion();
      }
    }, 100);

    timerIntervalRef.current = timer;

    return () => {
      clearInterval(timer);
    };
  }, [
    isSpeedPracticeMode,
    QUESTION_DURATION_SECONDS,
    currentQIndex,
    examFinished,
    isDisqualified,
    advanceToNextQuestion,
    triggerCompletion,
  ]);

  // Option selection handler
  const handleSelectOption = useCallback(
    (optionIndex: number) => {
      if (examFinished || isFinishedRef.current) return;
      const optId = `opt_${optionIndex}`;

      setAttempts((prev) => {
        const current = prev[currentQuestion.id] || {
          questionId: currentQuestion.id,
          selectedOptionId: null,
          status: 'NOT_ANSWERED',
          timeSpentMs: 0,
          visitCount: 1,
          lastVisitedTimestamp: Date.now(),
        };

        const updated = transitionQuestionState(current, {
          type: 'SELECT_OPTION',
          optionId: optId,
        });

        return {
          ...prev,
          [currentQuestion.id]: updated,
        };
      });
    },
    [currentQuestion.id, examFinished]
  );

  // Action: Save & Next
  const handleSaveAndNext = useCallback(() => {
    if (examFinished || isFinishedRef.current) return;

    setAttempts((prev) => {
      const current = prev[currentQuestion.id];
      if (!current) return prev;
      const updated = transitionQuestionState(current, { type: 'SAVE_AND_NEXT' });
      return {
        ...prev,
        [currentQuestion.id]: updated,
      };
    });

    advanceToNextQuestion();
  }, [advanceToNextQuestion, currentQuestion.id, examFinished]);

  // Action: Mark for Review & Next
  const handleMarkForReviewAndNext = useCallback(() => {
    if (examFinished || isFinishedRef.current) return;

    setAttempts((prev) => {
      const current = prev[currentQuestion.id];
      if (!current) return prev;
      const updated = transitionQuestionState(current, { type: 'MARK_FOR_REVIEW_AND_NEXT' });
      return {
        ...prev,
        [currentQuestion.id]: updated,
      };
    });

    advanceToNextQuestion();
  }, [advanceToNextQuestion, currentQuestion.id, examFinished]);

  // Action: Clear Response
  const handleClearResponse = useCallback(() => {
    if (examFinished || isFinishedRef.current) return;

    setAttempts((prev) => {
      const current = prev[currentQuestion.id];
      if (!current) return prev;
      const updated = transitionQuestionState(current, { type: 'CLEAR_RESPONSE' });
      return {
        ...prev,
        [currentQuestion.id]: updated,
      };
    });
  }, [currentQuestion.id, examFinished]);

  // Keyboard Hotkeys Integration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (examFinished || isFinishedRef.current || isDisqualified) return;

      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      // Alt + N -> Save & Next
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        handleSaveAndNext();
      }
      // Alt + M -> Mark for Review & Next
      else if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        handleMarkForReviewAndNext();
      }
      // Alt + C -> Clear Response
      else if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleClearResponse();
      }
      // 1, 2, 3, 4 -> Quick Option Select
      else if (!e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '1') {
          e.preventDefault();
          handleSelectOption(0);
        } else if (e.key === '2') {
          e.preventDefault();
          handleSelectOption(1);
        } else if (e.key === '3') {
          e.preventDefault();
          handleSelectOption(2);
        } else if (e.key === '4') {
          e.preventDefault();
          handleSelectOption(3);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [examFinished, handleClearResponse, handleMarkForReviewAndNext, handleSaveAndNext, handleSelectOption, isDisqualified]);

  const handleFeedbackSubmitAndProceed = () => {
    if (finalAttempt) {
      onCompleteExam(finalAttempt);
      onExit();
    }
  };

  // 1. If Exam is completed normally -> show FeedbackModal
  if (examFinished && finalAttempt && !isDisqualified) {
    return (
      <FeedbackModal
        attempt={finalAttempt}
        language={language}
        onSubmitAndProceed={handleFeedbackSubmitAndProceed}
      />
    );
  }

  // 2. If Disqualified
  if (isDisqualified) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center px-4 py-8 transition-colors">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-6 sm:p-8 text-center shadow-md space-y-5">
          <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl mx-auto flex items-center justify-center border border-rose-200 dark:border-rose-800">
            <XCircle className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-rose-900 dark:text-rose-200 tracking-tight">
              {t.examTerminatedTitle}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {t.examTerminatedDesc}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 text-left space-y-1.5">
            <div className="font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Violations Logged on Server:</span>
            </div>
            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-700 pb-1">
              • Anti-cheat triggered: {disqualificationReason || 'Tab switch / window blur detected after 1 violation warning.'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              Total Violations: {violationCount} · Score Penalty: -10.00 Marks
            </div>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer shadow-xs"
          >
            {t.exitToResults}
          </button>
        </div>
      </div>
    );
  }

  // Active question state
  const currentAttempt = attempts[currentQuestion.id] || {
    questionId: currentQuestion.id,
    selectedOptionId: null,
    status: 'NOT_VISITED',
    timeSpentMs: 0,
    visitCount: 1,
    lastVisitedTimestamp: Date.now(),
  };

  const questionIds = test.questions.map((q) => q.id);
  const paletteSummary = computePaletteSummary(questionIds, attempts);

  // Formatting clock time
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Color generator for palette status (Non-navigable for past questions!)
  const getStatusBadgeClass = (status: QuestionStatus, idx: number) => {
    const base = 'w-8 h-8 lg:w-9 lg:h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all relative';
    const isCurrent = idx === currentQIndex;
    const isPast = idx < currentQIndex;

    const ring = isCurrent
      ? 'ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-slate-900 scale-105 z-10 shadow-sm'
      : '';
    const cursor = isPast ? 'opacity-80 cursor-not-allowed' : isCurrent ? 'cursor-default' : 'opacity-60 cursor-not-allowed';

    switch (status) {
      case 'ANSWERED':
        return `${base} ${ring} ${cursor} bg-emerald-600 text-white`;
      case 'NOT_ANSWERED':
        return `${base} ${ring} ${cursor} bg-rose-600 text-white`;
      case 'MARKED_FOR_REVIEW':
        return `${base} ${ring} ${cursor} bg-purple-600 text-white`;
      case 'ANSWERED_AND_MARKED_FOR_REVIEW':
        return `${base} ${ring} ${cursor} bg-purple-700 text-white ring-1 ring-purple-300`;
      case 'NOT_VISITED':
      default:
        return `${base} ${ring} ${cursor} bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200`;
    }
  };

  // 10s progress percentage
  const questionProgressPercent = Math.max(0, Math.min(100, (questionMsLeft / (QUESTION_DURATION_SECONDS * 1000)) * 100));
  const proctoringMeta = getProctoringBadgeMeta(cameraStatus);

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-amber-500 selection:text-white transition-colors">
      {/* Top Banner if state was restored */}
      {restoredBanner && (
        <div className="shrink-0 bg-blue-600 dark:bg-blue-700 text-white text-xs py-1 px-4 text-center font-medium shadow-xs flex items-center justify-center gap-2 animate-smooth-in">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Resilient State Hydration: Restored active session from IndexedDB cache.</span>
        </div>
      )}

      {/* 1. CBT Header Bar with Dual Timers */}
      <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="hidden sm:flex w-8 h-8 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white items-center justify-center font-bold text-xs tracking-wider shrink-0">
              CBT
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                <span className="truncate">{test.title}</span>
                <span className="hidden sm:inline-block bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono border border-slate-200 dark:border-slate-700 shrink-0">
                  {isSpeedPracticeMode
                    ? `${totalQuestionsCount}Q · Speed Practice`
                    : `${totalQuestionsCount}Q • ${TOTAL_DURATION_SECONDS}s (${QUESTION_DURATION_SECONDS}s/Q)`}
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                <span className="hidden sm:inline">Candidate: </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{studentName}</span>
                <span className="hidden sm:inline"> ({studentId})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Proctoring Live Monitor Indicator */}
            <div
              data-testid="exam-proctoring-status-badge"
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${
                proctoringMeta.isLiveCamera
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
              title={proctoringMeta.sublabel}
            >
              {proctoringMeta.isLiveCamera ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{proctoringMeta.label}</span>
                </>
              ) : (
                <>
                  <CameraOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{proctoringMeta.label}</span>
                </>
              )}
            </div>

            {!isSpeedPracticeMode && (
              <>
                {/* PER-QUESTION 10s TIMER */}
                <div
                  data-testid="exam-question-timer"
                  className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-lg border font-mono tabular-nums font-bold text-[11px] sm:text-xs ${
                    questionSecondsLeft <= 3
                      ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 animate-pulse'
                      : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                  }`}
                  title={`Time remaining for this question (${QUESTION_DURATION_SECONDS}s auto-advance)`}
                >
                  <TimerIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Q:{questionSecondsLeft}s</span>
                </div>

                {/* TOTAL EXAM TIMER */}
                <div
                  data-testid="exam-total-timer"
                  className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-lg border font-mono tabular-nums font-bold text-[11px] sm:text-xs ${
                    totalSecondsLeft < 60
                      ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 animate-pulse'
                      : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                  title={`Total examination time remaining (${TOTAL_DURATION_SECONDS}s)`}
                >
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>
                    <span className="hidden sm:inline">Total: </span>
                    {formatTime(totalSecondsLeft)}
                  </span>
                </div>
              </>
            )}

            {/* Mobile Palette Drawer Trigger Button */}
            <button
              type="button"
              onClick={() => setIsMobilePaletteOpen(true)}
              aria-label="Open question palette"
              className="md:hidden flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold cursor-pointer"
            >
              <Grid className="w-3 h-3" />
              <span>{currentQIndex + 1}/{totalQuestionsCount}</span>
            </button>

            {/* Submit Button (Always visible on both mobile and desktop) */}
            <button
              type="button"
              onClick={() => setShowSubmitConfirmModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Submit</span>
            </button>
          </div>
        </div>

        {/* 10s Per-Question Progress Countdown Line */}
        {!isSpeedPracticeMode && (
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ease-linear ${
                questionSecondsLeft <= 3 ? 'bg-rose-500' : 'bg-amber-500'
              }`}
              style={{ width: `${questionProgressPercent}%` }}
            />
          </div>
        )}

        {/* Section Navigation Header */}
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 py-1 text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider pr-0.5">
              Section:
            </span>
            <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] sm:text-xs bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap">
              {currentQuestion.subject}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium shrink-0">
            {cameraStatus === 'active' && cameraStream ? (
              <div className="md:hidden flex items-center gap-1.5 bg-slate-900 text-white px-2 py-0.5 rounded border border-emerald-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <video
                  ref={mobileVideoRef}
                  autoPlay
                  muted
                  playsInline
                  onLoadedMetadata={(e) => {
                    void e.currentTarget.play().catch(() => {});
                  }}
                  className="w-6 h-4 rounded-xs object-cover scale-x-[-1]"
                />
                <span className="text-[10px] font-semibold">Camera On</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void handleEnableCameraInExam()}
                className="md:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold cursor-pointer"
              >
                <Camera className="w-3 h-3" />
                <span>Enable Camera</span>
              </button>
            )}
            <Lock className="w-3 h-3 text-slate-400 hidden sm:inline" />
            <span className="hidden sm:inline">Strict Forward-Only • No Previous Navigation</span>
          </div>
        </div>
      </header>

      {/* Anti-Cheat Floating Warning Toast */}
      {warningToast && warningToast.show && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs font-semibold animate-smooth-in border-b border-amber-600 z-50 sticky top-[60px]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
            <span>{warningToast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setWarningToast(null)}
            className="px-2.5 py-1 bg-slate-950 text-white rounded text-[11px] font-bold hover:bg-slate-900 transition-colors cursor-pointer shrink-0"
          >
            I Acknowledge
          </button>
        </div>
      )}

      {/* 2. Main CBT Split-Pane Container (Fits 100% inside remaining viewport height) */}
      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto p-2.5 sm:p-4 flex flex-col md:flex-row gap-3 sm:gap-4 overflow-hidden">
        {/* LEFT PANE: Question Prompt, Options & Pinned Forward Navigation */}
        <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden transition-colors">
          {/* Question Metadata Row */}
          <div className="shrink-0 px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base shrink-0">
                Question {currentQIndex + 1}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">of {test.questions.length}</span>
              <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded font-medium truncate max-w-[160px] sm:max-w-xs">
                {currentQuestion.topic}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs shrink-0">
              <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded font-semibold text-[10px] sm:text-[11px]">
                +1.00
              </span>
              <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded font-semibold text-[10px] sm:text-[11px]">
                -0.25
              </span>
            </div>
          </div>

          {/* Question Prompt & Options (Inner scroll only if text is unusually long; footer never pushes off-screen) */}
          <div className="p-3.5 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-3.5 sm:space-y-4">
            <div className="text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-relaxed font-normal">
              <MathRenderer content={currentQuestion.text} />
            </div>

            {/* Options List */}
            <div className="space-y-2 sm:space-y-2.5">
              {currentQuestion.options.map((optText, idx) => {
                const optId = `opt_${idx}`;
                const isSelected = currentAttempt.selectedOptionId === optId;
                const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-2.5 sm:p-3.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer relative ${
                      isSelected
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/60 ring-1 ring-blue-500 text-blue-950 dark:text-blue-100 font-medium'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {/* Circle Radio with Hotkey hint */}
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700'
                      }`}
                    >
                      {optionLabel}
                    </div>

                    <div className="flex-1 text-xs sm:text-sm pt-0.5 leading-normal">
                      <MathRenderer content={optText} inline={true} />
                    </div>

                    {/* Hotkey Badge [1], [2], [3], [4] */}
                    <span className="hidden sm:inline-block text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">
                      [{idx + 1}]
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Action Footer (Pinned to bottom of Left Pane; never scrolls below screen) */}
          <div className="shrink-0 px-3 py-2.5 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleClearResponse}
                disabled={currentAttempt.selectedOptionId === null}
                className="px-2.5 sm:px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:pointer-events-none border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
                <span className="hidden sm:inline text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">Alt+C</span>
              </button>

              <button
                type="button"
                onClick={handleMarkForReviewAndNext}
                className="px-2.5 sm:px-3.5 py-2 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
              >
                <Bookmark className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                <span className="sm:hidden">Review</span>
                <span className="hidden sm:inline">Mark Review &amp; Next</span>
                <span className="hidden lg:inline text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-100/60 dark:bg-purple-900/50 px-1 py-0.5 rounded">Alt+M</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleSaveAndNext}
                className="px-3.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs whitespace-nowrap"
              >
                <span>Save &amp; Next</span>
                <span className="hidden lg:inline text-[10px] font-mono text-blue-200 bg-blue-700/80 px-1 py-0.5 rounded">Alt+N</span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANE (Desktop): Compact Proctoring Feed, Question Palette & Summary Sidebar */}
        <aside className="hidden md:flex flex-col w-72 lg:w-80 xl:w-96 min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-3 space-y-2.5 overflow-hidden transition-colors">
          {/* Live Camera Proctoring Monitor Card */}
          <div
            data-testid="exam-camera-monitor-card"
            className="shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 text-white"
          >
            <div className="px-2.5 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <span
                  className={`w-2 h-2 rounded-full ${
                    cameraStatus === 'active'
                      ? 'bg-rose-500 animate-pulse'
                      : cameraStatus === 'interrupted'
                      ? 'bg-amber-500'
                      : 'bg-slate-500'
                  }`}
                />
                <span>{proctoringMeta.label}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Anti-Cheat</span>
            </div>

            {cameraStatus === 'active' && cameraStream ? (
              <div className="relative h-28 lg:h-32 bg-black">
                <video
                  ref={desktopVideoRef}
                  autoPlay
                  muted
                  playsInline
                  onLoadedMetadata={(e) => {
                    void e.currentTarget.play().catch(() => {});
                  }}
                  data-testid="exam-live-camera-video"
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between text-[10px] font-mono bg-slate-950/75 px-2 py-0.5 rounded text-emerald-300 border border-emerald-500/30">
                  <span>REC · Cheating Guard</span>
                  <span>{violationCount}/2 Warnings</span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 space-y-1.5 text-[11px] text-slate-300">
                <div className="text-slate-400 leading-snug">
                  {cameraErrorMsg || 'Tab-switch guard active. Enable camera for live video proctoring.'}
                </div>
                <button
                  type="button"
                  onClick={() => void handleEnableCameraInExam()}
                  className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Enable Camera Monitor</span>
                </button>
              </div>
            )}
          </div>

          {/* Candidate Card */}
          <div className="shrink-0 px-2.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{studentName}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">{studentId}</div>
            </div>
            <div className="text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded shrink-0">
              {studentState}
            </div>
          </div>

          {/* Palette Summary Legend (CBT 5 States) */}
          <div className="shrink-0 grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="w-5 h-5 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                {paletteSummary.answered}
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-medium truncate">Answered</span>
            </div>

            <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="w-5 h-5 rounded bg-rose-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                {paletteSummary.notAnswered}
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-medium truncate">Not Answered</span>
            </div>

            <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                {paletteSummary.notVisited}
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-medium truncate">Not Visited</span>
            </div>

            <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="w-5 h-5 rounded bg-purple-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                {paletteSummary.markedForReview}
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-medium truncate">Marked Review</span>
            </div>
          </div>

          {/* 30 Questions Grid (scrolls cleanly inside sidebar if viewport height is short) */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5">
            <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center justify-between">
              <span>Question Palette</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                {paletteSummary.answered} of {totalQuestionsCount} Answered
              </span>
            </div>

            <div className="grid grid-cols-5 lg:grid-cols-6 gap-1.5 pt-1">
              {test.questions.map((q, idx) => {
                const att = attempts[q.id];
                const status: QuestionStatus = att ? att.status : 'NOT_VISITED';

                return (
                  <div
                    key={q.id}
                    className={getStatusBadgeClass(status, idx)}
                    title={`Question ${idx + 1} (${status})${idx < currentQIndex ? ' • Completed' : ''}`}
                  >
                    <span>{idx + 1}</span>
                    {status === 'ANSWERED_AND_MARKED_FOR_REVIEW' && (
                      <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-white dark:ring-slate-900"></span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hotkey Helper Footer */}
          <div className="shrink-0 p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
            <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Keyboard className="w-3 h-3" />
              <span>Keyboard Shortcuts</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              <div><kbd className="font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1 rounded text-slate-700 dark:text-slate-300">1-4</kbd> Select</div>
              <div><kbd className="font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1 rounded text-slate-700 dark:text-slate-300">Alt+N</kbd> Save &amp; Next</div>
              <div><kbd className="font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1 rounded text-slate-700 dark:text-slate-300">Alt+M</kbd> Review</div>
              <div><kbd className="font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1 rounded text-slate-700 dark:text-slate-300">Alt+C</kbd> Clear</div>
            </div>
          </div>
        </aside>
      </main>

      {/* 3. Mobile Slide-Up Bottom Drawer / Sheet (< 768px) */}
      {isMobilePaletteOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobilePaletteOpen(false)}
          />

          <div className="relative bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl p-5 max-h-[85vh] flex flex-col space-y-4 animate-smooth-in border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Question Progress</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Question {currentQIndex + 1} of {totalQuestionsCount} • Strict Forward-Only
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobilePaletteOpen(false)}
                aria-label="Close question palette"
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Question Grid */}
            <div className="overflow-y-auto max-h-[50vh] py-2">
              <div className="grid grid-cols-6 gap-2">
                {test.questions.map((q, idx) => {
                  const att = attempts[q.id];
                  const status: QuestionStatus = att ? att.status : 'NOT_VISITED';

                  return (
                    <div
                      key={q.id}
                      className={getStatusBadgeClass(status, idx)}
                    >
                      <span>{idx + 1}</span>
                      {status === 'ANSWERED_AND_MARKED_FOR_REVIEW' && (
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-white dark:ring-slate-900"></span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsMobilePaletteOpen(false);
                setShowSubmitConfirmModal(true);
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors cursor-pointer shadow-xs"
            >
              Submit Entire Examination
            </button>
          </div>
        </div>
      )}

      {/* 4. Submit Confirmation Dialog */}
      {showSubmitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-smooth-in text-slate-900 dark:text-slate-100">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Submit Examination?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to finalize your exam session? Your answers will be verified against the official answer key vault.
            </p>

            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Attempted Questions:</span>
                <div className="font-bold text-emerald-700 dark:text-emerald-400 text-base">{paletteSummary.answered + paletteSummary.answeredAndMarkedForReview}</div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Unattempted:</span>
                <div className="font-bold text-slate-700 dark:text-slate-200 text-base">{paletteSummary.notAnswered + paletteSummary.notVisited}</div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Marked for Review:</span>
                <div className="font-bold text-purple-700 dark:text-purple-400 text-base">{paletteSummary.markedForReview}</div>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">
                  {isSpeedPracticeMode ? 'Mode:' : 'Time Left:'}
                </span>
                <div className="font-bold text-slate-800 dark:text-slate-100 text-base">
                  {isSpeedPracticeMode ? 'Untimed Practice' : formatTime(totalSecondsLeft)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Return to Test
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitConfirmModal(false);
                  triggerCompletion();
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
