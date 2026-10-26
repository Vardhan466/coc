import React from 'react';
import { SubjectTag } from '../types';
import { Zap, Play } from 'lucide-react';

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
  }[] = [
    {
      subject: 'Quantitative Aptitude',
      title: 'Speed Calculations & Arithmetic',
      description: 'Master 8-second percentage shortcuts, ratios, train problems, and algebra formulas.',
      drillCount: 15,
      avgAccuracy: 75.7,
    },
    {
      subject: 'Reasoning & Intelligence',
      title: 'Logical Deduction & Series',
      description: 'Rapid pattern recognition, prime squares, syllogisms, and direction sense.',
      drillCount: 18,
      avgAccuracy: 86.4,
    },
    {
      subject: 'General Awareness',
      title: 'Indian Polity & Modern History Blitz',
      description: 'Constitution articles, amendments, freedom movement events, and general science.',
      drillCount: 22,
      avgAccuracy: 77.9,
    },
    {
      subject: 'English Comprehension',
      title: 'Idioms, Error Spotting & Vocab',
      description: 'High-frequency SSC/Banking collocations, one-word substitutions, and antonyms.',
      drillCount: 14,
      avgAccuracy: 72.9,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Practice Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="max-w-xl space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Zap className="w-3.5 h-3.5 text-slate-700" />
            <span>Speed Conditioning Drills · 12s / Question</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Targeted Topic Drills
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Condition your reflex responses and eradicate impulsive guessing errors before entering the live 7:00 PM All-India examination.
          </p>
        </div>
      </div>

      {/* Speed Practice Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {practiceModules.map((mod) => (
          <div
            key={mod.subject}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {mod.subject}
                </span>
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 tabular-nums">
                  {mod.avgAccuracy}% Accuracy
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-1">
                {mod.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {mod.description}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {mod.drillCount} drill sets
              </span>
              <button
                type="button"
                onClick={() => onStartSprint(mod.subject)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Start Drill</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
