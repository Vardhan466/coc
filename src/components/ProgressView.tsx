import React, { useState } from 'react';
import { StudentProgressStats, UserProfile } from '../types';
import {
  TrendingUp,
  Target,
  Flame,
  AlertTriangle,
  Award,
  Zap,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  BarChart3,
  BookOpen,
} from 'lucide-react';

interface ProgressViewProps {
  stats: StudentProgressStats;
  user: UserProfile;
  onLaunchPracticeTopic: (topic: string) => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  stats,
  user,
  onLaunchPracticeTopic,
}) => {
  const [selectedRange, setSelectedRange] = useState<'7' | '30' | '90'>('7');

  // SVG Trend Line Math
  const attempts = stats.recentAttempts;
  const maxScore = 40;
  const minScore = 0;
  const chartHeight = 160;
  const chartWidth = 520;
  const paddingX = 40;
  const paddingY = 25;

  const pointsStudent = attempts.map((a, i) => {
    const x = paddingX + (i / (attempts.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (a.score / maxScore) * (chartHeight - paddingY * 2);
    return { x, y, score: a.score, date: a.testDate, rank: a.rank };
  });

  const pointsPeer = attempts.map((a, i) => {
    const x = paddingX + (i / (attempts.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (a.peerAvgScore / maxScore) * (chartHeight - paddingY * 2);
    return { x, y, score: a.peerAvgScore };
  });

  const studentPath = pointsStudent.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );

  const peerPath = pointsPeer.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tests Taken</span>
            <Target className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.testsTaken}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Consecutive daily streak</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overall Accuracy</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.overallAccuracy}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Average score: {stats.averageScore.toFixed(2)}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Best Rank</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600">#{stats.bestRank}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Highest score: {stats.highestScore}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Current Streak</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-orange-600">{stats.currentStreak} Days</div>
          <div className="text-[10px] text-emerald-600 font-semibold">Active Streak Bonus</div>
        </div>
      </div>

      {/* Critical Insight: Negative Marking Mark Loss */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-950 to-slate-950 border border-rose-800/60 rounded-3xl p-5 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
              <span>Negative Marking Penalty Diagnostic</span>
              <span className="bg-rose-500/30 text-rose-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-400/30">
                CRITICAL LEAK
              </span>
            </h3>
            <p className="text-xs text-rose-200/90 mt-1 leading-relaxed max-w-xl">
              You have forfeited a cumulative <strong className="text-rose-400 font-mono font-bold">-{stats.marksLostToNegatives.toFixed(2)} marks</strong> across past tests due to aggressive guessing. Eliminating 3 wild guesses per test can boost your rank by ~38 positions.
            </p>
          </div>
        </div>

        <div className="bg-rose-950/80 border border-rose-700/50 rounded-2xl p-3 text-center shrink-0 w-full sm:w-auto">
          <div className="text-[10px] uppercase font-bold text-rose-300">Impulsive Mistakes (&lt;2s)</div>
          <div className="text-2xl font-black text-rose-400 mt-0.5">{stats.rapidMistakesCount} Questions</div>
          <div className="text-[10px] text-rose-300">Answered in under 2s and wrong</div>
        </div>
      </div>

      {/* Performance Score Trend vs All-India Average Chart */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>Score Trajectory vs All-India Daily Average</span>
            </h3>
            <p className="text-xs text-slate-500">
              Your test scores plotted against the daily average of 4,000+ competitors.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="font-semibold text-slate-700">Your Score</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-400 border-dashed" />
              <span className="text-slate-500">Peer Average</span>
            </div>
          </div>
        </div>

        {/* SVG Responsive Chart */}
        <div className="w-full overflow-x-auto py-2">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-h-52 overflow-visible">
            {/* Grid lines */}
            {[0, 10, 20, 30, 40].map((val) => {
              const y = chartHeight - paddingY - (val / maxScore) * (chartHeight - paddingY * 2);
              return (
                <g key={val}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={chartWidth - paddingX}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text x={paddingX - 8} y={y + 3} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Peer Average Line */}
            <path d={peerPath} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 5" />

            {/* Student Trend Line */}
            <path d={studentPath} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Data Points */}
            {pointsStudent.map((pt, i) => (
              <g key={i}>
                <circle cx={pt.x} cy={pt.y} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                <text x={pt.x} y={chartHeight - 6} textAnchor="middle" className="text-[10px] fill-slate-500 font-semibold">
                  {pt.date}
                </text>
                <text x={pt.x} y={pt.y - 10} textAnchor="middle" className="text-[10px] font-bold fill-slate-800">
                  {pt.score}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Subject Strength Breakdown */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          <span>Subject-wise Mastery & Speed Analysis</span>
        </h3>

        <div className="space-y-4">
          {stats.subjectPerformance.map((subj) => (
            <div key={subj.subject} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-800">{subj.subject}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-normal">{subj.avgTimePerQuestion}s avg/Q</span>
                  <span className="font-bold text-slate-900">{subj.accuracy}% Accuracy</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    subj.accuracy >= 80
                      ? 'bg-emerald-500'
                      : subj.accuracy >= 70
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${subj.accuracy}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weakest 3 Topics Action Cards */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Targeted Remediation: Weakest 3 Topics</span>
            </h3>
            <p className="text-xs text-slate-500">
              Identified by algorithmic diagnostic. Focused speed drills on these topics yield maximum score lift.
            </p>
          </div>
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            AI Diagnosis
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stats.weakestTopics.map((topic, index) => (
            <div
              key={topic.topic}
              className="p-4 rounded-2xl border border-slate-200 hover:border-amber-400 bg-slate-50/60 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">{topic.subject}</span>
                  <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    {topic.accuracy}%
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                  {topic.topic}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Encountered {topic.questionsEncountered} times in past mocks.
                </p>
              </div>

              <button
                onClick={() => onLaunchPracticeTopic(topic.topic)}
                className="mt-4 w-full bg-white group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-800 border border-slate-300 group-hover:border-amber-400 font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Practice Speed Drill</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 30-Day Activity & Streak Calendar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>30-Day Daily Exam Streak Calendar</span>
          </h3>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            {stats.currentStreak} Active Days
          </span>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-10 gap-2">
          {Array.from({ length: 30 }).map((_, idx) => {
            const dayNum = idx + 1;
            const isAttended = idx >= 18; // 12-day active streak
            const isToday = idx === 29;

            return (
              <div
                key={idx}
                className={`p-2 rounded-xl border text-center transition-all ${
                  isToday
                    ? 'border-amber-500 bg-amber-500 text-slate-950 font-black shadow-md'
                    : isAttended
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold'
                    : 'border-slate-100 bg-slate-50 text-slate-400'
                }`}
              >
                <div className="text-[9px] uppercase tracking-tighter">Oct {dayNum}</div>
                <div className="text-xs mt-0.5">
                  {isAttended ? '✓' : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
