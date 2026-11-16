import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toPublicLeaderboardEntry,
  mergeLiveLeaderboardAttempts,
  buildUniqueMockQuestions,
  generateDailySeededLeaderboardAttempts,
  buildDynamicDailyLeaderboard,
  TARGET_LEADERBOARD_COHORT_SIZE,
} from './dailyLeaderboard';
import { getTopicFormulaSlides } from './topicCheatCodes';
import {
  EMPTY_STUDENT_PROGRESS,
  recordTestAttemptInProgress,
} from './studentProgressStorage';
import {
  getErrorBookEntries,
} from './errorBookStorage';
import {
  isCustomTestWindowActiveIST,
} from './istTime';
import { Attempt, Question, UserProfile } from '../types';

function makeQuestion(id: string, text: string, subject: Question['subject'], correctIndex = 0): Question {
  return {
    id,
    qIndex: 0,
    subject,
    topic: `${subject} Topic`,
    difficulty: 'medium',
    text,
    options: ['Opt A', 'Opt B', 'Opt C', 'Opt D'],
    correctIndex,
    explanation: 'Sample explanation',
  };
}

test('toPublicLeaderboardEntry strips sensitive PII fields', () => {
  const attempt = {
    id: 'att-1',
    studentId: 'COC-2026-10001',
    studentName: 'Aarav Sharma',
    studentState: 'Maharashtra',
    testId: 'daily-live',
    score: 24.5,
    correctCount: 25,
    incorrectCount: 2,
    unattemptedCount: 3,
    timeTakenSeconds: 185,
    submittedAt: '2026-04-10T13:35:00.000Z',
    answers: [{ questionId: 'q1', questionIndex: 0, selectedOption: 1, isCorrect: true, timeSpentSeconds: 4 }],
    email: 'secret@example.com',
    phone: '9999999999',
  } as unknown as Attempt;

  const pub = toPublicLeaderboardEntry(attempt);
  assert.equal(pub.studentId, 'COC-2026-10001');
  assert.equal(pub.studentName, 'Aarav Sharma');
  assert.equal(pub.score, 24.5);
  assert.equal('email' in pub, false);
  assert.equal('phone' in pub, false);
  assert.equal('answers' in pub, false);
});

test('mergeLiveLeaderboardAttempts deduplicates by studentId and reranks with tie-breakers', () => {
  const base: Attempt[] = [
    {
      id: '1',
      studentId: 'S1',
      studentName: 'Riya',
      studentState: 'Delhi',
      testId: 'daily',
      score: 20,
      correctCount: 20,
      incorrectCount: 0,
      unattemptedCount: 10,
      timeTakenSeconds: 200,
      submittedAt: '2026-04-10T13:31:00.000Z',
      answers: [],
    },
    {
      id: '2',
      studentId: 'S2',
      studentName: 'Kabir',
      studentState: 'UP',
      testId: 'daily',
      score: 20,
      correctCount: 21,
      incorrectCount: 4,
      unattemptedCount: 5,
      timeTakenSeconds: 220,
      submittedAt: '2026-04-10T13:32:00.000Z',
      answers: [],
    },
  ];

  // Incoming update for S1 finishes faster and higher accuracy
  const incoming: Attempt[] = [
    {
      id: '1',
      studentId: 'S1',
      studentName: 'Riya',
      studentState: 'Delhi',
      testId: 'daily',
      score: 22,
      correctCount: 22,
      incorrectCount: 0,
      unattemptedCount: 8,
      timeTakenSeconds: 180,
      submittedAt: '2026-04-10T13:34:00.000Z',
      answers: [],
    },
  ];

  const ranked = mergeLiveLeaderboardAttempts(base, incoming);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].studentId, 'S1');
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[1].studentId, 'S2');
  assert.equal(ranked[1].rank, 2);
});

