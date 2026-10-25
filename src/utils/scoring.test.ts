import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateScore,
  calculateNegativeMarkLoss,
  calculateTieBreakerRank,
  calculateDiscriminationIndex,
  checkQuestionDefect,
  formatStudentId,
  validateTestPaper,
} from './scoring';
import { Attempt, Question } from '../types';

test('calculateScore handles perfect, partial, and negative marks correctly', () => {
  // 40 correct, 0 incorrect -> 40.0
  assert.equal(calculateScore(40, 0), 40.0);

  // 30 correct, 10 incorrect -> 30 - 2.5 = 27.5
  assert.equal(calculateScore(30, 10), 27.5);

  // 10 correct, 6 incorrect -> 10 - 1.5 = 8.5
  assert.equal(calculateScore(10, 6), 8.5);

  // 0 correct, 4 incorrect -> -1.0 (no artificial clamping to zero!)
  assert.equal(calculateScore(0, 4), -1.0);

  // 1 correct, 5 incorrect -> 1 - 1.25 = -0.25
  assert.equal(calculateScore(1, 5), -0.25);
});

test('calculateNegativeMarkLoss calculates exact forfeited marks', () => {
  assert.equal(calculateNegativeMarkLoss(0), 0);
  assert.equal(calculateNegativeMarkLoss(4), 1.0);
  assert.equal(calculateNegativeMarkLoss(11), 2.75);
});

test('formatStudentId generates padded, immutable IDs', () => {
  assert.equal(formatStudentId(1, 2026), 'COC-2026-000001');
  assert.equal(formatStudentId(123, 2026), 'COC-2026-000123');
  assert.equal(formatStudentId(99999, 2026), 'COC-2026-099999');
});

test('calculateTieBreakerRank sorts deterministically by score, accuracy, and time', () => {
  const mockAttempts: Attempt[] = [
    {
      id: 'att-1',
      testId: 'test-1',
      studentId: 'COC-2026-000002',
      studentName: 'Bhavani',
      studentState: 'Andhra Pradesh',
      startedAt: '2026-10-24T19:00:00Z',
      answers: [],
      score: 25.0,
      correctCount: 27,
      incorrectCount: 8,
      unattemptedCount: 5,
      timeTakenSeconds: 280,
      integrityFlags: { tabSwitches: 0, focusLosses: 0 },
    },
    {
      id: 'att-2',
      testId: 'test-1',
      studentId: 'COC-2026-000001',
      studentName: 'Aarav',
      studentState: 'Telangana',
      startedAt: '2026-10-24T19:00:00Z',
      answers: [],
      score: 30.0,
      correctCount: 31,
      incorrectCount: 4,
      unattemptedCount: 5,
      timeTakenSeconds: 290,
      integrityFlags: { tabSwitches: 0, focusLosses: 0 },
    },
    {
      id: 'att-3',
      testId: 'test-1',
      studentId: 'COC-2026-000003',
      studentName: 'Chetan',
      studentState: 'Bihar',
      startedAt: '2026-10-24T19:00:00Z',
      answers: [],
      score: 25.0,
      correctCount: 28, // Same score as Bhavani, but more correct answers (28 vs 27)
      incorrectCount: 12,
      unattemptedCount: 0,
      timeTakenSeconds: 250,
      integrityFlags: { tabSwitches: 0, focusLosses: 0 },
    },
    {
      id: 'att-4',
      testId: 'test-1',
      studentId: 'COC-2026-000004',
      studentName: 'Divya',
      studentState: 'Uttar Pradesh',
      startedAt: '2026-10-24T19:00:00Z',
      answers: [],
      score: 25.0,
      correctCount: 27,
      incorrectCount: 8,
      unattemptedCount: 5,
      timeTakenSeconds: 240, // Same score, correct & incorrect as Bhavani, but faster! (240s vs 280s)
      integrityFlags: { tabSwitches: 0, focusLosses: 0 },
    },
  ];

  const ranked = calculateTieBreakerRank(mockAttempts);

  // Rank 1: Aarav (score 30.0)
  assert.equal(ranked[0].studentName, 'Aarav');
  assert.equal(ranked[0].rank, 1);

  // Rank 2: Chetan (score 25.0, but 28 correct answers)
  assert.equal(ranked[1].studentName, 'Chetan');
  assert.equal(ranked[1].rank, 2);

  // Rank 3: Divya (score 25.0, 27 correct, 8 incorrect, time 240s)
  assert.equal(ranked[2].studentName, 'Divya');
  assert.equal(ranked[2].rank, 3);

  // Rank 4: Bhavani (score 25.0, 27 correct, 8 incorrect, time 280s)
  assert.equal(ranked[3].studentName, 'Bhavani');
  assert.equal(ranked[3].rank, 4);
});

test('calculateDiscriminationIndex and checkQuestionDefect correctly detect defective items', () => {
  // Good question: Top group got 80/100, bottom group got 20/100 -> D = 0.60
  const goodD = calculateDiscriminationIndex(80, 100, 20, 100);
  assert.equal(goodD, 0.6);
  assert.equal(checkQuestionDefect(50, goodD).isDefective, false);

  // Defective question: Top group got 10/100, bottom group got 40/100 -> D = -0.30 (negative discrimination!)
  const badD = calculateDiscriminationIndex(10, 100, 40, 100);
  assert.equal(badD, -0.3);
  const defectCheck = checkQuestionDefect(25, badD);
  assert.equal(defectCheck.isDefective, true);
  assert.match(defectCheck.reason || '', /Negative discrimination/);
});

test('validateTestPaper enforces strictly 40 questions and required fields', () => {
  // Test paper with only 2 questions should fail
  const incompleteResult = validateTestPaper({
    title: 'Test Exam',
    questions: [
      {
        id: '1',
        qIndex: 0,
        text: 'Sample',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        subject: 'General Awareness',
        topic: 'Polity',
        difficulty: 'easy',
        explanation: 'Exp',
      },
    ] as Question[],
  });
  assert.equal(incompleteResult.valid, false);
  assert.match(incompleteResult.errors[0], /exactly 40 questions/);
});
