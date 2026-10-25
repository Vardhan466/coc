import React, { useState } from 'react';
import { Attempt, Question, TestPaper, UserProfile } from '../types';
import { getTranslation } from '../utils/i18n';
import { calculateNegativeMarkLoss } from '../utils/scoring';
import {
  Trophy,
  Award,
  Flame,
  Search,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
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
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 sm:py-6 space-y-5 sm:space-y-6">
      {/* Student's Personal Result Card */}
      {currentAttempt ? (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-xl text-white relative overflow-hidden animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
                <Trophy className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {t.perfCardTitle}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {user.studentId} • {user.fullName} ({user.address.state})
                </p>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full text-xs font-bold">
              {t.allIndiaRank}: #{currentAttempt.rank || 28}
            </div>
          </div>

          {/* Primary stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-5">
            <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-3.5 sm:p-4 text-center">
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-wider">{t.finalScore}</div>
              <div className="text-2xl sm:text-4xl font-black text-amber-400 mt-0.5">
                {currentAttempt.score.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400">out of 40.0</div>
            </div>

            <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-3.5 sm:p-4 text-center">
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-wider">{t.allIndiaRank}</div>
              <div className="text-2xl sm:text-4xl font-black text-white mt-0.5">
                #{currentAttempt.rank || 28}
              </div>
              <div className="text-[10px] text-emerald-400">Top {(100 - (currentAttempt.percentile || 99.3)).toFixed(1)}% cohort</div>
            </div>

            <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-3.5 sm:p-4 text-center">
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-wider">{t.percentile}</div>
              <div className="text-2xl sm:text-4xl font-black text-emerald-400 mt-0.5">
                {currentAttempt.percentile || 99.3}%
              </div>
              <div className="text-[10px] text-slate-400">4,120 participants</div>
            </div>

            <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl p-3.5 sm:p-4 text-center">
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-wider">{t.accuracy}</div>
              <div className="text-2xl sm:text-4xl font-black text-blue-400 mt-0.5">
                {Math.round((currentAttempt.correctCount / Math.max(1, currentAttempt.correctCount + currentAttempt.incorrectCount)) * 100)}%
              </div>
              <div className="text-[10px] text-slate-400">{currentAttempt.timeTakenSeconds}s elapsed</div>
            </div>
          </div>

          {/* Correct / Incorrect / Skip bar */}
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{currentAttempt.correctCount} {t.correctBadge}</span>
              </span>
              <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                <XCircle className="w-4 h-4" />
                <span>{currentAttempt.incorrectCount} {t.incorrectBadge}</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                <HelpCircle className="w-4 h-4" />
                <span>{currentAttempt.unattemptedCount} {t.skippedBadge}</span>
              </span>
            </div>

            <div className="text-amber-300 font-semibold flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>{t.marksLostToGuesses}: -{negativeLoss.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-600 shadow-sm">
          <p className="font-bold text-slate-800">You haven't attempted today's test yet.</p>
          <p className="text-xs mt-1">Take the test from the "Daily Test" tab to view your score and rank here!</p>
        </div>
      )}

      {/* Answer Key Vault Status Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs transition-colors ${
        isKeyReleased
          ? 'bg-purple-50 border-purple-200 text-purple-900'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-center gap-2.5">
          {isKeyReleased ? (
            <Unlock className="w-5 h-5 text-purple-600 shrink-0" />
          ) : (
            <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <div>
            <div className="font-bold text-sm">
              {isKeyReleased ? t.keyVaultUnlocked : t.keyVaultLocked}
            </div>
            <p className="text-slate-600 mt-0.5">
              {isKeyReleased
                ? 'Full step-by-step solutions and distractor statistics are now visible for all 40 questions.'
                : 'Correct answers are hidden until 8:15 PM IST to protect competition integrity across all cohorts.'}
            </p>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 text-sm mb-3 sm:mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span>{t.top3Title}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {top3.map((podium, index) => {
            const colors = [
              { border: 'border-amber-300', bg: 'bg-amber-50/70', badge: 'bg-amber-500 text-slate-950', icon: '🥇' },
              { border: 'border-slate-300', bg: 'bg-slate-50', badge: 'bg-slate-400 text-white', icon: '🥈' },
              { border: 'border-amber-700/30', bg: 'bg-orange-50/50', badge: 'bg-amber-700 text-white', icon: '🥉' },
            ][index];

            return (
              <div
                key={podium.id}
                className={`p-3.5 sm:p-4 rounded-xl border ${colors.border} ${colors.bg} flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">{colors.icon}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${colors.badge}`}>
                      {t.rankHeader} #{index + 1}
                    </span>
                  </div>
                  <div className="font-extrabold text-slate-900 text-sm">{podium.studentName}</div>
                  <div className="text-[11px] font-mono text-slate-500">{podium.studentId} • {podium.studentState}</div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-900 text-base">{podium.score.toFixed(2)} pts</span>
                  <span className="text-slate-500">{podium.timeTakenSeconds}s</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard Section with State Filter & Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
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
                className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">{t.allStates}</option>
              {uniqueStates.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Leaderboard Table with Current User Comparison */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left whitespace-nowrap sm:whitespace-normal">
            <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
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
                      isCurrentUser ? 'bg-amber-100/70 font-semibold ring-1 ring-amber-400' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center justify-center font-black ${
                        rankNum === 1
                          ? 'text-amber-500 font-extrabold'
                          : rankNum === 2
                          ? 'text-slate-500'
                          : rankNum === 3
                          ? 'text-amber-700'
                          : 'text-slate-700'
                      }`}>
                        #{rankNum}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{att.studentName}</span>
                        {isCurrentUser && (
                          <span className="bg-amber-500 text-slate-950 text-[9px] px-1.5 py-0.5 rounded uppercase font-black">
                            {t.youBadge}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">{att.studentId}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{att.studentState}</td>
                    <td className="py-2.5 px-3 text-center font-extrabold text-slate-900">
                      {att.score.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 font-semibold">
                      {att.correctCount}
                    </td>
                    <td className="py-2.5 px-3 text-center text-rose-500 font-semibold">
                      {att.incorrectCount}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500 font-mono">
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
