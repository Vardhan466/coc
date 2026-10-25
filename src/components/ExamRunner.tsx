import React, { useState, useEffect, useRef } from 'react';
import { Attempt, AttemptAnswer, LanguageCode, Question, TestPaper } from '../types';
import { calculateScore, calculateNegativeMarkLoss } from '../utils/scoring';
import { getTranslation } from '../utils/i18n';
import { useExamIntegrity, IntegrityEvent } from '../hooks/useExamIntegrity';
import { FeedbackModal } from './FeedbackModal';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Wifi,
  WifiOff,
  Flame,
  Award,
  ArrowRight,
  HelpCircle,
  XCircle,
  Timer,
} from 'lucide-react';

interface ExamRunnerProps {
  test: TestPaper;
  studentId: string;
  studentName: string;
  studentState: string;
  language: LanguageCode;
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
  onCompleteExam,
  onExit,
  onLogAudit,
}) => {
  const t = getTranslation(language);

  const QUESTION_DURATION_SECONDS = 12;
  const TOTAL_DURATION_SECONDS = 320; // 5 min 20 sec

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<AttemptAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isOptionLocked, setIsOptionLocked] = useState(false);
  const [examStartedAt] = useState<string>(new Date().toISOString());

  const [totalSecondsLeft, setTotalSecondsLeft] = useState(TOTAL_DURATION_SECONDS);
  const [questionSecondsLeft, setQuestionSecondsLeft] = useState(QUESTION_DURATION_SECONDS);
  const [millisecondTick, setMillisecondTick] = useState(QUESTION_DURATION_SECONDS * 1000);

  const [isOfflineSimulated, setIsOfflineSimulated] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [finalAttempt, setFinalAttempt] = useState<Attempt | null>(null);

  const questionStartTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<any>(null);
  const isFinishedRef = useRef(false);

  // Integrity Hook (Anti-cheat & Tab switch detection)
  const {
    violationCount,
    showWarningModal,
    isDisqualified,
    integrityLogs,
    dismissWarning,
  } = useExamIntegrity({
    isActive: !examFinished && !isFinishedRef.current,
    currentQuestionIndex: currentQIndex,
    onFirstViolation: () => {},
    onDisqualify: (events) => {
      finishExamAsDisqualified(events);
    },
    onLogAudit,
  });

  // Safe fallback to prevent out-of-bounds access
  const safeQIndex = Math.min(currentQIndex, Math.max(0, test.questions.length - 1));
  const currentQuestion: Question = test.questions[safeQIndex] || test.questions[0];

  // Core execution loop
  useEffect(() => {
    if (examFinished || isFinishedRef.current || isDisqualified) return;

    questionStartTimeRef.current = Date.now();
    setQuestionSecondsLeft(QUESTION_DURATION_SECONDS);
    setMillisecondTick(QUESTION_DURATION_SECONDS * 1000);
    setSelectedOption(null);
    setIsOptionLocked(false);

    const timer = setInterval(() => {
      if (isFinishedRef.current) {
        clearInterval(timer);
        return;
      }

      const now = Date.now();
      const elapsedMs = now - questionStartTimeRef.current;
      const msLeft = Math.max(0, QUESTION_DURATION_SECONDS * 1000 - elapsedMs);
      const secLeft = Math.ceil(msLeft / 1000);

      setMillisecondTick(msLeft);
      setQuestionSecondsLeft(secLeft);

      setTotalSecondsLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(timer);
          triggerCompletion();
          return 0;
        }
        return Math.max(0, prev - 0.1);
      });

      if (msLeft <= 0) {
        advanceQuestion();
      }
    }, 100);

    timerIntervalRef.current = timer;

    return () => clearInterval(timer);
  }, [currentQIndex, examFinished, isDisqualified]);

  const advanceQuestion = () => {
    if (isFinishedRef.current) return;

    const timeSpent = Math.min(
      QUESTION_DURATION_SECONDS,
      Number(((Date.now() - questionStartTimeRef.current) / 1000).toFixed(1))
    );

    const isCorrect = selectedOption !== null && selectedOption === currentQuestion.correctIndex;

    const answerRecord: AttemptAnswer = {
      questionId: currentQuestion.id,
      questionIndex: currentQIndex,
      selectedOptionIndex: selectedOption,
      timeSpentSeconds: timeSpent,
      submittedAt: new Date().toISOString(),
      isCorrect,
    };

    const nextAnswers = [...answers, answerRecord];
    setAnswers(nextAnswers);

    // If we reached the end of the test (40 questions), finish smoothly!
    if (currentQIndex + 1 >= test.questions.length) {
      triggerCompletion(nextAnswers);
    } else {
      setCurrentQIndex((prev) => prev + 1);
    }
  };

  const handleSelectOption = (index: number) => {
    if (isOptionLocked || examFinished || isFinishedRef.current || isDisqualified) return;
    setSelectedOption(index);
    setIsOptionLocked(true);
  };

  const triggerCompletion = (completedAnswers = answers) => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    clearInterval(timerIntervalRef.current);
    setExamFinished(true);

    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;

    completedAnswers.forEach((ans) => {
      if (ans.selectedOptionIndex === null) {
        unattempted++;
      } else if (ans.isCorrect) {
        correct++;
      } else {
        incorrect++;
      }
    });

    const unreachedCount = Math.max(0, test.questions.length - completedAnswers.length);
    unattempted += unreachedCount;

    const finalScore = calculateScore(correct, incorrect);
    const timeTaken = Math.min(TOTAL_DURATION_SECONDS, Math.round(TOTAL_DURATION_SECONDS - totalSecondsLeft));

    const attempt: Attempt = {
      id: `att_${Date.now()}`,
      testId: test.id,
      studentId,
      studentName,
      studentState,
      startedAt: examStartedAt,
      completedAt: new Date().toISOString(),
      answers: completedAnswers,
      score: finalScore,
      correctCount: correct,
      incorrectCount: incorrect,
      unattemptedCount: unattempted,
      timeTakenSeconds: timeTaken || 310,
      integrityFlags: {
        tabSwitches: violationCount,
        focusLosses: integrityLogs.length,
      },
    };

    setFinalAttempt(attempt);
  };

  const finishExamAsDisqualified = (events: IntegrityEvent[]) => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    clearInterval(timerIntervalRef.current);
    setExamFinished(true);

    const attempt: Attempt = {
      id: `att_disq_${Date.now()}`,
      testId: test.id,
      studentId,
      studentName,
      studentState,
      startedAt: examStartedAt,
      completedAt: new Date().toISOString(),
      answers,
      score: -5.0,
      correctCount: 0,
      incorrectCount: 0,
      unattemptedCount: test.questions.length,
      timeTakenSeconds: Math.round(TOTAL_DURATION_SECONDS - totalSecondsLeft) || 12,
      integrityFlags: {
        tabSwitches: events.filter((e) => e.type === 'tab_switch').length,
        focusLosses: events.length,
      },
    };

    setFinalAttempt(attempt);
  };

  const handleFeedbackSubmitAndProceed = () => {
    if (finalAttempt) {
      onCompleteExam(finalAttempt);
      onExit();
    }
  };

  // 1. If Exam is completed normally -> Directly show FeedbackModal without UI freezing!
  if (examFinished && finalAttempt && !isDisqualified) {
    return (
      <FeedbackModal
        attempt={finalAttempt}
        language={language}
        onSubmitAndProceed={handleFeedbackSubmitAndProceed}
      />
    );
  }

  // 2. If Disqualified due to repeated tab switching
  if (isDisqualified) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 py-8">
        <div className="w-full max-w-md bg-slate-900 border-2 border-rose-600 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-5 animate-in zoom-in-95">
          <div className="w-16 h-16 bg-rose-600/20 border-2 border-rose-500 text-rose-500 rounded-2xl mx-auto flex items-center justify-center">
            <XCircle className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-rose-400 tracking-tight">
              {t.examTerminatedTitle}
            </h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {t.examTerminatedDesc}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 text-left space-y-1.5">
            <div className="font-bold text-rose-300 flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Violations Logged on Server:</span>
            </div>
            {integrityLogs.map((log, i) => (
              <div key={i} className="text-[11px] font-mono text-slate-300">
                • {log.type}: Q{log.questionIndex + 1} ({new Date(log.timestamp).toLocaleTimeString()})
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              if (finalAttempt) onCompleteExam(finalAttempt);
              onExit();
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl text-xs transition-colors"
          >
            {t.exitToResults}
          </button>
        </div>
      </div>
    );
  }

  // Localized question and options text
  const questionText =
    language === 'te' && currentQuestion?.textTe
      ? currentQuestion.textTe
      : language === 'hi' && currentQuestion?.textHi
      ? currentQuestion.textHi
      : currentQuestion?.text;

  const getOptionText = (optIdx: number) => {
    if (language === 'te' && currentQuestion?.optionsTe?.[optIdx]) {
      return currentQuestion.optionsTe[optIdx];
    }
    if (language === 'hi' && currentQuestion?.optionsHi?.[optIdx]) {
      return currentQuestion.optionsHi[optIdx];
    }
    return currentQuestion?.options?.[optIdx] ?? '';
  };

  // 12-second circular timer math
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (millisecondTick / (QUESTION_DURATION_SECONDS * 1000)) * circumference;
  const isUrgent = questionSecondsLeft <= 4;

  const totalProgressPercent = ((TOTAL_DURATION_SECONDS - totalSecondsLeft) / TOTAL_DURATION_SECONDS) * 100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between select-none relative animate-in fade-in duration-200">
      {/* Gentle Warning Modal on 1st Violation */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl max-w-md w-full p-6 text-center text-white shadow-2xl space-y-4">
            <div className="w-14 h-14 bg-amber-500/20 border border-amber-500/40 text-amber-400 rounded-2xl mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-amber-400">
                {t.tabSwitchWarningTitle}
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {t.tabSwitchWarningDesc}
              </p>
            </div>

            <button
              onClick={dismissWarning}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3 rounded-xl text-xs transition-all shadow-md active:scale-98"
            >
              {t.iUnderstandContinue}
            </button>
          </div>
        </div>
      )}

      {/* Top 320s (5m 20s) Linear Progress Bar */}
      <div className="w-full bg-slate-900 h-1.5 relative overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-200 ease-linear"
          style={{ width: `${Math.min(100, totalProgressPercent)}%` }}
        />
      </div>

      {/* Reconnecting / Offline Simulation Banner */}
      {isOfflineSimulated && (
        <div className="bg-amber-600 text-white text-xs font-semibold py-1.5 px-4 flex items-center justify-center gap-2 animate-pulse">
          <WifiOff className="w-3.5 h-3.5" />
          <span>{t.reconnecting}</span>
        </div>
      )}

      {/* Exam Header */}
      <header className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black px-2.5 py-1 rounded-md">
            {t.qNumber} {safeQIndex + 1} / {test.questions.length}
          </div>
          <div className="hidden sm:block text-xs text-slate-400">
            <span className="font-semibold text-slate-300">{currentQuestion.subject}</span> • {currentQuestion.topic}
          </div>
        </div>

        {/* Center: Circular 12-second countdown timer */}
        <div className="flex items-center gap-2">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-12 h-12 -rotate-90">
              <circle
                cx="24"
                cy="24"
                r={radius}
                stroke="#1e293b"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="24"
                cy="24"
                r={radius}
                stroke={isUrgent ? '#ef4444' : '#f59e0b'}
                strokeWidth="4"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`transition-all duration-100 ease-linear ${isUrgent ? 'animate-pulse' : ''}`}
              />
            </svg>
            <span
              className={`absolute font-mono font-black text-sm ${
                isUrgent ? 'text-rose-400 scale-110' : 'text-amber-400'
              } transition-all`}
            >
              {questionSecondsLeft}{t.secLeft}
            </span>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              {t.totalTime} (5m 20s)
            </div>
            <div className="text-xs font-mono font-bold text-slate-200">
              {Math.floor(totalSecondsLeft / 60)}:
              {String(Math.floor(totalSecondsLeft % 60)).padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Right: Integrity status & Network simulator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded-md">
            <ShieldAlert className={`w-3.5 h-3.5 ${violationCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span>{violationCount}/2</span>
          </div>

          <button
            onClick={() => setIsOfflineSimulated(!isOfflineSimulated)}
            title="Simulate 4G network reconnection"
            className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 text-xs"
          >
            {isOfflineSimulated ? <WifiOff className="w-3.5 h-3.5 text-rose-400" /> : <Wifi className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Question Body */}
      <main className="max-w-2xl w-full mx-auto px-4 py-6 flex-1 flex flex-col justify-center">
        <div className="sm:hidden mb-2">
          <span className="text-[11px] font-semibold text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
            {currentQuestion.subject}
          </span>
        </div>

        <div className="mb-6">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white leading-relaxed">
            {questionText}
          </h1>
        </div>

        {/* 4 Full-Width Option Cards with 48px tap targets */}
        <div className="space-y-3">
          {currentQuestion.options.map((_, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx);
            const isSelected = selectedOption === optIdx;
            const text = getOptionText(optIdx);

            return (
              <button
                key={optIdx}
                onClick={() => handleSelectOption(optIdx)}
                disabled={isOptionLocked}
                className={`w-full min-h-[52px] p-3.5 sm:p-4 rounded-xl text-left transition-all border flex items-center justify-between text-sm sm:text-base font-medium active:scale-[0.99] ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/50'
                    : isOptionLocked
                    ? 'bg-slate-900/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                      isSelected
                        ? 'bg-slate-950 text-amber-400'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {letter}
                  </span>
                  <span>{text}</span>
                </div>

                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-slate-950 fill-current shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>

        {/* Option Locked Status Indicator */}
        {isOptionLocked && (
          <div className="mt-4 flex items-center justify-between text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t.optionLocked} {questionSecondsLeft}s...</span>
            </div>
            <button
              onClick={advanceQuestion}
              className="text-white bg-amber-600 hover:bg-amber-500 px-2.5 py-1 rounded text-[11px] font-bold"
            >
              {t.skipWait}
            </button>
          </div>
        )}
      </main>

      {/* Exam Screen Footer */}
      <footer className="px-4 py-3 bg-slate-900/40 border-t border-slate-800/80 text-xs text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{t.serverClockActive}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => triggerCompletion()}
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-lg transition-colors cursor-pointer"
          >
            Submit Paper
          </button>
          <div className="text-[11px] text-slate-400 hidden sm:block">
            {t.noBackButton}
          </div>
        </div>
      </footer>
    </div>
  );
};
