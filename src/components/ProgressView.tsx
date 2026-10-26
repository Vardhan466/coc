import React, { useState } from 'react';
import { StudentProgressStats, UserProfile } from '../types';
import {
  TrendingUp,
  Target,
  Award,
  AlertTriangle,
  Flame,
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
  const chartHeight = 150;
  const chartWidth = 520;
  const paddingX = 40;
  const paddingY = 25;

  const pointsStudent = attempts.map((a, i) => {
    const x = paddingX + (i / Math.max(1, attempts.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (a.score / maxScore) * (chartHeight - paddingY * 2);
    return { x, y, score: a.score, date: a.testDate, rank: a.rank };
  });

  const pointsPeer = attempts.map((a, i) => {
    const x = paddingX + (i / Math.max(1, attempts.length - 1)) * (chartWidth - paddingX * 2);
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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Header Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tests Taken</span>
            <Target className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">{stats.testsTaken}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Consecutive daily tests</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Overall Accuracy</span>
            <Award className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">{stats.overallAccuracy}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Avg Score: {stats.averageScore.toFixed(2)}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Best Rank</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">#{stats.bestRank}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">High Score: {stats.highestScore}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Current Streak</span>
            <Flame className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">{stats.currentStreak} Days</div>
          <div className="text-[11px] text-emerald-700 font-medium">Active daily streak</div>
        </div>
      </div>

      {/* Critical Insight: Negative Marking Diagnostic */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>Negative Marking Penalty Diagnostic</span>
              <span className="bg-rose-100 text-rose-800 text-[10px] font-semibold px-2 py-0.5 rounded">
                High Impact
              </span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed max-w-xl">
              You have forfeited a cumulative <strong className="text-rose-700 font-mono font-bold">-{stats.marksLostToNegatives.toFixed(2)} marks</strong> across past tests due to aggressive guessing. Eliminating 3 wild guesses per test can boost your rank by ~38 positions.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center shrink-0 w-full sm:w-auto">
          <div className="text-[11px] text-slate-500 font-medium">Impulsive Mistakes (&lt;2s)</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">{stats.rapidMistakesCount} Questions</div>
          <div className="text-[10px] text-slate-400">Answered &lt;2s incorrectly</div>
        </div>
      </div>

      {/* Performance Score Trend vs All-India Average Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-700" />
              <span>Score Trajectory vs All-India Daily Average</span>
            </h3>
            <p className="text-xs text-slate-500">
              Your test scores plotted against the daily average of 4,000+ competitors.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              <span className="font-medium text-slate-700">Your Score</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-400 border-dashed" />
              <span className="text-slate-500">Peer Average</span>
            </div>
          </div>
        </div>

        {/* SVG Responsive Chart */}
        <div className="w-full overflow-x-auto py-2">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-h-48 overflow-visible">
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
            <path d={peerPath} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />

            {/* Student Trend Line */}
            <path d={studentPath} fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Data Points */}
            {pointsStudent.map((pt, i) => (
              <g key={i}>
                <circle cx={pt.x} cy={pt.y} r="4" fill="#0f172a" stroke="#ffffff" strokeWidth="2" />
                <text x={pt.x} y={chartHeight - 6} textAnchor="middle" className="text-[10px] fill-slate-500 font-medium">
                  {pt.date}
                </text>
                <text x={pt.x} y={pt.y - 8} textAnchor="middle" className="text-[10px] font-bold fill-slate-900 font-mono">
                  {pt.score}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Subject Strength Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-700" />
          <span>Subject Mastery & Speed Analysis</span>
        </h3>

        <div className="space-y-3.5">
          {stats.subjectPerformance.map((subj) => (
            <div key={subj.subject} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-800">{subj.subject}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-normal">{subj.avgTimePerQuestion}s avg/Q</span>
                  <span className="font-bold text-slate-900 tabular-nums">{subj.accuracy}% Accuracy</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-slate-800 transition-all duration-300"
                  style={{ width: `${subj.accuracy}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
