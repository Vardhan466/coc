import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deduplicateQuestions,
  gradeSubmittedAnswers,
  stripAnswerKeysFromPaper,
  validateMCQItem,
} from './aiQuestionValidation.ts';
import type { AIMCQQuestion } from '../types/aiSystem.ts';
import type { TestPaper } from '../types/index.ts';

function sampleMCQ(overrides: Partial<AIMCQQuestion> = {}): AIMCQQuestion {
  return {
    id: 'ai_q_1',
    qIndex: 0,
    text: 'Under which Article of the Indian Constitution can the Supreme Court issue writs to enforce Fundamental Rights?',
    options: ['Article 21', 'Article 32', 'Article 143', 'Article 226'],
    correctIndex: 1,
    subject: 'General Awareness',
    topic: 'Indian Polity & Constitution',
    difficulty: 'easy',
    explanation:
      'Article 32 empowers the Supreme Court to issue writs such as Habeas Corpus, Mandamus, Prohibition, Quo-Warranto, and Certiorari.',
    examCategory: 'UPSC',
    sourceType: 'ai_generated',
    referenceNote: 'AI-Generated Syllabus Practice (UPSC)',
    reviewStatus: 'pending',
    createdAt: '2026-10-24T12:00:00Z',
    ...overrides,
  };
}

test('validateMCQItem verifies all 8 fields and rejects duplicate options or fabricated PQP claims', () => {
  assert.equal(validateMCQItem(sampleMCQ()).valid, true);

  const dupOpts = sampleMCQ({
    options: ['Article 32', 'Article 32', 'Article 143', 'Article 226'],
  });
  assert.equal(validateMCQItem(dupOpts).valid, false);

  const fakeCitation = sampleMCQ({
    sourceType: 'ai_generated',
    referenceNote: 'Official SSC 2023 Shift 2 PYQ Paper',
  });
  assert.equal(validateMCQItem(fakeCitation).valid, false);

  const verifiedPqp = sampleMCQ({
    sourceType: 'verified_pqp',
    referenceNote: 'Official SSC 2023 Shift 2 PYQ Paper',
  });
  assert.equal(validateMCQItem(verifiedPqp).valid, true);
});

test('deduplicateQuestions filters punctuation/case/spacing variants against existing vault', () => {
  const existing = [sampleMCQ({ id: 'q1', text: 'What is the capital of Telangana?' })];
  const incoming = [
    sampleMCQ({ id: 'q2', text: '  what IS the capital   of Telangana?! ' }),
    sampleMCQ({ id: 'q3', text: 'Which Constitutional Amendment introduced GST in India?' }),
  ];

  const res = deduplicateQuestions(incoming, existing);
  assert.equal(res.duplicateCount, 1);
  assert.equal(res.unique.length, 1);
  assert.equal(res.unique[0].id, 'q3');
});

test('stripAnswerKeysFromPaper completely strips correctIndex & explanations prior to release', () => {
  const q1 = sampleMCQ({ id: 'q1', correctIndex: 2, explanation: 'Detailed official proof...' });
  const paper: TestPaper = {
    id: 'daily_test',
    testCode: 'COC-DAILY',
    title: 'Daily Exam',
    description: 'Desc',
    date: '2026-10-24',
    windowStart: '19:00',
    windowEnd: '19:15',
    answerKeyReleaseTime: '20:00',
    totalQuestions: 1,
    totalDurationSeconds: 300,
    questionDurationSeconds: 10,
    status: 'live',
    questions: [q1],
    lockedForEditing: true,
    totalSubscribers: 100,
  };

  const locked = stripAnswerKeysFromPaper(paper, false);
  assert.equal(locked.keyReleased, false);
  assert.equal(locked.questions[0].correctIndex, -1);
  assert.equal(locked.questions[0].explanation, '');

  const unlocked = stripAnswerKeysFromPaper(paper, true);
  assert.equal(unlocked.keyReleased, true);
  assert.equal(unlocked.questions[0].correctIndex, 2);
  assert.equal(unlocked.questions[0].explanation, 'Detailed official proof...');
});

test('gradeSubmittedAnswers scores +1/-0.25 accurately without leaking per-item answers when locked', () => {
  const q1 = sampleMCQ({ id: 'q1', qIndex: 0, correctIndex: 1 });
  const q2 = sampleMCQ({ id: 'q2', qIndex: 1, correctIndex: 0 });
  const q3 = sampleMCQ({ id: 'q3', qIndex: 2, correctIndex: 3 });

  const gradedLocked = gradeSubmittedAnswers(
    [q1, q2, q3],
    [
      { questionId: 'q1', questionIndex: 0, selectedOptionIndex: 1, timeSpentSeconds: 4 },
      { questionId: 'q2', questionIndex: 1, selectedOptionIndex: 2, timeSpentSeconds: 6 },
      { questionId: 'q3', questionIndex: 2, selectedOptionIndex: null, timeSpentSeconds: 10 },
    ],
    false
  );

  assert.equal(gradedLocked.correctCount, 1);
  assert.equal(gradedLocked.incorrectCount, 1);
  assert.equal(gradedLocked.unattemptedCount, 1);
  assert.equal(gradedLocked.score, 0.75);
  assert.equal(gradedLocked.gradedAnswers[0].isCorrect, undefined);
});
