import React, { useState, useEffect, useMemo } from 'react';
import { Attempt, LanguageCode, Question, SubjectTag } from '../types';
import { getMasterKeySheetQuestions } from '../utils/keySheetStorage';
import { formatCountdownHMS, getSecondsUntilISTTime, isAfterISTTime } from '../utils/istTime';
import { fetchDailyKeySheetServer } from '../utils/aiApiClient';
import { MathRenderer } from './MathRenderer';
import {
  FileKey,
  CheckCircle2,
  XCircle,
  Sparkles,
  Filter,
  Search,
  RotateCcw,
  Clock,
  Lock,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';

function formatHHMMTo12h(hhmm: string): string {
  const [rawH, rawM] = hhmm.split(':').map(Number);
  const h = Number.isFinite(rawH) ? rawH : 20;
  const m = Number.isFinite(rawM) ? rawM : 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

interface OfficialKeySheetViewProps {
  language?: LanguageCode;
  questionsOverride?: Question[];
  userAttempt?: Attempt;
  isUnlockedAlways?: boolean;
  answerKeyReleaseTime?: string;
  examDate?: string;
}

export const OfficialKeySheetView: React.FC<OfficialKeySheetViewProps> = ({
  language = 'en',
  questionsOverride,
  userAttempt,
  isUnlockedAlways = false,
  answerKeyReleaseTime,
  examDate,
}) => {
  const [storedQuestions, setStoredQuestions] = useState<Question[]>([]);
  const [serverKeyQuestions, setServerKeyQuestions] = useState<Question[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [onlyMissedFilter, setOnlyMissedFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Interactive click state for each question:
  const [interactiveSelections, setInteractiveSelections] = useState<Record<string, number>>({});
  const [allExplanationsExpanded, setAllExplanationsExpanded] = useState(false);

  useEffect(() => {
    setStoredQuestions(getMasterKeySheetQuestions());
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const releaseHHMM = answerKeyReleaseTime || '20:00';
  const releaseDisplay = formatHHMMTo12h(releaseHHMM);
  const isKeyUnlocked = isUnlockedAlways || isAfterISTTime(releaseHHMM, nowMs);

  useEffect(() => {
    if (!isKeyUnlocked || (questionsOverride && questionsOverride.length > 0)) {
      return;
    }
    let cancelled = false;
    fetchDailyKeySheetServer(examDate)
      .then((res) => {
        if (!cancelled && !res.locked && Array.isArray(res.questions) && res.questions.length > 0) {
          setServerKeyQuestions(res.questions);
        }
      })
      .catch(() => {
        // Offline local fallback remains active
      });
    return () => {
      cancelled = true;
    };
  }, [isKeyUnlocked, questionsOverride, examDate]);

  const questions = useMemo(() => {
    if (questionsOverride && questionsOverride.length > 0) {
      return questionsOverride;
    }
    if (serverKeyQuestions.length > 0) {
      return serverKeyQuestions;
    }
    return storedQuestions;
  }, [questionsOverride, serverKeyQuestions, storedQuestions]);

  const unlockCountdown = useMemo(
    () => formatCountdownHMS(getSecondsUntilISTTime(releaseHHMM, nowMs)),
    [releaseHHMM, nowMs]
  );

  // Map user's prior exam answers by questionId
  const userPickByQuestionId = useMemo(() => {
    const map = new Map<string, number | null>();
    if (userAttempt?.answers) {
      for (const ans of userAttempt.answers) {
        const picked = ans.selectedOptionIndex ?? ans.selectedOption ?? null;
        map.set(ans.questionId, picked);
      }
    }
    return map;
  }, [userAttempt]);

  const missedQuestionIds = useMemo(() => {
    const set = new Set<string>();
    for (const q of questions) {
      const picked = userPickByQuestionId.get(q.id);
      if (picked !== undefined && picked !== null && picked !== q.correctIndex) {
        set.add(q.id);
      }
    }
    return set;
  }, [questions, userPickByQuestionId]);

  const handleSelectOption = (questionId: string, optIndex: number) => {
    setInteractiveSelections((prev) => ({
      ...prev,
      [questionId]: optIndex,
    }));
  };

  const handleResetDrill = () => {
    setInteractiveSelections({});
  };

  // Filter questions & auto-prioritize missed questions from the student's latest attempt at top
  const filteredQuestions = useMemo(() => {
    const filtered = questions.filter((q) => {
      const matchesSubj = selectedSubject === 'all' || q.subject === selectedSubject;
      const matchesMissed = !onlyMissedFilter || missedQuestionIds.has(q.id);
      const matchesSearch =
        searchQuery.trim() === '' ||
        q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.topic.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSubj && matchesMissed && matchesSearch;
    });
    if (missedQuestionIds.size === 0) return filtered;
    return [...filtered].sort(
      (a, b) => Number(missedQuestionIds.has(b.id)) - Number(missedQuestionIds.has(a.id))
    );
  }, [questions, selectedSubject, onlyMissedFilter, searchQuery, missedQuestionIds]);

  const subjects: SubjectTag[] = [
    'Quantitative Aptitude',
    'Reasoning & Intelligence',
    'General Awareness',
    'English Comprehension',
  ];

  if (!isKeyUnlocked) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-10 text-center shadow-xs space-y-5 animate-smooth-in">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-amber-400 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>

        <div className="max-w-lg mx-auto space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Vault Encrypted Until {releaseDisplay} IST ({releaseHHMM} IST)
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Official Answer Key Sheet &amp; Solutions Locked
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            To preserve competition integrity across all timezones and straggler slots, the Official Answer Key and interactive step-by-step explanations unlock strictly at <strong>{releaseDisplay} IST</strong>.
          </p>
        </div>

        <div className="inline-flex flex-col items-center bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl px-6 py-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Unlocks In</span>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-slate-900 dark:text-amber-400 tabular-nums">
            {unlockCountdown.formatted}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            After {releaseDisplay} IST, click any wrong answer to reveal the right key and full explanation.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-smooth-in">
      {/* 1. Official Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <FileKey className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Official {releaseDisplay} Master Answer Key &amp; Solutions</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-500 dark:text-slate-400">Released Post-Exam at {releaseHHMM} IST</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Official Key Sheet &amp; Interactive Explanation Drill
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
              Test your understanding of today&apos;s exam questions. Click on any option: if you choose or missed the wrong answer, the system reveals the verified answer key and step-by-step shortcut below.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleResetDrill}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              title="Reset all selected answers"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Choices</span>
            </button>

            <button
              type="button"
              onClick={() => setAllExplanationsExpanded(!allExplanationsExpanded)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{allExplanationsExpanded ? 'Hide All Explanations' : 'Show All Explanations'}</span>
            </button>
          </div>
        </div>

        {/* Status indicator */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              Official Answer Vault Active ({releaseDisplay} IST Edition)
            </span>
            <span aria-hidden="true">·</span>
            <span>{questions.length} MCQs Loaded with Solutions</span>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Board: Club Of Competition (COC)
          </div>
        </div>
      </div>

      {/* 2. Filter & Search Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Subject & Wrong Answer Filter */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Filter:</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedSubject('all');
              setOnlyMissedFilter(false);
            }}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              selectedSubject === 'all' && !onlyMissedFilter
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            All ({questions.length})
          </button>

          {missedQuestionIds.size > 0 && (
            <button
              type="button"
              onClick={() => setOnlyMissedFilter((prev) => !prev)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                onlyMissedFilter
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800'
              }`}
            >
              Missed in Exam ({missedQuestionIds.size})
            </button>
          )}

          {subjects.map((subj) => {
            const count = questions.filter((q) => q.subject === subj).length;
            return (
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
                {subj} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search question or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* 3. Question Cards with Interactive Click-to-Explain */}
      <div className="space-y-4">
        {filteredQuestions.map((q, idx) => {
          const qText = language === 'te' && q.textTe ? q.textTe : language === 'hi' && q.textHi ? q.textHi : q.text;
          const options = language === 'te' && q.optionsTe ? q.optionsTe : language === 'hi' && q.optionsHi ? q.optionsHi : q.options;
          const explanation = language === 'te' && q.explanationTe ? q.explanationTe : language === 'hi' && q.explanationHi ? q.explanationHi : q.explanation;

          const examPicked = userPickByQuestionId.get(q.id);
          const wasMissedInExam = examPicked !== undefined && examPicked !== null && examPicked !== q.correctIndex;
          const selectedOption = interactiveSelections[q.id];
          const hasUserClicked = selectedOption !== undefined;
          const isUserCorrect = hasUserClicked && selectedOption === q.correctIndex;
          const isUserWrong = hasUserClicked && selectedOption !== q.correctIndex;
          const showExplanation = allExplanationsExpanded || hasUserClicked;

          return (
            <div
              key={q.id || idx}
              className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-xs transition-all space-y-4 ${
                isUserCorrect
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/10 dark:bg-emerald-950/15'
                  : isUserWrong
                  ? 'border-rose-300 dark:border-rose-800 bg-rose-50/10 dark:bg-rose-950/15'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Question Header Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Q{idx + 1}.
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{q.subject}</span>
                  <span aria-hidden="true">·</span>
                  <span>{q.topic}</span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{q.difficulty}</span>
                </div>

                <div className="flex items-center gap-2">
                  {wasMissedInExam && !showExplanation && (
                    <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                      Missed in exam (Your pick: {String.fromCharCode(65 + (examPicked as number))})
                    </span>
                  )}
                  {showExplanation && (
                    <span className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      Official Key: Option {String.fromCharCode(65 + q.correctIndex)}
                    </span>
                  )}
                </div>
              </div>

              {/* Question Statement */}
              <div className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                <MathRenderer content={qText} />
              </div>

              {/* Interactive 4 Options */}
              <div className="space-y-2">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Click an option (or your wrong pick) to verify and reveal explanation:</span>
                  {hasUserClicked && (
                    <span className={isUserCorrect ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-600 dark:text-rose-400 font-semibold'}>
                      {isUserCorrect ? '✓ Correct Choice!' : '✗ Wrong Choice — Solution Revealed'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {options.map((optText, optIdx) => {
                    const isThisClicked = selectedOption === optIdx;
                    const isThisCorrect = optIdx === q.correctIndex;
                    const isExamWrongPick = !hasUserClicked && wasMissedInExam && examPicked === optIdx;

                    let btnClass =
                      'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200';

                    if (hasUserClicked || allExplanationsExpanded) {
                      if (isThisCorrect) {
                        btnClass =
                          'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500';
                      } else if ((isThisClicked && !isThisCorrect) || (examPicked === optIdx && !isThisCorrect)) {
                        btnClass =
                          'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-950 dark:text-rose-200 font-semibold ring-1 ring-rose-500';
                      }
                    } else if (isExamWrongPick) {
                      btnClass =
                        'border-rose-300 dark:border-rose-700 bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-950/70';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        className={`flex items-start gap-2.5 p-3 rounded-lg border text-left text-xs sm:text-sm transition-all cursor-pointer ${btnClass}`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border mt-0.5 ${
                            (hasUserClicked || allExplanationsExpanded) && isThisCorrect
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : (hasUserClicked && isThisClicked) || isExamWrongPick
                              ? 'bg-rose-600 border-rose-600 text-white'
                              : 'border-current opacity-70'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>

                        <span className="flex-1 leading-normal">
                          <MathRenderer content={optText} inline={true} />
                        </span>

                        {(hasUserClicked || allExplanationsExpanded) && isThisCorrect && (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded shrink-0">
                            ✓ Key
                          </span>
                        )}

                        {hasUserClicked && isThisClicked && !isThisCorrect && (
                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50 px-1.5 py-0.5 rounded shrink-0">
                            ✗ Your Click
                          </span>
                        )}

                        {isExamWrongPick && (
                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 shrink-0">
                            Tap to Reveal
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Below Explanation Box */}
              {showExplanation && (
                <div
                  className={`p-4 rounded-xl border space-y-2.5 text-xs sm:text-sm animate-smooth-in ${
                    isUserWrong
                      ? 'bg-rose-50/70 dark:bg-slate-800/90 border-rose-200 dark:border-rose-900/60 text-slate-800 dark:text-slate-200'
                      : isUserCorrect
                      ? 'bg-emerald-50/70 dark:bg-slate-800/90 border-emerald-200 dark:border-emerald-900/60 text-slate-800 dark:text-slate-200'
                      : 'bg-blue-50/60 dark:bg-slate-800/80 border-blue-100 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 dark:border-white/10 pb-2">
                    <div className="flex items-center gap-2 font-bold">
                      {isUserWrong ? (
                        <>
                          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          <span className="text-rose-800 dark:text-rose-300">
                            Incorrect Choice! You clicked Option {String.fromCharCode(65 + (selectedOption ?? 0))}.
                          </span>
                        </>
                      ) : isUserCorrect ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-800 dark:text-emerald-300">
                            Correct! Option {String.fromCharCode(65 + q.correctIndex)} is the Right Answer.
                          </span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-blue-900 dark:text-blue-300">
                            Official Key Solution &amp; Shortcut:
                          </span>
                        </>
                      )}
                    </div>

                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      Right Answer: Option {String.fromCharCode(65 + q.correctIndex)}
                    </div>
                  </div>

                  <div className="leading-relaxed pt-1">
                    <MathRenderer content={explanation || 'No official explanation provided.'} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
