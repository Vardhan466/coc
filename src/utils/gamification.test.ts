import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSkillTier,
  evaluateDailyStreakWithFreeze,
  filterAndRankLeaderboard,
  build30DayRollingSeries,
  applyReferralReward,
  build7DayStreakCalendar,
} from './gamification';
import { getDiagnosticQuestions, evaluateDiagnosticQuiz } from './diagnosticQuiz';
import { generateSmartTriggers } from './smartTriggers';
import {
  EMPTY_STUDENT_PROGRESS,
  mergeDiagnosticIntoProgress,
  recordTestAttemptInProgress,
  activateStreakFreezeForDate,
  claimStreakMilestoneReward,
} from './studentProgressStorage';
import { SAMPLE_30_QUESTIONS, INITIAL_SAMPLE_ATTEMPTS, INITIAL_USER_PROFILE } from '../data/mockExamData';
import { Attempt } from '../types';

test('evaluateDailyStreakWithFreeze increments consecutively, stays idempotent same-day, consumes freeze on 1-day miss, and resets on multi-day miss', () => {
  // First active day
  const day1 = evaluateDailyStreakWithFreeze({
    currentStreak: 0,
    longestStreak: 0,
    streakFreezesAvailable: 1,
    streakFreezesUsed: 0,
    activityDate: '2026-10-20',
  });
  assert.equal(day1.nextStreak, 1);
  assert.equal(day1.freezeConsumed, false);

  // Same-day repeat is idempotent
  const sameDay = evaluateDailyStreakWithFreeze({
    currentStreak: day1.nextStreak,
    longestStreak: day1.nextLongestStreak,
    streakFreezesAvailable: day1.nextFreezesAvailable,
    streakFreezesUsed: day1.nextFreezesUsed,
    lastActivityDate: day1.lastActivityDate,
    activityDate: '2026-10-20',
  });
  assert.equal(sameDay.nextStreak, 1);
  assert.equal(sameDay.nextFreezesAvailable, 1);

  // Consecutive next day (+1)
  const day2 = evaluateDailyStreakWithFreeze({
    currentStreak: 6,
    longestStreak: 6,
    streakFreezesAvailable: 1,
    streakFreezesUsed: 0,
    lastActivityDate: '2026-10-20',
    activityDate: '2026-10-21',
  });
  assert.equal(day2.nextStreak, 7);
  assert.equal(day2.bonusFreezeEarned, true);
  assert.equal(day2.nextFreezesAvailable, 2);

  // Missed 1 full calendar day (Oct 21 -> Oct 23 = 2-day diff) with Streak Freeze available
  const savedByFreeze = evaluateDailyStreakWithFreeze({
    currentStreak: 7,
    longestStreak: 7,
    streakFreezesAvailable: 1,
    streakFreezesUsed: 0,
    lastActivityDate: '2026-10-21',
    activityDate: '2026-10-23',
  });
  assert.equal(savedByFreeze.nextStreak, 8);
  assert.equal(savedByFreeze.freezeConsumed, true);
  assert.equal(savedByFreeze.nextFreezesAvailable, 0);
  assert.equal(savedByFreeze.nextFreezesUsed, 1);
  assert.equal(savedByFreeze.lastFreezeConsumedDate, '2026-10-23');

  // Missed 3+ days -> streak resets to 1
  const reset = evaluateDailyStreakWithFreeze({
    currentStreak: 10,
    longestStreak: 10,
    streakFreezesAvailable: 2,
    streakFreezesUsed: 0,
    lastActivityDate: '2026-10-20',
    activityDate: '2026-10-24',
  });
  assert.equal(reset.nextStreak, 1);
  assert.equal(reset.nextLongestStreak, 10);
});

test('getDiagnosticQuestions selects 3 balanced questions and evaluateDiagnosticQuiz assigns tier & percentile', () => {
  const qs = getDiagnosticQuestions(SAMPLE_30_QUESTIONS);
  assert.equal(qs.length, 3);

  const perfectFast = evaluateDiagnosticQuiz(
    qs.map((q) => ({ question: q, selectedOptionIndex: q.correctIndex, timeSpentSeconds: 5 }))
  );
  assert.equal(perfectFast.score, 3);
  assert.equal(perfectFast.accuracy, 100);
  assert.equal(perfectFast.assignedTier, 'Gold');
  assert.ok(perfectFast.estimatedPercentile >= 95);

  const mixed = evaluateDiagnosticQuiz([
    { question: qs[0], selectedOptionIndex: qs[0].correctIndex, timeSpentSeconds: 6 },
    { question: qs[1], selectedOptionIndex: (qs[1].correctIndex + 1) % 4, timeSpentSeconds: 8 },
    { question: qs[2], selectedOptionIndex: null, timeSpentSeconds: 10 },
  ]);
  assert.equal(mixed.score, 0.75); // +1 - 0.25 + 0
  assert.equal(mixed.correctCount, 1);
  assert.equal(mixed.incorrectCount, 1);
  assert.equal(mixed.skippedCount, 1);
  assert.equal(mixed.accuracy, 50);
  assert.equal(mixed.weakSubject, qs[1].subject);
});

