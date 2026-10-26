import React, { useState } from 'react';
import { Attempt, Question, TestPaper, UserProfile } from '../types';
import { getTranslation } from '../utils/i18n';
import { calculateNegativeMarkLoss } from '../utils/scoring';
import {
  Trophy,
  Award,
  Search,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ResultsViewProps {
  test: TestPaper;
  user: UserProfile;
  userAttempt?: Attempt;
  leaderboardAttempts: Attempt[];
  currentSimulatedTime: string;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  test,
  user,
  userAttempt,
  leaderboardAttempts,
  currentSimulatedTime,
}) => {
  const t = getTranslation(user.language);
  const [selectedState, setSelectedState] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const isKeyReleased = currentSimulatedTime >= '20:15';
  const currentAttempt = userAttempt || leaderboardAttempts.find((a) => a.studentId === user.studentId);

  const filteredLeaderboard = leaderboardAttempts.filter((a) => {
    const matchesState = selectedState === 'all' || a.studentState === selectedState;
    const matchesSearch =
      a.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesState && matchesSearch;
  });

  const top3 = leaderboardAttempts.slice(0, 3);
  const negativeLoss = currentAttempt ? calculateNegativeMarkLoss(currentAttempt.incorrectCount) : 0;
  const uniqueStates = Array.from(new Set(leaderboardAttempts.map((a) => a.studentState))).sort();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Student's Personal Result Card */}
      {currentAttempt ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs text-slate-900 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-center font-bold">
                <Trophy className="w-5 h-5 text-slate-800" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  {t.perfCardTitle}
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  {user.studentId} · {user.fullName} ({user.address.state})
                </p>
              </div>
            </div>

            <div className="bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1 rounded-md text-xs font-semibold tabular-nums">
              {t.allIndiaRank}: #{currentAttempt.rank || 28}
            </div>
          </div>

          {/* Primary stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-center">
              <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{t.finalScore}</div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5 tabular-nums">
                {currentAttempt.score.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-500">out of 40.0</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-center">
              <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{t.allIndiaRank}</div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5 tabular-nums">
                #{currentAttempt.rank || 28}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium">Top {(100 - (currentAttempt.percentile || 99.3)).toFixed(1)}% cohort</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-center">
              <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{t.percentile}</div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5 tabular-nums">
                {currentAttempt.percentile || 99.3}%
              </div>
              <div className="text-[11px] text-slate-500">4,120 participants</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-center">
              <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{t.accuracy}</div>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5 tabular-nums">
                {Math.round((currentAttempt.correctCount / Math.max(1, currentAttempt.correctCount + currentAttempt.incorrectCount)) * 100)}%
              </div>
              <div className="text-[11px] text-slate-500">{currentAttempt.timeTakenSeconds}s elapsed</div>
            </div>
          </div>

          {/* Correct / Incorrect / Skip bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{currentAttempt.correctCount} {t.correctBadge}</span>
              </span>
              <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>{currentAttempt.incorrectCount} {t.incorrectBadge}</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span>{currentAttempt.unattemptedCount} {t.skippedBadge}</span>
              </span>
            </div>

            <div className="text-slate-700 font-medium flex items-center gap-1.5">
              <span>{t.marksLostToGuesses}: <strong className="text-rose-700 font-bold font-mono">-{negativeLoss.toFixed(2)}</strong></span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-600 shadow-xs">
          <p className="font-semibold text-slate-800">You haven't attempted today's test yet.</p>
          <p className="text-xs mt-1 text-slate-500">Take the exam from the "Daily Test" tab to view your score and rank card.</p>
        </div>
      )}

      {/* Answer Key Vault Status Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between text-xs transition-colors ${
        isKeyReleased
          ? 'bg-purple-50 border-purple-200 text-purple-900'
          : 'bg-slate-50 border-slate-200 text-slate-800'
      }`}>
        <div className="flex items-center gap-2.5">
          {isKeyReleased ? (
            <Unlock className="w-4 h-4 text-purple-600 shrink-0" />
          ) : (
            <Lock className="w-4 h-4 text-slate-600 shrink-0" />
          )}
          <div>
            <div className="font-bold">
              {isKeyReleased ? t.keyVaultUnlocked : t.keyVaultLocked}
            </div>
            <p className="text-slate-600 mt-0.5">
              {isKeyReleased
                ? 'Full step-by-step solutions and distractor statistics are now visible for all 40 questions.'
                : 'Correct answers remain encrypted until 8:15 PM IST to protect competition integrity across all cohorts.'}
            </p>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm mb-3.5 flex items-center gap-2">
          <Award className="w-4 h-4 text-slate-700" />
          <span>{t.top3Title}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {top3.map((podium, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';

            return (
              <div
                key={podium.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{medal}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                      Rank #{index + 1}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{podium.studentName}</div>
                  <div className="text-[11px] font-mono text-slate-500">{podium.studentId} · {podium.studentState}</div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 tabular-nums">{podium.score.toFixed(2)} pts</span>
                  <span className="text-slate-500 font-mono">{podium.timeTakenSeconds}s</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard Section with State Filter & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-slate-700" />
              <span>{t.leaderboardTitle}</span>
            </h3>
            <p className="text-xs text-slate-500">
              Ranked deterministically: Score &gt; Correct &gt; Fewer Wrong &gt; Faster Time
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-44">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">{t.allStates}</option>
              {uniqueStates.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Leaderboard Table with Current User Comparison */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs text-left whitespace-nowrap sm:whitespace-normal">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">{t.rankHeader}</th>
                <th className="py-2.5 px-3">{t.studentHeader}</th>
                <th className="py-2.5 px-3">{t.stateHeader}</th>
                <th className="py-2.5 px-3 text-center">{t.scoreHeader}</th>
                <th className="py-2.5 px-3 text-center">{t.correctHeader}</th>
                <th className="py-2.5 px-3 text-center">{t.wrongHeader}</th>
                <th className="py-2.5 px-3 text-right">{t.timeHeader}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeaderboard.map((att, idx) => {
                const isCurrentUser = att.studentId === user.studentId;
                const rankNum = att.rank || idx + 1;

                return (
                  <tr
                    key={att.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isCurrentUser ? 'bg-slate-100 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      #{rankNum}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{att.studentName}</span>
                        {isCurrentUser && (
                          <span className="bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">
                            {t.youBadge}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">{att.studentId}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{att.studentState}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900 tabular-nums">
                      {att.score.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center text-emerald-700 font-medium tabular-nums">
                      {att.correctCount}
                    </td>
                    <td className="py-2.5 px-3 text-center text-rose-700 font-medium tabular-nums">
                      {att.incorrectCount}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500 font-mono tabular-nums">
                      {att.timeTakenSeconds}s
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
