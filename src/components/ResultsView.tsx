import React, { useState, useMemo, useEffect } from 'react';
import {
  Attempt,
  LeaderboardTimeframe,
  Question,
  SkillTier,
  TestPaper,
  UserProfile,
} from '../types';
import type { DailyExamScheduleConfig, StudyPlanDay } from '../types/aiSystem';
import { fetchDailyKeySheetServer } from '../utils/aiApiClient';
import { TopicFormulaSlideDeck } from './TopicFormulaSlideDeck';
import { getTranslation } from '../utils/i18n';
import { calculateNegativeMarkLoss } from '../utils/scoring';
import {
  assignAttemptSkillTier,
  filterAndRankLeaderboard,
  SKILL_TIERS_ORDER,
} from '../utils/gamification';
import {
  formatCountdownHMS,
  getSecondsUntilISTTime,
  isAfterISTTime,
} from '../utils/istTime';
import { MathRenderer } from './MathRenderer';
import {
  Trophy,
  Award,
  Search,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertTriangle,
  BarChart3,
  Check,
  Copy,
  Filter,
  MapPin,
  RotateCcw,
  Building2,
  Users,
  Share2,
  BookOpen,
  Clock,
} from 'lucide-react';
import { ShareResultsModal } from './ShareResultsModal';

