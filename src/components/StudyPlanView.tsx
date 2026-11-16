import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Play,
  RefreshCw,
  Search,
  Target,
} from 'lucide-react';
import type { SubjectTag } from '../types';
import type { StudyPlanDay } from '../types/aiSystem';
import { fetchSyllabusPlan } from '../utils/aiApiClient';
import {
  generate100WeekSyllabus,
  getPhaseLabelForWeek,
  resolveCurrentStudyDay,
} from '../utils/syllabus100Weeks';

interface StudyPlanViewProps {
  todayTopic?: StudyPlanDay | null;
  onPracticeTopic: (subject: SubjectTag, weekNumber: number, dayNumber: number) => void;
}

type PhaseFilter = 'all' | 'phase1' | 'phase2' | 'phase3' | 'phase4';

const PHASE_FILTERS: Array<{ id: PhaseFilter; label: string; minWeek: number; maxWeek: number }> = [
  { id: 'all', label: 'All 100 Weeks (500 Topics)', minWeek: 1, maxWeek: 100 },
  { id: 'phase1', label: 'Phase 1: Quant (W1–35)', minWeek: 1, maxWeek: 35 },
  { id: 'phase2', label: 'Phase 2: Reasoning (W36–60)', minWeek: 36, maxWeek: 60 },
  { id: 'phase3', label: 'Phase 3: English (W61–73)', minWeek: 61, maxWeek: 73 },
  { id: 'phase4', label: 'Phase 4: GA (W74–100)', minWeek: 74, maxWeek: 100 },
];

