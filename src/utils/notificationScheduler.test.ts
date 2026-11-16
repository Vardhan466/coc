import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_NOTIFICATION_PREFS,
  evaluateDueNotifications,
} from './notificationScheduler.ts';
import type { DailyExamScheduleConfig, StudyPlanDay } from '../types/aiSystem.ts';

const schedule: DailyExamScheduleConfig = {
  timezone: 'Asia/Kolkata',
  questionGenerationTime: '18:00',
  examStartTime: '19:00',
  examEndTime: '19:15',
  answerKeyReleaseTime: '20:00',
  totalQuestions: 30,
  examDurationSeconds: 300,
  questionDurationSeconds: 10,
  cohortStartDate: '2026-10-01',
  leaderboardVisibility: 'public',
  updatedAt: '2026-10-24T00:00:00Z',
};

const topic: StudyPlanDay = {
  dayKey: 'W004_D3',
  weekNumber: 4,
  dayNumber: 3,
  globalDayIndex: 24,
  dayType: 'study',
  subject: 'Quantitative Aptitude',
  topic: 'Percentages & Ratios',
  topicDescription: 'Master fast fraction percentages.',
  learningObjectives: ['Convert fractions rapidly'],
  difficultyDistribution: { easy: 60, medium: 30, hard: 10 },
  recommendedExamCategories: ['SSC'],
  approvalStatus: 'approved',
};

test('evaluateDueNotifications triggers pre-exam 10m alert at 18:52 IST and deduplicates same day', () => {
  // 18:52 IST = 13:22 UTC
  const ts1852IST = Date.parse('2026-10-24T13:22:00Z');
  const due = evaluateDueNotifications(DEFAULT_NOTIFICATION_PREFS, schedule, topic, {}, ts1852IST);

  assert.ok(due.some((item) => item.id === 'pre_exam'));
  assert.ok(due.some((item) => item.id === 'daily_topic'));
  assert.ok(!due.some((item) => item.id === 'exam_open'));

  // Calling again after marking sent emits empty for those already dispatched
  const dueAgain = evaluateDueNotifications(
    DEFAULT_NOTIFICATION_PREFS,
    schedule,
    topic,
    { '2026-10-24': ['pre_exam', 'daily_topic'] },
    ts1852IST
  );
  assert.equal(dueAgain.length, 0);
});

test('evaluateDueNotifications triggers exam_open during live gate and key_released after 20:00 IST', () => {
  // 19:05 IST = 13:35 UTC
  const ts1905IST = Date.parse('2026-10-24T13:35:00Z');
  const dueLive = evaluateDueNotifications(DEFAULT_NOTIFICATION_PREFS, schedule, topic, {}, ts1905IST);
  assert.ok(dueLive.some((item) => item.id === 'exam_open'));
  assert.ok(!dueLive.some((item) => item.id === 'key_released'));

  // 20:05 IST = 14:35 UTC
  const ts2005IST = Date.parse('2026-10-24T14:35:00Z');
  const duePost8 = evaluateDueNotifications(DEFAULT_NOTIFICATION_PREFS, schedule, topic, {}, ts2005IST);
  assert.ok(duePost8.some((item) => item.id === 'key_released'));
  assert.ok(!duePost8.some((item) => item.id === 'exam_open'));
});

test('evaluateDueNotifications returns empty list when notifications are disabled', () => {
  const ts1905IST = Date.parse('2026-10-24T13:35:00Z');
  const due = evaluateDueNotifications(
    { ...DEFAULT_NOTIFICATION_PREFS, enabled: false },
    schedule,
    topic,
    {},
    ts1905IST
  );
  assert.equal(due.length, 0);
});
