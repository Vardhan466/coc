import React, { useState } from 'react';
import { SubjectTag, Question } from '../types';
import { Zap, Clock, Award, BookOpen, CheckCircle2, ChevronRight, Play } from 'lucide-react';

interface PracticeViewProps {
  onStartSprint: (subject: SubjectTag) => void;
}

export const PracticeView: React.FC<PracticeViewProps> = ({ onStartSprint }) => {
  const practiceModules: {
    subject: SubjectTag;
    title: string;
    description: string;
    drillCount: number;
    avgAccuracy: number;
    color: string;
  }[] = [
    {
      subject: 'Quantitative Aptitude',
      title: 'Speed Calculations & Arithmetic',
      description: 'Master 8-second percentage shortcuts, ratios, train problems, and algebra formulas.',
      drillCount: 15,
      avgAccuracy: 75.7,
      color: 'blue',
    },
    {
      subject: 'Reasoning & Intelligence',
      title: 'Logical Deduction & Series',
      description: 'Rapid pattern recognition, prime squares, syllogisms, and direction sense.',
      drillCount: 18,
      avgAccuracy: 86.4,
      color: 'indigo',
    },
    {
      subject: 'General Awareness',
      title: 'Indian Polity & Modern History Blitz',
      description: 'Constitution articles, amendments, freedom movement events, and general science.',
      drillCount: 22,
      avgAccuracy: 77.9,
      color: 'amber',
    },
    {
      subject: 'English Comprehension',
      title: 'Idioms, Error Spotting & Vocab',
      description: 'High-frequency SSC/Banking collocations, one-word substitutions, and antonyms.',
      drillCount: 14,
      avgAccuracy: 72.9,
      color: 'emerald',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Practice Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl p-6 sm:p-7 text-slate-950 shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-slate-950/10 w-fit px-2.5 py-1 rounded-full mb-2">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>8-Second Speed Conditioning</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
            Rapid Practice Arena
          </h2>
          <p className="text-xs sm:text-sm text-slate-900/90 font-medium mt-1 leading-relaxed">
            Condition your reflexes to eliminate impulsive mistakes under the 8-second pressure ring before the 7:00 PM live official window.
          </p>
        </div>
      </div>

      {/* Speed Practice Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {practiceModules.map((mod) => (
          <div
            key={mod.subject}
            className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {mod.subject}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {mod.avgAccuracy}% Acc
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 text-base mb-1">
                {mod.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {mod.description}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                {mod.drillCount} drill sets available
              </span>
              <button
                onClick={() => onStartSprint(mod.subject)}
                className="bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Drill (8s/Q)</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
