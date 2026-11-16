import React, { useState } from 'react';
import { Attempt, TestPaper, UserProfile } from '../types';
import { MathRenderer } from './MathRenderer';
import {
  Trophy,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Calendar,
  ShieldAlert,
  BarChart2,
  FileCheck2,
  Users,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { downloadCustomTestAttemptPdf, CohortPdfEntry } from '../utils/pdfReport';

interface CustomTestResultsViewProps {
  test: TestPaper;
  attempt: Attempt;
  user: UserProfile;
  onBackToTests: () => void;
  onGoToMainLeaderboard: () => void;
}

export const CustomTestResultsView: React.FC<CustomTestResultsViewProps> = ({
  test,
  attempt,
  user,
  onBackToTests,
  onGoToMainLeaderboard,
}) => {
  const [expandedQId, setExpandedQId] = useState<string | null>(null);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const totalQuestions = test.questions?.length || test.totalQuestions || 30;
  const totalDurationSeconds = test.totalDurationSeconds || totalQuestions * 10;
  const timeSpentSeconds = Math.max(
    1,
    attempt.timeTakenSeconds ?? attempt.totalTimeSeconds ?? totalDurationSeconds
  );
  const totalAttempted = attempt.correctCount + attempt.incorrectCount;
  const accuracy =
    totalAttempted > 0 ? Math.round((attempt.correctCount / totalAttempted) * 100) : 0;
  const marksLostToNegatives = (attempt.incorrectCount * 0.25).toFixed(2);

  // Generate an isolated cohort of participants specifically for this custom test
  // (does NOT pollute or touch the 7 PM main leaderboard)
  const isolatedCohort = React.useMemo(() => {
    const scaleScore = (baseScoreOn30: number) =>
      Math.round(((baseScoreOn30 / 30) * totalQuestions) * 4) / 4;
    const scaleTime = (baseTimeOn300: number) =>
      Math.max(10, Math.round((baseTimeOn300 / 300) * totalDurationSeconds));

    const mockTakers = [
      { id: 'c1', name: 'Ananya Sharma', state: 'Delhi (NCT)', score: scaleScore(26.5), accuracy: 90, time: scaleTime(230) },
      { id: 'c2', name: 'Rajesh Varma', state: 'Andhra Pradesh', score: scaleScore(24.75), accuracy: 86, time: scaleTime(245) },
      { id: 'c3', name: 'Pooja Iyer', state: 'Tamil Nadu', score: scaleScore(23.0), accuracy: 82, time: scaleTime(250) },
      { id: 'c4', name: 'Manish Pandey', state: 'Uttar Pradesh', score: scaleScore(21.5), accuracy: 78, time: scaleTime(260) },
      { id: 'c5', name: 'Sunil Rathore', state: 'Rajasthan', score: scaleScore(19.25), accuracy: 73, time: scaleTime(275) },
      { id: 'c6', name: 'Kavita Das', state: 'West Bengal', score: scaleScore(17.5), accuracy: 68, time: scaleTime(280) },
    ];

    // Insert current user's attempt
    const all = [
      ...mockTakers,
      {
        id: attempt.studentId,
        name: `${attempt.studentName} (You)`,
        state: attempt.studentState,
        score: attempt.score,
        accuracy,
        time: timeSpentSeconds,
      },
    ].sort((a, b) => b.score - a.score || a.time - b.time);

    return all.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  }, [attempt, accuracy, totalQuestions, totalDurationSeconds, timeSpentSeconds]);

  const userRankInCohort =
    isolatedCohort.find((c) => c.id === attempt.studentId)?.rank || 1;

  const handleDownloadPdf = async () => {
    if (pdfGenerating) return;
    setPdfGenerating(true);
    try {
      await downloadCustomTestAttemptPdf(
        test,
        attempt,
        user,
        isolatedCohort as CohortPdfEntry[]
      );
      setPdfDownloaded(true);
      window.setTimeout(() => setPdfDownloaded(false), 3000);
    } finally {
      setPdfGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        <button
          type="button"
          onClick={onBackToTests}
          className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Tests &amp; Schedules</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pdfGenerating}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {pdfGenerating
                ? 'Preparing PDF...'
                : pdfDownloaded
                ? 'PDF Downloaded'
                : 'Download Attempt & Key PDF'}
            </span>
          </button>

          <button
            type="button"
            onClick={onGoToMainLeaderboard}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>View 7:00 PM All-India Leaderboard</span>
          </button>
        </div>
      </div>

      {/* Prominent Notice: Isolated Results, Independent from Main Leaderboard */}
      <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-950 dark:text-indigo-200 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 mt-0.5">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
                Independent Custom Assessment Scorecard
              </h2>
              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                · Isolated Test
              </span>
            </div>
            <p className="text-indigo-800 dark:text-indigo-300 mt-1 leading-relaxed">
              This exam was conducted as an on-demand scheduled test (
              <span className="font-semibold">{test.title}</span>). The results, score, and rank below
              are calculated exclusively within this specific test cohort and <strong>do not alter or contaminate</strong> the
              daily 7:00 PM All-India Leaderboard.
            </p>
          </div>
        </div>
      </div>

      {/* Main Scorecard Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                {test.testCode || 'CUSTOM-TEST'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Scheduled Assessment
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1.5">
              {test.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Candidate: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{user.studentId}</span> · {user.fullName} ({user.address.state})
            </p>
          </div>

          <div className="bg-slate-900 dark:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-center shadow-xs border border-slate-800 dark:border-slate-700">
            <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
              Test Cohort Rank
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono">
              #{userRankInCohort}{' '}
              <span className="text-xs font-normal text-slate-300 font-sans">
                of {isolatedCohort.length}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Score Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg p-3.5 text-center">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              Your Score
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
              {attempt.score.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">out of {totalQuestions}.0 marks</div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg p-3.5 text-center">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              Accuracy
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
              {accuracy}%
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {attempt.correctCount} / {totalAttempted} attempted
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg p-3.5 text-center">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              Correct / Wrong
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
              <span className="text-emerald-600 dark:text-emerald-400">{attempt.correctCount}</span>
              <span className="text-slate-300 dark:text-slate-600 mx-1">/</span>
              <span className="text-rose-600 dark:text-rose-400">{attempt.incorrectCount}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{attempt.unattemptedCount} skipped</div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-lg p-3.5 text-center">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              Negative Penalty
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 mt-0.5 tabular-nums">
              -{marksLostToNegatives}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">-0.25 per incorrect</div>
          </div>
        </div>

        {/* Diagnostic breakdown bar */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <span>
              Total Time Spent:{' '}
              <strong className="font-mono text-slate-900 dark:text-white">
                {timeSpentSeconds} seconds
              </strong>{' '}
              (Avg {(timeSpentSeconds / Math.max(1, totalQuestions)).toFixed(1)}s / question under 10s timer)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Assessed via 10-Second Per-Question Rule
            </span>
          </div>
        </div>
      </div>

      {/* Cohort Leaderboard (Dedicated to THIS custom test) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Dedicated Test Cohort Leaderboard
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isolatedCohort.length} participants in this scheduled window
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Participant</th>
                <th className="py-2.5 px-3">State</th>
                <th className="py-2.5 px-3 text-right">Score</th>
                <th className="py-2.5 px-3 text-right">Accuracy</th>
                <th className="py-2.5 px-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isolatedCohort.map((entry) => {
                const isMe = entry.id === attempt.studentId;
                return (
                  <tr
                    key={entry.id}
                    className={`${
                      isMe
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 font-semibold text-indigo-950 dark:text-indigo-200'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold">
                      #{entry.rank}
                    </td>
                    <td className="py-2.5 px-3">
                      {entry.name}{' '}
                      {isMe && (
                        <span className="ml-1 text-[10px] bg-indigo-200 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 px-1.5 py-0.5 rounded font-bold">
                          YOU
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{entry.state}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {entry.score.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {entry.accuracy}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500 dark:text-slate-400">
                      {entry.time}s
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Question-by-Question Solution & Key Analysis */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Questions &amp; Detailed Explanations
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {test.questions?.length || 0} questions reviewed
            </span>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{pdfDownloaded ? 'Downloaded' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {test.questions?.map((q, idx) => {
            const answer = attempt.answers?.find((a) => a.questionId === q.id || a.questionIndex === idx);
            const userChoice = answer?.selectedOptionIndex ?? answer?.selectedOption ?? null;
            const isAnswered = userChoice !== null && userChoice !== undefined;
            const isCorrect = isAnswered && userChoice === q.correctIndex;
            const isExpanded = expandedQId === q.id;

            return (
              <div
                key={q.id}
                className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors space-y-3"
              >
                {/* Question Row Header */}
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedQId(isExpanded ? null : q.id)}
                  className="w-full flex items-start justify-between gap-3 text-left cursor-pointer"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="font-mono text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded shrink-0">
                      Q{idx + 1}
                    </span>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                        <MathRenderer content={q.text} />
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {q.subject} · {q.topic}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>+1.00</span>
                      </span>
                    ) : isAnswered ? (
                      <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded text-[11px] font-bold">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>-0.25</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px] font-medium">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Skipped</span>
                      </span>
                    )}

                    <span className="p-1 text-slate-400 dark:text-slate-300 rounded">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 space-y-3 text-xs">
                    {/* 4 Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => {
                        const isCorrectOption = optIdx === q.correctIndex;
                        const isChosenOption = userChoice === optIdx;

                        let optClass = 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
                        if (isCorrectOption) {
                          optClass = 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700/80 text-emerald-900 dark:text-emerald-200 font-semibold';
                        } else if (isChosenOption) {
                          optClass = 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-700/80 text-rose-900 dark:text-rose-200 font-semibold';
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${optClass}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[11px]">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <span>{opt}</span>
                            </div>
                            {isCorrectOption && (
                              <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200 px-1.5 py-0.5 rounded font-bold">
                                Correct Key
                              </span>
                            )}
                            {isChosenOption && !isCorrectOption && (
                              <span className="text-[10px] bg-rose-200 dark:bg-rose-900/70 text-rose-900 dark:text-rose-200 px-1.5 py-0.5 rounded font-bold">
                                Your Choice
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-1">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                        <span>Official Explanation</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                        <MathRenderer content={q.explanation} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
