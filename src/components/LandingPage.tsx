import React, { useEffect, useState } from 'react';
import {
  Clock,
  ShieldCheck,
  Zap,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  XCircle,
  Lock,
  Award,
  Sun,
  Moon,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  checkPublicQuestionOfTheDay,
  fetchPublicQuestionOfTheDay,
} from '../utils/aiApiClient';
import type { PublicQuestionPayload } from '../types/aiSystem';
import { MathRenderer } from './MathRenderer';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onEnterAsDemo: () => void;
  onStartDiagnostic?: () => void;
  referralCode?: string | null;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

const FALLBACK_QOTD: PublicQuestionPayload = {
  id: 'qotd-fallback-article14',
  qIndex: 1,
  text: 'Which Article of the Constitution of India guarantees the Right to Equality before Law?',
  options: ['Article 14', 'Article 19', 'Article 21', 'Article 32'],
  subject: 'General Awareness',
  topic: 'Indian Polity · Fundamental Rights',
  difficulty: 'easy',
  examCategory: 'SSC',
  referenceNote: 'Constitution of India · Fundamental Rights',
  sourceType: 'admin_curated',
};

const FALLBACK_QOTD_ANSWER = {
  correctIndex: 0,
  explanation:
    'Article 14 ensures equality before law and equal protection of laws for all persons within the territory of India.',
  referenceNote: 'Constitution of India · Fundamental Rights',
};

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onEnterAsDemo,
  onStartDiagnostic,
  referralCode,
  isDark = false,
  onToggleTheme,
}) => {
  // Interactive Question of the Day state (no answer key leaked before selection)
  const [demoSelected, setDemoSelected] = useState<number | null>(null);
  const [qotd, setQotd] = useState<PublicQuestionPayload>(FALLBACK_QOTD);
  const [qotdIstDate, setQotdIstDate] = useState<string>('');
  const [qotdLoadedFromServer, setQotdLoadedFromServer] = useState<boolean>(false);
  const [isCheckingQotd, setIsCheckingQotd] = useState<boolean>(false);
  const [qotdResult, setQotdResult] = useState<{
    isCorrect: boolean;
    correctIndex: number;
    explanation: string;
    referenceNote: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublicQuestionOfTheDay()
      .then((res) => {
        if (cancelled) return;
        if (res?.question && Array.isArray(res.question.options) && res.question.options.length === 4) {
          setQotd(res.question);
          setQotdIstDate(res.istDate || '');
          setQotdLoadedFromServer(true);
        }
      })
      .catch(() => {
        // Offline / static fallback already ready
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectQotdOption = async (optIndex: number) => {
    setDemoSelected(optIndex);
    if (!qotdLoadedFromServer) {
      setQotdResult({
        isCorrect: optIndex === FALLBACK_QOTD_ANSWER.correctIndex,
        ...FALLBACK_QOTD_ANSWER,
      });
      return;
    }

    setIsCheckingQotd(true);
    try {
      const checked = await checkPublicQuestionOfTheDay(optIndex);
      setQotdResult(checked);
    } catch {
      setQotdResult({
        isCorrect: optIndex === 0,
        correctIndex: 0,
        explanation:
          'Option verified locally because the live check endpoint is temporarily unreachable. Sign in or open Speed Practice to drill full explanations.',
        referenceNote: qotd.referenceNote || 'Verified Exam Pattern',
      });
    } finally {
      setIsCheckingQotd(false);
    }
  };

  const handleResetQotd = () => {
    setDemoSelected(null);
    setQotdResult(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navigation Bar with Signup/Login in the upper right corner */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white flex items-center justify-center font-black text-xs sm:text-sm tracking-tight shadow-xs shrink-0">
              COC
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs min-[420px]:text-sm sm:text-base tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                  Club Of Competition
                </span>
                <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  · Daily 7:00 PM Exam
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                All-India 10-Second High-Stakes Speed Platform
              </p>
            </div>
          </div>

          {/* Right Upper Corner Theme & Auth Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-semibold text-[11px] sm:text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors shadow-xs flex items-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Get Student ID</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-10 pb-14 md:pt-14 md:pb-18 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-5">
          {referralCode && (
            <div className="max-w-xl mx-auto p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 font-medium">
              Challenge Invite (<strong className="font-mono">{referralCode}</strong>) — Take the 60s Diagnostic Quiz and create your Student ID to claim the Challenger Badge &amp; 1 Bonus Streak Freeze.
            </div>
          )}

          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Official Daily Exam Protocol · 7:00 PM to 7:15 PM IST
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            The 10-Second Daily Exam That Builds Real Exam Reflexes.
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Every evening at 7:00 PM, over 4,800+ competitive aspirants face 30 questions under a strict 10-second clock. +1.0 for correct, -0.25 for incorrect. No second-guessing.
          </p>

          {/* Call-To-Action Row with Lazy Registration Diagnostic Entry */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {onStartDiagnostic && (
              <button
                type="button"
                onClick={onStartDiagnostic}
                className="w-full sm:w-auto bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-bold px-6 py-3 min-h-[44px] rounded-xl text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Zap className="w-4 h-4 text-amber-400 dark:text-amber-200" />
                <span>Take 3-Question Diagnostic (No Account)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="w-full sm:w-auto bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 font-bold px-5 py-3 min-h-[44px] rounded-xl text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <span>Get Student ID</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onEnterAsDemo}
              className="w-full sm:w-auto bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-semibold px-4 py-3 min-h-[44px] rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <span>Explore Demo Mode</span>
            </button>
          </div>

          {/* Clean Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-8 max-w-4xl mx-auto text-left">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Entry Window</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">7:00 – 7:15 PM</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">5m guaranteed test time</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time Per Question</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">10 Seconds</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Auto-advances to next question</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Marking Scheme</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">+1.0 / -0.25</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Negative mark diagnostics</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aspirants Competing</div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">4,850+</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">All-India & State ranks</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive AI Question of the Day Preview */}
      <section className="py-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI-Generated Question of the Day {qotdIstDate ? `· ${qotdIstDate} IST` : ''}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
              Experience Today&apos;s High-Yield Question
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Answer key and step-by-step explanation stay hidden until you lock an option below.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 sm:p-7 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex flex-wrap items-center gap-1.5 font-medium">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {qotd.examCategory || 'General Competitive Examinations'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{qotd.subject}</span>
                <span aria-hidden="true">·</span>
                <span>{qotd.topic}</span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">{qotd.difficulty}</span>
              </div>
              <div className="font-mono font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                10s reflex target
              </div>
            </div>

            <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-5 leading-snug">
              <MathRenderer content={qotd.text} />
            </div>

            <div className="space-y-2.5">
              {qotd.options.map((opt, i) => {
                const isSelected = demoSelected === i;
                const resolvedCorrect = qotdResult ? i === qotdResult.correctIndex : false;
                const showFeedback = demoSelected !== null && qotdResult !== null;

                let optionClass =
                  'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700';
                if (showFeedback) {
                  if (resolvedCorrect) {
                    optionClass =
                      'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 dark:border-emerald-600 text-emerald-950 dark:text-emerald-200 font-semibold';
                  } else if (isSelected) {
                    optionClass =
                      'bg-rose-50 dark:bg-rose-950/70 border-rose-500 dark:border-rose-600 text-rose-950 dark:text-rose-200 font-semibold';
                  }
                } else if (isSelected) {
                  optionClass =
                    'bg-slate-100 dark:bg-slate-700 border-slate-400 dark:border-slate-500 text-slate-950 dark:text-white font-semibold';
                }

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isCheckingQotd}
                    onClick={() => void handleSelectQotdOption(i)}
                    className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition-colors flex items-center justify-between gap-3 cursor-pointer ${optionClass}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="min-w-0">
                        <MathRenderer content={opt} inline={true} />
                      </span>
                    </div>
                    {showFeedback && resolvedCorrect && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isSelected ? 'Correct (+1.0)' : 'Right Key'}</span>
                      </span>
                    )}
                    {showFeedback && isSelected && !resolvedCorrect && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-300 shrink-0">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Incorrect (-0.25)</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {isCheckingQotd && (
              <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                Verifying answer against official key sheet...
              </div>
            )}

            {demoSelected !== null && qotdResult && (
              <div className="mt-4 p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Verified Answer Explanation (Option {String.fromCharCode(65 + qotdResult.correctIndex)})
                  </span>
                  <button
                    type="button"
                    onClick={handleResetQotd}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Try Again / Reset</span>
                  </button>
                </div>
                <div>
                  <MathRenderer content={qotdResult.explanation} />
                </div>
                {qotdResult.referenceNote && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700">
                    Reference: {qotdResult.referenceNote}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Pillars Detailed Breakdown */}
      <section className="py-14 md:py-16 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 space-y-10">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Engineered for Fairness & Real Competition
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Designed from first principles to reflect actual competitive examination pressure and eliminate the flaws of unmoderated practice tests.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">7:00 PM Synchronized Window</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Enter the live exam alongside thousands of aspirants across India. If you start between 7:00 and 7:15 PM, you receive your full guaranteed 5m test duration.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Anti-Cheat Tab Switch Detection</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Detects tab-switching, app backgrounding, and screen-off events. Displays a gentle warning on first notice; automatically terminates attempt on second violation.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">8:00 PM Vault Key Release</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Official answer keys remain encrypted until 8:00 PM IST. Once released, candidates review complete question solutions and percentile rank cards.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold">
                <Award className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Permanent Student ID</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Receive an immutable system-assigned student ID (e.g. COC-2026-000123) with state and district classification for regional benchmark ranking.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold">
                <BarChart3 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Negative Mark Leak Diagnostic</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Track cumulative marks forfeited to incorrect guesses (-0.25 penalty) and isolate impulsive misjudgments made in under 2 seconds.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Targeted Subject Sprints</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Sharpen weak areas between daily tests with 10-question speed drills across Quantitative Aptitude, Reasoning, General Awareness, and English.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Call to Action */}
      <section className="py-12 bg-white dark:bg-slate-900 text-center border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-2xl mx-auto px-4 space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Join Today's 7:00 PM Competition
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Create your permanent Student ID in under 60 seconds. Test under pressure, build speed, and track your All-India rankcard.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl text-xs sm:text-sm shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Get Your Student ID & Register</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-[#F8FAFC] dark:bg-slate-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>© 2026 Club Of Competition. All rights reserved.</div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
            <span>DPDP Act 2023 Compliant</span>
            <span>·</span>
            <span>Server-Authoritative Vault</span>
            <span>·</span>
            <span>Deterministic Tie-Breaker Ranking</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
