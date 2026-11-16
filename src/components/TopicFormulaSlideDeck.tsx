import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Zap,
  Sparkles,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import type { StudyPlanDay } from '../types/aiSystem';
import { getTopicFormulaSlides } from '../utils/topicCheatCodes';
import { MathRenderer } from './MathRenderer';

interface TopicFormulaSlideDeckProps {
  todayTopic: StudyPlanDay;
  testTitle?: string;
  testDescription?: string;
  eyebrowLabel?: string;
  badgeNote?: string;
}

const SLIDE_TABS = [
  { id: 0, code: '01', label: 'Formulas', Icon: BookOpen },
  { id: 1, code: '02', label: 'Cheat Codes', Icon: Zap },
  { id: 2, code: '03', label: 'Solved Example', Icon: Sparkles },
  { id: 3, code: '04', label: 'Exam Traps', Icon: AlertTriangle },
] as const;

export const TopicFormulaSlideDeck: React.FC<TopicFormulaSlideDeckProps> = ({
  todayTopic,
  testTitle = '',
  testDescription = '',
  eyebrowLabel = "Today's Test Topic · Formulas & Cheat Codes",
  badgeNote,
}) => {
  const [activeSlide, setActiveSlide] = useState<number>(0);

  useEffect(() => {
    setActiveSlide(0);
  }, [todayTopic?.dayKey, todayTopic?.topic]);

  const deck = useMemo(
    () =>
      getTopicFormulaSlides(todayTopic, {
        title: testTitle,
        description: testDescription,
        category: todayTopic.recommendedExamCategories?.[0],
      }),
    [todayTopic, testTitle, testDescription]
  );

  const cleanTopicTitle = useMemo(
    () =>
      deck.topicTitle
        .replace(/^Week\s+\d+\s+(Revision|Assessment\s+Test)\s*:\s*/i, '')
        .replace(/\s*·\s*Week\s+\d+\s+Day\s+\d+/gi, '')
        .trim() || deck.topicTitle,
    [deck.topicTitle]
  );

  const totalSlides = SLIDE_TABS.length;
  const goPrev = () => setActiveSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  const goNext = () => setActiveSlide((prev) => (prev + 1) % totalSlides);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    }
  };

  return (
    <section
      aria-label="Today's Exam Topic Formulas and Cheat Codes Slide Deck"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <span>{eyebrowLabel}</span>
            {badgeNote && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-slate-600 dark:text-slate-300 font-semibold">{badgeNote}</span>
              </>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
            {cleanTopicTitle}
          </h3>
          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{deck.subject}</span>
            {' · '}
            <span>{deck.examFocusLabel}</span>
          </p>
        </div>

        {/* Slide Controls */}
        <div className="flex items-center gap-1.5 self-start shrink-0">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous slide"
            className="min-h-[36px] min-w-[36px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2.5 py-1.5 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums select-none">
            Slide {activeSlide + 1} / {totalSlides}
          </span>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next slide"
            className="min-h-[36px] min-w-[36px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Segmented Slide Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Topic Revision Slides"
        className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700/80 pb-3 overflow-x-auto"
      >
        {SLIDE_TABS.map(({ id, code, label, Icon }) => {
          const isActive = activeSlide === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveSlide(id)}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono text-[10px] opacity-80">{code}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Slide Content Viewport */}
      <div className="min-h-[180px] text-xs text-slate-700 dark:text-slate-300">
        {activeSlide === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {deck.summary}
            </p>
            <div className="divide-y divide-slate-200 dark:divide-slate-700/70">
              {deck.formulas.map((item, idx) => (
                <div key={item.name} className={`${idx === 0 ? 'pt-1 pb-3' : 'py-3'} space-y-1.5`}>
                  <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                    {idx + 1}. {item.name}
                  </div>
                  <div className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-900/80 text-slate-900 dark:text-amber-300 font-medium overflow-x-auto">
                    <MathRenderer content={item.formula} inline={true} />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    <MathRenderer content={item.explanation} inline={true} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSlide === 1 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{deck.speedTargetNote}</span>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700/70">
              {deck.cheatCodes.map((code, idx) => (
                <div key={code.title} className={`${idx === 0 ? 'pt-1 pb-3' : 'py-3'} space-y-1.5`}>
                  <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{code.title}</span>
                  </div>
                  <div className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-900/80 text-emerald-800 dark:text-emerald-300 font-semibold overflow-x-auto">
                    <MathRenderer content={code.shortcut} inline={true} />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    <MathRenderer content={code.explanation} inline={true} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSlide === 2 && (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Corporate &amp; Competitive Pattern Question
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                <MathRenderer content={deck.workedExample.problem} inline={true} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-700/70">
              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Standard Method
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <MathRenderer content={deck.workedExample.standardApproach} inline={true} />
                </p>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Cheat-Code 5-Second Method
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-100 font-medium leading-relaxed">
                  <MathRenderer content={deck.workedExample.cheatCodeApproach} inline={true} />
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/70 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                Verified Answer
              </span>
              <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400">
                <MathRenderer content={deck.workedExample.finalAnswer} inline={true} />
              </span>
            </div>
          </div>
        )}

        {activeSlide === 3 && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              High-frequency traps that cost $-0.25$ negative marks in 10s/question tests:
            </div>
            <ul className="divide-y divide-slate-200 dark:divide-slate-700/70">
              {deck.commonTraps.map((trap, idx) => (
                <li
                  key={idx}
                  className={`${idx === 0 ? 'pt-1 pb-2.5' : 'py-2.5'} flex items-start gap-2.5 leading-relaxed`}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-200">
                    <MathRenderer content={trap} inline={true} />
                  </span>
                </li>
              ))}
            </ul>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/70 flex items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
              <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{deck.speedTargetNote}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Slide Stepper Dots */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/70 text-[11px] text-slate-500 dark:text-slate-400">
        <span>Use ← / → arrows or tabs to flip slides</span>
        <div className="flex items-center gap-1.5">
          {SLIDE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSlide(tab.id)}
              aria-label={`Go to slide ${tab.id + 1}: ${tab.label}`}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                activeSlide === tab.id
                  ? 'w-5 bg-slate-900 dark:bg-emerald-400'
                  : 'w-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