test('buildUniqueMockQuestions eliminates duplicate IDs and normalized question stems across pools', () => {
  const poolA: Question[] = [
    makeQuestion('q1', 'What is 15% of 200?', 'Quantitative Aptitude'),
    makeQuestion('q2', 'Solve: 12 x 12', 'Quantitative Aptitude'),
    makeQuestion('q3', 'Synonym of Ephemeral', 'English Comprehension'),
  ];
  const poolB: Question[] = [
    makeQuestion('q1', 'What is 15% of 200?', 'Quantitative Aptitude'), // duplicate id + stem
    makeQuestion('q4', '  what is   15% of 200? ', 'Quantitative Aptitude'), // duplicate stem different id
    makeQuestion('q5', 'Average of 10, 20, 30', 'Quantitative Aptitude'),
  ];

  const uniqueQuant = buildUniqueMockQuestions('Quantitative Aptitude', 10, poolA, poolB);
  assert.equal(uniqueQuant.length, 3);
  assert.deepEqual(
    uniqueQuant.map((q) => q.id),
    ['q1', 'q2', 'q5']
  );
  assert.deepEqual(
    uniqueQuant.map((q) => q.qIndex),
    [0, 1, 2]
  );
});

test('recordTestAttemptInProgress dynamically builds subjectPerformance and weakestTopics from empty progress', () => {
  const q1 = makeQuestion('dq1', 'Quant Q1', 'Quantitative Aptitude', 1);
  const q2 = makeQuestion('dq2', 'Quant Q2', 'Quantitative Aptitude', 2);
  const q3 = makeQuestion('de1', 'English Q1', 'English Comprehension', 0);

  const attempt: Attempt = {
    id: 'att-fresh-1',
    studentId: 'COC-2026-99999',
    studentName: 'New Learner',
    studentState: 'Karnataka',
    testId: 'mock-1',
    score: 1.75,
    correctCount: 2,
    incorrectCount: 1,
    unattemptedCount: 0,
    timeTakenSeconds: 18,
    submittedAt: '2026-04-10T10:00:00.000Z',
    answers: [
      { questionId: 'dq1', questionIndex: 0, selectedOptionIndex: 1, isCorrect: true, timeSpentSeconds: 5 },
      { questionId: 'dq2', questionIndex: 1, selectedOptionIndex: 0, isCorrect: false, timeSpentSeconds: 7 },
      { questionId: 'de1', questionIndex: 2, selectedOptionIndex: 0, isCorrect: true, timeSpentSeconds: 6 },
    ],
  };

  const fakeUser: UserProfile = {
    uid: '', // omit localStorage write side-effect
    studentId: 'COC-2026-99999',
    fullName: 'New Learner',
    email: 'new@example.com',
    phone: '+91 9000000000',
    address: { local: '', district: 'Bengaluru', state: 'Karnataka', country: 'India' },
    examTarget: 'SSC CGL / CHSL',
    role: 'student',
    language: 'en',
    profileComplete: true,
    createdAt: '2026-04-10T00:00:00.000Z',
    dpdpConsent: true,
    subscription: { isActive: true, plan: 'Pro Daily Pass', validUntil: '2026-12-31', consecutiveMissedDays: 0 },
  };

  const next = recordTestAttemptInProgress(
    EMPTY_STUDENT_PROGRESS,
    attempt,
    'Quant + English Sprint',
    { ...fakeUser, studentId: '' }, // skip localStorage in Node test env
    [q1, q2, q3]
  );

  assert.equal(next.testsTaken, 1);
  assert.equal(next.averageScore, 1.75);
  assert.equal(next.highestScore, 1.75);
  assert.equal(next.currentStreak, 1);

  const quantPerf = next.subjectPerformance.find((s) => s.subject === 'Quantitative Aptitude');
  const engPerf = next.subjectPerformance.find((s) => s.subject === 'English Comprehension');
  const gaPerf = next.subjectPerformance.find((s) => s.subject === 'General Awareness');

  assert.equal(quantPerf?.totalQuestions, 2);
  assert.equal(quantPerf?.correct, 1);
  assert.equal(quantPerf?.accuracy, 50);

  assert.equal(engPerf?.totalQuestions, 1);
  assert.equal(engPerf?.correct, 1);
  assert.equal(engPerf?.accuracy, 100);

  assert.equal(gaPerf?.totalQuestions, 0);
  assert.equal(gaPerf?.accuracy, 0);

  assert.equal(next.weakestTopics[0].topic, 'Quantitative Aptitude Topic');
  assert.equal(next.weakestTopics[0].accuracy, 50);
});

