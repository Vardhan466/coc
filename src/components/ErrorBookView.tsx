import React, { useState, useEffect } from 'react';
import {
  ErrorBookEntry,
  getErrorBookEntries,
  recordRetryResult,
  removeErrorBookEntry,
} from '../utils/errorBookStorage';
import { LanguageCode, SubjectTag } from '../types';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Check,
  Trash2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MathRenderer } from './MathRenderer';

interface ErrorBookViewProps {
  language: LanguageCode;
  userId?: string;
  onGoToExam?: () => void;
}

export const ErrorBookView: React.FC<ErrorBookViewProps> = ({ language, userId }) => {
  const [entries, setEntries] = useState<ErrorBookEntry[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unmastered' | 'mastered'>('unmastered');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});
  
  // Interactive retry state for entries: { [entryId]: { selectedOpt: number | null, result: 'correct' | 'incorrect' | null } }
  const [retryState, setRetryState] = useState<Record<string, { selectedOpt: number | null; result: 'correct' | 'incorrect' | null }>>({});

  useEffect(() => {
    setEntries(getErrorBookEntries(userId));
  }, [userId]);

  const refreshEntries = () => {
    setEntries(getErrorBookEntries(userId));
  };

  const handleToggleExplanation = (id: string) => {
    setExpandedExplanations((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectRetryOption = (entryId: string, optIdx: number) => {
    setRetryState((prev) => ({
      ...prev,
      [entryId]: {
        selectedOpt: optIdx,
        result: null,
      },
    }));
  };

  const handleVerifyRetry = (entry: ErrorBookEntry) => {
    const state = retryState[entry.id];
    if (!state || state.selectedOpt === null) return;

    const isCorrect = state.selectedOpt === entry.correctOptionIndex;
    setRetryState((prev) => ({
      ...prev,
      [entry.id]: {
        ...prev[entry.id],
        result: isCorrect ? 'correct' : 'incorrect',
      },
    }));

    recordRetryResult(entry.id, isCorrect, userId);
    refreshEntries();
  };

  const handleDeleteEntry = (entryId: string) => {
    removeErrorBookEntry(entryId, userId);
    refreshEntries();
  };

  // Filtered entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSubject = selectedSubject === 'all' || entry.subject === selectedSubject;
    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'unmastered'
        ? !entry.mastered
        : entry.mastered;
    const matchesSearch =
      searchQuery.trim() === '' ||
      entry.question.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.topic.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesStatus && matchesSearch;
  });

  const totalMistakes = entries.length;
  const unmasteredCount = entries.filter((e) => !e.mastered).length;
  const masteredCount = entries.filter((e) => e.mastered).length;
  const estimatedMarksLost = Number((unmasteredCount * 0.25).toFixed(2));

  const subjects: SubjectTag[] = [
    'Quantitative Aptitude',
    'Reasoning & Intelligence',
    'General Awareness',
    'English Comprehension',
  ];

  return (
    <div className="space-y-5 animate-smooth-in">
      {/* 1. Header Overview & Habit Protection */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Aspirant Error Book (कमजोरी सुधार नोटबुक)</span>
              <span aria-hidden="true">·</span>
              <span>Automated Mistake Capture</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Weak Area &amp; Negative Mark Reversal
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
              Every question where you lost 0.25 marks is automatically saved here. Re-attempt each question to erase negative impulses and master the underlying shortcut.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-2.5 sm:p-3 rounded-lg text-center min-w-[90px]">
              <div className="text-[10px] uppercase font-semibold text-rose-800 dark:text-rose-400 tracking-wider">
                Unmastered
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-rose-950 dark:text-rose-300 tabular-nums">
                {unmasteredCount}
              </div>
              <div className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">
                -{estimatedMarksLost} marks
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 p-2.5 sm:p-3 rounded-lg text-center min-w-[90px]">
              <div className="text-[10px] uppercase font-semibold text-emerald-800 dark:text-emerald-400 tracking-wider">
                Mastered
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-950 dark:text-emerald-300 tabular-nums">
                {masteredCount}
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                Concept Fixed
              </div>
            </div>
          </div>
        </div>

        {/* Streak Freeze Alert Banner */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Streak Protection:</strong> Re-attempt &amp; master 3 mistakes to earn a 24-hour Daily Streak Freeze.
            </span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-emerald-800 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/40 px-2 py-0.5 rounded shrink-0">
            {Math.min(3, masteredCount)} / 3 Solved
          </span>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setFilterStatus('unmastered')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filterStatus === 'unmastered'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Needs Practice ({unmasteredCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('mastered')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filterStatus === 'mastered'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Mastered ({masteredCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({totalMistakes})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search topic or question text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Subject Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
            <span>Subject:</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedSubject('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              selectedSubject === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            All Subjects
          </button>
          {subjects.map((subj) => (
            <button
              key={subj}
              type="button"
              onClick={() => setSelectedSubject(subj)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                selectedSubject === subj
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Questions List */}
      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {totalMistakes === 0
                ? 'Your Error Book Is Empty'
                : filterStatus === 'unmastered'
                ? 'Zero Weak Points Found!'
                : 'No Matching Mistakes'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {totalMistakes === 0
                ? 'Mistakes you make in Daily Tests or Speed Sprints are captured here automatically so you can revise and master weak concepts.'
                : filterStatus === 'unmastered'
                ? 'You have mastered all your captured mistakes. Great work on eliminating negative marks!'
                : 'No mistakes match the active filters.'}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry, idx) => {
            const q = entry.question;
            const qText = language === 'te' && q.textTe ? q.textTe : language === 'hi' && q.textHi ? q.textHi : q.text;
            const options = language === 'te' && q.optionsTe ? q.optionsTe : language === 'hi' && q.optionsHi ? q.optionsHi : q.options;
            const explanation = language === 'te' && q.explanationTe ? q.explanationTe : language === 'hi' && q.explanationHi ? q.explanationHi : q.explanation;
            const isExplanationOpen = !!expandedExplanations[entry.id];
            const currentRetry = retryState[entry.id];

            return (
              <div
                key={entry.id}
                className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-xs transition-all space-y-4 ${
                  entry.mastered
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Card Top Strip: Metadata without pill badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      #{idx + 1}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{entry.subject}</span>
                    <span aria-hidden="true">·</span>
                    <span>{entry.topic}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{entry.difficulty}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[11px] text-slate-400">{entry.testTitle}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.mastered ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        <Check className="w-3 h-3" />
                        <span>Mastered</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                        <XCircle className="w-3 h-3" />
                        <span>-0.25 Mark Lost</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry.id)}
                      aria-label="Remove mistake from Error Book"
                      className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove from Error Book"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Question Statement */}
                <div className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                  <MathRenderer content={qText} />
                </div>

                {/* Options List with Interactive Re-attempt Mode */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Select answer to re-test reflex:</span>
                    {entry.userSelectedOptionIndex !== null && (
                      <span className="text-[11px] text-rose-600 dark:text-rose-400">
                        Your Exam Choice: Option {String.fromCharCode(65 + (entry.userSelectedOptionIndex || 0))}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {options.map((optText, optIdx) => {
                      const isSelectedInRetry = currentRetry?.selectedOpt === optIdx;
                      const isPastWrongChoice = entry.userSelectedOptionIndex === optIdx;
                      const isOfficialCorrect = optIdx === entry.correctOptionIndex;

                      let itemStyle = 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200';

                      if (currentRetry?.result) {
                        if (isOfficialCorrect) {
                          itemStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500';
                        } else if (isSelectedInRetry && !isOfficialCorrect) {
                          itemStyle = 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-semibold';
                        }
                      } else if (isSelectedInRetry) {
                        itemStyle = 'border-slate-900 dark:border-emerald-400 bg-slate-900 dark:bg-emerald-600 text-white font-semibold';
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectRetryOption(entry.id, optIdx)}
                          className={`flex items-start gap-2.5 p-3 rounded-lg border text-left text-xs sm:text-sm transition-all cursor-pointer ${itemStyle}`}
                        >
                          <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border border-current opacity-70">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1">
                            <MathRenderer content={optText} inline={true} />
                          </span>
                          {isPastWrongChoice && (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold shrink-0">
                              (Past mistake)
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Re-attempt Verification & Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentRetry?.selectedOpt === undefined || currentRetry?.selectedOpt === null}
                      onClick={() => handleVerifyRetry(entry)}
                      className="px-3.5 py-1.5 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Check Reflex</span>
                    </button>

                    {currentRetry?.result === 'correct' && (
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 animate-smooth-in">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Solved correctly! Concept mastered.</span>
                      </span>
                    )}

                    {currentRetry?.result === 'incorrect' && (
                      <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1 animate-smooth-in">
                        <XCircle className="w-4 h-4" />
                        <span>Incorrect. Review shortcut explanation below.</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleExplanation(entry.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <span>{isExplanationOpen ? 'Hide Explanation' : 'View Shortcut Explanation'}</span>
                    {isExplanationOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Explanation Accordion Drawer */}
                {isExplanationOpen && (
                  <div className="p-4 bg-blue-50/50 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-800 dark:text-slate-200 space-y-2 animate-smooth-in">
                    <div className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Official Solution &amp; Memory Shortcut:</span>
                    </div>
                    <div className="leading-relaxed">
                      <MathRenderer content={explanation || 'No explanation recorded for this question.'} />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
