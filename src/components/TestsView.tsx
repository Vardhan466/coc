import React from 'react';
import { TestPaper, UserProfile } from '../types';
import { getTranslation } from '../utils/i18n';
import {
  Clock,
  Flame,
  Award,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Zap,
  ArrowRight,
  ShieldCheck,
  FileText,
  Users,
  Timer,
} from 'lucide-react';

interface TestsViewProps {
  testPapers: TestPaper[];
  user: UserProfile;
  currentSimulatedTime: string;
  onStartExam: (test: TestPaper) => void;
  onNavigateToProfile: () => void;
}

export const TestsView: React.FC<TestsViewProps> = ({
  testPapers,
  user,
  currentSimulatedTime,
  onStartExam,
  onNavigateToProfile,
}) => {
  const t = getTranslation(user.language);
  const todayTest = testPapers[0];

  // Derive status from simulated time
  const isLobby = currentSimulatedTime < '19:00';
  const isLiveWindow = currentSimulatedTime >= '19:00' && currentSimulatedTime <= '19:15';
  const isPostWindow = currentSimulatedTime > '19:15' && currentSimulatedTime < '20:15';
  const isKeyReleased = currentSimulatedTime >= '20:15';

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 sm:py-6 space-y-5 sm:space-y-6">
      {/* Profile Incomplete Gate Alert if needed */}
      {!user.profileComplete && (
        <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-400 text-sm sm:text-base">
                Profile Incomplete (Test Entry Gated)
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                In compliance with competition anti-fraud guidelines, official 7 PM tests require a verified phone, state, and district before attempt entry.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToProfile}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shrink-0 transition-colors shadow-sm w-full sm:w-auto"
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* Hero: Today's 7 PM Grand Challenge */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-700/80 rounded-3xl p-5 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Header row with status badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase bg-amber-500 text-slate-950 shadow-sm flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>{t.todaysOfficialTest}</span>
              </span>
              <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {todayTest.testCode}
              </span>
            </div>

            {/* Dynamic Status pill */}
            <div className="flex items-center gap-2 text-xs font-bold">
              {isLobby && (
                <div className="bg-slate-800 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{t.windowLobby}</span>
                </div>
              )}
              {isLiveWindow && (
                <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{t.windowClosesSoon}</span>
                </div>
              )}
              {isPostWindow && (
                <div className="bg-blue-500/20 text-blue-400 border border-blue-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{t.windowClosed}</span>
                </div>
              )}
              {isKeyReleased && (
                <div className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.windowKeyReleased}</span>
                </div>
              )}
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
            {todayTest.title}
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed mb-4">
            {todayTest.description}
          </p>

          {/* 7:15 PM Guaranteed Timing Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 sm:p-3.5 mb-5 flex items-center gap-2.5 text-xs text-amber-300">
            <Timer className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">{t.fullDurationGuaranteed}</span>
          </div>

          {/* Key Metric Tags */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3">
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase">{t.totalQuestions}</div>
              <div className="text-base sm:text-lg font-black text-white">{t.questionsCount}</div>
              <div className="text-[10px] text-amber-400">10 per subject</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3">
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase">{t.totalDuration}</div>
              <div className="text-base sm:text-lg font-black text-white">{t.durationText}</div>
              <div className="text-[10px] text-emerald-400">12s per question</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3">
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase">{t.markingScheme}</div>
              <div className="text-base sm:text-lg font-black text-amber-400">{t.markingText}</div>
              <div className="text-[10px] text-slate-400">0 for unattempted</div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3">
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase">{t.activeContestants}</div>
              <div className="text-base sm:text-lg font-black text-white">{t.contestantsCount}</div>
              <div className="text-[10px] text-cyan-400">All-India rank</div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              onClick={() => onStartExam(todayTest)}
              disabled={!user.profileComplete}
              className={`flex-1 py-3.5 px-6 rounded-xl font-extrabold text-sm sm:text-base transition-all shadow-lg flex items-center justify-center gap-2 ${
                !user.profileComplete
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 active:scale-98 shadow-amber-500/20'
              }`}
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>{t.enterOfficialExam}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onStartExam(todayTest)}
              className="py-3.5 px-5 rounded-xl font-bold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>{t.freeSpeedDrill}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rules & Competition Protocol Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{t.antiCheatTitle}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="font-bold text-slate-900 mb-1">{t.rule1Title}</div>
            <p>{t.rule1Desc}</p>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="font-bold text-slate-900 mb-1">{t.rule2Title}</div>
            <p>{t.rule2Desc}</p>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="font-bold text-slate-900 mb-1">{t.rule3Title}</div>
            <p>{t.rule3Desc}</p>
          </div>
        </div>
      </div>

      {/* Syllabus Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-600" />
          <span>Daily Exam Structure (40 Questions)</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60">
            <div className="font-bold text-amber-900">General Awareness</div>
            <div className="text-slate-600 mt-0.5 text-[11px]">10 Qs • Polity, History, Economy</div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/60">
            <div className="font-bold text-blue-900">Quantitative Aptitude</div>
            <div className="text-slate-600 mt-0.5 text-[11px]">10 Qs • Speed Math, Percentages</div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/60">
            <div className="font-bold text-indigo-900">Reasoning & Intelligence</div>
            <div className="text-slate-600 mt-0.5 text-[11px]">10 Qs • Syllogisms, Series, Analogy</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
            <div className="font-bold text-emerald-900">English Comprehension</div>
            <div className="text-slate-600 mt-0.5 text-[11px]">10 Qs • Vocabulary, Grammar, Idioms</div>
          </div>
        </div>
      </div>

      {/* Past Tests Archive */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-600" />
            <span>Recent Test History</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">Archived Solutions</span>
        </div>

        <div className="space-y-2.5">
          {testPapers.slice(1).map((paper) => (
            <div
              key={paper.id}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">{paper.title}</span>
                  <span className="text-[10px] font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                    {paper.date}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Score: <span className="font-bold text-emerald-600">29.75 / 40.0</span> • Rank: #52 of 4,620 (98.7%ile)
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                  Key Published
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