test('getErrorBookEntries gives empty array to new accounts and seeds demo account only', () => {
  assert.equal(getErrorBookEntries('brand_new_user_1').length, 0);
  assert.equal(getErrorBookEntries('user_ravi_01').length, 0);
  assert.equal(getErrorBookEntries('demo_user_001').length > 0, true);
});

test('isCustomTestWindowActiveIST enforces scheduled start/end dates strictly in IST', () => {
  // 2026-11-10T14:00:00Z === 2026-11-10 19:30:00 IST
  const now1930IST = Date.UTC(2026, 10, 10, 14, 0, 0);
  const upcoming = isCustomTestWindowActiveIST(
    { scheduledDate: '2026-11-10', scheduledStartTime: '20:30', scheduledEndTime: '21:00' },
    now1930IST
  );
  assert.equal(upcoming.status, 'upcoming');
  assert.equal(upcoming.secondsToStart, 3600);

  // 2026-11-10T15:10:00Z === 2026-11-10 20:40:00 IST
  const now2040IST = Date.UTC(2026, 10, 10, 15, 10, 0);
  const live = isCustomTestWindowActiveIST(
    { scheduledDate: '2026-11-10', scheduledStartTime: '20:30', scheduledEndTime: '21:00' },
    now2040IST
  );
  assert.equal(live.status, 'live');
});

test('generateDailySeededLeaderboardAttempts rotates top names/scores across dates and stays deterministic within the same date', () => {
  const dayAFirst = generateDailySeededLeaderboardAttempts('2026-11-15');
  const dayASecond = generateDailySeededLeaderboardAttempts('2026-11-15');
  const dayB = generateDailySeededLeaderboardAttempts('2026-11-16');

  assert.equal(dayAFirst.length, TARGET_LEADERBOARD_COHORT_SIZE);
  assert.equal(dayB.length, TARGET_LEADERBOARD_COHORT_SIZE);
  assert.deepEqual(
    dayAFirst.map((a) => ({ id: a.studentId, name: a.studentName, score: a.score })),
    dayASecond.map((a) => ({ id: a.studentId, name: a.studentName, score: a.score }))
  );

  // Different days must rotate candidate names and IDs
  const dayATopNames = dayAFirst.slice(0, 5).map((a) => a.studentName);
  const dayBTopNames = dayB.slice(0, 5).map((a) => a.studentName);
  assert.notDeepEqual(dayATopNames, dayBTopNames);

  // Unique studentIds and non-colliding with built-in demo/default IDs
  const ids = new Set(dayAFirst.map((a) => a.studentId));
  assert.equal(ids.size, TARGET_LEADERBOARD_COHORT_SIZE);
  assert.equal(ids.has('COC-2026-000615'), false);
  assert.equal(ids.has('COC-2026-000123'), false);
  assert.equal(dayAFirst.every((a) => a.isSeededBenchmark === true), true);
});

