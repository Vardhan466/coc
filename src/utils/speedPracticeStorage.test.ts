import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractAttemptedQuestionIds,
  getSpeedPracticeSessions,
  saveSpeedPracticeSession,
} from './speedPracticeStorage.ts';
import type { Attempt } from '../types/index.ts';
import type { SpeedPracticeSessionRecord } from '../types/aiSystem.ts';
import type { ErrorBookEntry } from './errorBookStorage.ts';

function mockLocalStorage() {
  const store = new Map<string, string>();
  const g = globalThis as unknown as {
    window?: Record<string, unknown>;
    localStorage?: {
      getItem: (k: string) => string | null;
      setItem: (k: string, v: string) => void;
      removeItem: (k: string) => void;
    };
  };
  g.window = g.window || {};
  g.localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };
  return store;
}

test('saveSpeedPracticeSession stores newest first and caps per user', () => {
  mockLocalStorage();

  const s1: SpeedPracticeSessionRecord = {
    id: 'sp_1',
    completedAt: '2026-04-01T10:00:00.000Z',
    examCategory: 'SSC',
    subject: 'Quantitative Aptitude',
    difficulty: 'easy',
    poolFilter: 'all',
    totalQuestions: 5,
    correctCount: 4,
    incorrectCount: 1,
    accuracy: 80,
    avgTimePerQuestionSec: 6.2,
    questionIds: ['q1', 'q2', 'q3', 'q4', 'q5'],
    missedQuestionIds: ['q5'],
  };

  const s2: SpeedPracticeSessionRecord = {
    ...s1,
    id: 'sp_2',
    completedAt: '2026-04-02T10:00:00.000Z',
    correctCount: 5,
    incorrectCount: 0,
    accuracy: 100,
    missedQuestionIds: [],
  };

  saveSpeedPracticeSession('u_123', s1);
  const updated = saveSpeedPracticeSession('u_123', s2);

  assert.equal(updated.length, 2);
  assert.equal(updated[0].id, 'sp_2');
  assert.equal(getSpeedPracticeSessions('u_123').length, 2);
  assert.equal(getSpeedPracticeSessions('other_user').length, 0);
});

test('extractAttemptedQuestionIds aggregates attempted and unmastered incorrect IDs cleanly', () => {
  const attempts: Attempt[] = [
    {
      testId: 'daily_1',
      studentId: 'COC-1',
      studentName: 'Test User',
      studentState: 'Andhra Pradesh',
      answers: [
        {
          questionId: 'q1',
          questionIndex: 0,
          selectedOptionIndex: 0,
          timeSpentSeconds: 4,
          isCorrect: true,
        },
        {
          questionId: 'q2',
          questionIndex: 1,
          selectedOptionIndex: 2,
          timeSpentSeconds: 7,
          isCorrect: false,
        },
        {
          questionId: 'q3',
          questionIndex: 2,
          selectedOptionIndex: null,
          timeSpentSeconds: 10,
        },
      ],
      score: 0.75,
      correctCount: 1,
      incorrectCount: 1,
      unattemptedCount: 1,
    },
  ];

  const errEntries: ErrorBookEntry[] = [
    {
      id: 'err_1',
      questionId: 'q4',
      question: {
        id: 'q4',
        qIndex: 3,
        text: 'Sample',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        subject: 'General Awareness',
        topic: 'Polity',
        difficulty: 'easy',
        explanation: 'Exp',
      },
      userSelectedOptionIndex: 1,
      correctOptionIndex: 0,
      testId: 'daily_1',
      testTitle: 'Daily Mock',
      dateAdded: '2026-04-01',
      subject: 'General Awareness',
      topic: 'Polity',
      difficulty: 'easy',
      mastered: false,
      retryAttempts: 0,
    },
    {
      id: 'err_2',
      questionId: 'q5',
      question: {
        id: 'q5',
        qIndex: 4,
        text: 'Sample 2',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 1,
        subject: 'English Comprehension',
        topic: 'Idioms',
        difficulty: 'easy',
        explanation: 'Exp',
      },
      userSelectedOptionIndex: 0,
      correctOptionIndex: 1,
      testId: 'daily_1',
      testTitle: 'Daily Mock',
      dateAdded: '2026-04-01',
      subject: 'English Comprehension',
      topic: 'Idioms',
      difficulty: 'easy',
      mastered: true,
      retryAttempts: 1,
    },
  ];

  const sessions: SpeedPracticeSessionRecord[] = [
    {
      id: 'sp_x',
      completedAt: '2026-04-01T11:00:00.000Z',
      examCategory: 'all',
      subject: 'all',
      difficulty: 'all',
      poolFilter: 'all',
      totalQuestions: 2,
      correctCount: 1,
      incorrectCount: 1,
      accuracy: 50,
      avgTimePerQuestionSec: 5,
      questionIds: ['q6', 'q7'],
      missedQuestionIds: ['q7'],
    },
  ];

  const { attemptedIds, incorrectIds } = extractAttemptedQuestionIds(attempts, errEntries, sessions);

  assert.equal(attemptedIds.has('q1'), true);
  assert.equal(attemptedIds.has('q2'), true);
  assert.equal(attemptedIds.has('q3'), false);
  assert.equal(attemptedIds.has('q6'), true);
  assert.equal(incorrectIds.has('q2'), true);
  assert.equal(incorrectIds.has('q4'), true);
  assert.equal(incorrectIds.has('q5'), false);
  assert.equal(incorrectIds.has('q7'), true);
});
