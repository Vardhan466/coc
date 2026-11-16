import React, { useState, useMemo, useEffect } from 'react';
import { Attempt, StudentProgressStats, UserProfile } from '../types';
import type { SpeedPracticeSessionRecord, StudyPlanDay } from '../types/aiSystem';
import { getStreakMilestone } from '../utils/streakMilestones';
import { getTodayIsoDateIST } from '../utils/istTime';
import { buildComprehensiveStudentAnalytics } from '../utils/studentAnalyticsEngine';
import { getErrorBookEntries } from '../utils/errorBookStorage';
import { SAMPLE_40_QUESTIONS } from '../data/mockExamData';
import {
  build30DayRollingSeries,
  build7DayStreakCalendar,
  calculateSkillTier,
  SKILL_TIERS_ORDER,
  STREAK_MILESTONE_REWARDS,
} from '../utils/gamification';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Target,
  Award,
  AlertTriangle,
  Flame,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  Minus,
  Plus,
  Check,
  Snowflake,
  Trophy,
  CalendarDays,
  Clock,
  Gift,
  BookOpen,
  Play,
} from 'lucide-react';

interface ProgressViewProps {
  stats: StudentProgressStats;
  user: UserProfile;
  attempts?: Attempt[];
  speedSessions?: SpeedPracticeSessionRecord[];
  todayTopic?: StudyPlanDay | null;
  onLaunchPracticeTopic: (topic: string) => void;
  onUpdateDailyGoal?: (newGoal: number) => void;
  onActivateStreakFreeze?: (targetIsoDate: string) => void;
  onClaimMilestoneReward?: (milestoneDays: number) => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  stats,
  user,
  attempts: rawAttempts = [],
  speedSessions = [],
  todayTopic,
  onLaunchPracticeTopic,
  onUpdateDailyGoal,
  onActivateStreakFreeze,
  onClaimMilestoneReward,
}) => {
  const [activeChartMetric, setActiveChartMetric] = useState<'line' | 'area' | 'accuracy' | '30d_rolling'>('line');
  const [trendView, setTrendView] = useState<'weekly' | 'monthly'>('weekly');
  const [freezeAnimDate, setFreezeAnimDate] = useState<string | null>(null);
  const [freezeBannerMsg, setFreezeBannerMsg] = useState<string | null>(null);
  const [milestoneAnimDays, setMilestoneAnimDays] = useState<number | null>(null);
  const [milestoneBannerMsg, setMilestoneBannerMsg] = useState<string | null>(null);

  const comprehensive = useMemo(
    () =>
      buildComprehensiveStudentAnalytics({
        attempts: rawAttempts,
        speedSessions,
        errorBook: getErrorBookEntries(user.uid || user.studentId),
        questionBank: SAMPLE_40_QUESTIONS,
        currentStreak: stats.currentStreak,
        todayTopic,
      }),
    [rawAttempts, speedSessions, user.uid, user.studentId, stats.currentStreak, todayTopic]
  );

  const userGoalKey = `coc_daily_goal_score_${user.uid || user.studentId || 'guest'}`;

  const readGoalForUser = (storageKey: string, fallback: number): number => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed) && parsed >= 5 && parsed <= 30) {
          return parsed;
        }
      }
    } catch {}
    return fallback;
  };

  // Daily Goal Target Setting (score out of 30, customizable with presets)
  const [dailyGoal, setDailyGoal] = useState<number>(() =>
    readGoalForUser(userGoalKey, stats.dailyGoalScore || 26.0)
  );

  const [customGoalInput, setCustomGoalInput] = useState<string>(() => String(dailyGoal));

  useEffect(() => {
    const synced = readGoalForUser(userGoalKey, stats.dailyGoalScore || 26.0);
    setDailyGoal(synced);
    setCustomGoalInput(String(synced));
  }, [userGoalKey, stats.dailyGoalScore]);

  const handleSetDailyGoal = (val: number) => {
    const clamped = Math.max(5, Math.min(30, Number(val.toFixed(1))));
    setDailyGoal(clamped);
    setCustomGoalInput(String(clamped));
    try {
      localStorage.setItem(userGoalKey, String(clamped));
    } catch {}
    onUpdateDailyGoal?.(clamped);
  };

  const handleCustomGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(customGoalInput);
    if (!isNaN(parsed)) {
      handleSetDailyGoal(parsed);
    }
  };

  // Format 10-Attempt dataset for Recharts
  const attempts = useMemo(() => {
    const list = stats.recentAttempts || [];
    return list.slice(-10);
  }, [stats.recentAttempts]);

  // Build 30-day rolling series (Accuracy % & Avg Speed sec/Q)
  const rolling30Data = useMemo(() => {
    return build30DayRollingSeries(stats.recentAttempts, stats.rolling30DayHistory);
  }, [stats.recentAttempts, stats.rolling30DayHistory]);

  const skillMeta = useMemo(() => {
    return calculateSkillTier(stats.overallAccuracy, stats.testsTaken, stats.averageScore);
  }, [stats.overallAccuracy, stats.testsTaken, stats.averageScore]);

  const activeSkillTier = stats.skillTier || skillMeta.tier;

  const todayIsoDate = getTodayIsoDateIST();
  const streakCalendar = useMemo(
    () => build7DayStreakCalendar(stats, todayIsoDate),
    [stats, todayIsoDate]
  );

  // Pick default day eligible for Streak Freeze (prefer today if pending, else most recent missed day)
  const freezeTargetDay = useMemo(() => {
    const todayPending = streakCalendar.days.find((d) => d.status === 'pending_today');
    if (todayPending) return todayPending;
    return [...streakCalendar.days].reverse().find((d) => d.status === 'missed') || null;
  }, [streakCalendar]);

  const handleTriggerStreakFreeze = (dayDate: string, dayLabel: string) => {
    if ((stats.streakFreezesAvailable ?? 0) <= 0) return;
    onActivateStreakFreeze?.(dayDate);
    setFreezeAnimDate(dayDate);
    setFreezeBannerMsg(`Streak Freeze Shield activated for ${dayLabel}. Your streak stays protected!`);
    setTimeout(() => {
      setFreezeAnimDate((prev) => (prev === dayDate ? null : prev));
    }, 2400);
  };

  const handleClaimMilestone = (days: number, title: string, rewardLabel: string) => {
    onClaimMilestoneReward?.(days);
    setMilestoneAnimDays(days);
    setMilestoneBannerMsg(`${title} (${days}-Day Milestone) claimed: ${rewardLabel}!`);
    setTimeout(() => {
      setMilestoneAnimDays((prev) => (prev === days ? null : prev));
    }, 2400);
  };

  // Compute Growth & Consistency metrics over the last 10 attempts
  const analytics = useMemo(() => {
    if (attempts.length === 0) {
      return {
        growthPct: 0,
        growthMarks: 0,
        consistencyRating: 0,
        stdDev: 0,
        meanScore: 0,
        highestScore: 0,
        lowestScore: 0,
        daysAboveAverage: 0,
      };
    }

    const scores = attempts.map((a) => a.score);
    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];
    const growthMarks = Number((lastScore - firstScore).toFixed(2));
    const growthPct = Number((((lastScore - firstScore) / Math.max(1, firstScore)) * 100).toFixed(1));

    const meanScore = Number((scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(2));
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - meanScore, 2), 0) / scores.length;
    const stdDev = Number(Math.sqrt(variance).toFixed(2));

    // Consistency rating: Lower standard deviation relative to mean indicates higher consistency
    // Scale: stdDev / mean of ~0.10 is ~90-95% consistency
    const rawConsistency = 100 - (stdDev / Math.max(1, meanScore)) * 70;
    const consistencyRating = Math.max(60, Math.min(98, Math.round(rawConsistency)));

    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const daysAboveAverage = attempts.filter((a) => a.score > a.peerAvgScore).length;

    return {
      growthPct,
      growthMarks,
      consistencyRating,
      stdDev,
      meanScore,
      highestScore,
      lowestScore,
      daysAboveAverage,
    };
  }, [attempts]);

  // Chart data formatting
  const chartData = useMemo(() => {
    return attempts.map((a, idx) => ({
      day: a.testDate,
      dayNum: `Test ${idx + 1}`,
      fullLabel: `${a.testDate} (${a.testTitle})`,
      score: a.score,
      peerAvgScore: a.peerAvgScore,
      accuracy: a.accuracy,
      rank: a.rank,
      percentile: a.percentile,
      deltaVsPeer: Number((a.score - a.peerAvgScore).toFixed(2)),
    }));
  }, [attempts]);

  // Custom Recharts Tooltip for Score Progress
  const CustomScoreTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-xl p-3.5 shadow-xl text-xs space-y-2 min-w-[210px]">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
            <span className="font-bold text-slate-200">{data.fullLabel}</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
              {data.rank > 0 ? `#${data.rank} Rank` : 'Practice'}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                <span>Your Score:</span>
              </span>
              <span className="font-mono font-bold text-white text-sm">{data.score}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-slate-400" />
                <span>Peer Average:</span>
              </span>
              <span className="font-mono text-slate-300">{data.peerAvgScore}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Accuracy:</span>
              <span className="font-mono text-amber-300 font-semibold">{data.accuracy}%</span>
            </div>
            <div className="pt-1 border-t border-slate-800 text-[11px] flex items-center justify-between">
              <span className="text-slate-400">vs National Peer Avg:</span>
              <span
                className={`font-mono font-semibold ${
                  data.deltaVsPeer >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {data.deltaVsPeer >= 0 ? `+${data.deltaVsPeer}` : data.deltaVsPeer} marks
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Target analytics relative to latest attempt & historical attempts
  const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
  const currentLatestScore = latestAttempt ? latestAttempt.score : stats.averageScore;
  const goalProgressPct = Math.min(100, Math.max(0, Number(((currentLatestScore / dailyGoal) * 100).toFixed(1))));
  const isGoalAchieved = currentLatestScore >= dailyGoal;
  const goalDelta = Number((currentLatestScore - dailyGoal).toFixed(2));
  const attemptsMeetingGoal = attempts.filter((a) => a.score >= dailyGoal).length;
  const goalHitRatePct = attempts.length > 0 ? Math.round((attemptsMeetingGoal / attempts.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5 text-slate-900 dark:text-slate-100 transition-colors">
      {/* 1. Header Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tests Taken</span>
            <Target className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {stats.testsTaken}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {stats.testsTaken === 0 ? 'Start your first exam' : 'Consecutive daily tests'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Overall Accuracy</span>
            <Award className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {stats.testsTaken === 0 ? '--' : `${stats.overallAccuracy}%`}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {stats.testsTaken === 0 ? 'Pending 1st attempt' : `Avg: ${stats.averageScore.toFixed(2)} marks`}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Best Rank</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {stats.testsTaken === 0 || stats.bestRank <= 0 ? '--' : `#${stats.bestRank}`}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {stats.testsTaken === 0
              ? 'All-India leaderboard'
              : stats.bestRank <= 0
              ? `Practice Peak: ${stats.highestScore} marks`
              : `High: ${stats.highestScore} marks`}
          </div>
        </div>

        {(() => {
          const milestone = getStreakMilestone(stats.currentStreak);
          const freezes = stats.streakFreezesAvailable ?? 1;
          return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Streak &amp; Freezes</span>
                <Flame className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-amber-400 tabular-nums">
                  {stats.currentStreak}d
                </span>
                <span className="text-xs font-bold text-orange-600 dark:text-amber-300 truncate">
                  {milestone.title}
                </span>
              </div>
              <div className="text-[11px] text-sky-700 dark:text-sky-400 font-semibold mt-0.5 flex items-center gap-1 tabular-nums">
                <Snowflake className="w-3 h-3 shrink-0" />
                <span>{freezes} Streak Freeze{freezes === 1 ? '' : 's'} · Best {stats.longestStreak ?? stats.currentStreak}d</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 1B. 7-Day Visual Streak Calendar Grid & Animated Milestone Rewards */}
      <section
        aria-label="7-Day Streak Calendar and Milestone Rewards"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <span>7-Day Attendance &amp; Streak Shield</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  {streakCalendar.completedDaysCount}/7 Active
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Weekly Streak History &amp; Milestone Rewards
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Complete at least one Micro-Challenge or 7:00 PM exam daily, or deploy a Streak Freeze to shield a day.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-mono font-bold flex items-center gap-1.5 tabular-nums">
              <Snowflake className="w-3.5 h-3.5" />
              <span>{stats.streakFreezesAvailable ?? 0} Available</span>
            </div>

            {freezeTargetDay && (stats.streakFreezesAvailable ?? 0) > 0 && onActivateStreakFreeze && (
              <button
                type="button"
                onClick={() =>
                  handleTriggerStreakFreeze(
                    freezeTargetDay.date,
                    `${freezeTargetDay.monthShort} ${freezeTargetDay.dayNum}`
                  )
                }
                className="px-3.5 py-1.5 min-h-[34px] rounded-lg bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Snowflake className="w-3.5 h-3.5" />
                <span>Activate Streak Freeze</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Activation / Celebration Alerts */}
        {freezeBannerMsg && (
          <div
            role="status"
            className="animate-freeze-reveal p-3 rounded-xl bg-sky-50 dark:bg-sky-950/70 border border-sky-300 dark:border-sky-700 text-xs text-sky-900 dark:text-sky-200 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 font-semibold">
              <Snowflake className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>{freezeBannerMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setFreezeBannerMsg(null)}
              className="text-[11px] font-bold text-sky-700 dark:text-sky-300 hover:underline cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {milestoneBannerMsg && (
          <div
            role="status"
            className="animate-freeze-reveal p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-xs text-amber-950 dark:text-amber-200 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 font-semibold">
              <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{milestoneBannerMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setMilestoneBannerMsg(null)}
              className="text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 7-Day Visual Calendar Grid */}
        <div
          role="list"
          aria-label="Past 7 Days Streak Calendar"
          className="grid grid-cols-7 gap-1.5 sm:gap-2.5"
        >
          {streakCalendar.days.map((day) => {
            const isJustFrozen = freezeAnimDate === day.date;
            const canClickFreeze =
              (day.status === 'pending_today' || day.status === 'missed') &&
              (stats.streakFreezesAvailable ?? 0) > 0 &&
              Boolean(onActivateStreakFreeze);

            const statusLabel =
              day.status === 'completed'
                ? `Completed (${day.testsCount} test${day.testsCount === 1 ? '' : 's'})`
                : day.status === 'frozen'
                ? 'Protected by Streak Freeze'
                : day.status === 'pending_today'
                ? 'Today (Pending)'
                : day.status === 'missed'
                ? 'Missed'
                : 'Not Started';

            const cellClasses =
              day.status === 'completed'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                : day.status === 'frozen'
                ? 'bg-sky-50 dark:bg-sky-950/75 border-sky-400 dark:border-sky-600 text-sky-900 dark:text-sky-200'
                : day.status === 'pending_today'
                ? 'bg-amber-50/70 dark:bg-amber-950/40 border-dashed border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200'
                : day.status === 'missed'
                ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/70 text-rose-700 dark:text-rose-300'
                : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500';

            const innerContent = (
              <>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                  {day.dayShort}
                </span>
                <div
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center my-1 transition-transform ${
                    day.status === 'completed'
                      ? 'bg-emerald-500 text-white shadow-2xs'
                      : day.status === 'frozen'
                      ? 'bg-sky-500 text-white shadow-2xs'
                      : day.status === 'pending_today'
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      : day.status === 'missed'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      : 'bg-slate-200/70 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {day.status === 'completed' && <Flame className="w-4 h-4 fill-current" />}
                  {day.status === 'frozen' && <Snowflake className="w-4 h-4" />}
                  {day.status === 'pending_today' && <Clock className="w-3.5 h-3.5" />}
                  {day.status === 'missed' && <Minus className="w-3.5 h-3.5" />}
                  {day.status === 'inactive' && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                </div>
                <span className="text-[11px] sm:text-xs font-mono font-bold tabular-nums">
                  {day.dayNum}
                </span>
                <span className="hidden sm:block text-[9px] font-semibold uppercase tracking-tight truncate max-w-full mt-0.5 opacity-85">
                  {day.status === 'completed' && 'Done'}
                  {day.status === 'frozen' && 'Frozen'}
                  {day.status === 'pending_today' && 'Today'}
                  {day.status === 'missed' && 'Missed'}
                  {day.status === 'inactive' && '—'}
                </span>
                {day.isToday && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 sm:hidden">
                    Now
                  </span>
                )}
              </>
            );

            if (canClickFreeze) {
              return (
                <button
                  key={day.date}
                  type="button"
                  role="listitem"
                  onClick={() => handleTriggerStreakFreeze(day.date, `${day.monthShort} ${day.dayNum}`)}
                  aria-label={`${day.monthShort} ${day.dayNum}: ${statusLabel}. Activate Streak Freeze`}
                  title={`Click to protect ${day.monthShort} ${day.dayNum} with a Streak Freeze`}
                  className={`relative p-2 sm:p-3 rounded-xl border flex flex-col items-center justify-between text-center transition-all hover:scale-[1.02] cursor-pointer ${cellClasses} ${
                    isJustFrozen ? 'animate-freeze-burst ring-2 ring-sky-400' : ''
                  }`}
                >
                  {innerContent}
                </button>
              );
            }

            return (
              <div
                key={day.date}
                role="listitem"
                aria-label={`${day.monthShort} ${day.dayNum}: ${statusLabel}`}
                className={`relative p-2 sm:p-3 rounded-xl border flex flex-col items-center justify-between text-center transition-all ${cellClasses} ${
                  isJustFrozen ? 'animate-freeze-burst ring-2 ring-sky-400' : ''
                }`}
              >
                {innerContent}
              </div>
            );
          })}
        </div>

        {/* Legend & Next Milestone Progress Bar */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-[11px] text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span>Completed</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
                <span>Freeze Shield</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm border border-dashed border-amber-500 bg-amber-500/20" />
                <span>Today Pending</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-400/50" />
                <span>Missed</span>
              </span>
            </div>

            <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 font-mono tabular-nums">
              Next Reward ({streakCalendar.nextMilestone.days}d · {streakCalendar.nextMilestone.title}):{' '}
              <span className="text-amber-700 dark:text-amber-400 font-bold">
                {stats.currentStreak}/{streakCalendar.nextMilestone.days}d
              </span>
            </div>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-linear-to-r from-amber-500 via-orange-500 to-emerald-500 transition-all duration-700"
              style={{ width: `${Math.max(4, streakCalendar.progressToNextMilestonePct)}%` }}
            />
          </div>
        </div>

        {/* Milestone Rewards Cards with Claim & Unlock Animations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {STREAK_MILESTONE_REWARDS.map((reward) => {
            const bestReached = Math.max(stats.currentStreak, stats.longestStreak ?? 0);
            const isUnlocked = bestReached >= reward.days;
            const isClaimed = (stats.claimedMilestones || []).includes(reward.days);
            const isCelebrating = milestoneAnimDays === reward.days;

            return (
              <div
                key={reward.days}
                className={`relative overflow-hidden p-3.5 rounded-xl border text-xs flex flex-col justify-between gap-2.5 transition-all ${
                  isCelebrating
                    ? 'animate-milestone-pop bg-amber-50 dark:bg-amber-950/70 border-amber-400 dark:border-amber-500 text-amber-950 dark:text-amber-100 ring-2 ring-amber-400/60'
                    : isUnlocked
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/45 border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-white'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {(isCelebrating || (isUnlocked && !isClaimed)) && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-amber-300/25 to-transparent animate-milestone-sweep"
                  />
                )}

                <div className="space-y-1 relative z-10">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono font-bold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      {reward.days}-Day Streak
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isClaimed
                          ? 'bg-emerald-600 text-white'
                          : isUnlocked
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {isClaimed ? 'CLAIMED' : isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {reward.title}
                  </div>
                  <div className="text-[11px] opacity-90">{reward.rewardLabel}</div>
                </div>

                {isUnlocked && !isClaimed && onClaimMilestoneReward ? (
                  <button
                    type="button"
                    onClick={() => handleClaimMilestone(reward.days, reward.title, reward.rewardLabel)}
                    className="relative z-10 w-full py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Claim Reward</span>
                  </button>
                ) : (
                  <div className="relative z-10 text-[10px] font-medium opacity-75">
                    {isClaimed
                      ? 'Reward added to profile'
                      : `${Math.max(0, reward.days - bestReached)} more active day(s)`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Highlight Cards: Score Consistency & Growth Rate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Score Consistency Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Score Consistency
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>
                  {attempts.length === 0 ? '--% Stability' : `${analytics.consistencyRating}% Stability`}
                </span>
                {attempts.length > 0 && (
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    · Focus Index
                  </span>
                )}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {attempts.length > 0 ? (
              <>
                Minimal score variance (<span className="font-mono font-semibold text-slate-800 dark:text-slate-200">±{analytics.stdDev} marks</span> std dev) over the last {attempts.length} attempt(s) under the 10-second per-question timer constraint.
              </>
            ) : (
              'Write your first speed drill or 7:00 PM test to measure stability across the 10-second timer constraint.'
            )}
          </p>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Attempts Above Peer Avg:</span>
            <span className="font-bold text-slate-900 dark:text-white tabular-nums font-mono">
              {analytics.daysAboveAverage} / {attempts.length} Attempts
            </span>
          </div>
        </div>

        {/* 10-Attempt Growth Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  10-Attempt Score Growth
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-emerald-700 dark:text-emerald-400">
                  {attempts.length > 0 ? `${analytics.growthPct >= 0 ? '+' : ''}${analytics.growthPct}%` : '--'}
                </span>
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 font-normal">
                  ({analytics.growthMarks >= 0 ? `+${analytics.growthMarks}` : analytics.growthMarks} marks)
                </span>
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>

          {attempts.length > 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Progressed from <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{attempts[0]?.score ?? 0}</span> on {attempts[0]?.testDate} to <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{attempts[attempts.length - 1]?.score ?? 0}</span> on {attempts[attempts.length - 1]?.testDate}.{' '}
              {(attempts[attempts.length - 1]?.rank || stats.bestRank) > 0 ? (
                <>
                  Rank ascended to <span className="font-semibold text-slate-900 dark:text-white">#{attempts[attempts.length - 1]?.rank || stats.bestRank}</span>.
                </>
              ) : (
                'Official All-India rank unlocks after your first 7:00 PM IST daily exam.'
              )}
            </p>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Complete your first test to establish your baseline score and begin tracking your growth velocity.
            </p>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Growth Velocity:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums font-mono">
              {attempts.length > 0 ? `+${(analytics.growthMarks / Math.max(1, attempts.length)).toFixed(2)} marks / test` : '-- marks / test'}
            </span>
          </div>
        </div>
      </div>

      {/* 2B. Skill Tier Ladder, Streak Freeze Protection & Earned Badges */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                Tiered Competition Ladder · {stats.xpPoints ?? 0} XP
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Current Bracket: {activeSkillTier} Tier
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {skillMeta.summary}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-3 py-1.5 rounded-lg shrink-0 self-start sm:self-auto">
            <Snowflake className="w-3.5 h-3.5" />
            <span>{stats.streakFreezesAvailable ?? 1} Freeze Shield · {stats.streakFreezesUsed ?? 0} Used</span>
          </div>
        </div>

        {/* 4-Step Skill Bracket Ladder */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SKILL_TIERS_ORDER.map((tier, idx) => {
            const currentIdx = SKILL_TIERS_ORDER.indexOf(activeSkillTier);
            const isCurrent = tier === activeSkillTier;
            const isUnlocked = idx <= currentIdx;
            return (
              <div
                key={tier}
                className={`p-3 rounded-xl border text-xs transition-colors ${
                  isCurrent
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-500 shadow-xs'
                    : isUnlocked
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>{tier}</span>
                  <span className="text-[10px] font-mono">
                    {isCurrent ? 'ACTIVE' : isUnlocked ? 'CLEARED' : 'LOCKED'}
                  </span>
                </div>
                <div className={`text-[10px] mt-1 ${isCurrent ? 'text-slate-200' : 'opacity-80'}`}>
                  {tier === 'Bronze' && 'Entry Bracket'}
                  {tier === 'Silver' && '2+ Tests · ≥55% Acc'}
                  {tier === 'Gold' && '5+ Tests · ≥72% Acc'}
                  {tier === 'Grandmaster' && '10+ Tests · ≥85% Acc'}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="text-slate-600 dark:text-slate-300">
            Progress to {skillMeta.nextTier || 'Peak Mastery'}:{' '}
            <strong className="font-mono text-slate-900 dark:text-white">{skillMeta.progressToNextPct}%</strong>
            {stats.badges && stats.badges.length > 0 && (
              <span className="ml-3 text-amber-700 dark:text-amber-400 font-semibold">
                · Badges: {stats.badges.join(', ')}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Every 7-day streak earns +1 Streak Freeze (max 5)
          </div>
        </div>
      </div>


      {/* 3. Daily Goal Target-Setting & Progress Feature */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                <span>Daily Goal Target</span>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span className="text-slate-500 dark:text-slate-400">Next Exam Target</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
                Personal Target Score: {dailyGoal.toFixed(1)} / 30.0 Marks
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set your target score for today's 7:00 PM speed exam. Track real-time progress and closing gaps towards state rank benchmarks.
              </p>
            </div>
          </div>

          {/* Target Status Badge */}
          <div className="self-start sm:self-auto shrink-0">
            {isGoalAchieved ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Target Reached (+{goalDelta}m)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs font-bold">
                <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{goalProgressPct}% Reached ({(dailyGoal - currentLatestScore).toFixed(1)}m gap)</span>
              </div>
            )}
          </div>
        </div>

        {/* Visual Progress Bar to Target */}
        <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">Latest Attempt Score:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{currentLatestScore} marks</span>
              <span className="text-slate-400 dark:text-slate-500">({latestAttempt?.testDate || 'Latest'})</span>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">{goalProgressPct}% of Goal</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500 dark:text-slate-400">Target: <strong className="text-slate-900 dark:text-white">{dailyGoal.toFixed(1)}</strong></span>
            </div>
          </div>

          {/* Progress Track */}
          <div className="relative w-full h-4 bg-slate-200/80 dark:bg-slate-700/80 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isGoalAchieved
                  ? 'bg-emerald-500'
                  : 'bg-linear-to-r from-amber-500 via-orange-500 to-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(3, goalProgressPct))}%` }}
            />
          </div>

          {/* Advice / Gap Callout */}
          <div className="pt-1 flex items-start gap-2 text-xs">
            {isGoalAchieved ? (
              <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed">
                <strong className="font-semibold">Goal Surpassed:</strong> You scored {currentLatestScore} marks on your last exam, beating your daily target of {dailyGoal.toFixed(1)}. Outstanding speed control under the 10-second timer — consider raising your target for today&apos;s 7 PM test.
              </p>
            ) : (
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong className="font-semibold text-slate-800 dark:text-slate-200">Target in sight:</strong> You need <strong className="font-mono text-amber-700 dark:text-amber-400">{(dailyGoal - currentLatestScore).toFixed(2)} marks</strong> to reach your daily goal. To achieve this in 300 seconds: target at least <strong className="text-slate-800 dark:text-slate-200">{Math.ceil(dailyGoal)} correct answers</strong> with zero negative deductions, or {Math.min(30, Math.ceil(dailyGoal + 1))} correct with ≤2 errors.
              </p>
            )}
          </div>
        </div>

        {/* Target Setting Controls: Presets & Custom Stepper */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Select or Adjust Your Daily Target Score
            </span>
            <span className="text-slate-500 dark:text-slate-400">30 Questions · +1 / -0.25 format</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { score: 20.0, label: '20.0', desc: 'Passing Benchmark' },
              { score: 24.0, label: '24.0', desc: 'Top 10% Cutoff' },
              { score: 26.5, label: '26.5', desc: 'Merit Tier' },
              { score: 28.5, label: '28.5', desc: 'State Top 10' },
              { score: 30.0, label: '30.0', desc: 'Max Score' },
            ].map((preset) => {
              const isSelected = dailyGoal === preset.score;
              return (
                <button
                  key={preset.score}
                  type="button"
                  onClick={() => handleSetDailyGoal(preset.score)}
                  className={`flex-1 min-w-[100px] p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 dark:border-amber-500 bg-amber-50/80 dark:bg-amber-950/60 shadow-2xs ring-1 ring-amber-400'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-sm font-bold ${isSelected ? 'text-amber-900 dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>
                      {preset.label}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {preset.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Stepper & Custom Number Input */}
          <form onSubmit={handleCustomGoalSubmit} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Custom Target:</span>
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleSetDailyGoal(dailyGoal - 0.5)}
                  disabled={dailyGoal <= 5}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Decrease target by 0.5 marks"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <input
                  type="number"
                  step="0.5"
                  min="5"
                  max="30"
                  value={customGoalInput}
                  onChange={(e) => setCustomGoalInput(e.target.value)}
                  onBlur={() => {
                    const parsed = parseFloat(customGoalInput);
                    if (!isNaN(parsed)) handleSetDailyGoal(parsed);
                  }}
                  className="w-16 text-center font-mono font-bold text-sm text-slate-900 dark:text-white bg-transparent border-x border-slate-200 dark:border-slate-700 py-1 focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => handleSetDailyGoal(dailyGoal + 0.5)}
                  disabled={dailyGoal >= 30}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                  title="Increase target by 0.5 marks"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">/ 30 marks</span>
            </div>

            {/* Historical Goal Hit Rate */}
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span>Past 10 Attempts:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {attemptsMeetingGoal} / {attempts.length} ({goalHitRatePct}%)
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">met this target</span>
            </div>
          </form>
        </div>
      </div>

      {/* 4. Recharts Interactive Score Progression & 30-Day Rolling Accuracy/Speed */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        {/* Chart Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-700 dark:text-amber-400" />
              <span>
                {activeChartMetric === '30d_rolling'
                  ? '30-Day Rolling Accuracy & Speed Window'
                  : 'Score Progression & Trend Line (Last 10 Attempts)'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {activeChartMetric === '30d_rolling'
                ? 'Tracks accuracy percentage and average response speed (sec/question) over your 30-day rolling window.'
                : 'Interactive visualization rendering your score progression, consistency curve, and peer benchmarks.'}
            </p>
          </div>

          {/* Metric Selector Toggle */}
          <div
            role="tablist"
            aria-label="Analytics Chart View"
            className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs overflow-x-auto max-w-full"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeChartMetric === 'line'}
              onClick={() => setActiveChartMetric('line')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeChartMetric === 'line'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Trend Line
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeChartMetric === 'area'}
              onClick={() => setActiveChartMetric('area')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeChartMetric === 'area'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Area Fill
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeChartMetric === 'accuracy'}
              onClick={() => setActiveChartMetric('accuracy')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeChartMetric === 'accuracy'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Accuracy (%) &amp; Rank
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeChartMetric === '30d_rolling'}
              onClick={() => setActiveChartMetric('30d_rolling')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeChartMetric === '30d_rolling'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              30-Day Accuracy &amp; Speed
            </button>
          </div>
        </div>

        {/* Legend Row */}
        {activeChartMetric === '30d_rolling' ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Accuracy (%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Avg Speed (sec / question)</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {rolling30Data.length} active session day(s) recorded
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-500 border border-white dark:border-slate-800 shadow-2xs" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Your Score Line</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 bg-amber-500 border-dashed" />
                <span className="text-amber-800 dark:text-amber-400 font-bold">Daily Goal ({dailyGoal.toFixed(1)})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-slate-400 border-dashed" />
                <span className="text-slate-500 dark:text-slate-400">Peer Average (~21.5)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-500" />
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">Mean ({analytics.meanScore})</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              Hover over any attempt for detailed breakdown
            </div>
          </div>
        )}

        {/* Recharts Chart Component */}
        {(activeChartMetric === '30d_rolling' ? rolling30Data.length === 0 : chartData.length === 0) ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <BarChart3 className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" />
            <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
              {activeChartMetric === '30d_rolling'
                ? 'No 30-Day Rolling History Yet'
                : 'No Attempt History Plotted Yet'}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              {activeChartMetric === '30d_rolling'
                ? 'Complete a micro-challenge or 7:00 PM exam to chart your 30-day rolling accuracy and response speed.'
                : 'Your score trendline and consistency curves will automatically be plotted here in real time as you write exams.'}
            </p>
          </div>
        ) : (
          <div className="w-full h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {activeChartMetric === '30d_rolling' ? (
                <LineChart data={rolling30Data} margin={{ top: 12, right: 12, left: -12, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.35} />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis
                    yAxisId="left"
                    domain={[0, 100]}
                    stroke="#10b981"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 12]}
                    stroke="#f59e0b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                    tickFormatter={(v) => `${v}s`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900/95 text-white border border-slate-700 rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[180px]">
                            <div className="font-bold text-slate-200">{d.label} ({d.date})</div>
                            <div className="text-emerald-400 font-semibold">Accuracy: {d.accuracy}%</div>
                            <div className="text-amber-300 font-semibold">Avg Speed: {d.avgSpeedSec}s / Q</div>
                            <div className="text-slate-300">Avg Score: {d.score} · {d.testsCount} test(s)</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="accuracy"
                    name="Accuracy %"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981', stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgSpeedSec"
                    name="Avg Speed (s/Q)"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 1.5 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              ) : activeChartMetric === 'line' ? (
                <LineChart data={chartData} margin={{ top: 12, right: 16, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.35} />
                  <XAxis
                    dataKey="day"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis
                    domain={[0, 40]}
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                    ticks={[0, 10, 20, 30, 40]}
                  />
                  <Tooltip content={<CustomScoreTooltip />} />
                  <ReferenceLine
                    y={analytics.meanScore}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Avg: ${analytics.meanScore}`,
                      position: 'insideTopRight',
                      fill: '#10b981',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                  <ReferenceLine
                    y={dailyGoal}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.8}
                    label={{
                      value: `Goal: ${dailyGoal.toFixed(1)}`,
                      position: 'insideTopLeft',
                      fill: '#f59e0b',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="peerAvgScore"
                    name="Peer Average"
                    stroke="#94a3b8"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Your Score Trend"
                    stroke="#0ea5e9"
                    strokeWidth={3}
                    activeDot={{ r: 7, fill: '#0ea5e9', stroke: '#ffffff', strokeWidth: 2 }}
                    dot={{ r: 4, fill: '#0ea5e9', stroke: '#ffffff', strokeWidth: 1.5 }}
                  />
                </LineChart>
              ) : activeChartMetric === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 12, right: 16, left: -15, bottom: 5 }}>
                  <defs>
                    <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.35} />
                  <XAxis
                    dataKey="day"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis
                    domain={[0, 40]}
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                    ticks={[0, 10, 20, 30, 40]}
                  />
                  <Tooltip content={<CustomScoreTooltip />} />
                  <ReferenceLine
                    y={analytics.meanScore}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Avg: ${analytics.meanScore}`,
                      position: 'insideTopRight',
                      fill: '#10b981',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                  <ReferenceLine
                    y={dailyGoal}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.8}
                    label={{
                      value: `Goal: ${dailyGoal.toFixed(1)}`,
                      position: 'insideTopLeft',
                      fill: '#f59e0b',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="peerAvgScore"
                    name="Peer Average"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    name="Your Score"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#scoreFill)"
                    activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#ffffff', strokeWidth: 2 }}
                    dot={{ r: 4, fill: '#0ea5e9', stroke: '#ffffff', strokeWidth: 1.5 }}
                  />
                </AreaChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 12, right: 16, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" strokeOpacity={0.35} />
                  <XAxis
                    dataKey="day"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis
                    domain={[60, 100]}
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                    ticks={[60, 70, 80, 90, 100]}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[170px] border border-slate-700">
                            <div className="font-bold text-slate-200">{data.fullLabel}</div>
                            <div className="text-amber-300 font-semibold">
                              Accuracy: {data.accuracy}%
                            </div>
                            <div className="text-slate-300">
                              Rank: #{data.rank} ({data.percentile}th percentile)
                            </div>
                            <div className="text-slate-400">Score: {data.score} marks</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={80}
                    stroke="#cbd5e1"
                    strokeDasharray="3 3"
                    label={{
                      value: 'Target: 80%',
                      position: 'insideTopLeft',
                      fill: '#94a3b8',
                      fontSize: 10,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    name="Accuracy %"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* 10-Attempt Performance Matrix Mini-Cards */}
        {attempts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {attempts.map((att, i) => {
              const isLatest = i === attempts.length - 1;
              const isHighest = att.score === analytics.highestScore;
              return (
                <div
                  key={`${att.testDate}-${att.testTitle}-${i}`}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    isLatest
                      ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-900 dark:border-slate-700 shadow-xs'
                      : isHighest
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-slate-900 dark:text-white'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                  }`}
                >
                  <div
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      isLatest ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {att.testDate}
                  </div>
                  <div
                    className={`text-base font-bold font-mono mt-0.5 tabular-nums ${
                      isLatest ? 'text-white' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {att.score}
                  </div>
                  <div
                    className={`text-[10px] font-medium mt-0.5 ${
                      isLatest
                        ? 'text-emerald-300'
                        : isHighest
                        ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isHighest ? 'Peak' : `${att.accuracy}% acc`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Critical Insight: Negative Marking Diagnostic */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-slate-900 dark:text-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-700 dark:text-rose-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex flex-wrap items-center gap-1.5">
              <span>Negative Marking Penalty Diagnostic</span>
              <span className="text-slate-400 dark:text-slate-500 font-normal" aria-hidden="true">·</span>
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                High Impact
              </span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed max-w-xl">
              You have forfeited a cumulative{' '}
              <strong className="text-rose-700 dark:text-rose-400 font-mono font-bold">
                -{stats.marksLostToNegatives.toFixed(2)} marks
              </strong>{' '}
              across past tests due to aggressive guessing. Eliminating 3 wild guesses per test can
              boost your rank by ~38 positions.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center shrink-0 w-full sm:w-auto">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Impulsive Mistakes (&lt;2s)</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
            {stats.rapidMistakesCount} Questions
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500">Answered &lt;2s incorrectly</div>
        </div>
      </div>

      {/* 5. Subject Strength & Speed Breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 text-slate-900 dark:text-slate-100">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          <span>Subject Mastery & Speed Analysis</span>
        </h3>

        <div className="space-y-3.5">
          {stats.subjectPerformance.map((subj) => (
            <div key={subj.subject} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-800 dark:text-slate-200">{subj.subject}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 dark:text-slate-400 font-normal">
                    {subj.avgTimePerQuestion}s avg/Q
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                    {subj.accuracy}% Accuracy
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-slate-800 dark:bg-indigo-500 transition-all duration-300"
                  style={{ width: `${subj.accuracy}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Comprehensive Topic Mastery, Weekly/Monthly Trends & AI Recommendations */}
      <section
        aria-label="Comprehensive Syllabus Mastery and Trends"
        className="scroll-mt-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-5 text-slate-900 dark:text-slate-100"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Comprehensive Syllabus &amp; Trend Intelligence · {speedSessions.length} Drill Session(s)
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Topic-Wise Mastery, Consistency Score &amp; Trends
            </h3>
          </div>

          <div
            role="tablist"
            aria-label="Trend Granularity"
            className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 self-start sm:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={trendView === 'weekly'}
              onClick={() => setTrendView('weekly')}
              className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap ${
                trendView === 'weekly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Weekly Trends
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={trendView === 'monthly'}
              onClick={() => setTrendView('monthly')}
              className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap ${
                trendView === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly Trends
            </button>
          </div>
        </div>

        {/* 4 Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Consistency Score
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              {comprehensive.consistencyScore}/100
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Study Days
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              {comprehensive.activeStudyDays}
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Strongest Subjects
            </div>
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1 leading-snug">
              {comprehensive.strongestSubjects.length > 0
                ? comprehensive.strongestSubjects.join(', ')
                : 'Awaiting ≥70% data'}
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Weakest Subjects
            </div>
            <div className="text-xs font-bold text-rose-700 dark:text-rose-400 mt-1 leading-snug">
              {comprehensive.weakestSubjects.length > 0
                ? comprehensive.weakestSubjects.join(', ')
                : 'No <60% weak flags'}
            </div>
          </div>
        </div>

        {/* Weekly / Monthly Trends Table */}
        {(() => {
          const rows =
            trendView === 'weekly' ? comprehensive.weeklyTrends : comprehensive.monthlyTrends;
          return rows.length === 0 ? (
            <div className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 text-center text-xs text-slate-500 dark:text-slate-400">
              Complete an official Daily Exam or Custom Test to plot your {trendView} aggregation table.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-[11px] sm:text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-2 sm:px-3 whitespace-nowrap">Period</th>
                    <th className="py-2.5 px-1.5 sm:px-3 text-center whitespace-nowrap">Tests</th>
                    <th className="py-2.5 px-1.5 sm:px-3 text-center whitespace-nowrap">
                      <span className="hidden sm:inline">Avg </span>Score
                    </th>
                    <th className="py-2.5 px-1.5 sm:px-3 text-center whitespace-nowrap">
                      <span className="hidden sm:inline">Avg </span>Acc
                    </th>
                    <th className="py-2.5 px-2 sm:px-3 text-right whitespace-nowrap">
                      <span className="sm:hidden">Index</span>
                      <span className="hidden sm:inline">Consistency Index</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((r) => (
                    <tr key={r.periodLabel}>
                      <td className="py-2.5 px-2 sm:px-3 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {r.periodLabel}
                      </td>
                      <td className="py-2.5 px-1.5 sm:px-3 text-center font-mono tabular-nums">{r.testsCount}</td>
                      <td className="py-2.5 px-1.5 sm:px-3 text-center font-mono font-bold tabular-nums">
                        {r.avgScore}
                      </td>
                      <td className="py-2.5 px-1.5 sm:px-3 text-center font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {r.avgAccuracy}%
                      </td>
                      <td className="py-2.5 px-2 sm:px-3 text-right font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                        {r.consistencyIndex}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* Subject Strength Comparison Grid */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Subject Strength Comparison
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {comprehensive.subjectComparison.map((item) => (
              <div
                key={item.subject}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 dark:text-white truncate">{item.subject}</span>
                  <span
                    className={`font-semibold text-[11px] shrink-0 ${
                      item.tier === 'Strong'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : item.tier === 'Weak'
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {item.tier}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {item.attempted > 0
                    ? `${item.accuracy}% acc · ${item.avgSpeedSec}s/Q · ${item.attempted}Q`
                    : 'No attempts yet'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Topic Mastery & Revision Backlog */}
        {comprehensive.topicMastery.length > 0 && (
          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Topic Mastery &amp; Revision Backlog</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {comprehensive.topicMastery.slice(0, 6).map((tm) => (
                <div
                  key={`${tm.subject}-${tm.topic}`}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {tm.subject} ·{' '}
                      <span
                        className={
                          tm.status === 'Strong'
                            ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                            : tm.status === 'Needs Focus'
                            ? 'text-rose-700 dark:text-rose-400 font-semibold'
                            : 'text-amber-700 dark:text-amber-400 font-semibold'
                        }
                      >
                        {tm.status}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white truncate">{tm.topic}</div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                      {tm.accuracy}% accuracy · {tm.avgSpeedSec}s/Q ({tm.correct}/{tm.attempted})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLaunchPracticeTopic(tm.topic)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Practice Topic</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personalized Insights */}
        {comprehensive.personalizedInsights.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Personalized Preparation Action Plan</span>
            </div>
            <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 list-disc pl-4">
              {comprehensive.personalizedInsights.map((insight, idx) => (
                <li key={idx} className="leading-relaxed">
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
};