test('buildDynamicDailyLeaderboard ranks real users strictly by marks and phases out seeded benchmarks as real users fill the cohort', () => {
  const examDate = '2026-11-15';

  // 0 real users -> 15 seeded benchmarks
  const emptyBoard = buildDynamicDailyLeaderboard([], examDate);
  assert.equal(emptyBoard.length, TARGET_LEADERBOARD_COHORT_SIZE);
  assert.equal(emptyBoard.filter((a) => !a.isSeededBenchmark).length, 0);

  // 1 top real user + 1 mid-tier real user -> exact mark ranking + 13 seeded fillers
  const topReal: Attempt = {
    id: 'real-top',
    studentId: 'COC-2026-880001',
    studentName: 'Real Topper',
    studentState: 'Telangana',
    testId: 'test-2026-11-15',
    score: 28.5,
    correctCount: 29,
    incorrectCount: 2,
    unattemptedCount: 0,
    timeTakenSeconds: 140,
    submittedAt: '2026-11-15T13:35:00.000Z',
    answers: [],
  };
  const midReal: Attempt = {
    id: 'real-mid',
    studentId: 'COC-2026-880002',
    studentName: 'Real Contender',
    studentState: 'Maharashtra',
    testId: 'test-2026-11-15',
    score: 17.5,
    correctCount: 18,
    incorrectCount: 2,
    unattemptedCount: 10,
    timeTakenSeconds: 210,
    submittedAt: '2026-11-15T13:36:00.000Z',
    answers: [],
  };

  const twoRealBoard = buildDynamicDailyLeaderboard([topReal, midReal], examDate);
  assert.equal(twoRealBoard.length, TARGET_LEADERBOARD_COHORT_SIZE);
  assert.equal(twoRealBoard.filter((a) => !a.isSeededBenchmark).length, 2);
  assert.equal(twoRealBoard.filter((a) => a.isSeededBenchmark).length, TARGET_LEADERBOARD_COHORT_SIZE - 2);
  assert.equal(twoRealBoard[0].studentId, 'COC-2026-880001');
  assert.equal(twoRealBoard[0].rank, 1);

  const midEntry = twoRealBoard.find((a) => a.studentId === 'COC-2026-880002');
  assert.ok(midEntry && typeof midEntry.rank === 'number' && midEntry.rank > 1);

  // Full cohort of 15+ real users -> 0 seeded accounts remain
  const fullRealCohort: Attempt[] = Array.from({ length: TARGET_LEADERBOARD_COHORT_SIZE + 2 }, (_, idx) => ({
    id: `real-full-${idx}`,
    studentId: `COC-2026-9900${String(idx).padStart(2, '0')}`,
    studentName: `Verified Student ${idx + 1}`,
    studentState: 'Karnataka',
    testId: 'test-2026-11-15',
    score: 29 - idx * 0.5,
    correctCount: Math.max(5, 29 - idx),
    incorrectCount: 0,
    unattemptedCount: 0,
    timeTakenSeconds: 150 + idx * 5,
    submittedAt: '2026-11-15T13:40:00.000Z',
    answers: [],
  }));

  const fullBoard = buildDynamicDailyLeaderboard(fullRealCohort, examDate);
  assert.equal(fullBoard.length, TARGET_LEADERBOARD_COHORT_SIZE + 2);
  assert.equal(fullBoard.filter((a) => a.isSeededBenchmark).length, 0);
  assert.equal(fullBoard[0].studentName, 'Verified Student 1');
  assert.equal(fullBoard[0].rank, 1);
});

test('getTopicFormulaSlides provides structured formulas, cheat codes, worked example, and traps for exam topics', () => {
  const quantDeck = getTopicFormulaSlides({
    dayKey: 'W001_D1',
    weekNumber: 1,
    dayNumber: 1,
    globalDayIndex: 1,
    dayType: 'study',
    subject: 'Quantitative Aptitude',
    topic: 'Percentages & Fraction Equivalents',
    topicDescription: 'Rapid conversion percentages',
    learningObjectives: ['Convert fractions rapidly'],
    difficultyDistribution: { easy: 60, medium: 30, hard: 10 },
    recommendedExamCategories: ['SSC', 'Banking'],
    approvalStatus: 'approved',
  });

  assert.equal(quantDeck.subject, 'Quantitative Aptitude');
  assert.ok(quantDeck.formulas.length >= 2);
  assert.ok(quantDeck.cheatCodes.length >= 2);
  assert.ok(quantDeck.workedExample.cheatCodeApproach.length > 10);
  assert.ok(quantDeck.commonTraps.length >= 1);

  const fallbackDeck = getTopicFormulaSlides(null, {
    title: 'Daily Mixed Corporate Speed Assessment',
    description: 'Combined Quant, Reasoning, GK & English exam',
    category: 'Corporate Aptitude',
  });
  assert.ok(fallbackDeck.formulas.length >= 1);
  assert.ok(fallbackDeck.cheatCodes.length >= 1);

  const freedomDeck = getTopicFormulaSlides({
    dayKey: 'W007_D2',
    weekNumber: 7,
    dayNumber: 2,
    globalDayIndex: 44,
    dayType: 'study',
    subject: 'General Awareness',
    topic: 'Modern Indian Freedom Struggle (1857–1947)',
    topicDescription: 'Revolt of 1857, INC sessions, Gandhian mass movements, and Constitutional Acts.',
    learningObjectives: ['Order INC sessions'],
    difficultyDistribution: { easy: 60, medium: 30, hard: 10 },
    recommendedExamCategories: ['UPSC', 'SSC'],
    approvalStatus: 'approved',
  });
  assert.equal(freedomDeck.topicKey, 'ga_modern_freedom');
});