test('filterAndRankLeaderboard scopes timeframe (Weekly/Monthly/All-Time) and filters by SkillTier cleanly', () => {
  const weeklyAll = filterAndRankLeaderboard(INITIAL_SAMPLE_ATTEMPTS as Attempt[], 'weekly', 'all');
  assert.equal(weeklyAll.length, INITIAL_SAMPLE_ATTEMPTS.length);
  assert.ok(weeklyAll[0].score > INITIAL_SAMPLE_ATTEMPTS[0].score);
  assert.equal(weeklyAll[0].rank, 1);

  const bronzeOnly = filterAndRankLeaderboard(INITIAL_SAMPLE_ATTEMPTS as Attempt[], 'today', 'Bronze');
  assert.ok(bronzeOnly.every((a) => a.skillTier === 'Bronze'));
  if (bronzeOnly.length > 0) {
    assert.equal(bronzeOnly[0].rank, 1);
  }

  const grandmasterOnly = filterAndRankLeaderboard(
    INITIAL_SAMPLE_ATTEMPTS as Attempt[],
    'monthly',
    'Grandmaster'
  );
  assert.ok(grandmasterOnly.length > 0);
  assert.ok(grandmasterOnly.every((a) => a.skillTier === 'Grandmaster'));
});

test('generateSmartTriggers emits rank-drop #3 -> #4 alert, streak protection, and referral confirmation', () => {
  const rank4Attempt: Attempt = {
    ...(INITIAL_SAMPLE_ATTEMPTS[3] as Attempt),
    studentId: INITIAL_USER_PROFILE.studentId,
    rank: 4,
  };

  const triggers = generateSmartTriggers({
    progress: {
      ...EMPTY_STUDENT_PROGRESS,
      currentStreak: 5,
      streakFreezesAvailable: 1,
      lastActivityDate: '2026-10-23',
      marksLostToNegatives: 2.5,
      referralsCount: 1,
    },
    leaderboardAttempts: INITIAL_SAMPLE_ATTEMPTS as Attempt[],
    userAttempt: rank4Attempt,
    user: INITIAL_USER_PROFILE,
    todayIsoDate: '2026-10-24',
  });

  const rankTrigger = triggers.find((t) => t.type === 'rank_drop');
  assert.ok(rankTrigger);
  assert.match(rankTrigger!.title, /4th place/i);

  assert.ok(triggers.some((t) => t.type === 'streak_risk'));
  assert.ok(triggers.some((t) => t.type === 'mistake_leak'));
  assert.ok(triggers.some((t) => t.type === 'referral_unlock'));
});

test('applyReferralReward and mergeDiagnosticIntoProgress award Challenger badge, Freeze, and carry guest results', () => {
  const qs = getDiagnosticQuestions(SAMPLE_30_QUESTIONS);
  const diag = evaluateDiagnosticQuiz(
    qs.map((q) => ({ question: q, selectedOptionIndex: q.correctIndex, timeSpentSeconds: 6 }))
  );

  const merged = mergeDiagnosticIntoProgress(EMPTY_STUDENT_PROGRESS, diag, undefined, true);
  assert.equal(merged.proAnalyticsUnlocked, true);
  assert.equal(merged.currentStreak, 1);
  assert.equal(merged.streakFreezesAvailable, 2); // 1 default + 1 referral bonus
  assert.ok(merged.badges?.includes('Diagnostic Verified'));
  assert.ok(merged.badges?.includes('Challenger'));
  assert.equal(merged.rolling30DayHistory?.length, 1);

  const reward2 = applyReferralReward(EMPTY_STUDENT_PROGRESS);
  assert.equal(reward2.referralsCount, 1);
  assert.equal(reward2.streakFreezesAvailable, 2);

  const series = build30DayRollingSeries(
    [{ testDate: 'Oct 24', testTitle: '#298', score: 25, peerAvgScore: 21, rank: 10, percentile: 98, accuracy: 86 }],
    []
  );
  assert.equal(series.length, 1);
  assert.equal(series[0].accuracy, 86);
  assert.ok(series[0].avgSpeedSec > 0);
  assert.equal(calculateSkillTier(88, 12, 26).tier, 'Grandmaster');
});

