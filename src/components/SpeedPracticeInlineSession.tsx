import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Target,
  XCircle,
} from 'lucide-react';
import type { Attempt, AttemptAnswer, SubjectTag, UserProfile } from '../types';
import type {
  AIMCQQuestion,
  ExamCategory,
  SpeedPracticeSessionRecord,
} from '../types/aiSystem';
import { MathRenderer } from './MathRenderer';
import { addMistakesFromAttempt } from '../utils/errorBookStorage';

interface SpeedPracticeInlineSessionProps {
  isOpen: boolean;
  onClose: () => void;
  questions: AIMCQQuestion[];
  filters: {
    examCategory: ExamCategory | 'all';
    subject: SubjectTag | 'all';
    difficulty: 'all' | 'easy' | 'medium' | 'hard';
    poolFilter: 'all' | 'incorrect' | 'unattempted';
  };
  userId?: string;
  user?: UserProfile;
  initialTestTitle?: string;
  onSessionSaved?: (rec: SpeedPracticeSessionRecord) => void;
}

export const SpeedPracticeInlineSession: React.FC<SpeedPracticeInlineSessionProps> = ({
  isOpen,
  onClose,
  questions,
  filters,
  userId,
  user,
  initialTestTitle = 'Interactive Speed Drill',
  onSessionSaved,
}) => {
  const [activeQuestions, setActiveQuestions] = useState<AIMCQQuestion[]>(questions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [questionTimings, setQuestionTimings] = useState<Record<string, number>>({});
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(() => Date.now());
  const [sessionStartAt, setSessionStartAt] = useState<number>(() => Date.now());
  const [savedRecord, setSavedRecord] = useState<SpeedPracticeSessionRecord | null>(null);
  const [mistakesLogged, setMistakesLogged] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;
    setActiveQuestions(questions);
    setCurrentIndex(0);
    setSelections({});
    setQuestionTimings({});
    const now = Date.now();
    setSessionStartAt(now);
    setQuestionStartedAt(now);
    setSavedRecord(null);
    setMistakesLogged(0);
  }, [isOpen, questions]);

  const currentQ = activeQuestions[currentIndex];
  const selectedOpt = currentQ ? selections[currentQ.id] : undefined;
  const hasAnsweredCurrent = selectedOpt !== undefined;

  const summary = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    const missedIds: string[] = [];

    for (const q of activeQuestions) {
      const picked = selections[q.id];
      if (picked === undefined) continue;
      if (picked === q.correctIndex) {
        correct += 1;
      } else {
        incorrect += 1;
        missedIds.push(q.id);
      }
    }

    const answered = correct + incorrect;
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const totalSec = Math.max(1, Math.round((Date.now() - sessionStartAt) / 1000));
    const avgTime = answered > 0 ? Number((totalSec / answered).toFixed(1)) : 0;
    return { correct, incorrect, answered, accuracy, totalSec, avgTime, missedIds };
  }, [activeQuestions, selections, sessionStartAt]);

  if (!isOpen) return null;

  const handleSelectOption = (optIndex: number) => {
    if (!currentQ || selections[currentQ.id] !== undefined) return;
    const spentSec = Math.max(1, Math.round((Date.now() - questionStartedAt) / 1000));
    setSelections((prev) => ({ ...prev, [currentQ.id]: optIndex }));
    setQuestionTimings((prev) => ({ ...prev, [currentQ.id]: spentSec }));
  };

  const handleNext = () => {
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setQuestionStartedAt(Date.now());
    } else {
      handleFinishSession();
    }
  };

  const handleFinishSession = () => {
    const answeredQuestions = activeQuestions.filter((q) => selections[q.id] !== undefined);
    const evaluatedQuestions = answeredQuestions.length > 0 ? answeredQuestions : activeQuestions;
    const totalAttempted = answeredQuestions.length;
    const avgSec =
      totalAttempted > 0
        ? Number((Math.max(1, (Date.now() - sessionStartAt) / 1000) / totalAttempted).toFixed(1))
        : 0;

    const itemOutcomes = answeredQuestions.map((q) => ({
      questionId: q.id,
      subject: q.subject,
      topic: q.topic,
      isCorrect: selections[q.id] === q.correctIndex,
      timeSpentSeconds: questionTimings[q.id] || Math.max(1, Math.round(avgSec)),
    }));

    const record: SpeedPracticeSessionRecord = {
      id: `sp_${Date.now()}`,
      completedAt: new Date().toISOString(),
      examCategory: filters.examCategory,
      subject: filters.subject,
      difficulty: filters.difficulty,
      poolFilter: filters.poolFilter,
      totalQuestions: evaluatedQuestions.length,
      correctCount: summary.correct,
      incorrectCount: summary.incorrect,
      accuracy: summary.accuracy,
      avgTimePerQuestionSec: avgSec,
      questionIds: evaluatedQuestions.map((q) => q.id),
      missedQuestionIds: summary.missedIds,
      itemOutcomes,
    };

    const answers: AttemptAnswer[] = evaluatedQuestions.map((q, idx) => {
      const picked = selections[q.id];
      return {
        questionId: q.id,
        questionIndex: idx,
        selectedOptionIndex: picked !== undefined ? picked : null,
        timeSpentSeconds: questionTimings[q.id] || 6,
        isCorrect: picked !== undefined ? picked === q.correctIndex : undefined,
      };
    });

    const drillAttempt: Attempt = {
      testId: record.id,
      studentId: user?.studentId || userId || 'guest',
      studentName: user?.fullName || 'Student',
      studentState: user?.address?.state || 'India',
      answers,
      score: Number((summary.correct - summary.incorrect * 0.25).toFixed(2)),
      correctCount: summary.correct,
      incorrectCount: summary.incorrect,
      unattemptedCount: Math.max(0, activeQuestions.length - summary.answered),
      timeTakenSeconds: summary.totalSec,
      completedAt: record.completedAt,
      isCustomTest: true,
      customTestTitle: initialTestTitle,
    };

    const newlyLogged = addMistakesFromAttempt(
      drillAttempt,
      activeQuestions,
      initialTestTitle,
      userId
    );
    setMistakesLogged(newlyLogged);
    setSavedRecord(record);
    onSessionSaved?.(record);
  };

  const handleRetryWrongOnly = () => {
    const missedQuestions = activeQuestions.filter((q) => {
      const picked = selections[q.id];
      return picked !== undefined && picked !== q.correctIndex;
    });
    if (missedQuestions.length === 0) return;

    const now = Date.now();
    setActiveQuestions(missedQuestions);
    setCurrentIndex(0);
    setSelections({});
    setQuestionTimings({});
    setSessionStartAt(now);
    setQuestionStartedAt(now);
    setSavedRecord(null);
    setMistakesLogged(0);
  };

  if (activeQuestions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-4">
        <Target className="w-8 h-8 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          No Questions Match Your Filter Combination
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Try switching Pool Filter back to All Questions or broadening Subject/Difficulty.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
        >
          Back to Speed Practice
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-5 animate-smooth-in">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit Drill</span>
          </button>

          <div>
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              Non-Ranking Interactive Practice · Immediate Feedback
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {initialTestTitle}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 tabular-nums font-mono">
          {!savedRecord && (
            <span>
              Question {currentIndex + 1} / {activeQuestions.length}
            </span>
          )}
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            Untimed Practice
          </span>
        </div>
      </div>

      {/* Completion Summary View */}
      {savedRecord ? (
        <div className="space-y-5">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Interactive Drill Complete
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Practice sessions improve topic speed and populate your Error Book without affecting daily All-India leaderboard rankings.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Accuracy</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {savedRecord.accuracy}%
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Correct</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                {savedRecord.correctCount}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Incorrect</div>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
                {savedRecord.incorrectCount}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Avg Pace</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {savedRecord.avgTimePerQuestionSec}s/Q
              </div>
            </div>
          </div>

          {mistakesLogged > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200">
              Added {mistakesLogged} missed item{mistakesLogged === 1 ? '' : 's'} to your Error Book for spaced revision.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Return to Practice Hub
            </button>

            {savedRecord.incorrectCount > 0 && (
              <button
                type="button"
                onClick={handleRetryWrongOnly}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Wrong Only ({savedRecord.incorrectCount}Q)</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Active Interactive Question Stage */
        <div className="space-y-5">
          {/* Unboxed clean metadata row */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {currentQ.subject}
              </span>
              <span aria-hidden="true">·</span>
              <span>{currentQ.topic}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{currentQ.difficulty}</span>
              {currentQ.examCategory && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{currentQ.examCategory}</span>
                </>
              )}
            </div>
            {currentQ.referenceNote && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {currentQ.referenceNote}
              </span>
            )}
          </div>

          <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
            <MathRenderer content={currentQ.text} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQ.options.map((opt, idx) => {
              const isPicked = selectedOpt === idx;
              const isCorrect = idx === currentQ.correctIndex;

              let btnClass =
                'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100';

              if (hasAnsweredCurrent) {
                if (isCorrect) {
                  btnClass =
                    'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 dark:border-emerald-600 text-emerald-950 dark:text-emerald-200 font-semibold';
                } else if (isPicked) {
                  btnClass =
                    'bg-rose-50 dark:bg-rose-950/60 border-rose-500 dark:border-rose-600 text-rose-950 dark:text-rose-200 font-semibold';
                } else {
                  btnClass =
                    'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 opacity-75';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={hasAnsweredCurrent}
                  onClick={() => handleSelectOption(idx)}
                  className={`p-3.5 rounded-xl border text-left text-xs sm:text-sm flex items-start gap-3 transition-colors ${
                    hasAnsweredCurrent ? 'cursor-default' : 'cursor-pointer'
                  } ${btnClass}`}
                >
                  <span className="w-6 h-6 rounded-md border border-current/25 flex items-center justify-center font-bold text-xs shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1 leading-snug">
                    <MathRenderer content={opt} inline={true} />
                  </span>
                </button>
              );
            })}
          </div>

          {hasAnsweredCurrent && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2 text-xs animate-smooth-in">
              <div className="flex items-center justify-between gap-2 font-bold">
                {selectedOpt === currentQ.correctIndex ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Correct Option {String.fromCharCode(65 + currentQ.correctIndex)}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                    <XCircle className="w-4 h-4" />
                    <span>
                      Incorrect — Right Answer is Option {String.fromCharCode(65 + currentQ.correctIndex)}
                    </span>
                  </span>
                )}
              </div>
              <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                <MathRenderer content={currentQ.explanation} />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleFinishSession}
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Finish &amp; Save Early
            </button>

            <button
              type="button"
              disabled={!hasAnsweredCurrent}
              onClick={handleNext}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                hasAnsweredCurrent
                  ? 'bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white cursor-pointer'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>
                {currentIndex < activeQuestions.length - 1 ? 'Next Question' : 'Finish & View Summary'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
