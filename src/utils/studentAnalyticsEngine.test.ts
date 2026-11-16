import test from 'node:test';
import assert from 'node:assert/strict';
import { buildComprehensiveStudentAnalytics } from './studentAnalyticsEngine.ts';
import type { Attempt, Question } from '../types/index.ts';

test('buildComprehensiveStudentAnalytics computes topic mastery, subject strength/weakness, consistency score, and insights', () => {
  const questions: Question[] = [
    {
      id: 'q1',
      qIndex: 0,
      text: 'Percent question 1',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
      subject: 'Quantitative Aptitude',
      topic: 'Percentages',
      difficulty: 'easy',
      explanation: 'Exp 1',
    },
    {
      id: 'q2',
      qIndex: 1,
      text: 'Polity question 2',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 2,
      subject: 'General Awareness',
      topic: 'Fundamental Rights',
      difficulty: 'medium',
      explanation: 'Exp 2',
    },
  ];

  const attempts: Attempt[] = [
    {
      id: 'att1',
      testId: 'test_1',
      studentId: 'COC-1',
      studentName: 'Student',
      studentState: 'Telangana',
      score: 18,
      correctCount: 1,
      incorrectCount: 1,
      unattemptedCount: 0,
      submittedAt: '2026-10-24T13:45:00Z',
      answers: [
        { questionId: 'q1', questionIndex: 0, selectedOptionIndex: 0, timeSpentSeconds: 4, isCorrect: true },
        { questionId: 'q2', questionIndex: 1, selectedOptionIndex: 1, timeSpentSeconds: 9, isCorrect: false },
      ],
    },
  ];

  const analytics = buildComprehensiveStudentAnalytics({
    attempts,
    questionBank: questions,
    currentStreak: 4,
  });

  assert.equal(analytics.topicMastery.length, 2);
  assert.ok(analytics.strongestSubjects.includes('Quantitative Aptitude'));
  assert.ok(analytics.weakestSubjects.includes('General Awareness'));
  assert.ok(analytics.missedTopicsNeedingRevision.includes('Fundamental Rights'));
  assert.ok(analytics.consistencyScore > 0);
  assert.ok(analytics.weeklyTrends.length === 1);
  assert.ok(analytics.monthlyTrends.length === 1);
  assert.ok(analytics.personalizedInsights.length >= 2);
});

test('buildComprehensiveStudentAnalytics aggregates mixed SpeedPracticeSessionRecord itemOutcomes into subjectComparison and topicMastery', () => {
  const analytics = buildComprehensiveStudentAnalytics({
    attempts: [],
    speedSessions: [
      {
        id: 'sp_mixed_1',
        completedAt: '2026-11-12T05:00:00.000Z',
        examCategory: 'SSC',
        subject: 'all',
        difficulty: 'all',
        poolFilter: 'all',
        totalQuestions: 2,
        correctCount: 2,
        incorrectCount: 0,
        accuracy: 100,
        avgTimePerQuestionSec: 5.5,
        questionIds: ['q1', 'q2'],
        missedQuestionIds: [],
        itemOutcomes: [
          {
            questionId: 'q1',
            subject: 'General Awareness',
            topic: 'Indian Polity - Constitution',
            isCorrect: true,
            timeSpentSeconds: 5,
          },
          {
            questionId: 'q2',
            subject: 'Quantitative Aptitude',
            topic: 'Percentages',
            isCorrect: true,
            timeSpentSeconds: 6,
          },
        ],
      },
    ],
    currentStreak: 1,
  });

  const gaMetric = analytics.subjectComparison.find((s) => s.subject === 'General Awareness');
  const qaMetric = analytics.subjectComparison.find((s) => s.subject === 'Quantitative Aptitude');
  assert.equal(gaMetric?.attempted, 1);
  assert.equal(gaMetric?.accuracy, 100);
  assert.equal(qaMetric?.attempted, 1);
  assert.ok(analytics.strongestSubjects.includes('General Awareness'));
  assert.ok(analytics.topicMastery.some((t) => t.topic === 'Indian Polity - Constitution' && t.accuracy === 100));
});