function formatHHMMTo12h(hhmm: string): string {
  const [rawH, rawM] = hhmm.split(':').map(Number);
  const h = Number.isFinite(rawH) ? rawH : 20;
  const m = Number.isFinite(rawM) ? rawM : 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

interface ResultsViewProps {
  test: TestPaper;
  user: UserProfile;
  userAttempt?: Attempt;
  leaderboardAttempts: Attempt[];
  currentSimulatedTime: string;
  scheduleConfig?: DailyExamScheduleConfig;
  nextDayStudyTopic?: StudyPlanDay | null;
  onNavigateToErrorBook?: () => void;
  onNavigateToDailyTest?: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  test,
  user,
  userAttempt,
  leaderboardAttempts,
  currentSimulatedTime,
  scheduleConfig,
  nextDayStudyTopic,
  onNavigateToErrorBook,
  onNavigateToDailyTest,
}) => {
  const t = getTranslation(user.language);
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('today');
  const [selectedTier, setSelectedTier] = useState<SkillTier | 'all'>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [copiedChallenge, setCopiedChallenge] = useState<boolean>(false);
  const [unlockedKeyQuestions, setUnlockedKeyQuestions] = useState<Question[] | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  void currentSimulatedTime;
  const releaseHHMM = scheduleConfig?.answerKeyReleaseTime || test.answerKeyReleaseTime || '20:00';
  const releaseDisplay = formatHHMMTo12h(releaseHHMM);
  const isKeyReleased = useMemo(() => isAfterISTTime(releaseHHMM, nowMs), [releaseHHMM, nowMs]);
  const keyUnlockCountdown = useMemo(
    () => formatCountdownHMS(getSecondsUntilISTTime(releaseHHMM, nowMs)),
    [releaseHHMM, nowMs]
  );

  useEffect(() => {
    if (!isKeyReleased) {
      setUnlockedKeyQuestions(null);
      return;
    }
    let cancelled = false;
    fetchDailyKeySheetServer(test.date)
      .then((res) => {
        if (!cancelled && !res.locked && Array.isArray(res.questions) && res.questions.length > 0) {
          setUnlockedKeyQuestions(res.questions);
        }
      })
      .catch(() => {
        // Offline paper already carries explanations when unlocked
      });
    return () => {
      cancelled = true;
    };
  }, [isKeyReleased, test.date]);

  const displayQuestions = useMemo(() => {
    const base = test.questions || [];
    if (!unlockedKeyQuestions || unlockedKeyQuestions.length === 0) return base;
    if (base.length === 0) return unlockedKeyQuestions;
    const byId = new Map(unlockedKeyQuestions.map((q) => [q.id, q]));
    const merged = base.map((q) => byId.get(q.id) || q);
    const hasMissingKeys = merged.some(
      (q) => typeof q.correctIndex !== 'number' || q.correctIndex < 0
    );
    return hasMissingKeys ? unlockedKeyQuestions : merged;
  }, [test.questions, unlockedKeyQuestions]);

  const leaderboardVisibility = scheduleConfig?.leaderboardVisibility || 'public';
  const currentAttempt =
    userAttempt ||
    (user.uid === 'demo_user_001'
      ? leaderboardAttempts.find((a) => a.studentId === user.studentId)
      : undefined);
  const telemetry = currentAttempt?.telemetry;

  const referralChallengeUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${encodeURIComponent(user.referralCode || user.studentId)}`
      : `https://clubofcompetition.in/?ref=${encodeURIComponent(user.referralCode || user.studentId)}`;

  const handleCopyChallenge = async () => {
    const scoreText = currentAttempt ? ` (${currentAttempt.score.toFixed(2)} pts)` : '';
    const msg = `Beat my score${scoreText} on Club Of Competition! Take the 60s Diagnostic via my invite link for a free Streak Freeze: ${referralChallengeUrl}`;
    try {
      await navigator.clipboard.writeText(msg);
      setCopiedChallenge(true);
      setTimeout(() => setCopiedChallenge(false), 2500);
    } catch {}
  };

  // Apply Timeframe (Today / Weekly / Monthly / All-Time) & Skill Tier bracket ranking
  const tieredLeaderboard = useMemo(() => {
    return filterAndRankLeaderboard(leaderboardAttempts, timeframe, selectedTier);
  }, [leaderboardAttempts, timeframe, selectedTier]);

  // Extract unique filter options
  const uniqueStates = useMemo(() => {
    return Array.from(new Set(leaderboardAttempts.map((a) => a.studentState).filter(Boolean))).sort();
  }, [leaderboardAttempts]);

  const availableCities = useMemo(() => {
    const pool = selectedState === 'all'
      ? leaderboardAttempts
      : leaderboardAttempts.filter((a) => a.studentState === selectedState);
    return Array.from(new Set(pool.map((a) => a.studentCity).filter(Boolean) as string[])).sort();
  }, [leaderboardAttempts, selectedState]);

  const uniqueBatches = useMemo(() => {
    return Array.from(new Set(leaderboardAttempts.map((a) => a.batch).filter(Boolean) as string[])).sort();
  }, [leaderboardAttempts]);

  // Filter tiered leaderboard by State, City, Batch, and Search
  const filteredLeaderboard = useMemo(() => {
    return tieredLeaderboard.filter((a) => {
      const matchesState = selectedState === 'all' || a.studentState === selectedState;
      const matchesCity = selectedCity === 'all' || a.studentCity === selectedCity;
      const matchesBatch = selectedBatch === 'all' || a.batch === selectedBatch;
      const matchesSearch =
        searchQuery.trim() === '' ||
        a.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.studentCity && a.studentCity.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesState && matchesCity && matchesBatch && matchesSearch;
    });
  }, [tieredLeaderboard, selectedState, selectedCity, selectedBatch, searchQuery]);

  const hasActiveFilter =
    timeframe !== 'today' ||
    selectedTier !== 'all' ||
    selectedState !== 'all' ||
    selectedCity !== 'all' ||
    selectedBatch !== 'all' ||
    searchQuery.trim() !== '';

  const userLocalizedRankIndex = useMemo(() => {
    return filteredLeaderboard.findIndex((a) => a.studentId === user.studentId);
  }, [filteredLeaderboard, user.studentId]);

  const userLocalizedRank = userLocalizedRankIndex >= 0 ? userLocalizedRankIndex + 1 : null;

  const top3 = tieredLeaderboard.slice(0, 3);
  const visibleLeaderboardRows = useMemo(() => {
    if (leaderboardVisibility === 'top_only') {
      const topIds = new Set(tieredLeaderboard.slice(0, 3).map((a) => a.studentId));
      return filteredLeaderboard.filter(
        (a) => topIds.has(a.studentId) || a.studentId === user.studentId
      );
    }
    return filteredLeaderboard;
  }, [leaderboardVisibility, tieredLeaderboard, filteredLeaderboard, user.studentId]);

  const negativeLoss = currentAttempt ? calculateNegativeMarkLoss(currentAttempt.incorrectCount) : 0;
  const totalQuestionsCount = displayQuestions.length || 30;
  const timeframeLabel =
    timeframe === 'today'
      ? "Today's 7 PM"
      : timeframe === 'weekly'
      ? 'Weekly'
      : timeframe === 'monthly'
      ? 'Monthly'
      : 'All-Time';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* 1. Student's Personal Result Card */}
      {currentAttempt ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs text-slate-900 dark:text-slate-100 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 flex items-center justify-center font-bold">
                <Trophy className="w-5 h-5 text-slate-800 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  {t.perfCardTitle}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {user.studentId} · {user.fullName} ({currentAttempt.studentCity || user.address.district || 'Guntur'}, {user.address.state})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {hasActiveFilter && userLocalizedRank && (
                <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-md text-xs font-bold tabular-nums flex items-center gap-1.5 shadow-2xs">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Localized Rank: #{userLocalizedRank} of {filteredLeaderboard.length}
                  </span>
                </div>
              )}
              <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1 rounded-md text-xs font-semibold tabular-nums">
                {t.allIndiaRank}: #{currentAttempt.rank ?? 1}
              </div>

              <div className="flex items-center gap-2">
                {currentAttempt.incorrectCount > 0 && onNavigateToErrorBook && (
                  <button
                    type="button"
                    onClick={onNavigateToErrorBook}
                    className="bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    title="View and re-attempt all mistakes in your personal Error Book"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Revise {currentAttempt.incorrectCount} Mistakes</span>
                  </button>
                )}

                {/* Share Results Button */}
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Generate scorecard image and share on WhatsApp, X, Telegram or LinkedIn"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Results</span>
                </button>
              </div>
            </div>
          </div>

          {/* Primary stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-center">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">{t.finalScore}</div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                {currentAttempt.score.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">out of {totalQuestionsCount}.0</div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-center">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">{t.allIndiaRank}</div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-amber-400 mt-0.5 tabular-nums">
                #{currentAttempt.rank ?? 1}
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                Top {Math.max(0.1, 100 - (currentAttempt.percentile ?? 0)).toFixed(1)}% cohort
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-center">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">{t.percentile}</div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-purple-400 mt-0.5 tabular-nums">
                {(currentAttempt.percentile ?? 0).toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {tieredLeaderboard.length} participants
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-center">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">{t.accuracy}</div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-sky-400 mt-0.5 tabular-nums">
                {Math.round((currentAttempt.correctCount / Math.max(1, currentAttempt.correctCount + currentAttempt.incorrectCount)) * 100)}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">{currentAttempt.timeTakenSeconds ?? 0}s elapsed</div>
            </div>
          </div>

          {/* Correct / Incorrect / Skip bar */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{currentAttempt.correctCount} {t.correctBadge}</span>
              </span>
              <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-semibold">
                <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>{currentAttempt.incorrectCount} {t.incorrectBadge}</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span>{currentAttempt.unattemptedCount} {t.skippedBadge}</span>
              </span>
            </div>

            <div className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
              <span>{t.marksLostToGuesses}: <strong className="text-rose-700 dark:text-rose-400 font-bold font-mono">-{negativeLoss.toFixed(2)}</strong></span>
            </div>
          </div>

          {/* Challenge a Friend Referral Strip */}
          <div className="bg-amber-50/70 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/60 rounded-lg px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="text-amber-950 dark:text-amber-200">
              <strong className="font-bold">Challenge a Friend:</strong> Send your referral challenge link to earn the Challenger Badge &amp; +1 Streak Freeze when they complete the diagnostic.
            </div>
            <button
              type="button"
              onClick={handleCopyChallenge}
              className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {copiedChallenge ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Challenge Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Challenge Invite</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-slate-600 dark:text-slate-400 shadow-xs">
          <p className="font-semibold text-slate-800 dark:text-slate-200">You haven't attempted today's test yet.</p>
          <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">Take the exam from the "Daily Test" tab to view your score and rank card.</p>
        </div>
      )}

      {/* 2. Post-Test Telemetry Engine Report (Speed vs Accuracy Matrix & Trap Detection) */}
      {telemetry && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 text-slate-900 dark:text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Advanced CBT Telemetry & Speed vs Accuracy Matrix
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              Total Time: {telemetry.totalTimeSpentSeconds}s
            </span>
          </div>

          {/* 2x2 Speed vs Accuracy Matrix */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-900 dark:text-emerald-300">Fast & Correct (&lt;15s)</span>
                <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {telemetry.speedVsAccuracy.fastAndCorrect}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400/80 mt-0.5">High-confidence mastery zone</p>
            </div>

            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-900 dark:text-blue-300">Slow & Correct (≥15s)</span>
                <span className="text-base font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                  {telemetry.speedVsAccuracy.slowAndCorrect}
                </span>
              </div>
              <p className="text-[11px] text-blue-700 dark:text-blue-400/80 mt-0.5">Accurate but consumed time budget</p>
            </div>

            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-900 dark:text-amber-300">Fast & Wrong (&lt;15s)</span>
                <span className="text-base font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                  {telemetry.speedVsAccuracy.fastAndWrong}
                </span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400/80 mt-0.5">Hasty guess / distractor penalty</p>
            </div>

            <div className="p-3 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-rose-900 dark:text-rose-300">Slow & Wrong (≥15s)</span>
                <span className="text-base font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                  {telemetry.speedVsAccuracy.slowAndWrong}
                </span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-400/80 mt-0.5">High time-drain without returns</p>
            </div>
          </div>

          {/* Trap Questions Alert */}
          {telemetry.trapQuestionsIdentified && telemetry.trapQuestionsIdentified.length > 0 && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg text-xs space-y-1">
              <div className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>
                  {telemetry.trapQuestionsIdentified.length} Trap Questions Identified
                </span>
              </div>
              <p className="text-rose-700 dark:text-rose-300 text-[11px] leading-relaxed">
                You spent more than 12-15 seconds on these questions but chose an incorrect option. In speed exams, skip tricky questions after 8 seconds.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {telemetry.trapQuestionsIdentified.map((qId) => {
                  const qIdx = test.questions.findIndex((q) => q.id === qId);
                  return (
                    <span
                      key={qId}
                      className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300 rounded font-mono font-bold text-[10px]"
                    >
                      Question {qIdx >= 0 ? qIdx + 1 : qId}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section-wise performance */}
          {telemetry.sectionWiseScore && (
            <div className="space-y-2 pt-1">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>Sectional Breakdown & Precision</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(telemetry.sectionWiseScore).map(([subject, stats]) => (
                  <div key={subject} className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                    <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                      <span>{subject.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-slate-900 dark:text-white">{stats.score} pts</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      <span>Attempted: {stats.attempted}/{stats.total}</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">Accuracy: {stats.accuracy}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Answer Key Vault & Explanations */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-colors ${
        isKeyReleased
          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-200'
          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
      }`}>
        <div className="flex items-center gap-2.5">
          {isKeyReleased ? (
            <Unlock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
          ) : (
            <Lock className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
          )}
          <div>
            <div className="font-bold">
              {isKeyReleased ? t.keyVaultUnlocked : t.keyVaultLocked}
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5">
              {isKeyReleased
                ? `Full step-by-step solutions and KaTeX formulas are available for all ${totalQuestionsCount} questions.`
                : `Correct answers remain encrypted until ${releaseDisplay} IST (${releaseHHMM} IST) to protect competition integrity across all cohorts.`}
            </p>
          </div>
        </div>

        {!isKeyReleased && (
          <div className="px-3.5 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-amber-400 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-xs whitespace-nowrap flex items-center gap-1.5 tabular-nums shrink-0">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Unlocks in {keyUnlockCountdown.formatted}</span>
          </div>
        )}
      </div>


      {/* Answer Key Solutions Accordion */}
      {isKeyReleased && (
        <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 rounded-xl p-5 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
            <span>Official Answer Key &amp; Explanations ({totalQuestionsCount} Questions)</span>
            <span className="text-xs text-purple-700 dark:text-purple-300 font-normal">Click any question to view solution</span>
          </h3>

          <div className="space-y-2 pt-1">
            {displayQuestions.map((q, idx) => {
              const isExpanded = expandedQuestionId === q.id;
              const userAns = currentAttempt?.answers?.find(
                (a) => a.questionId === q.id || a.questionIndex === idx
              );
              const userOptIdx = userAns?.selectedOptionIndex ?? userAns?.selectedOption;
              const isUserCorrect = userOptIdx !== undefined && userOptIdx !== null && userOptIdx === q.correctIndex;

              return (
                <div key={q.id} className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                    className="w-full text-left p-3 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-slate-100/70 dark:hover:bg-slate-800 flex items-center justify-between text-xs cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200">Q{idx + 1}.</span>
                      <span className="text-slate-700 dark:text-slate-300 line-clamp-1">
                        <MathRenderer content={q.text} inline={true} />
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {userOptIdx !== null && userOptIdx !== undefined ? (
                        isUserCorrect ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                            <Check className="w-3.5 h-3.5" /> Correct
                          </span>
                        ) : (
                          <span className="text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1 text-[11px]">
                            <XCircle className="w-3.5 h-3.5" /> Incorrect
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[11px]">Unattempted</span>
                      )}

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs animate-smooth-in">
                      <div className="text-slate-900 dark:text-slate-100 font-medium">
                        <MathRenderer content={q.text} />
                      </div>

                      <div className="space-y-1.5">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = oIdx === q.correctIndex;
                          const isPicked = userOptIdx === oIdx;

                          return (
                            <div
                              key={oIdx}
                              className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 font-semibold'
                                  : isPicked
                                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-200'
                                  : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                              <div className="flex-1">
                                <MathRenderer content={opt} inline={true} />
                              </div>
                              {isCorrect && (
                                <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">
                                  Correct Key
                                </span>
                              )}
                              {isPicked && !isCorrect && (
                                <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">
                                  Your Pick
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="p-3 bg-purple-50/50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-lg text-slate-800 dark:text-slate-200 space-y-1">
                          <span className="font-bold text-purple-900 dark:text-purple-300 text-[11px]">Official Explanation:</span>
                          <div className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                            <MathRenderer content={q.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* AI Next-Day Exam Topic + Formulas & Cheat Codes Preview (Daily Post-Results Routine) */}
      {nextDayStudyTopic && (
        <div
          data-testid="results-next-day-topic"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Tomorrow&apos;s Daily Exam Topic Selected by AI (500-Topic Non-Repeating Pool)
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {nextDayStudyTopic.topic}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {nextDayStudyTopic.subject} · Topic #{nextDayStudyTopic.globalDayIndex} of 500 · Scheduled for tomorrow&apos;s live CBT exam
              </p>
            </div>
            {onNavigateToDailyTest && (
              <button
                type="button"
                onClick={onNavigateToDailyTest}
                className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center"
              >
                Open in Daily Test Page
              </button>
            )}
          </div>

          <TopicFormulaSlideDeck
            todayTopic={nextDayStudyTopic}
            testTitle={nextDayStudyTopic.topic}
            testDescription={nextDayStudyTopic.topicDescription}
            eyebrowLabel="Next-Day Exam Prep · Formulas & Cheat Codes"
            badgeNote={`Topic ${nextDayStudyTopic.globalDayIndex}/500`}
          />
        </div>
      )}

      {/* 4 & 5. Leaderboard Policy Enforcement */}
      {leaderboardVisibility === 'hidden_from_students' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs text-center space-y-2">
          <Lock className="w-6 h-6 text-slate-500 dark:text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            Personal Rankcard Only Mode Active
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            Administrators have configured this cycle&apos;s leaderboard visibility to personal rankcard only. Your official score, rank, and accuracy are shown above.
          </p>
        </div>
      ) : (
        <>
          {/* 4. Top 3 Podium Cards */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-700 dark:text-amber-400" />
                <span>
                  {t.top3Title} · {timeframeLabel}
                  {selectedTier !== 'all' ? ` (${selectedTier} Bracket)` : ''}
                </span>
              </h3>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Peers grouped cleanly by Skill Tier
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {top3.map((podium, index) => {
                const tier = assignAttemptSkillTier(podium);
                const podiumAccent =
                  index === 0
                    ? 'text-amber-500'
                    : index === 1
                    ? 'text-slate-400 dark:text-slate-300'
                    : 'text-amber-700 dark:text-amber-600';

                return (
                  <div
                    key={podium.id || podium.studentId}
                    className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-mono font-bold ${podiumAccent}`}>
                          <Award className="w-4 h-4" />
                          <span>#{index + 1}</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200">
                          Rank #{index + 1} · {tier}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{podium.studentName}</div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{podium.studentId} · {podium.studentState}</div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">{podium.score.toFixed(2)} pts</span>
                      <span className="text-slate-500 dark:text-slate-400 font-mono">{podium.timeTakenSeconds}s</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Tiered & Localized Leaderboard Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            {/* Header & Description */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-slate-700 dark:text-amber-400" />
                  <span>{t.leaderboardTitle} &amp; Skill-Tier Brackets</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {(() => {
                    const realCount = leaderboardAttempts.filter((a) => !a.isSeededBenchmark).length;
                    const seededCount = leaderboardAttempts.length - realCount;
                    return seededCount > 0
                      ? `Daily cohort rotates every IST day · ${realCount} real candidate${realCount === 1 ? '' : 's'} ranked by marks (${seededCount} daily benchmarks fill open slots until real students fill the board).`
                      : `Live All-India cohort · 100% real-user leaderboard (${realCount} verified candidate${realCount === 1 ? '' : 's'} ranked strictly by marks).`;
                  })()}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                  Ranked strictly by Final Score → Fewer Wrong Answers → Accuracy % → Faster Time Taken
                  {leaderboardVisibility === 'top_only' && ' · Top 3 + Your Rank View'}
                </p>
              </div>

          {/* Active Filter Clear Tag */}
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => {
                setTimeframe('today');
                setSelectedTier('all');
                setSelectedState('all');
                setSelectedCity('all');
                setSelectedBatch('all');
                setSearchQuery('');
              }}
              className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Timeframe & Skill Tier Switchers */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Leaderboard Timeframe"
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-x-auto max-w-full"
          >
            {([
              { id: 'today', label: "Today's 7 PM" },
              { id: 'weekly', label: 'Weekly' },
              { id: 'monthly', label: 'Monthly' },
              { id: 'all_time', label: 'All-Time' },
            ] as const).map((tf) => {
              const active = timeframe === tf.id;
              return (
                <button
                  key={tf.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTimeframe(tf.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tf.label}
                </button>
              );
            })}
          </div>

          <div
            role="tablist"
            aria-label="Skill Tier Bracket"
            className="flex items-center gap-1.5 flex-wrap"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedTier === 'all'}
              onClick={() => setSelectedTier('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                selectedTier === 'all'
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-500'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              All Tiers
            </button>
            {SKILL_TIERS_ORDER.map((tier) => {
              const active = selectedTier === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedTier(tier)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {tier}
                </button>
              );
            })}
          </div>
        </div>

        {/* Localized Filter Controls Panel */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Filter Cohort by Location &amp; Batch:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500"
              />
            </div>

            {/* State Filter */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedCity('all');
                }}
                className="w-full text-xs bg-transparent py-1 focus:outline-none text-slate-800 dark:text-slate-200"
              >
                <option value="all" className="dark:bg-slate-900">All States ({uniqueStates.length})</option>
                {uniqueStates.map((st) => (
                  <option key={st} value={st} className="dark:bg-slate-900">{st}</option>
                ))}
              </select>
            </div>

            {/* City / District Filter */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full text-xs bg-transparent py-1 focus:outline-none text-slate-800 dark:text-slate-200"
              >
                <option value="all" className="dark:bg-slate-900">
                  {selectedState === 'all' ? 'All Cities' : `Cities in ${selectedState}`} ({availableCities.length})
                </option>
                {availableCities.map((city) => (
                  <option key={city} value={city} className="dark:bg-slate-900">{city}</option>
                ))}
              </select>
            </div>

            {/* Batch Filter */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5">
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full text-xs bg-transparent py-1 focus:outline-none text-slate-800 dark:text-slate-200"
              >
                <option value="all" className="dark:bg-slate-900">All Batches ({uniqueBatches.length})</option>
                {uniqueBatches.map((b) => (
                  <option key={b} value={b} className="dark:bg-slate-900">{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick-Filter Presets */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Quick Filters:</span>
            
            <button
              type="button"
              onClick={() => {
                setSelectedState('all');
                setSelectedCity('all');
                setSelectedBatch('all');
                setSearchQuery('');
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                !hasActiveFilter
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              All-India
            </button>

            {user.address?.state && (
              <button
                type="button"
                onClick={() => {
                  setSelectedState(user.address.state);
                  setSelectedCity('all');
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  selectedState === user.address.state && selectedCity === 'all'
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                My State ({user.address.state})
              </button>
            )}


            {(currentAttempt?.studentCity || user.address?.district) && (
              <button
                type="button"
                onClick={() => {
                  if (user.address?.state) setSelectedState(user.address.state);
                  setSelectedCity(currentAttempt?.studentCity || user.address.district);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  selectedCity === (currentAttempt?.studentCity || user.address.district)
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                My City ({currentAttempt?.studentCity || user.address.district})
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedBatch('Morning Prelims Alpha');
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                selectedBatch === 'Morning Prelims Alpha'
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Morning Alpha
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedBatch('Evening Super 100');
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                selectedBatch === 'Evening Super 100'
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Evening Super 100
            </button>
          </div>
        </div>

        {/* Localized Cohort Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
          <div className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white">
              {filteredLeaderboard.length} candidates
            </span>
            <span className="text-slate-400">·</span>
            <span>
              Scope:{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {selectedState !== 'all' ? selectedState : 'National'}
                {selectedCity !== 'all' ? ` > ${selectedCity}` : ''}
                {selectedBatch !== 'all' ? ` > ${selectedBatch}` : ''}
              </strong>
            </span>
          </div>

          {userLocalizedRank ? (
            <div className="text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Your Local Rank: #{userLocalizedRank}</span>
              <span className="text-slate-400 dark:text-slate-400 font-normal">
                (All-India #{currentAttempt?.rank ?? 1})
              </span>
            </div>
          ) : (
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">
              Top local score:{' '}
              <strong className="text-slate-800 dark:text-slate-200 font-mono">
                {filteredLeaderboard[0]?.score?.toFixed(2) ?? '0.00'} pts
              </strong>
            </div>
          )}
        </div>

        {/* Leaderboard Table with Localized Rankings */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs text-left whitespace-nowrap sm:whitespace-normal">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Local Rank</th>
                <th className="py-2.5 px-3">All-India</th>
                <th className="py-2.5 px-3">{t.studentHeader}</th>
                <th className="py-2.5 px-3">Location (City &amp; State)</th>
                <th className="py-2.5 px-3 text-center">{t.scoreHeader}</th>
                <th className="py-2.5 px-3 text-center">{t.correctHeader}</th>
                <th className="py-2.5 px-3 text-center">{t.wrongHeader}</th>
                <th className="py-2.5 px-3 text-right">{t.timeHeader}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {visibleLeaderboardRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                    No candidates found matching the selected filters.
                    <button
                      type="button"
                      onClick={() => {
                        setTimeframe('today');
                        setSelectedTier('all');
                        setSelectedState('all');
                        setSelectedCity('all');
                        setSelectedBatch('all');
                        setSearchQuery('');
                      }}
                      className="block mx-auto mt-2 text-slate-900 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                    >
                      Clear filters to view All-India leaderboard
                    </button>
                  </td>
                </tr>
              ) : (
                visibleLeaderboardRows.map((att, idx) => {
                  const isCurrentUser = att.studentId === user.studentId;
                  const localizedRank =
                    filteredLeaderboard.findIndex((a) => a.studentId === att.studentId) + 1 || idx + 1;
                  const allIndiaRank = att.rank || '-';
                  const tierLabel = assignAttemptSkillTier(att);

                  return (
                    <tr
                      key={att.id || att.studentId}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        isCurrentUser ? 'bg-amber-50/70 dark:bg-amber-950/35 font-semibold' : ''
                      }`}
                    >
                      {/* Localized Rank */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold text-xs ${
                              localizedRank <= 3 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-slate-200'
                            }`}
                          >
                            #{localizedRank}
                          </span>
                          {localizedRank === 1 && (
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded">
                              Top
                            </span>
                          )}
                        </div>
                      </td>

                      {/* All-India Rank */}
                      <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                        #{allIndiaRank}
                      </td>

                      {/* Student Info, Skill Tier & Batch */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white">{att.studentName}</span>
                          {isCurrentUser && (
                            <span className="bg-slate-900 dark:bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">
                              {t.youBadge}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                            · {tierLabel}
                          </span>
                          {att.batch && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              · {att.batch}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                          {att.studentId}
                        </div>
                      </td>

                      {/* Location: City & State */}
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>
                            {att.studentCity ? `${att.studentCity}, ` : ''}
                            {att.studentState}
                          </span>
                        </div>
                      </td>

                      {/* Score */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white tabular-nums">
                        {att.score.toFixed(2)}
                      </td>

                      {/* Correct */}
                      <td className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400 font-medium tabular-nums">
                        {att.correctCount}
                      </td>

                      {/* Wrong */}
                      <td className="py-2.5 px-3 text-center text-rose-700 dark:text-rose-400 font-medium tabular-nums">
                        {att.incorrectCount}
                      </td>

                      {/* Time */}
                      <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {att.timeTakenSeconds}s
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

          </table>
        </div>
      </div>
        </>
      )}

      {/* Share Results Modal */}
      {currentAttempt && (
        <ShareResultsModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          attempt={currentAttempt}
          user={user}
          test={test}
          localizedRank={userLocalizedRank}
          localizedCohortSize={filteredLeaderboard.length}
        />
      )}
    </div>
  );
};
