import React from 'react';
import { UserProfile } from '../types';
import { Clock, Play, User, ShieldCheck } from 'lucide-react';

interface SimulationBarProps {
  currentSimulatedTime: string; // e.g. "19:02"
  setSimulatedTime: (time: string) => void;
  user?: UserProfile;
  onLaunchExam: () => void;
  isExamActive: boolean;
}

export const SimulationBar: React.FC<SimulationBarProps> = ({
  currentSimulatedTime,
  setSimulatedTime,
  user,
  onLaunchExam,
  isExamActive,
}) => {
  if (isExamActive) return null;

  const isAdmin = user && user.role !== 'student';

  return (
    <div className="bg-slate-900 text-slate-200 border-b border-slate-800 text-xs px-3 py-2">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Time state simulator */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-amber-400 font-semibold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            <span>Time Sim (IST):</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setSimulatedTime('18:50')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                currentSimulatedTime === '18:50'
                  ? 'bg-amber-600 text-white font-medium shadow-sm'
                  : 'hover:text-white text-slate-300'
              }`}
              title="6:50 PM: Test is precomputed, locked, Cloud Functions pre-warming"
            >
              18:50 (Pre-Lobby)
            </button>
            <button
              type="button"
              onClick={() => setSimulatedTime('19:02')}
              className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                currentSimulatedTime === '19:02'
                  ? 'bg-emerald-600 text-white font-medium shadow-sm'
                  : 'hover:text-white text-slate-300'
              }`}
              title="7:02 PM: Live Official Exam Window Open (7:00 - 7:15 PM)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              19:02 (Live Window)
            </button>
            <button
              type="button"
              onClick={() => setSimulatedTime('19:18')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                currentSimulatedTime === '19:18'
                  ? 'bg-blue-600 text-white font-medium shadow-sm'
                  : 'hover:text-white text-slate-300'
              }`}
              title="7:18 PM: Window closed, stragglers finalizing, ranking computing"
            >
              19:18 (Finalizing)
            </button>
            <button
              type="button"
              onClick={() => setSimulatedTime('20:15')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                currentSimulatedTime === '20:15'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'hover:text-white text-slate-300'
              }`}
              title="8:15 PM: Official Answer Key & Explanations Released"
            >
              20:15 (Key Released)
            </button>
          </div>
        </div>

        {/* Direct Action & Read-only Account Identity */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onLaunchExam}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-3 py-1 rounded-md transition-all shadow-sm active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Take 7 PM Exam Now</span>
          </button>

          {user && (
            <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300">
              {isAdmin ? (
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <User className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="font-semibold text-white max-w-[120px] sm:max-w-none truncate">
                {user.fullName}
              </span>
              <span
                className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded font-bold ${
                  isAdmin
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {user.role}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
