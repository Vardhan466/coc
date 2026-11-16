import React, { useEffect, useMemo, useState } from 'react';
import {
  Zap,
  Play,
  BookOpen,
  FileKey,
  Layers,
  Archive,
  SlidersHorizontal,
  Calendar,
} from 'lucide-react';
import { ErrorBookView } from './ErrorBookView';
import { OfficialKeySheetView } from './OfficialKeySheetView';
import { DailyPracticePapersView } from './DailyPracticePapersView';
import { StudyPlanView } from './StudyPlanView';
import { SpeedPracticeInlineSession } from './SpeedPracticeInlineSession';
import { getErrorBookEntries } from '../utils/errorBookStorage';
import { fetchPracticeQuestionPool } from '../utils/aiApiClient';
import { extractAttemptedQuestionIds } from '../utils/speedPracticeStorage';
import { SAMPLE_40_QUESTIONS } from '../data/mockExamData';
import type {
  Attempt,
  LanguageCode,
  PreviousYearPaper,
  StudentProgressStats,
  SubjectTag,
  TestPaper,
  UserProfile,
} from '../types';
import {
  EXAM_CATEGORIES,
  type AIMCQQuestion,
  type DailyExamScheduleConfig,
  type ExamCategory,
  type SpeedPracticeSessionRecord,
  type StudyPlanDay,
} from '../types/aiSystem';

export type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';
export type PoolFilter = 'all' | 'incorrect' | 'unattempted';
export type PracticeSubTab =
  | 'daily_mocks'
  | 'study_plan'
  | 'previous_pqp'
  | 'error_book'
  | 'key_sheet';

interface PracticeViewProps {
  userId?: string;
  user?: UserProfile;
  language?: LanguageCode;
  studentProgress?: StudentProgressStats;
  userAttempt?: Attempt;
  userAttempts?: Attempt[];
  speedSessions?: SpeedPracticeSessionRecord[];
  todayStudyTopic?: StudyPlanDay | null;
  scheduleConfig?: DailyExamScheduleConfig;
  uploadedPQPs?: PreviousYearPaper[];
  onStartSprint: (subject: SubjectTag | 'all', difficulty?: DifficultyFilter) => void;
  onStartMockExam?: (test: TestPaper) => void;
  onSaveSpeedSession?: (rec: SpeedPracticeSessionRecord) => void;
  initialSubTab?: PracticeSubTab;
}

const TOPICS: Array<{ id: SubjectTag | 'all'; label: string }> = [
  { id: 'all', label: 'All Topics' },
  { id: 'Quantitative Aptitude', label: 'Quantitative Aptitude' },
  { id: 'Reasoning & Intelligence', label: 'Reasoning' },
  { id: 'General Awareness', label: 'General Awareness' },
  { id: 'English Comprehension', label: 'English' },
];

