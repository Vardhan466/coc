import React, { useMemo, useState } from 'react';
import { PreviousYearPaper, TestPaper, LanguageCode } from '../types';
import { SAMPLE_30_QUESTIONS, SAMPLE_40_QUESTIONS } from '../data/mockExamData';
import { buildUniqueMockQuestions } from '../utils/dailyLeaderboard';
import { getTodayIsoDateIST } from '../utils/istTime';
import {
  Play,
  Layers,
  Archive,
  Info,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

interface DailyPracticePapersViewProps {
  language?: LanguageCode;
  onStartExam?: (test: TestPaper) => void;
  forcedSection?: 'pqp' | 'daily_mocks';
  uploadedPQPs?: PreviousYearPaper[];
}

export const DailyPracticePapersView: React.FC<DailyPracticePapersViewProps> = ({
  language = 'en',
  onStartExam,
  forcedSection,
  uploadedPQPs = [],
}) => {
  const [internalSection, setInternalSection] = useState<'pqp' | 'daily_mocks'>(
    forcedSection || 'daily_mocks'
  );
  const activeSection = forcedSection ?? internalSection;
  const todayIso = getTodayIsoDateIST();

  // Curated Daily Mock Tests generated strictly from deduplicated question pools
  const dailyMockPapers: TestPaper[] = useMemo(() => {
    const allMixedQs = buildUniqueMockQuestions('all', 30, SAMPLE_30_QUESTIONS, SAMPLE_40_QUESTIONS);
    const quantQs = buildUniqueMockQuestions('Quantitative Aptitude', 30, SAMPLE_40_QUESTIONS, SAMPLE_30_QUESTIONS);
    const reasoningQs = buildUniqueMockQuestions('Reasoning & Intelligence', 30, SAMPLE_40_QUESTIONS, SAMPLE_30_QUESTIONS);
    const gaQs = buildUniqueMockQuestions('General Awareness', 30, SAMPLE_40_QUESTIONS, SAMPLE_30_QUESTIONS);

    const makeMock = (
      id: string,
      testCode: string,
      title: string,
      category: string,
      description: string,
      questions: typeof allMixedQs,
      subscribers: number
    ): TestPaper => ({
      id,
      testCode,
      title,
      description,
      category,
      date: todayIso,
      windowStart: '00:00',
      windowEnd: '23:59',
      answerKeyReleaseTime: '20:00',
      totalQuestions: questions.length,
      totalDurationSeconds: questions.length * 10,
      questionDurationSeconds: 10,
      status: 'live',
      questions,
      lockedForEditing: true,
      totalSubscribers: subscribers,
      isCustomScheduled: true,
    });

    return [
      makeMock(
        'daily_mock_full_01',
        'COC-MOCK-ALL',
        'All-India Mixed Speed Mock #1',
        'Daily Practice Mock',
        `${allMixedQs.length}-question CBT speed test covering Quantitative Aptitude, Reasoning, General Awareness, and English Comprehension.`,
        allMixedQs,
        1240
      ),
      makeMock(
        'daily_mock_quant_02',
        'COC-MOCK-QA',
        'Quantitative Aptitude & Calculations Mock #2',
        'Subject Sprint Mock',
        `${quantQs.length} unique speed calculation problems covering percentages, ratios, profit & loss, algebra, and number series under strict 10s rule.`,
        quantQs,
        980
      ),
      makeMock(
        'daily_mock_reasoning_03',
        'COC-MOCK-LR',
        'Logical Reasoning & Deduction Mock #3',
        'Subject Sprint Mock',
        `${reasoningQs.length} unique analytical reasoning puzzles, coding-decoding, number analogies, and syllogisms to hone split-second reflexes.`,
        reasoningQs,
        875
      ),
      makeMock(
        'daily_mock_ga_04',
        'COC-MOCK-GA',
        'General Awareness & Indian Polity Mock #4',
        'Subject Sprint Mock',
        `${gaQs.length} unique Static GK, Indian Constitution, Modern History, and General Science questions reflecting official SSC and Railway exams.`,
        gaQs,
        1120
      ),
    ];
  }, [todayIso]);

  const handleLaunchPQP = (pqp: PreviousYearPaper) => {
    const qLen = pqp.questions.length;
    const durSecs = pqp.totalDurationSeconds || qLen * 10;
    const pqpTest: TestPaper = {
      id: `pqp_${pqp.id}`,
      testCode: `PQP-${pqp.year}`,
      title: pqp.title,
      description: `${pqp.examBoard} ${pqp.year}${pqp.shiftLabel ? ` (${pqp.shiftLabel})` : ''} official previous year question paper.`,
      category: pqp.examBoard,
      date: todayIso,
      windowStart: '00:00',
      windowEnd: '23:59',
      answerKeyReleaseTime: '20:00',
      totalQuestions: qLen,
      totalDurationSeconds: durSecs,
      questionDurationSeconds: Math.max(10, Math.round(durSecs / Math.max(1, qLen))),
      status: 'live',
      questions: pqp.questions,
      lockedForEditing: true,
      totalSubscribers: 0,
      isCustomScheduled: true,
    };
    onStartExam?.(pqpTest);
  };

  return (
    <div className="space-y-5 animate-smooth-in" data-lang={language}>
      {!forcedSection && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Exam Resource Bank · Daily Practice Question Papers
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Daily Practice Question Papers
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
              Access previous year question papers (PQP) and high-yield daily mock papers under the authentic 10s/question CBT engine.
            </p>
          </div>

          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setInternalSection('pqp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeSection === 'pqp'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-indigo-500" />
              <span>Previous PQP</span>
            </button>

            <button
              type="button"
              onClick={() => setInternalSection('daily_mocks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeSection === 'daily_mocks'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              <span>Daily Mock Tests</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: PREVIOUS YEAR QUESTION PAPERS (PQP) */}
      {activeSection === 'pqp' && (
        uploadedPQPs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 sm:p-12 text-center shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
              <Archive className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                Previous Year Question Papers (PQP)
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Previous PQP Archive Coming Soon
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Official previous year question papers from SSC CGL, RRB NTPC, and Banking examinations will appear in this section once uploaded.
              </p>
            </div>

            <div className="p-3.5 max-w-lg mx-auto bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-left flex items-start gap-3">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  PQP Archive Readiness
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  This slot is reserved for uploaded Previous Year Question Papers with shift tags, official answer keys, and bilingual explanations.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Previous Year Question Papers ({uploadedPQPs.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Official shift archives · CBT timed practice
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {uploadedPQPs.map((pqp) => {
                const durSec = pqp.totalDurationSeconds || pqp.questions.length * 10;
                const durText = durSec >= 60 ? `${Math.round(durSec / 60)} mins` : `${durSec}s`;
                return (
                  <div
                    key={pqp.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                          {pqp.examBoard} · {pqp.year}
                        </span>
                        {pqp.shiftLabel && (
                          <span className="font-semibold text-slate-500 dark:text-slate-400">
                            {pqp.shiftLabel}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 dark:text-white text-base">
                        {pqp.title}
                      </h4>

                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {pqp.questions.length} Questions
                        </span>
                        <span>·</span>
                        <span>{durText}</span>
                        <span>·</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Official Shift Paper</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        <span>Includes Keys</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLaunchPQP(pqp)}
                        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start PQP Practice</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* SECTION 2: DAILY MOCK TESTS */}
      {activeSection === 'daily_mocks' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Available Daily Mock Tests ({dailyMockPapers.length})
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Unlimited attempts · Continuous progress tracking
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dailyMockPapers.map((paper) => {
              const qCount = paper.questions.length;
              const durSecs = paper.totalDurationSeconds || qCount * 10;
              const durLabel =
                durSecs >= 60
                  ? `${Math.floor(durSecs / 60)}m ${durSecs % 60 > 0 ? `${durSecs % 60}s` : ''}`.trim()
                  : `${durSecs}s`;

              return (
                <div
                  key={paper.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {paper.testCode}
                      </span>
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        {paper.category}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">
                        {paper.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {paper.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {qCount} Questions
                      </span>
                      <span>·</span>
                      <span>{durLabel}</span>
                      <span>·</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">10s/Q rule</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>CBT Simulation</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onStartExam?.(paper)}
                      className="bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Mock Test</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
