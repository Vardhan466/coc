import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizePdfText,
  buildCustomTestPdfReportData,
} from './pdfReport';
import { Attempt, TestPaper, UserProfile } from '../types';

test('sanitizePdfText converts LaTeX math and Unicode symbols cleanly for Helvetica PDF', () => {
  assert.equal(sanitizePdfText('Solve: $x^2 + 1/x^2$'), 'Solve: x^2 + 1/x^2');
  assert.equal(sanitizePdfText('$\\frac{25}{125} \\times 100 = 20\\%$'), '(25)/(125) x 100 = 20%');
  assert.equal(sanitizePdfText('$\\sqrt{144} \\geq 12$'), 'sqrt(144) >= 12');
  assert.equal(sanitizePdfText('Angle $\\theta = 90°$ — \u201CRight\u201D'), 'Angle theta = 90 deg - "Right"');
});

test('buildCustomTestPdfReportData accurately maps correct, incorrect, skipped, and cohort rank', () => {
  const paper: TestPaper = {
    id: 'custom_pdf_1',
    testCode: 'COC-SPRINT-3',
    title: 'Quant & Polity Micro-Sprint',
    description: 'Rapid 3Q check',
    category: 'Speed Practice',
    date: '2026-11-10',
    windowStart: '19:00',
    windowEnd: '19:15',
    answerKeyReleaseTime: '20:00',
    totalQuestions: 3,
    totalDurationSeconds: 30,
    questionDurationSeconds: 10,
    status: 'live',
    lockedForEditing: true,
    totalSubscribers: 50,
    questions: [
      {
        id: 'q1',
        qIndex: 0,
        subject: 'Quantitative Aptitude',
        topic: 'Percentages',
        difficulty: 'easy',
        text: 'What is $20\\%$ of $150$?',
        options: ['20', '30', '40', '50'],
        correctIndex: 1,
        explanation: '$0.2 \\times 150 = 30$.',
      },
      {
        id: 'q2',
        qIndex: 1,
        subject: 'General Awareness',
        topic: 'Polity',
        difficulty: 'medium',
        text: 'Which Article guarantees Equality before Law?',
        options: ['Article 14', 'Article 19', 'Article 21', 'Article 32'],
        correctIndex: 0,
        explanation: 'Article 14 deals with Right to Equality.',
      },
      {
        id: 'q3',
        qIndex: 2,
        subject: 'English Comprehension',
        topic: 'Vocabulary',
        difficulty: 'hard',
        text: 'Synonym of Ephemeral',
        options: ['Eternal', 'Transient', 'Solid', 'Ancient'],
        correctIndex: 1,
        explanation: 'Ephemeral means short-lived or transient.',
      },
    ],
  };

  const user: UserProfile = {
    uid: 'u1',
    studentId: 'COC-2026-888888',
    fullName: 'Asha Devi',
    email: 'asha@example.com',
    phone: '+91 9000000000',
    address: { local: '', district: 'Guntur', state: 'Andhra Pradesh', country: 'India' },
    examTarget: 'SSC CGL / CHSL',
    role: 'student',
    language: 'en',
    profileComplete: true,
    createdAt: '2026-11-10T00:00:00Z',
    dpdpConsent: true,
    subscription: { isActive: true, plan: 'Pro Daily Pass', validUntil: '2026-12-31', consecutiveMissedDays: 0 },
  };

  const attempt: Attempt = {
    id: 'att_pdf_1',
    testId: 'custom_pdf_1',
    studentId: 'COC-2026-888888',
    studentName: 'Asha Devi',
    studentState: 'Andhra Pradesh',
    score: 0.75,
    correctCount: 1,
    incorrectCount: 1,
    unattemptedCount: 1,
    timeTakenSeconds: 22,
    totalTimeSeconds: 22,
    submittedAt: '2026-11-10T10:00:00Z',
    isDisqualified: false,
    answers: [
      { questionId: 'q1', questionIndex: 0, selectedOptionIndex: 1, isCorrect: true, timeSpentSeconds: 6 },
      { questionId: 'q2', questionIndex: 1, selectedOptionIndex: 2, isCorrect: false, timeSpentSeconds: 9 },
      { questionId: 'q3', questionIndex: 2, selectedOptionIndex: null, isCorrect: false, timeSpentSeconds: 7 },
    ],
  };

  const cohort = [
    { id: 'c1', name: 'Peer 1', state: 'Delhi', score: 2.0, accuracy: 100, time: 18, rank: 1 },
    { id: 'COC-2026-888888', name: 'Asha Devi (You)', state: 'Andhra Pradesh', score: 0.75, accuracy: 50, time: 22, rank: 2 },
  ];

  const report = buildCustomTestPdfReportData(paper, attempt, user, cohort);

  assert.equal(report.filename, 'COC-SPRINT-3-COC-2026-888888-Review.pdf');
  assert.equal(report.cohortRank, 2);
  assert.equal(report.cohortTotal, 2);
  assert.equal(report.accuracyPct, 50);
  assert.equal(report.negativeLossText, '0.25');
  assert.equal(report.scoreText, '0.75 / 3.00');
  assert.equal(report.questions[0].outcome, 'correct');
  assert.equal(report.questions[0].correctLetter, 'B');
  assert.equal(report.questions[0].userSelectedLetter, 'B');
  assert.equal(report.questions[0].prompt, 'What is 20% of 150?');
  assert.equal(report.questions[1].outcome, 'incorrect');
  assert.equal(report.questions[1].marksAwardedText, '-0.25');
  assert.equal(report.questions[2].outcome, 'skipped');
  assert.equal(report.questions[2].userSelectedLetter, '--');
});