const DIFFICULTIES: Array<{ id: DifficultyFilter; label: string }> = [
  { id: 'all', label: 'All Levels' },
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

export const PracticeView: React.FC<PracticeViewProps> = ({
  userId,
  user,
  language = 'en',
  studentProgress,
  userAttempt,
  userAttempts,
  speedSessions = [],
  todayStudyTopic,
  scheduleConfig,
  uploadedPQPs = [],
  onStartSprint,
  onStartMockExam,
  onSaveSpeedSession,
  initialSubTab = 'daily_mocks',
}) => {
  const [subTab, setSubTab] = useState<PracticeSubTab>(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  // Micro-challenge & Interactive Drill filter state
  const [selectedTopic, setSelectedTopic] = useState<SubjectTag | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>('all');
  const [selectedExamCategory, setSelectedExamCategory] = useState<ExamCategory | 'all'>('all');
  const [poolFilter, setPoolFilter] = useState<PoolFilter>('all');
  const [serverQuestions, setServerQuestions] = useState<AIMCQQuestion[]>([]);
  const [inlineDrillOpen, setInlineDrillOpen] = useState<boolean>(false);
  const [inlineDrillQuestions, setInlineDrillQuestions] = useState<AIMCQQuestion[]>([]);
  const [inlineDrillTitle, setInlineDrillTitle] = useState<string>('Interactive Speed Drill');

  useEffect(() => {
    let cancelled = false;
    fetchPracticeQuestionPool()
      .then((qs) => {
        if (!cancelled && Array.isArray(qs)) {
          setServerQuestions(qs);
        }
      })
      .catch(() => {
        // Fallback local bank works seamlessly
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const combinedQuestionBank = useMemo<AIMCQQuestion[]>(() => {
    const map = new Map<string, AIMCQQuestion>();
    for (const q of serverQuestions) {
      map.set(q.id, q);
    }
    for (const q of SAMPLE_40_QUESTIONS) {
      if (!map.has(q.id)) {
        map.set(q.id, {
          ...q,
          examCategory: 'General Competitive Examinations',
          sourceType: 'admin_curated',
          referenceNote: 'Curated Practice Bank',
          reviewStatus: 'approved',
          createdAt: '2026-01-01T00:00:00.000Z',
        });
      }
    }
    return Array.from(map.values());
  }, [serverQuestions]);

  const errorEntries = useMemo(() => getErrorBookEntries(userId), [userId, subTab, inlineDrillOpen]);
  const unmasteredCount = errorEntries.filter((e) => !e.mastered).length;

  const { attemptedIds, incorrectIds } = useMemo(() => {
    const mergedAttempts = [
      ...(userAttempts || []),
      ...(userAttempt && !(userAttempts || []).some((a) => a.id && a.id === userAttempt.id)
        ? [userAttempt]
        : []),
    ];
    return extractAttemptedQuestionIds(mergedAttempts, errorEntries, speedSessions);
  }, [userAttempts, userAttempt, errorEntries, speedSessions]);

  const matchingQuestions = useMemo(() => {
    return combinedQuestionBank.filter((q) => {
      const topicOk = selectedTopic === 'all' || q.subject === selectedTopic;
      const diffOk = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
      const catOk = selectedExamCategory === 'all' || q.examCategory === selectedExamCategory;
      const poolOk =
        poolFilter === 'all'
          ? true
          : poolFilter === 'incorrect'
          ? incorrectIds.has(q.id)
          : !attemptedIds.has(q.id);
      return topicOk && diffOk && catOk && poolOk;
    });
  }, [
    combinedQuestionBank,
    selectedTopic,
    selectedDifficulty,
    selectedExamCategory,
    poolFilter,
    incorrectIds,
    attemptedIds,
  ]);

  const matchingMicroCount = matchingQuestions.length;

  const launchInteractiveDrill = (
    overrideQuestions?: AIMCQQuestion[],
    overrideTitle?: string
  ) => {
    const pool = (overrideQuestions ?? matchingQuestions).slice(0, 15);
    setInlineDrillQuestions(pool);
    setInlineDrillTitle(
      overrideTitle ||
        `${selectedTopic === 'all' ? 'Mixed Subjects' : selectedTopic} · ${
          selectedExamCategory === 'all' ? 'All Exams' : selectedExamCategory
        }`
    );
    setInlineDrillOpen(true);
  };

  const practiceModules = useMemo(() => {
    const defs: { subject: SubjectTag; title: string; description: string }[] = [
      {
        subject: 'Quantitative Aptitude',
        title: 'Speed Calculations & Arithmetic',
        description: 'Master 8-second percentage shortcuts, ratios, train problems, and algebra formulas.',
      },
      {
        subject: 'Reasoning & Intelligence',
        title: 'Logical Deduction & Series',
        description: 'Rapid pattern recognition, prime squares, syllogisms, and direction sense.',
      },
      {
        subject: 'General Awareness',
        title: 'Indian Polity & Modern History Blitz',
        description: 'Constitution articles, amendments, freedom movement events, and general science.',
      },
      {
        subject: 'English Comprehension',
        title: 'Idioms, Error Spotting & Vocab',
        description: 'High-frequency SSC/Banking collocations, one-word substitutions, and antonyms.',
      },
    ];

    return defs.map((def) => {
      const bankCount = SAMPLE_40_QUESTIONS.filter((q) => q.subject === def.subject).length;
      const perf = studentProgress?.subjectPerformance?.find((s) => s.subject === def.subject);
      const hasData = Boolean(
        studentProgress && studentProgress.testsTaken > 0 && perf && perf.totalQuestions > 0
      );
      return {
        ...def,
        bankCount,
        solvedCount: hasData && perf ? perf.totalQuestions : 0,
        avgAccuracyLabel: hasData && perf ? `${perf.accuracy}% avg` : '-- avg',
      };
    });
  }, [studentProgress]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Tabbed Interface Splitting Speed Practice cleanly into Daily Mock Tests, Previous PQP, Error Book & 8 PM Key */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div
          role="tablist"
          aria-label="Speed Practice Sections"
          className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'daily_mocks'}
            onClick={() => setSubTab('daily_mocks')}
            className={`flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'daily_mocks'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
            <span>Daily Mock Tests</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'study_plan'}
            onClick={() => {
              setInlineDrillOpen(false);
              setSubTab('study_plan');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'study_plan'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span>Daily Syllabus</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'previous_pqp'}
            onClick={() => {
              setInlineDrillOpen(false);
              setSubTab('previous_pqp');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'previous_pqp'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Archive className="w-3.5 h-3.5 text-indigo-500" />
            <span>Previous PQP</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'error_book'}
            onClick={() => {
              setInlineDrillOpen(false);
              setSubTab('error_book');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'error_book'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
            <span>Error Book</span>
            {unmasteredCount > 0 && (
              <span className="font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400 leading-none tabular-nums">
                ({unmasteredCount})
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'key_sheet'}
            onClick={() => {
              setInlineDrillOpen(false);
              setSubTab('key_sheet');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === 'key_sheet'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileKey className="w-3.5 h-3.5 text-amber-500" />
            <span>{scheduleConfig?.answerKeyReleaseTime || '8:00 PM'} Key Sheet</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden md:block whitespace-nowrap">
          {subTab === 'daily_mocks' && 'Interactive Drills · Daily Mock Papers'}
          {subTab === 'study_plan' && 'Structured Daily Competitive Exam Syllabus'}
          {subTab === 'previous_pqp' &&
            (uploadedPQPs.length > 0
              ? `${uploadedPQPs.length} Official PQP Paper(s)`
              : 'Official PQP Archive')}
          {subTab === 'error_book' && 'Spaced Mistake Revision'}
          {subTab === 'key_sheet' &&
            `Official Solutions Released After ${scheduleConfig?.answerKeyReleaseTime || '20:00'} IST`}
        </div>
      </div>

      {/* Render Active Sub-View */}
      {subTab === 'study_plan' ? (
        <StudyPlanView
          todayTopic={todayStudyTopic}
          onPracticeTopic={(subject) => {
            setSelectedTopic(subject);
            setSubTab('daily_mocks');
            const topicMatches = combinedQuestionBank
              .filter((q) => q.subject === subject)
              .slice(0, 15);
            launchInteractiveDrill(
              topicMatches,
              `Daily Syllabus Drill (${subject})`
            );
          }}
        />
      ) : subTab === 'previous_pqp' ? (
        <DailyPracticePapersView
          language={language}
          onStartExam={onStartMockExam}
          forcedSection="pqp"
          uploadedPQPs={uploadedPQPs}
        />
      ) : subTab === 'key_sheet' ? (
        <OfficialKeySheetView
          language={language}
          userAttempt={userAttempt}
          isUnlockedAlways={false}
          answerKeyReleaseTime={scheduleConfig?.answerKeyReleaseTime}
        />
      ) : subTab === 'error_book' ? (
        <ErrorBookView language={language} userId={userId} />
      ) : inlineDrillOpen ? (
        <SpeedPracticeInlineSession
          isOpen={inlineDrillOpen}
          onClose={() => setInlineDrillOpen(false)}
          questions={inlineDrillQuestions}
          filters={{
            examCategory: selectedExamCategory,
            subject: selectedTopic,
            difficulty: selectedDifficulty,
            poolFilter,
          }}
          userId={userId}
          user={user}
          initialTestTitle={inlineDrillTitle}
          onSessionSaved={(rec) => onSaveSpeedSession?.(rec)}
        />
      ) : (
        <div className="space-y-6 animate-smooth-in">
          {/* 1. 3-to-5-Minute Topic & Difficulty Micro-Challenges Builder */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>3–5 Minute Micro-Challenges · Instant Streak Saver</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Custom Topic &amp; Difficulty Sprints
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Filter high-yield questions by topic and difficulty to sharpen speed before tonight’s 7:00 PM live competition.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => launchInteractiveDrill()}
                  className="bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-bold px-4 py-2.5 min-h-[42px] rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Interactive Drill (Immediate Feedback)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onStartSprint(selectedTopic, selectedDifficulty)}
                  className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 font-bold px-4 py-2.5 min-h-[42px] rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Speed Practice ({Math.min(10, Math.max(3, matchingMicroCount))}Q)</span>
                </button>
              </div>
            </div>

            {/* Filter Rows */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="practice-exam-category"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Exam Category
                  </label>
                  <select
                    id="practice-exam-category"
                    value={selectedExamCategory}
                    onChange={(e) => setSelectedExamCategory(e.target.value as ExamCategory | 'all')}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500"
                  >
                    <option value="all">All Competitive Exams ({combinedQuestionBank.length}Q)</option>
                    {EXAM_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Question Pool Filter
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(
                      [
                        { id: 'all', label: 'All Questions' },
                        { id: 'incorrect', label: 'Previously Incorrect' },
                        { id: 'unattempted', label: 'Unattempted' },
                      ] as const
                    ).map((item) => {
                      const active = poolFilter === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPoolFilter(item.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            active
                              ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-500'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Topic Category</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TOPICS.map((tp) => {
                    const active = selectedTopic === tp.id;
                    return (
                      <button
                        key={tp.id}
                        type="button"
                        onClick={() => setSelectedTopic(tp.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-500'
                            : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {tp.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">
                    Difficulty:
                  </span>
                  {DIFFICULTIES.map((diff) => {
                    const active = selectedDifficulty === diff.id;
                    return (
                      <button
                        key={diff.id}
                        type="button"
                        onClick={() => setSelectedDifficulty(diff.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {diff.label}
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  <strong className="text-slate-900 dark:text-white">{matchingMicroCount}</strong> questions matched ·{' '}
                  {matchingMicroCount === 0
                    ? 'broaden filters to drill'
                    : `${Math.min(15, matchingMicroCount)}Q interactive session ready`}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Daily Mock Tests Papers */}
          <DailyPracticePapersView
            language={language}
            onStartExam={onStartMockExam}
            forcedSection="daily_mocks"
          />

          {/* 3. Targeted Subject Reflex Sprints */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
              Targeted Subject Reflex Sprints (10 Questions · Untimed Practice)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {practiceModules.map((mod) => (
                <div
                  key={mod.subject}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {mod.subject}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                        {mod.avgAccuracyLabel}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1">
                      {mod.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {mod.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {mod.bankCount} questions · {mod.solvedCount} solved
                    </span>
                    <button
                      type="button"
                      onClick={() => onStartSprint(mod.subject, selectedDifficulty)}
                      className="bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-semibold px-3.5 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Start Drill</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