test('recordTestAttemptInProgress starts empty and dynamically builds rolling progress & XP across attempts', () => {
  assert.equal(EMPTY_STUDENT_PROGRESS.testsTaken, 0);
  assert.equal(EMPTY_STUDENT_PROGRESS.recentAttempts.length, 0);

  const sampleAttempt: Attempt = {
    id: 'att_new_1',
    testId: 'test_practice_1',
    studentId: 'COC-2026-999999',
    studentName: 'New Student',
    studentState: 'Telangana',
    score: 16.5,
    correctCount: 18,
    incorrectCount: 6,
    unattemptedCount: 6,
    timeTakenSeconds: 180,
    answers: [],
  };

  const afterFirst = recordTestAttemptInProgress(
    EMPTY_STUDENT_PROGRESS,
    sampleAttempt,
    'Quantitative Aptitude Micro-Challenge'
  );
  assert.equal(afterFirst.testsTaken, 1);
  assert.equal(afterFirst.averageScore, 16.5);
  assert.equal(afterFirst.highestScore, 16.5);
  assert.equal(afterFirst.overallAccuracy, 75);
  assert.equal(afterFirst.currentStreak, 1);
  assert.equal(afterFirst.rolling30DayHistory?.length, 1);
  assert.equal(afterFirst.rolling30DayHistory?.[0].avgSpeedSec, 6.0);
  assert.ok((afterFirst.xpPoints ?? 0) >= 180);
  assert.equal(afterFirst.skillTier, 'Silver');
});

test('build7DayStreakCalendar renders empty baseline cleanly, tracks completed/frozen/missed days, and claimStreakMilestoneReward awards XP & Freezes', () => {
  // 1. New user with 0 tests: past 6 days inactive, today pending
  const emptyCal = build7DayStreakCalendar(EMPTY_STUDENT_PROGRESS, '2026-11-09');
  assert.equal(emptyCal.days.length, 7);
  assert.equal(emptyCal.days[6].date, '2026-11-09');
  assert.equal(emptyCal.days[6].isToday, true);
  assert.equal(emptyCal.days[6].status, 'pending_today');
  assert.ok(emptyCal.days.slice(0, 6).every((d) => d.status === 'inactive'));

  // 2. Active user who missed yesterday (2026-11-08), protected today with Freeze Shield
  const withActivity = {
    ...EMPTY_STUDENT_PROGRESS,
    currentStreak: 3,
    longestStreak: 3,
    streakFreezesAvailable: 1,
    streakFreezesUsed: 0,
    lastActivityDate: '2026-11-07',
    rolling30DayHistory: [
      { date: '2026-11-05', label: 'Nov 5', accuracy: 78, avgSpeedSec: 6.2, score: 21, testsCount: 1 },
      { date: '2026-11-06', label: 'Nov 6', accuracy: 82, avgSpeedSec: 5.8, score: 23, testsCount: 1 },
      { date: '2026-11-07', label: 'Nov 7', accuracy: 85, avgSpeedSec: 5.5, score: 25, testsCount: 2 },
    ],
  };

  const activated = activateStreakFreezeForDate(withActivity, undefined, '2026-11-09');
  assert.equal(activated.streakFreezesAvailable, 0);
  assert.equal(activated.streakFreezesUsed, 1);
  assert.equal(activated.lastFreezeConsumedDate, '2026-11-09');
  assert.ok(activated.frozenDates?.includes('2026-11-09'));

  // Calling again when 0 freezes available is a no-op
  const noOp = activateStreakFreezeForDate(activated, undefined, '2026-11-08');
  assert.equal(noOp.streakFreezesUsed, 1);

  const cal = build7DayStreakCalendar(activated, '2026-11-09');
  assert.equal(cal.completedDaysCount, 3);
  assert.equal(cal.frozenDaysCount, 1);
  assert.equal(cal.days.find((d) => d.date === '2026-11-08')?.status, 'missed');
  assert.equal(cal.days.find((d) => d.date === '2026-11-09')?.status, 'frozen');

  // 3. Milestone claim at 3 days awards +50 XP & Abhyaasi Habit badge idempotently
  const claimed = claimStreakMilestoneReward(activated, 3);
  assert.equal(claimed.xpPoints, 50);
  assert.ok(claimed.claimedMilestones?.includes(3));
  assert.ok(claimed.badges?.includes('Abhyaasi Habit'));
  const claimedTwice = claimStreakMilestoneReward(claimed, 3);
  assert.equal(claimedTwice.xpPoints, 50);
});
