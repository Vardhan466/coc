import React, { useState, useEffect } from 'react';
import { Attempt, TestPaper, UserProfile } from '../types';
import { getTranslation } from '../utils/i18n';
import {
  getISTNowParts,
  parseHHMMToSeconds,
  isDailyExamWindowLive,
  isCustomTestWindowActiveIST,
  formatCountdownHMS,
} from '../utils/istTime';
import type { DailyExamScheduleConfig, StudyPlanDay } from '../types/aiSystem';
import type { PracticeSubTab } from './PracticeView';
import { resolveCurrentStudyDay, shiftIsoDate } from '../utils/syllabus100Weeks';
import { TopicFormulaSlideDeck } from './TopicFormulaSlideDeck';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  FileText,
  FileKey,
  Users,
  Timer,
  Play,
  Award,
  Zap,
  Check,
  Sparkles,
  BookOpen,
  Trash2,
} from 'lucide-react';

function formatHHMMTo12h(hhmm: string): string {
  const [rawH, rawM] = hhmm.split(':').map(Number);
  const h = Number.isFinite(rawH) ? rawH : 19;
  const m = Number.isFinite(rawM) ? rawM : 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

interface TestsViewProps {
  testPapers: TestPaper[];
  user: UserProfile;
  userAttempt?: Attempt;
  customTestAttempts?: Record<string, Attempt>;
  currentSimulatedTime?: string;
  scheduleConfig?: DailyExamScheduleConfig;
  todayStudyTopic?: StudyPlanDay | null;
  nextDayStudyTopic?: StudyPlanDay | null;
  onStartExam: (test: TestPaper) => void;
  onNavigateToProfile: () => void;
  onNavigateToResults?: () => void;
  onViewCustomResult?: (test: TestPaper) => void;
  onNavigateToPractice?: (subTab?: PracticeSubTab) => void;
  onDeleteCustomTest?: (testId: string) => void;
}

export const TestsView: React.FC<TestsViewProps> = ({
  testPapers,
  user,
  userAttempt,
  customTestAttempts = {},
  scheduleConfig,
  todayStudyTopic,
  nextDayStudyTopic,
  onStartExam,
  onNavigateToProfile,
  onNavigateToResults,
  onViewCustomResult,
  onNavigateToPractice,
  onDeleteCustomTest,
}) => {
  const t = getTranslation(user.language);
  const todayTest = testPapers.find((p) => !p.isCustomScheduled) || testPapers[0];
  const customScheduledTests = testPapers.filter((p) => p.isCustomScheduled);

  const todayQuestionCount = todayTest.questions?.length || todayTest.totalQuestions || 30;
  const todayQuestionDuration = todayTest.questionDurationSeconds || 10;
  const todayDurationSeconds =
    todayTest.totalDurationSeconds || todayQuestionCount * todayQuestionDuration;
  const todayDurationMins = Math.max(1, Math.round(todayDurationSeconds / 60));

  // Live wall-clock ticker (updates every second, anchored strictly to IST)
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const [pendingDeleteCustomId, setPendingDeleteCustomId] = useState<string | null>(null);
  const [topicDeckTab, setTopicDeckTab] = useState<'today' | 'tomorrow' | null>(null);

  const cleanTestTitle = (title: string) =>
    (title || '').replace(/ · Week \d+ Day \d+/gi, '').replace(/Week \d+ · Day \d+ · /gi, '');

  const istNow = getISTNowParts(nowMs);
  const effectiveTodayTopic =
    todayStudyTopic ||
    resolveCurrentStudyDay(scheduleConfig?.cohortStartDate || '2026-10-01', nowMs);
  const effectiveNextDayTopic =
    nextDayStudyTopic ||
    resolveCurrentStudyDay(
      scheduleConfig?.cohortStartDate || '2026-10-01',
      nowMs,
      {},
      shiftIsoDate(istNow.isoDate, 1)
    );

  const currentSecondsOfDay = istNow.secondsSinceMidnight;

  const windowStartStr = scheduleConfig?.examStartTime || todayTest.windowStart || '19:00';
  const windowEndStr = scheduleConfig?.examEndTime || todayTest.windowEnd || '19:15';
  const answerKeyReleaseStr = scheduleConfig?.answerKeyReleaseTime || todayTest.answerKeyReleaseTime || '20:00';

  const windowStartDisplay = formatHHMMTo12h(windowStartStr);
  const windowEndDisplay = formatHHMMTo12h(windowEndStr);
  const answerKeyReleaseDisplay = formatHHMMTo12h(answerKeyReleaseStr);

  const windowStartSeconds = parseHHMMToSeconds(windowStartStr);
  const windowEndSeconds = parseHHMMToSeconds(windowEndStr);
  const preExamStartSeconds = Math.max(0, windowStartSeconds - 3600);
  const lobbyStartDisplay = formatHHMMTo12h(
    `${String(Math.floor(preExamStartSeconds / 3600)).padStart(2, '0')}:${String(
      Math.floor((preExamStartSeconds % 3600) / 60)
    ).padStart(2, '0')}`
  );

  const isRealBefore7PM = currentSecondsOfDay < windowStartSeconds;
  const isRealBetween7And715 = isDailyExamWindowLive(windowStartStr, windowEndStr, nowMs);
  const isRealAfter715 = currentSecondsOfDay >= windowEndSeconds;

  // Has the student completed today's official test attempt?
  const hasCompletedToday = Boolean(userAttempt && userAttempt.testId === todayTest.id);

  // Strict IST Pre-Exam Lobby (60 min prior to scheduled start time)
  const isPreExamWindowActive =
    currentSecondsOfDay >= preExamStartSeconds &&
    currentSecondsOfDay < windowStartSeconds &&
    !hasCompletedToday;

  // Effective window state
  const isLiveWindow = isRealBetween7And715 && !hasCompletedToday;
  const isBefore7PM = isRealBefore7PM && !hasCompletedToday;
  const isPastWindow = hasCompletedToday || isRealAfter715;

  // Countdown to TODAY scheduled exam start IST
  const secondsToToday7PM = Math.max(0, windowStartSeconds - currentSecondsOfDay);
  const today7Hours = Math.floor(secondsToToday7PM / 3600);
  const today7Mins = Math.floor((secondsToToday7PM % 3600) / 60);
  const today7Secs = secondsToToday7PM % 60;

  // Countdown to scheduled end IST (Window closing)
  const secondsToWindowClose = Math.max(0, windowEndSeconds - currentSecondsOfDay);
  const windowCloseMins = Math.floor(secondsToWindowClose / 60);
  const windowCloseSecs = secondsToWindowClose % 60;

  // Countdown to NEXT DATE scheduled start IST
  const secondsToNextDate7PM =
    currentSecondsOfDay < windowStartSeconds
      ? windowStartSeconds - currentSecondsOfDay
      : 86400 - currentSecondsOfDay + windowStartSeconds;
  const next7Hours = Math.floor(secondsToNextDate7PM / 3600);
  const next7Mins = Math.floor((secondsToNextDate7PM % 3600) / 60);
  const next7Secs = secondsToNextDate7PM % 60;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Profile Incomplete Notice */}
      {!user.profileComplete && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950 dark:text-amber-100">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                Profile Verification Required
              </div>
              <p className="text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                To prevent fraudulent duplicate entries, all-India 7 PM exams require a verified state and district.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToProfile}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-lg text-xs shrink-0 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* 6:00 PM – 7:00 PM Pre-Exam Preparation Banner with Live Countdown & Browser Notification */}
      {isPreExamWindowActive && (
        <div className="relative overflow-hidden bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 space-y-4">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

          {/* Banner Header */}
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-[11px] font-bold tracking-wider uppercase text-amber-400">
                  Pre-Exam Lobby ({lobbyStartDisplay} – {windowStartDisplay} IST)
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-1">
                  High-Stakes {windowStartDisplay} IST Exam Starts Soon — Prepare Your Setup!
                </h2>
              </div>
            </div>

            {/* Countdown Badge to start */}
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl self-start sm:self-auto shadow-inner">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-xs">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Countdown to {windowStartDisplay}</div>
                <div className="font-mono text-base sm:text-lg font-extrabold text-amber-400 tabular-nums">
                  {today7Hours > 0 ? `${today7Hours}h ` : ''}
                  {String(today7Mins).padStart(2, '0')}m {String(today7Secs).padStart(2, '0')}s
                </div>
              </div>
            </div>
          </div>

          {/* Motivational & Readiness Summary */}
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 text-xs space-y-1">
              <div className="text-slate-400 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Candidate</span>
              </div>
              <div className="font-mono text-slate-200 font-bold truncate">
                {user.studentId}
              </div>
              <div className="text-[11px] text-slate-400">
                {user.fullName} · {user.address.state}
              </div>
            </div>

            <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 text-xs space-y-1">
              <div className="text-slate-400 font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>High-Speed Format</span>
              </div>
              <div className="text-slate-200 font-bold">
                {todayQuestionCount} Questions in {todayDurationSeconds} Seconds
              </div>
              <div className="text-[11px] text-amber-300/90 font-medium">
                {todayQuestionDuration}s/Q limit · Strict forward flow
              </div>
            </div>

            <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 text-xs space-y-1">
              <div className="text-slate-400 font-semibold flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-400" />
                <span>Marking Strategy</span>
              </div>
              <div className="text-slate-200 font-bold">
                +1 Correct · -0.25 Negative
              </div>
              <div className="text-[11px] text-slate-400">
                0 for skipped · No negative guesswork
              </div>
            </div>
          </div>

          {/* Lobby Status Footer */}
          <div className="relative flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Stay on this tab — the official &ldquo;Write Exam&rdquo; button activates automatically at {windowStartDisplay} IST.</span>
            </div>
          </div>
        </div>
      )}

      {/* Primary Card: Today's Daily Official Test */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7 shadow-xs space-y-5 text-slate-900 dark:text-slate-100 transition-colors">
        {/* Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
              {todayTest.testCode}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              · {t.todaysOfficialTest}
            </span>
          </div>

          {/* Status Indicator */}
          <div className="text-xs font-semibold flex items-center gap-2">
            {hasCompletedToday ? (
              <span className="text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-md flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Today's Exam Completed</span>
              </span>
            ) : isLiveWindow ? (
              <span className="text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-md flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>ENTRY WINDOW LIVE ({windowStartDisplay} – {windowEndDisplay})</span>
              </span>
            ) : isBefore7PM ? (
              <span className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Lobby · Entry Opens at {windowStartDisplay} IST</span>
              </span>
            ) : (
              <span className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-md flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Today's Window Closed ({windowEndDisplay} IST)</span>
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {cleanTestTitle(todayTest.title)}
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
            {todayTest.description?.replace(/100-Week Plan Focus:/gi, 'Daily Exam Focus:')}
          </p>
        </div>

        {/* Timing Guarantee Callout */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
          <Timer className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
          <span>{t.fullDurationGuaranteed}</span>
        </div>

        {/* Daily Exam Topic Slide Deck: Automatically shifts to Tomorrow's AI-Selected Topic after test completion / results */}
        {(() => {
          const showNextDayByDefault = isPastWindow || hasCompletedToday;
          const activeDeckTab: 'today' | 'tomorrow' =
            topicDeckTab ?? (showNextDayByDefault ? 'tomorrow' : 'today');
          const showingTomorrow = activeDeckTab === 'tomorrow';
          const activeTopicForDeck = showingTomorrow ? effectiveNextDayTopic : effectiveTodayTopic;

          return (
            <div className="space-y-2.5">
              {showNextDayByDefault && (
                <div
                  data-testid="next-day-topic-banner"
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-emerald-50/80 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/70 rounded-xl px-4 py-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        AI Selected Next-Day Exam Topic (Non-Repeating Daily Pool)
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        Tomorrow&apos;s Test: {effectiveNextDayTopic.topic} · {effectiveNextDayTopic.subject}
                      </div>
                    </div>
                  </div>

                  <div
                    role="tablist"
                    aria-label="Exam Topic Formula Deck View"
                    className="inline-flex items-center gap-1 p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-center"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={showingTomorrow}
                      onClick={() => setTopicDeckTab('tomorrow')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        showingTomorrow
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      Tomorrow&apos;s Prep
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={!showingTomorrow}
                      onClick={() => setTopicDeckTab('today')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        !showingTomorrow
                          ? 'bg-slate-900 dark:bg-slate-700 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      Today&apos;s Review
                    </button>
                  </div>
                </div>
              )}

              <TopicFormulaSlideDeck
                todayTopic={activeTopicForDeck}
                testTitle={showingTomorrow ? activeTopicForDeck.topic : cleanTestTitle(todayTest.title)}
                testDescription={showingTomorrow ? activeTopicForDeck.topicDescription : todayTest.description}
                eyebrowLabel={
                  showingTomorrow
                    ? "Tomorrow's Exam Topic · Cheat Codes & Main Formulas"
                    : "Today's Test Topic · Formulas & Cheat Codes"
                }
                badgeNote={
                  showingTomorrow
                    ? `AI Next-Day Routine · Topic ${activeTopicForDeck.globalDayIndex}/500`
                    : `Daily Topic ${activeTopicForDeck.globalDayIndex}/500`
                }
              />
            </div>
          );
        })()}

        {/* 4 Key Metric Boxes - 30 Questions, 10s/Q, 5m Duration */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">{t.totalQuestions}</div>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">{todayQuestionCount} Questions</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Speed across 4 topics</div>
          </div>
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">{t.totalDuration}</div>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">{todayDurationMins}m ({todayQuestionDuration}s/Q)</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{todayQuestionDuration}s auto-advance</div>
          </div>
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">{t.markingScheme}</div>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">{t.markingText}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">0 for unattempted</div>
          </div>
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">{t.activeContestants}</div>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">{t.contestantsCount}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">All-India live rank</div>
          </div>
        </div>


        {/* ACTION AREA: STRICT 7:00-7:15 PM WRITE EXAM VS COUNTDOWN TIMER */}
        <div className="pt-2">
          {/* CASE 1: INSIDE THE 7:00 - 7:15 PM WINDOW (AND NOT YET ATTEMPTED) */}
          {isLiveWindow && (
            <div className="space-y-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
                      Official Entry Window is Live Now
                    </div>
                    <div className="text-emerald-700 dark:text-emerald-300">
                      Window closes in <span className="font-mono font-bold text-emerald-900 dark:text-white">{String(windowCloseMins).padStart(2, '0')}:{String(windowCloseSecs).padStart(2, '0')}</span> IST. Launch to write your exam!
                    </div>
                  </div>
                </div>

                <div className="font-mono text-sm font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-100/70 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 px-3 py-1.5 rounded-lg">
                  {String(windowCloseMins).padStart(2, '0')}:{String(windowCloseSecs).padStart(2, '0')} remaining
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => onStartExam(todayTest)}
                  disabled={!user.profileComplete}
                  className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base transition-colors shadow-sm flex items-center justify-center gap-2.5 cursor-pointer ${
                    !user.profileComplete
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Write Exam Now ({todayQuestionCount}Q · {todayDurationSeconds}s)</span>
                </button>
              </div>
            </div>
          )}

          {/* CASE 2: BEFORE SCHEDULED START TODAY -> COUNTDOWN TIMER */}
          {isBefore7PM && (
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-5 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-slate-700 dark:text-slate-200 font-semibold text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>Today&apos;s Exam Launches Strictly at {windowStartDisplay} IST</span>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                Entry window runs {windowStartDisplay} to {windowEndDisplay} IST. Countdown to entry opening:
              </div>

              {/* Countdown Digits to start */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 sm:px-4 py-2 min-w-[64px] sm:min-w-[76px] shadow-2xs">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                    {String(today7Hours).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Hours</div>
                </div>

                <span className="text-xl font-bold text-slate-400 dark:text-slate-500 pb-2">:</span>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 sm:px-4 py-2 min-w-[64px] sm:min-w-[76px] shadow-2xs">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                    {String(today7Mins).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Minutes</div>
                </div>

                <span className="text-xl font-bold text-slate-400 dark:text-slate-500 pb-2">:</span>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 sm:px-4 py-2 min-w-[64px] sm:min-w-[76px] shadow-2xs">
                  <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                    {String(today7Secs).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Seconds</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                The <span className="font-semibold text-slate-700 dark:text-slate-300">Write Exam</span> button will become active automatically at {windowStartDisplay} IST.
              </div>
            </div>
          )}

          {/* CASE 3: AFTER WINDOW CLOSES OR EXAM COMPLETED -> COUNTDOWN TO NEXT DATE */}
          {isPastWindow && (
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-5 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>Next Official Exam: Tomorrow at {windowStartDisplay} IST</span>
              </div>

              {hasCompletedToday ? (
                <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  You have successfully submitted today's exam! Ranks are calculated against all competitors.
                </div>
              ) : (
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Today&apos;s {windowStartDisplay} – {windowEndDisplay} entry window has concluded. Prepare for tomorrow&apos;s live test:
                </div>
              )}

              {/* Countdown Digits to Next Date start */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 sm:px-4 py-2 min-w-[64px] sm:min-w-[76px] shadow-2xs">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                    {String(next7Hours).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Hours</div>
                </div>

                <span className="text-xl font-bold text-slate-400 dark:text-slate-500 pb-2">:</span>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 sm:px-4 py-2 min-w-[64px] sm:min-w-[76px] shadow-2xs">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                    {String(next7Mins).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Minutes</div>
                </div>

                <span className="text-xl font-bold text-slate-400 dark:text-slate-500 pb-2">:</span>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 sm:px-4 py-2 min-w-[64px] sm:min-w-[76px] shadow-2xs">
                  <div className="text-2xl sm:text-3xl font-black text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                    {String(next7Secs).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Seconds</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                {hasCompletedToday && onNavigateToResults && (
                  <button
                    type="button"
                    onClick={onNavigateToResults}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                  >
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>View Today's Rankcard & Leaderboard</span>
                  </button>
                )}
                {onNavigateToPractice && (
                  <button
                    type="button"
                    onClick={() => onNavigateToPractice('key_sheet')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 dark:bg-emerald-600 hover:bg-emerald-800 dark:hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                  >
                    <FileKey className="w-4 h-4" />
                    <span>{answerKeyReleaseDisplay} Master Key Sheet Drill &amp; Explanations</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SEPARATE SECTION: ADMIN SCHEDULED & ON-DEMAND TESTS */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Special Scheduled &amp; On-Demand Exams
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Custom timed tests scheduled by administrators at specific times. Results are published on independent scorecards and do not affect the main 7:00 PM All-India Leaderboard.
            </p>
          </div>

          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg self-start sm:self-auto border border-slate-200 dark:border-slate-700">
            {customScheduledTests.length} Scheduled {customScheduledTests.length === 1 ? 'Exam' : 'Exams'}
          </div>
        </div>

        {customScheduledTests.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              No Additional Scheduled Exams Right Now
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Admins can schedule on-demand timed exams at any time from the Admin Operations Portal. When scheduled, they will appear right here in this separate section.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {customScheduledTests.map((customTest) => {
              const attempt = customTestAttempts[customTest.id];
              const isCompleted = Boolean(attempt);

              // Strict IST window enforcement for custom scheduled tests
              const startTimeStr = customTest.scheduledStartTime || customTest.windowStart || '20:30';
              const customStatus = isCustomTestWindowActiveIST(customTest, nowMs);
              const customCountdown = formatCountdownHMS(customStatus.secondsToStart);
              const customLiveCountdown = formatCountdownHMS(customStatus.secondsToEnd);

              const isBeforeWindow = customStatus.status === 'upcoming';
              const isInsideWindow = customStatus.status === 'live';

              const qCount = customTest.questions?.length || customTest.totalQuestions || 30;
              const durMins = customTest.totalDurationSeconds
                ? Math.max(1, Math.round(customTest.totalDurationSeconds / 60))
                : Math.max(1, Math.round((qCount * (customTest.questionDurationSeconds || 10)) / 60));

              return (
                <div
                  key={customTest.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs hover:border-indigo-200 dark:hover:border-indigo-500/40 transition-colors space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                        {customTest.testCode}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {customTest.category || 'Special Practice Assessment'}
                      </span>
                    </div>

                    <div className="text-xs font-semibold">
                      {isCompleted ? (
                        <span className="text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Exam Completed</span>
                        </span>
                      ) : isInsideWindow ? (
                        <span className="text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>WINDOW LIVE ({startTimeStr} IST)</span>
                        </span>
                      ) : isBeforeWindow ? (
                        <span className="text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Scheduled for {startTimeStr} IST</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>Window Concluded ({startTimeStr} IST)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {customTest.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl">
                        {customTest.description}
                      </p>
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {qCount} Questions
                        </span>
                        <span>·</span>
                        <span>{durMins} mins</span>
                        <span>·</span>
                        <span className="text-amber-700 dark:text-amber-400 font-medium">{customTest.questionDurationSeconds || 10}s/Question rule</span>
                        <span>·</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">Isolated Scorecard</span>
                      </div>
                    </div>

                    {/* Action Area */}
                    <div className="shrink-0 flex items-center gap-2">
                      {isCompleted ? (
                        <button
                          type="button"
                          onClick={() => onViewCustomResult?.(customTest)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                        >
                          <Award className="w-4 h-4" />
                          <span>View Test Results</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!isInsideWindow}
                          onClick={() => isInsideWindow && onStartExam(customTest)}
                          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-2 ${
                            isInsideWindow
                              ? 'bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white cursor-pointer'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          {isInsideWindow ? (
                            <>
                              <Play className="w-4 h-4 fill-current" />
                              <span>Write Exam Now ({customLiveCountdown.formatted} left)</span>
                            </>
                          ) : isBeforeWindow ? (
                            <>
                              <Clock className="w-4 h-4" />
                              <span>Opens {startTimeStr} IST ({customCountdown.formatted})</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4" />
                              <span>Entry Window Closed</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Admin Delete Action */}
                      {(user.role === 'superAdmin' || user.role === 'contentAdmin' || user.email?.toLowerCase() === 'ssuspect542@gmail.com') && onDeleteCustomTest && (
                        pendingDeleteCustomId === customTest.id ? (
                          <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/60 p-1 rounded-lg border border-rose-200 dark:border-rose-800">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteCustomTest(customTest.id);
                                setPendingDeleteCustomId(null);
                              }}
                              className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteCustomId(null)}
                              className="px-2 py-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingDeleteCustomId(customTest.id)}
                            title="Delete this scheduled exam"
                            className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Isolated Scorecard Guarantee Note */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 border border-slate-100 dark:border-slate-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>
                      Results for this test are evaluated separately on its dedicated scorecard and do not affect the 7:00 PM All-India Daily Leaderboard.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rules and Integrity Details */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-700 dark:text-slate-400" />
          <span>{t.antiCheatTitle}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white">{t.rule1Title}</div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t.rule1Desc}</p>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white">{t.rule2Title}</div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t.rule2Desc}</p>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white">{t.rule3Title}</div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t.rule3Desc}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
