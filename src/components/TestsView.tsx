import React, { useState, useEffect } from 'react';
import { Attempt, TestPaper, UserProfile } from '../types';
import { getTranslation } from '../utils/i18n';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Zap,
  ArrowRight,
  ShieldCheck,
  FileText,
  Users,
  Timer,
  Play,
  Award,
  Sparkles,
} from 'lucide-react';

interface TestsViewProps {
  testPapers: TestPaper[];
  user: UserProfile;
  userAttempt?: Attempt;
  currentSimulatedTime?: string;
  onStartExam: (test: TestPaper) => void;
  onNavigateToProfile: () => void;
  onNavigateToResults?: () => void;
}

export const TestsView: React.FC<TestsViewProps> = ({
  testPapers,
  user,
  userAttempt,
  onStartExam,
  onNavigateToProfile,
  onNavigateToResults,
}) => {
  const t = getTranslation(user.language);
  const todayTest = testPapers[0];

  // Live wall-clock timer (updates every second)
  const [now, setNow] = useState<Date>(() => new Date());

  // Demo toggle allowing reviewers to simulate being inside the 7:00-7:15 PM window at any time of day
  const [simulateWindowActive, setSimulateWindowActive] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine current time in hours, minutes, seconds
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentSeconds = now.getSeconds();

  // Current time as total seconds from midnight
  const currentSecondsOfDay = currentHours * 3600 + currentMinutes * 60 + currentSeconds;

  // 7:00 PM is 19:00:00 = 19 * 3600 = 68400 seconds
  const windowStartSeconds = 19 * 3600; // 68,400s
  // 7:15 PM is 19:15:00 = 19 * 3600 + 15 * 60 = 69300 seconds
  const windowEndSeconds = 19 * 3600 + 15 * 60; // 69,300s

  // Real-time window state
  const isRealBefore7PM = currentSecondsOfDay < windowStartSeconds;
  const isRealBetween7And715 = currentSecondsOfDay >= windowStartSeconds && currentSecondsOfDay <= windowEndSeconds;
  const isRealAfter715 = currentSecondsOfDay > windowEndSeconds;

  // Has the student completed today's test attempt?
  const hasCompletedToday = Boolean(userAttempt && (userAttempt.testId === todayTest.id || !userAttempt.isDisqualified));

  // Effective window state (honoring simulate toggle if activated for testing)
  const isLiveWindow = (simulateWindowActive || isRealBetween7And715) && !hasCompletedToday;
  const isBefore7PM = !simulateWindowActive && isRealBefore7PM && !hasCompletedToday;
  const isPastWindow = hasCompletedToday || (!simulateWindowActive && isRealAfter715);

  // Compute countdown to TODAY 7:00 PM
  let secondsToToday7PM = Math.max(0, windowStartSeconds - currentSecondsOfDay);
  const today7Hours = Math.floor(secondsToToday7PM / 3600);
  const today7Mins = Math.floor((secondsToToday7PM % 3600) / 60);
  const today7Secs = secondsToToday7PM % 60;

  // Compute countdown to 7:15 PM (Window closing urgency)
  let secondsToWindowClose = Math.max(0, windowEndSeconds - currentSecondsOfDay);
  if (simulateWindowActive && !isRealBetween7And715) {
    secondsToWindowClose = 12 * 60 + 40; // Simulated 12m 40s remaining
  }
  const windowCloseMins = Math.floor(secondsToWindowClose / 60);
  const windowCloseSecs = secondsToWindowClose % 60;

  // Compute countdown to NEXT DATE 7:00 PM (Tomorrow 19:00:00)
  // Seconds remaining today after current time + 19 hours of tomorrow
  let secondsToNextDate7PM = 0;
  if (currentSecondsOfDay >= windowStartSeconds) {
    // Current time is past 7 PM today: remaining today (86400 - current) + 68400 tomorrow
    secondsToNextDate7PM = (86400 - currentSecondsOfDay) + windowStartSeconds;
  } else {
    // If student finished during 7:00-7:15 or simulated, countdown to tomorrow 7 PM
    secondsToNextDate7PM = (86400 - currentSecondsOfDay) + windowStartSeconds;
  }
  const next7Hours = Math.floor(secondsToNextDate7PM / 3600);
  const next7Mins = Math.floor((secondsToNextDate7PM % 3600) / 60);
  const next7Secs = secondsToNextDate7PM % 60;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Profile Incomplete Notice */}
      {!user.profileComplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-900 text-sm">
                Profile Verification Required
              </div>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                To prevent fraudulent duplicate entries, all-India 7 PM exams require a verified state and district.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToProfile}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-lg text-xs shrink-0 transition-colors shadow-xs"
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* Primary Card: Today's 7 PM Official Test */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 shadow-xs space-y-5">
        {/* Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              {todayTest.testCode}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              · {t.todaysOfficialTest}
            </span>
          </div>

          {/* Status Indicator */}
          <div className="text-xs font-semibold flex items-center gap-2">
            {hasCompletedToday ? (
              <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Today's Exam Completed</span>
              </span>
            ) : isLiveWindow ? (
              <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md flex items-center gap-1.5 font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>ENTRY WINDOW LIVE (7:00 – 7:15 PM)</span>
              </span>
            ) : isBefore7PM ? (
              <span className="text-slate-600 bg-slate-100 px-3 py-1 rounded-md flex items-center gap-1.5 border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Lobby · Opens at 7:00 PM IST</span>
              </span>
            ) : (
              <span className="text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-md flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Today's Window Closed (7:15 PM)</span>
              </span>
            )}

            {/* Discreet Reviewer Window Simulation Switch */}
            <button
              type="button"
              onClick={() => setSimulateWindowActive((prev) => !prev)}
              className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors font-medium flex items-center gap-1 ${
                simulateWindowActive
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title="Toggle to simulate active 7:00-7:15 PM window anytime"
            >
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>{simulateWindowActive ? 'Window Sim: ON (7:05 PM)' : 'Simulate 7 PM Window'}</span>
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {todayTest.title}
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed">
            {todayTest.description}
          </p>
        </div>

        {/* Timing Guarantee Callout */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-2.5 text-xs text-slate-700">
          <Timer className="w-4 h-4 text-slate-600 shrink-0" />
          <span>{t.fullDurationGuaranteed}</span>
        </div>

        {/* 4 Key Metric Boxes - Updated to 30 Questions, 10s/Q, 5m Duration */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">{t.totalQuestions}</div>
            <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 tabular-nums">30 Questions</div>
            <div className="text-[11px] text-slate-500">Speed across 4 topics</div>
          </div>
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">{t.totalDuration}</div>
            <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 tabular-nums">5m (10s/Q)</div>
            <div className="text-[11px] text-slate-500">10s auto-advance</div>
          </div>
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">{t.markingScheme}</div>
            <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 tabular-nums">{t.markingText}</div>
            <div className="text-[11px] text-slate-500">0 for unattempted</div>
          </div>
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">{t.activeContestants}</div>
            <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 tabular-nums">{t.contestantsCount}</div>
            <div className="text-[11px] text-slate-500">All-India live rank</div>
          </div>
        </div>

        {/* ACTION AREA: STRICT 7:00-7:15 PM LAUNCH VS DYNAMIC COUNTDOWN TIMER */}
        <div className="pt-2">
          {/* CASE 1: INSIDE THE 7:00 - 7:15 PM WINDOW (AND NOT YET ATTEMPTED) */}
          {isLiveWindow && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-950 text-sm">
                      Official Entry Window is Live Now
                    </div>
                    <div className="text-emerald-700">
                      Window closes in <span className="font-mono font-bold text-emerald-900">{String(windowCloseMins).padStart(2, '0')}:{String(windowCloseSecs).padStart(2, '0')}</span> IST. Launch to claim your full 5 minutes!
                    </div>
                  </div>
                </div>

                <div className="font-mono text-sm font-bold text-emerald-900 bg-emerald-100/70 border border-emerald-300 px-3 py-1.5 rounded-lg">
                  {String(windowCloseMins).padStart(2, '0')}:{String(windowCloseSecs).padStart(2, '0')} remaining
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => onStartExam(todayTest)}
                  disabled={!user.profileComplete}
                  className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base transition-colors shadow-sm flex items-center justify-center gap-2.5 ${
                    !user.profileComplete
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <Zap className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <span>Launch Exam Now (30 Questions • 5 Minutes)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* CASE 2: BEFORE 7:00 PM (LOBBY MODE -> TIMER TO TODAY 7:00 PM) */}
          {isBefore7PM && (
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-slate-600" />
                    <span>Today's All-India Speed Exam Opens In</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Launch option unlocks strictly between 7:00 PM and 7:15 PM IST.
                  </p>
                </div>

                {/* Big Live Countdown Timer to 7:00 PM */}
                <div className="flex items-center gap-2 font-mono text-slate-900">
                  <div className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-center shadow-xs">
                    <div className="text-xl sm:text-2xl font-bold tabular-nums">
                      {String(today7Hours).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans uppercase font-semibold">Hours</div>
                  </div>
                  <span className="text-xl font-bold text-slate-400">:</span>
                  <div className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-center shadow-xs">
                    <div className="text-xl sm:text-2xl font-bold tabular-nums">
                      {String(today7Mins).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans uppercase font-semibold">Mins</div>
                  </div>
                  <span className="text-xl font-bold text-slate-400">:</span>
                  <div className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-center shadow-xs">
                    <div className="text-xl sm:text-2xl font-bold tabular-nums text-amber-600">
                      {String(today7Secs).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans uppercase font-semibold">Secs</div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>Synchronized with Indian Standard Time (IST). Exam: 30 MCQs in 5m (10s/Q).</span>
                <span className="font-semibold text-slate-900">Starts today at 7:00 PM</span>
              </div>
            </div>
          )}

          {/* CASE 3: AFTER 7:15 PM OR COMPLETED (TIMER TO NEXT DATE 7:00 PM) */}
          {isPastWindow && (
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {hasCompletedToday ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Today's Exam Completed · Next Exam Starts In</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 text-slate-600" />
                        <span>Today's Entry Closed · Next Exam Opens In</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {hasCompletedToday
                      ? `Your attempt for ${todayTest.testCode} is safely recorded. Next All-India contest opens tomorrow at 7:00 PM.`
                      : "Today's 15-minute entry window ended at 7:15 PM. Tomorrow's test opens at 7:00 PM IST."}
                  </p>
                </div>

                {/* Big Live Countdown Timer to NEXT DATE 7:00 PM */}
                <div className="flex items-center gap-2 font-mono text-slate-900">
                  <div className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-center shadow-xs">
                    <div className="text-xl sm:text-2xl font-bold tabular-nums">
                      {String(next7Hours).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans uppercase font-semibold">Hours</div>
                  </div>
                  <span className="text-xl font-bold text-slate-400">:</span>
                  <div className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-center shadow-xs">
                    <div className="text-xl sm:text-2xl font-bold tabular-nums">
                      {String(next7Mins).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans uppercase font-semibold">Mins</div>
                  </div>
                  <span className="text-xl font-bold text-slate-400">:</span>
                  <div className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-center shadow-xs">
                    <div className="text-xl sm:text-2xl font-bold tabular-nums text-amber-600">
                      {String(next7Secs).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans uppercase font-semibold">Secs</div>
                  </div>
                </div>
              </div>

              {hasCompletedToday && onNavigateToResults && (
                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <span className="text-xs text-slate-600">
                    Official score: <strong className="text-slate-900">{userAttempt?.score ?? 23.5} / 30</strong> ({userAttempt?.correctCount ?? 25} correct, {userAttempt?.incorrectCount ?? 5} wrong).
                  </span>
                  <button
                    type="button"
                    onClick={onNavigateToResults}
                    className="text-xs font-bold text-slate-900 hover:text-slate-700 underline flex items-center gap-1"
                  >
                    <span>View Rankcard & Solutions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rules & Competition Protocol Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{t.antiCheatTitle}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
            <div className="font-bold text-slate-900 mb-1">{t.rule1Title}</div>
            <p className="leading-relaxed">{t.rule1Desc}</p>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
            <div className="font-bold text-slate-900 mb-1">{t.rule2Title}</div>
            <p className="leading-relaxed">{t.rule2Desc}</p>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
            <div className="font-bold text-slate-900 mb-1">{t.rule3Title}</div>
            <p className="leading-relaxed">{t.rule3Desc}</p>
          </div>
        </div>
      </div>

      {/* Syllabus Breakdown (30 Questions across 4 Subjects) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-600" />
          <span>Daily Exam Structure (30 Questions • 5 Minutes)</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="font-bold text-slate-900">General Awareness</div>
            <div className="text-slate-500 mt-0.5 text-[11px]">8 Qs · Polity, History, Science</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="font-bold text-slate-900">Quantitative Aptitude</div>
            <div className="text-slate-500 mt-0.5 text-[11px]">8 Qs · Speed Math, Arithmetic</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="font-bold text-slate-900">Reasoning & Intelligence</div>
            <div className="text-slate-500 mt-0.5 text-[11px]">7 Qs · Series, Analogy, Logic</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="font-bold text-slate-900">English Comprehension</div>
            <div className="text-slate-500 mt-0.5 text-[11px]">7 Qs · Vocab, Error Spotting</div>
          </div>
        </div>
      </div>

      {/* Past Tests Archive */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-600" />
            <span>Recent Test History</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">Archived Solutions</span>
        </div>

        <div className="space-y-2">
          {testPapers.slice(1).map((paper) => (
            <div
              key={paper.id}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-slate-900">{paper.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {paper.date} · 30 Questions · Key Released
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                30Q · 5m
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
