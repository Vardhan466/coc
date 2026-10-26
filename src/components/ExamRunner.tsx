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
  ArrowRight,
  XCircle,
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

  const QUESTION_DURATION_SECONDS = test.questionDurationSeconds || 10;
  const TOTAL_DURATION_SECONDS = test.totalDurationSeconds || 300; // 5 min (300 sec)

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

  const examStartTimeRef = useRef<string>(new Date().toISOString());
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

      const elapsedMs = Date.now() - questionStartTimeRef.current;
      const remainingMs = Math.max(0, QUESTION_DURATION_SECONDS * 1000 - elapsedMs);
      const remainingSec = Math.ceil(remainingMs / 1000);

      setMillisecondTick(remainingMs);
      setQuestionSecondsLeft(remainingSec);

      setTotalSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerCompletion();
          return 0;
        }
        return prev - 0.1;
      });

      if (remainingMs <= 0) {
        clearInterval(timer);
        advanceQuestion();
      }
    }, 100);

    timerIntervalRef.current = timer;

    return () => {
      clearInterval(timer);
    };
  }, [currentQIndex, examFinished, isDisqualified]);

  const advanceQuestion = () => {
    if (isFinishedRef.current) return;

    const timeSpentMs = Math.min(
      QUESTION_DURATION_SECONDS * 1000,
      Date.now() - questionStartTimeRef.current
    );
    const timeSpentSec = Number((timeSpentMs / 1000).toFixed(1));

    const answerRecord: AttemptAnswer = {
      questionId: currentQuestion.id,
      questionIndex: safeQIndex,
      selectedOption: selectedOption,
      timeSpentSeconds: timeSpentSec,
      isCorrect: selectedOption !== null ? selectedOption === currentQuestion.correctIndex : false,
      timestamp: new Date().toISOString(),
    };

    setAnswers((prev) => {
      const updated = [...prev, answerRecord];

      if (safeQIndex >= test.questions.length - 1) {
        triggerCompletion(updated);
      } else {
        setCurrentQIndex((prevIndex) => prevIndex + 1);
      }
      return updated;
    });
  };

  const handleSelectOption = (optIndex: number) => {
    if (isOptionLocked || examFinished || isFinishedRef.current) return;
    setSelectedOption(optIndex);
    setIsOptionLocked(true);
  };

  const triggerCompletion = (latestAnswers?: AttemptAnswer[]) => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    setExamFinished(true);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    const recordedAnswers = latestAnswers || answers;
    const answeredCount = recordedAnswers.filter((a) => a.selectedOption !== null).length;
    const correctCount = recordedAnswers.filter((a) => a.isCorrect).length;
    const incorrectCount = recordedAnswers.filter(
      (a) => a.selectedOption !== null && !a.isCorrect
    ).length;
    const unattemptedCount = test.totalQuestions - answeredCount;

    const totalTimeSec = TOTAL_DURATION_SECONDS - Math.max(0, Math.floor(totalSecondsLeft));
    const rawScore = calculateScore(correctCount, incorrectCount);

    const attempt: Attempt = {
      id: `att_${Date.now()}`,
      attemptId: `att_${Date.now()}`,
      testId: test.id,
      studentId,
      studentName,
      studentState,
      startedAt: examStartTimeRef.current,
      submittedAt: new Date().toISOString(),
      score: rawScore,
      correctCount,
      incorrectCount,
      unattemptedCount,
      timeTakenSeconds: Math.max(1, totalTimeSec),
      totalTimeSeconds: Math.max(1, totalTimeSec),
      answers: recordedAnswers,
      isDisqualified: false,
    };

    setFinalAttempt(attempt);
  };

  const finishExamAsDisqualified = (events: IntegrityEvent[]) => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    setExamFinished(true);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    const attempt: Attempt = {
      id: `att_disq_${Date.now()}`,
      attemptId: `att_disq_${Date.now()}`,
      testId: test.id,
      studentId,
      studentName,
      studentState,
      startedAt: examStartTimeRef.current,
      submittedAt: new Date().toISOString(),
      score: -10,
      correctCount: 0,
      incorrectCount: test.totalQuestions,
      unattemptedCount: 0,
      timeTakenSeconds: TOTAL_DURATION_SECONDS - Math.floor(totalSecondsLeft),
      totalTimeSeconds: TOTAL_DURATION_SECONDS - Math.floor(totalSecondsLeft),
      answers: [],
      isDisqualified: true,
      disqualificationReason: 'Repeated tab switching / application backgrounding detected.',
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
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-center items-center px-4 py-8">
        <div className="w-full max-w-md bg-white border border-rose-200 rounded-2xl p-6 sm:p-8 text-center shadow-md space-y-5">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-xl mx-auto flex items-center justify-center border border-rose-200">
            <XCircle className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-rose-900 tracking-tight">
              {t.examTerminatedTitle}
            </h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {t.examTerminatedDesc}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 text-left space-y-1.5">
            <div className="font-semibold text-rose-800 flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Violations Logged on Server:</span>
            </div>
            {integrityLogs.map((log, i) => (
              <div key={i} className="text-[11px] font-mono text-slate-600">
                • {log.type}: Q{log.questionIndex + 1} ({new Date(log.timestamp).toLocaleTimeString()})
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              if (finalAttempt) onCompleteExam(finalAttempt);
              onExit();
            }}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl text-xs transition-colors shadow-xs"
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

  const isUrgent = questionSecondsLeft <= 4;
  const totalProgressPercent = ((TOTAL_DURATION_SECONDS - totalSecondsLeft) / TOTAL_DURATION_SECONDS) * 100;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between select-none relative font-sans">
      {/* Gentle Warning Modal on 1st Violation */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-amber-300 rounded-2xl max-w-md w-full p-6 text-center text-slate-900 shadow-xl space-y-4">
            <div className="w-12 h-12 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {t.tabSwitchWarningTitle}
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {t.tabSwitchWarningDesc}
              </p>
            </div>

            <button
              type="button"
              onClick={dismissWarning}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-xs"
            >
              {t.iUnderstandContinue}
            </button>
          </div>
        </div>
      )}

      {/* Top Total Progress Line */}
      <div className="w-full bg-slate-200 h-1 relative overflow-hidden">
        <div
          className="h-full bg-slate-900 transition-all duration-200 ease-linear"
          style={{ width: `${Math.min(100, totalProgressPercent)}%` }}
        />
      </div>

      {/* Reconnecting / Offline Simulation Banner */}
      {isOfflineSimulated && (
        <div className="bg-amber-600 text-white text-xs font-semibold py-1 px-4 flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5" />
          <span>{t.reconnecting}</span>
        </div>
      )}

      {/* Clean Exam Header */}
      <header className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold px-2.5 py-1 rounded-md">
            {t.qNumber} {safeQIndex + 1} / {test.questions.length}
          </div>
          <div className="hidden sm:block text-xs text-slate-600">
            <span className="font-semibold text-slate-900">{currentQuestion.subject}</span> · {currentQuestion.topic}
          </div>
        </div>

        {/* Center: 12-second countdown timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 bg-slate-50">
            <Clock className={`w-4 h-4 ${isUrgent ? 'text-rose-600' : 'text-slate-700'}`} />
            <span
              className={`font-mono font-bold text-sm tabular-nums ${
                isUrgent ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {questionSecondsLeft}{t.secLeft}
            </span>
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Total Clock
            </div>
            <div className="text-xs font-mono font-bold text-slate-800 tabular-nums">
              {Math.floor(totalSecondsLeft / 60)}:
              {String(Math.floor(totalSecondsLeft % 60)).padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Right: Integrity status & Network simulator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">
            <ShieldAlert className={`w-3.5 h-3.5 ${violationCount > 0 ? 'text-amber-600' : 'text-slate-500'}`} />
            <span>{violationCount}/2</span>
          </div>

          <button
            type="button"
            onClick={() => setIsOfflineSimulated(!isOfflineSimulated)}
            title="Simulate 4G network reconnection"
            className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          >
            {isOfflineSimulated ? <WifiOff className="w-3.5 h-3.5 text-rose-600" /> : <Wifi className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Main Question Body */}
      <main className="max-w-2xl w-full mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
        <div className="sm:hidden mb-2">
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {currentQuestion.subject}
          </span>
        </div>

        <div className="mb-6">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-relaxed">
            {questionText}
          </h1>
        </div>

        {/* 4 Full-Width Option Cards */}
        <div className="space-y-3">
          {currentQuestion.options.map((_, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx);
            const isSelected = selectedOption === optIdx;
            const text = getOptionText(optIdx);

            return (
              <button
                key={optIdx}
                type="button"
                onClick={() => handleSelectOption(optIdx)}
                disabled={isOptionLocked}
                className={`w-full min-h-[50px] p-3.5 sm:p-4 rounded-xl text-left transition-colors border flex items-center justify-between text-sm sm:text-base font-medium ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-xs'
                    : isOptionLocked
                    ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-70'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isSelected
                        ? 'bg-white text-slate-900'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {letter}
                  </span>
                  <span>{text}</span>
                </div>

                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-white shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>

        {/* Option Locked Status Indicator */}
        {isOptionLocked && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-700 bg-slate-100 border border-slate-200 px-3.5 py-2.5 rounded-lg">
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{t.optionLocked} Advancing in {questionSecondsLeft}s...</span>
            </div>
            <button
              type="button"
              onClick={advanceQuestion}
              className="text-white bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded text-[11px] font-semibold"
            >
              {t.skipWait}
            </button>
          </div>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="px-4 py-3 bg-white border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span>{t.serverClockActive}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => triggerCompletion()}
            className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1 rounded-md transition-colors"
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
