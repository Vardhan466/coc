import React, { useEffect, useMemo, useState } from 'react';
import {
  DiagnosticResult,
  Question,
  UserProfile,
} from '../types';
import { SAMPLE_30_QUESTIONS } from '../data/mockExamData';
import {
  DiagnosticSubmissionItem,
  evaluateDiagnosticQuiz,
  getDiagnosticQuestions,
} from '../utils/diagnosticQuiz';
import {
  signInWithFirebaseGoogle,
  signInWithFirebaseGoogleRedirect,
} from '../utils/firebaseAuth';
import { MathRenderer } from './MathRenderer';
import {
  AlertCircle,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Lock,
  Share2,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';

interface DiagnosticQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteWithGoogle: (user: UserProfile, result: DiagnosticResult) => void;
  onOpenSignupWithResult: (result: DiagnosticResult) => void;
  referralCode?: string | null;
}

export const DiagnosticQuizModal: React.FC<DiagnosticQuizModalProps> = ({
  isOpen,
  onClose,
  onCompleteWithGoogle,
  onOpenSignupWithResult,
  referralCode,
}) => {
  const diagnosticQuestions: Question[] = useMemo(
    () => getDiagnosticQuestions(SAMPLE_30_QUESTIONS),
    []
  );

  const [phase, setPhase] = useState<'quiz' | 'results'>('quiz');
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [questionElapsedSec, setQuestionElapsedSec] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<DiagnosticSubmissionItem[]>([]);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorMeta, setAuthErrorMeta] = useState<{
    canRetryRedirect?: boolean;
    shouldSuggestNewTab?: boolean;
  } | null>(null);
  const [copiedChallenge, setCopiedChallenge] = useState<boolean>(false);
  const [keyPreviewUnlocked, setKeyPreviewUnlocked] = useState<boolean>(false);

  // Reset when opened fresh
  useEffect(() => {
    if (isOpen) {
      setPhase('quiz');
      setCurrentIdx(0);
      setQuestionElapsedSec(0);
      setSelectedOption(null);
      setSubmissions([]);
      setResult(null);
      setAuthError(null);
      setAuthErrorMeta(null);
      setCopiedChallenge(false);
      setKeyPreviewUnlocked(false);
    }
  }, [isOpen]);

  // Per-question speed timer
  useEffect(() => {
    if (!isOpen || phase !== 'quiz') return;
    const timer = setInterval(() => {
      setQuestionElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, phase, currentIdx]);

  if (!isOpen) return null;

  const currentQuestion = diagnosticQuestions[currentIdx];

  const handleRecordAndAdvance = (chosenOpt: number | null) => {
    if (!currentQuestion) return;
    const nextItem: DiagnosticSubmissionItem = {
      question: currentQuestion,
      selectedOptionIndex: chosenOpt,
      timeSpentSeconds: Math.max(1, questionElapsedSec),
    };
    const nextSubmissions = [...submissions, nextItem];

    if (currentIdx + 1 < diagnosticQuestions.length) {
      setSubmissions(nextSubmissions);
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
      setQuestionElapsedSec(0);
    } else {
      const evaluated = evaluateDiagnosticQuiz(nextSubmissions);
      setSubmissions(nextSubmissions);
      setResult(evaluated);
      setPhase('results');
    }
  };

  const handleGoogleUnlock = async () => {
    if (!result) return;
    setIsGoogleLoading(true);
    setAuthError(null);
    setAuthErrorMeta(null);
    try {
      const res = await signInWithFirebaseGoogle({
        referralCode: referralCode || undefined,
        skillTier: result.assignedTier,
      });
      setIsGoogleLoading(false);
      if (res.success && res.user) {
        onCompleteWithGoogle(res.user, result);
      } else {
        setAuthError(res.error || 'Google sign-in cancelled. Use Student ID signup below.');
        setAuthErrorMeta({
          canRetryRedirect: res.canRetryRedirect,
          shouldSuggestNewTab: res.shouldSuggestNewTab,
        });
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      setAuthError(err?.message || 'Google sign-in unavailable right now.');
    }
  };

  const handleDiagnosticRedirectRetry = async () => {
    if (!result) return;
    setIsGoogleLoading(true);
    setAuthError(null);
    const res = await signInWithFirebaseGoogleRedirect({
      referralCode: referralCode || undefined,
      skillTier: result.assignedTier,
    });
    if (!res.success) {
      setIsGoogleLoading(false);
      setAuthError(res.error || 'Redirect sign-in unavailable right now.');
    }
  };

  const handleCopyChallengeUnlock = async () => {
    if (!result) return;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://clubofcompetition.in';
    const challengeUrl = `${baseUrl}/?ref=CHALLENGE-${result.assignedTier.toUpperCase()}`;
    const msg = `I scored ${result.score.toFixed(2)}/${result.maxScore} (${result.assignedTier} Tier, ${result.avgTimePerQuestionSec}s/Q) on the Club Of Competition 60s Diagnostic! Beat my time: ${challengeUrl}`;
    try {
      await navigator.clipboard.writeText(msg);
      setCopiedChallenge(true);
      setKeyPreviewUnlocked(true);
      setTimeout(() => setCopiedChallenge(false), 2500);
    } catch {
      setKeyPreviewUnlocked(true);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostic-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-5 sm:p-7 shadow-2xl relative text-slate-900 dark:text-slate-100 max-h-[92vh] overflow-y-auto animate-smooth-in transition-colors">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close diagnostic quiz"
          className="absolute right-4 top-4 p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {phase === 'quiz' && currentQuestion && (
          <div className="space-y-5">
            <div className="pr-8 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Lazy Onboarding · No Signup Required · Question {currentIdx + 1} of {diagnosticQuestions.length}
              </div>
              <h2 id="diagnostic-modal-title" className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                60-Second All-India Diagnostic Micro-Quiz
              </h2>
              {referralCode && (
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  Friend Challenge Active ({referralCode}) · Complete to claim Challenger Badge & Streak Freeze
                </p>
              )}
            </div>

            {/* Progress & Speed Clock */}
            <div className="flex items-center justify-between gap-3 py-2 px-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                <span>{currentQuestion.subject}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500 dark:text-slate-400 font-normal">{currentQuestion.topic}</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono font-bold text-amber-700 dark:text-amber-400 tabular-nums shrink-0">
                <Clock className="w-3.5 h-3.5" />
                <span>{questionElapsedSec}s elapsed</span>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="grid grid-cols-3 gap-1.5">
              {diagnosticQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className={`h-1.5 rounded-full transition-colors ${
                    idx < currentIdx
                      ? 'bg-emerald-500'
                      : idx === currentIdx
                      ? 'bg-slate-900 dark:bg-amber-400'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {/* Question Stem */}
            <div className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
              <MathRenderer content={currentQuestion.text} />
            </div>

            {/* 4 Options */}
            <div className="space-y-2.5">
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedOption(idx)}
                    className={`w-full p-3.5 min-h-[46px] rounded-xl border text-left text-xs sm:text-sm font-medium transition-colors flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-500 font-semibold shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1">
                      <MathRenderer content={opt} inline={true} />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Footer Controls */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleRecordAndAdvance(null)}
                className="px-4 py-2.5 min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Skip (0 Marks)
              </button>

              <button
                type="button"
                disabled={selectedOption === null}
                onClick={() => handleRecordAndAdvance(selectedOption)}
                className="px-5 py-2.5 min-h-[42px] rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>
                  {currentIdx + 1 === diagnosticQuestions.length
                    ? 'Reveal My Rank & Tier'
                    : 'Lock & Next Question'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {phase === 'results' && result && (
          <div className="space-y-5">
            {/* Value-First Immediate Rank & Tier Reveal */}
            <div className="pr-8 space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Diagnostic Complete · Value-First Assessment
              </div>
              <h2 id="diagnostic-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">
                You Placed in the {result.assignedTier} Skill Bracket
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Projected All-India Rank: <strong className="text-slate-900 dark:text-white font-mono">#{result.estimatedRank}</strong> of 4,850 contenders ({result.estimatedPercentile}th percentile)
              </p>
            </div>

            {/* 4 Key Result KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Score</div>
                <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                  {result.score.toFixed(2)}/{result.maxScore}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Speed / Q</div>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
                  {result.avgTimePerQuestionSec}s
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Accuracy</div>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">
                  {result.accuracy}%
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Skill Tier</div>
                <div className="text-xl font-black text-indigo-700 dark:text-indigo-400 mt-0.5">
                  {result.assignedTier}
                </div>
              </div>
            </div>

            {/* Subject Signal */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Instant Reflex Snapshot</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {result.strengthSubject
                  ? `Strongest reflex detected in ${result.strengthSubject}. `
                  : ''}
                {result.weakSubject
                  ? `Targeted practice recommended in ${result.weakSubject} to reach Gold tier faster.`
                  : 'Strong baseline across all tested modules — ready for tonight’s 7:00 PM live exam.'}
              </p>
            </div>

            {/* Value-First Paywall / Account Unlock Section */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 bg-white dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {keyPreviewUnlocked
                        ? 'Answer Key Preview Unlocked via Friend Challenge'
                        : 'Save Rank & Unlock Full Solutions + 30-Day Analytics'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Lock in your <span className="font-semibold text-slate-700 dark:text-slate-300">{result.assignedTier}</span> rank, claim a free Streak Freeze, and inspect step-by-step KaTeX answers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Solutions Preview (Locked until challenge shared or signed in) */}
              <div className="space-y-1.5">
                {diagnosticQuestions.map((q, idx) => {
                  const sub = submissions[idx];
                  const isRight = sub?.selectedOptionIndex === q.correctIndex;
                  return (
                    <div
                      key={q.id}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          Q{idx + 1}: {q.subject}
                        </span>
                        <span
                          className={`text-[11px] font-bold shrink-0 ${
                            isRight
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {sub?.selectedOptionIndex === null
                            ? 'Skipped'
                            : isRight
                            ? 'Correct (+1)'
                            : 'Incorrect (-0.25)'}
                        </span>
                      </div>
                      {keyPreviewUnlocked ? (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                          Key: <strong className="text-emerald-700 dark:text-emerald-400">{q.options[q.correctIndex]}</strong> — {q.explanation}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                          Step-by-step official solution gated · Sign in or challenge a friend to view
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {authError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 space-y-1.5"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                  {authErrorMeta?.canRetryRedirect && (
                    <button
                      type="button"
                      onClick={handleDiagnosticRedirectRetry}
                      disabled={isGoogleLoading}
                      className="text-[11px] font-bold text-rose-800 dark:text-rose-200 underline hover:opacity-80 cursor-pointer"
                    >
                      Retry via Full-Page Google Redirect
                    </button>
                  )}
                  {authErrorMeta?.shouldSuggestNewTab && typeof window !== 'undefined' && (
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 dark:text-rose-200 underline hover:opacity-80"
                    >
                      <span>Open App in New Tab for Google Sign-In</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Primary Unlock CTAs */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleGoogleUnlock}
                  disabled={isGoogleLoading}
                  className="w-full py-2.5 px-4 min-h-[42px] rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isGoogleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Diagnostic to Account...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>1-Click Continue with Google &amp; Save Rank</span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenSignupWithResult(result)}
                    className="py-2.5 px-3 min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>Claim Free Student ID</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyChallengeUnlock}
                    className="py-2.5 px-3 min-h-[42px] rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedChallenge ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Challenge Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Challenge Friend · Preview Key</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