export const StudyPlanView: React.FC<StudyPlanViewProps> = ({
  todayTopic: initialTodayTopic,
  onPracticeTopic,
}) => {
  const [days, setDays] = useState<StudyPlanDay[]>(() => generate100WeekSyllabus());
  const [todayTopic, setTodayTopic] = useState<StudyPlanDay>(
    () => initialTodayTopic || resolveCurrentStudyDay('2026-01-01')
  );
  const [selectedWeek, setSelectedWeek] = useState<number>(
    () => initialTodayTopic?.weekNumber || resolveCurrentStudyDay('2026-01-01').weekNumber || 1
  );
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchSyllabusPlan()
      .then((res) => {
        if (cancelled) return;
        if (Array.isArray(res.days) && res.days.length > 0) {
          setDays(res.days);
        }
        if (res.todayTopic) {
          setTodayTopic(res.todayTopic);
          setSelectedWeek(res.todayTopic.weekNumber);
        }
      })
      .catch(() => {
        // Fallback syllabus is deterministic and already initialized
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (initialTodayTopic) {
      setTodayTopic(initialTodayTopic);
    }
  }, [initialTodayTopic]);

  const activePhase = useMemo(
    () => PHASE_FILTERS.find((p) => p.id === phaseFilter) || PHASE_FILTERS[0],
    [phaseFilter]
  );

  const handlePhaseChange = (nextPhase: PhaseFilter) => {
    setPhaseFilter(nextPhase);
    const meta = PHASE_FILTERS.find((p) => p.id === nextPhase) || PHASE_FILTERS[0];
    if (selectedWeek < meta.minWeek || selectedWeek > meta.maxWeek) {
      setSelectedWeek(meta.minWeek);
    }
  };

  const weekOptions = useMemo(() => {
    const arr: number[] = [];
    for (let w = activePhase.minWeek; w <= activePhase.maxWeek; w++) {
      arr.push(w);
    }
    return arr;
  }, [activePhase]);

  const displayedDays = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length > 0) {
      return days
        .filter((d) => {
          const inPhase = d.weekNumber >= activePhase.minWeek && d.weekNumber <= activePhase.maxWeek;
          if (!inPhase) return false;
          return (
            d.topic.toLowerCase().includes(q) ||
            d.subject.toLowerCase().includes(q) ||
            d.topicDescription.toLowerCase().includes(q) ||
            d.recommendedExamCategories.some((c) => c.toLowerCase().includes(q))
          );
        })
        .slice(0, 21);
    }
    return days.filter((d) => d.weekNumber === selectedWeek);
  }, [days, selectedWeek, searchQuery, activePhase]);

  const phaseLabel = useMemo(() => getPhaseLabelForWeek(selectedWeek), [selectedWeek]);

  return (
    <div className="space-y-5 animate-smooth-in">
      {/* Featured Current IST Study Day */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                Today&apos;s Scheduled Focus
              </span>
              <span aria-hidden="true">·</span>
              <span>{todayTopic.subject}</span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {todayTopic.topic}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              {todayTopic.topicDescription}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onPracticeTopic(todayTopic.subject, todayTopic.weekNumber, todayTopic.dayNumber)
            }
            className="bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 min-h-[40px] rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer whitespace-nowrap shrink-0 self-start"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Practice Today&apos;s Topic</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="md:col-span-2 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Learning Objectives
            </div>
            <ul className="space-y-1 text-slate-700 dark:text-slate-300">
              {todayTopic.learningObjectives.map((obj, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              <span>Difficulty Mix</span>
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {todayTopic.difficultyDistribution.easy}% E · {todayTopic.difficultyDistribution.medium}% M · {todayTopic.difficultyDistribution.hard}% H
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full"
                style={{ width: `${todayTopic.difficultyDistribution.easy}%` }}
              />
              <div
                className="bg-amber-500 h-full"
                style={{ width: `${todayTopic.difficultyDistribution.medium}%` }}
              />
              <div
                className="bg-rose-500 h-full"
                style={{ width: `${todayTopic.difficultyDistribution.hard}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Exams: {todayTopic.recommendedExamCategories.join(' · ')}
            </div>
          </div>
        </div>
      </section>

      {/* Navigation, Phase & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col gap-3">
          <div
            role="group"
            aria-label="Syllabus Phase Filter"
            className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full sm:w-fit"
          >
            {PHASE_FILTERS.map((phase) => {
              const active = phaseFilter === phase.id;
              return (
                <button
                  key={phase.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handlePhaseChange(phase.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {phase.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                aria-label="Previous week"
                disabled={selectedWeek <= activePhase.minWeek}
                onClick={() => setSelectedWeek((w) => Math.max(activePhase.minWeek, w - 1))}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <label htmlFor="study-week-select" className="sr-only">
                Select Study Week
              </label>
              <select
                id="study-week-select"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500 tabular-nums"
              >
                {weekOptions.map((w) => (
                  <option key={w} value={w}>
                    Week {w} {w === todayTopic.weekNumber ? '(Current)' : ''}
                  </option>
                ))}
              </select>

              <button
                type="button"
                aria-label="Next week"
                disabled={selectedWeek >= activePhase.maxWeek}
                onClick={() => setSelectedWeek((w) => Math.min(activePhase.maxWeek, w + 1))}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search syllabus topics or exam category..."
                aria-label="Search 100-week syllabus topics"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-200">{phaseLabel}</span>
            <span aria-hidden="true">·</span>
            <span>500 Non-Repeating AI Daily Topics (Days 1–5 per Week)</span>
          </div>
          {isLoading && (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Syncing plan...</span>
            </span>
          )}
        </div>
      </div>

      {/* 5-Day Grid / Search Matches */}
      {displayedDays.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-2">
          <Target className="w-6 h-6 text-slate-400 mx-auto" />
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            No matching study topics found
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Clear your search filter or switch phases to browse all 500 topics in the 100-week pool.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedDays.map((day) => {
            const isToday = day.dayKey === todayTopic.dayKey;
            const dayTypeText = `Topic ${day.globalDayIndex} of 500`;

            return (
              <div
                key={day.dayKey}
                className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-xs flex flex-col justify-between gap-4 transition-colors ${
                  isToday
                    ? 'border-emerald-500 dark:border-emerald-500 ring-1 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 tabular-nums">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        W{day.weekNumber} · D{day.dayNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{dayTypeText}</span>
                    </div>
                    {isToday ? (
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        Active Today (IST)
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {day.subject}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {day.topic}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {day.topicDescription}
                  </p>

                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 pt-1">
                    {day.learningObjectives.slice(0, 2).map((obj, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">·</span>
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {day.subject} · {day.recommendedExamCategories.slice(0, 3).join(', ')}
                  </div>

                  <button
                    type="button"
                    onClick={() => onPracticeTopic(day.subject, day.weekNumber, day.dayNumber)}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Practice Topic</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
