import {
  StudentProgressStats,
  Attempt,
  Question,
  SubjectTag,
  UserProfile,
  DiagnosticResult,
  RollingDayPoint,
} from '../types';
import { calculateNegativeMarkLoss } from './scoring';
import { SAMPLE_40_QUESTIONS } from '../data/mockExamData';
import { getISTNowParts, getTodayIsoDateIST } from './istTime';
import {
  calculateSkillTier,
  evaluateDailyStreakWithFreeze,
  applyReferralReward,
  STREAK_MILESTONE_REWARDS,
} from './gamification';

export const EMPTY_STUDENT_PROGRESS: StudentProgressStats = {
  testsTaken: 0,
  averageScore: 0,
  highestScore: 0,
  overallAccuracy: 0,
  bestRank: 0,
  currentStreak: 0,
  longestStreak: 0,
  streakFreezesAvailable: 1,
  streakFreezesUsed: 0,
  frozenDates: [],
  claimedMilestones: [],
  skillTier: 'Bronze',
  xpPoints: 0,
  proAnalyticsUnlocked: false,
  referralsCount: 0,
  badges: [],
  rolling30DayHistory: [],
  marksLostToNegatives: 0,
  rapidMistakesCount: 0,
  subjectPerformance: [
    { subject: 'Quantitative Aptitude', totalQuestions: 0, correct: 0, accuracy: 0, avgTimePerQuestion: 0 },
    { subject: 'Reasoning & Intelligence', totalQuestions: 0, correct: 0, accuracy: 0, avgTimePerQuestion: 0 },
    { subject: 'General Awareness', totalQuestions: 0, correct: 0, accuracy: 0, avgTimePerQuestion: 0 },
    { subject: 'English Comprehension', totalQuestions: 0, correct: 0, accuracy: 0, avgTimePerQuestion: 0 },
  ],
  weakestTopics: [],
  recentAttempts: [],
};

/**
 * Get progress for a specific user.
 * Brand new users start with 0 tests taken and empty history so their progress builds cleanly from their actual tests.
 */
export function getStudentProgressForUser(user: UserProfile | null | undefined): StudentProgressStats {
  if (!user) {
    return { ...EMPTY_STUDENT_PROGRESS };
  }
  const id = user.uid || user.studentId;
  if (!id) {
    return { ...EMPTY_STUDENT_PROGRESS };
  }

  const storageKey = `coc_progress_${id}`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.testsTaken === 'number') {
        return {
          ...EMPTY_STUDENT_PROGRESS,
          ...parsed,
          streakFreezesAvailable: parsed.streakFreezesAvailable ?? 1,
          streakFreezesUsed: parsed.streakFreezesUsed ?? 0,
          longestStreak: parsed.longestStreak ?? parsed.currentStreak ?? 0,
          frozenDates: Array.isArray(parsed.frozenDates) ? parsed.frozenDates : [],
          claimedMilestones: Array.isArray(parsed.claimedMilestones) ? parsed.claimedMilestones : [],
          skillTier: parsed.skillTier ?? 'Bronze',
          xpPoints: parsed.xpPoints ?? 0,
          badges: parsed.badges ?? [],
          rolling30DayHistory: parsed.rolling30DayHistory ?? [],
        };
      }
    }
  } catch (err) {
    console.warn('Could not read user progress from localStorage', err);
  }

  // Brand new user starts with 0 tests
  return { ...EMPTY_STUDENT_PROGRESS };
}

/**
 * Save progress for a specific user to localStorage.
 */
export function saveStudentProgressForUser(
  user: UserProfile | null | undefined,
  progress: StudentProgressStats
): void {
  if (!user) return;
  const id = user.uid || user.studentId;
  if (!id) return;
  const storageKey = `coc_progress_${id}`;
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch (err) {
    console.warn('Could not save user progress to localStorage', err);
  }
}

/**
 * Merges a guest's Lazy Registration Diagnostic Micro-Quiz result into an authenticated user's progress.
 */
export function mergeDiagnosticIntoProgress(
  prev: StudentProgressStats,
  diagnostic: DiagnosticResult,
  user?: UserProfile,
  hadReferral?: boolean
): StudentProgressStats {
  const istParts = getISTNowParts();
  const isoDate = istParts.isoDate;
  const dateLabel = istParts.dateLabel;

  const streakEval = evaluateDailyStreakWithFreeze({
    currentStreak: prev.currentStreak,
    longestStreak: prev.longestStreak ?? 0,
    streakFreezesAvailable: prev.streakFreezesAvailable ?? 1,
    streakFreezesUsed: prev.streakFreezesUsed ?? 0,
    lastActivityDate: prev.lastActivityDate,
    activityDate: isoDate,
    isDisqualified: false,
  });

  const existingBadges = new Set(prev.badges || []);
  existingBadges.add('Diagnostic Verified');

  const rollingPoint: RollingDayPoint = {
    date: isoDate,
    label: dateLabel,
    accuracy: diagnostic.accuracy,
    avgSpeedSec: diagnostic.avgTimePerQuestionSec,
    score: diagnostic.score,
    testsCount: 1,
  };

  let merged: StudentProgressStats = {
    ...prev,
    diagnosticResult: diagnostic,
    skillTier: prev.testsTaken > 0 ? prev.skillTier : diagnostic.assignedTier,
    currentStreak: streakEval.nextStreak,
    longestStreak: streakEval.nextLongestStreak,
    streakFreezesAvailable: streakEval.nextFreezesAvailable,
    streakFreezesUsed: streakEval.nextFreezesUsed,
    lastActivityDate: streakEval.lastActivityDate,
    xpPoints: (prev.xpPoints ?? 0) + Math.max(25, Math.round(diagnostic.correctCount * 15)),
    proAnalyticsUnlocked: true,
    badges: Array.from(existingBadges),
    rolling30DayHistory: [...(prev.rolling30DayHistory || []), rollingPoint].slice(-30),
  };

  if (hadReferral) {
    merged = applyReferralReward(merged);
  }

  if (user) {
    saveStudentProgressForUser(user, merged);
  }

  return merged;
}

/**
 * Dynamically records an exam attempt into the student's progress record,
 * including per-subject accuracy, speed averages, and weakest topics.
 */
export function recordTestAttemptInProgress(
  prev: StudentProgressStats,
  attempt: Attempt,
  testTitle: string,
  user?: UserProfile,
  testQuestions: Question[] = SAMPLE_40_QUESTIONS
): StudentProgressStats {
  const newTestsTaken = prev.testsTaken + 1;
  const score = attempt.score;
  const newAvgScore = Number(
    ((prev.averageScore * prev.testsTaken + score) / newTestsTaken).toFixed(2)
  );
  const newHighScore = prev.testsTaken === 0 ? score : Math.max(prev.highestScore, score);
  const negativeLoss = calculateNegativeMarkLoss(attempt.incorrectCount);
  const newMarksLost = Number((prev.marksLostToNegatives + negativeLoss).toFixed(2));

  const istParts = getISTNowParts();
  const isoDate = istParts.isoDate;
  const dateLabel = istParts.dateLabel;

  // Evaluate daily streak with Streak Freeze protection
  const streakResult = evaluateDailyStreakWithFreeze({
    currentStreak: prev.currentStreak,
    longestStreak: prev.longestStreak ?? prev.currentStreak,
    streakFreezesAvailable: prev.streakFreezesAvailable ?? 1,
    streakFreezesUsed: prev.streakFreezesUsed ?? 0,
    lastActivityDate: prev.lastActivityDate,
    activityDate: isoDate,
    isDisqualified: attempt.isDisqualified,
  });

  const totalAttempted = attempt.correctCount + attempt.incorrectCount;
  const attemptAccuracy = Math.round(
    (attempt.correctCount / Math.max(1, totalAttempted)) * 100
  );
  const totalQuestionsInAttempt = Math.max(
    1,
    attempt.answers?.length || attempt.correctCount + attempt.incorrectCount + attempt.unattemptedCount || 30
  );
  const totalSec = attempt.timeTakenSeconds ?? attempt.totalTimeSeconds ?? totalQuestionsInAttempt * 6;
  const avgSpeedSec = Number(Math.max(1.0, totalSec / totalQuestionsInAttempt).toFixed(1));

  const officialRank =
    !attempt.isCustomTest && typeof attempt.rank === 'number' && attempt.rank > 0
      ? attempt.rank
      : 0;

  const newRecentAttempt = {
    testDate: dateLabel,
    isoDate,
    testTitle: testTitle.replace(/Daily All-India Speed Sprint /i, '#').slice(0, 18),
    score: attempt.score,
    peerAvgScore: Number(((21.5 / 30) * totalQuestionsInAttempt).toFixed(1)),
    rank: officialRank,
    percentile: attempt.percentile || Math.min(99.9, Math.max(30, Math.round((attempt.score / Math.max(1, totalQuestionsInAttempt)) * 100))),
    accuracy: attemptAccuracy,
    avgSpeedSec,
  };

  const updatedRecent = [...(prev.recentAttempts || []), newRecentAttempt].slice(-30);

  // Cumulative overall accuracy across recorded attempts
  const overallAcc =
    updatedRecent.length > 0
      ? Number(
          (
            updatedRecent.reduce((sum, a) => sum + a.accuracy, 0) /
            updatedRecent.length
          ).toFixed(1)
        )
      : attemptAccuracy;

  const bestRank =
    officialRank > 0
      ? prev.bestRank === 0
        ? officialRank
        : Math.min(prev.bestRank, officialRank)
      : prev.bestRank;

  // Update per-subject performance and weakest topics dynamically from answered items
  const questionMap = new Map<string, Question>();
  for (const q of SAMPLE_40_QUESTIONS) questionMap.set(q.id, q);
  for (const q of testQuestions) questionMap.set(q.id, q);

  const subjectPerfMap = new Map<SubjectTag, { totalQuestions: number; correct: number; totalTimeSec: number }>();
  for (const sp of prev.subjectPerformance || EMPTY_STUDENT_PROGRESS.subjectPerformance) {
    subjectPerfMap.set(sp.subject, {
      totalQuestions: sp.totalQuestions,
      correct: sp.correct,
      totalTimeSec: sp.avgTimePerQuestion * sp.totalQuestions,
    });
  }

  const topicMap = new Map<string, { topic: string; subject: SubjectTag; encountered: number; correct: number }>();
  for (const wt of prev.weakestTopics || []) {
    topicMap.set(wt.topic, {
      topic: wt.topic,
      subject: wt.subject,
      encountered: wt.questionsEncountered,
      correct: Math.round((wt.accuracy / 100) * wt.questionsEncountered),
    });
  }

  for (const ans of attempt.answers || []) {
    const q = questionMap.get(ans.questionId);
    if (!q) continue;

    const chosenIdx = ans.selectedOptionIndex ?? ans.selectedOption;
    const isCorrect =
      typeof ans.isCorrect === 'boolean'
        ? ans.isCorrect
        : chosenIdx !== null && chosenIdx !== undefined && chosenIdx === q.correctIndex;

    const prevSubj = subjectPerfMap.get(q.subject) || { totalQuestions: 0, correct: 0, totalTimeSec: 0 };
    subjectPerfMap.set(q.subject, {
      totalQuestions: prevSubj.totalQuestions + 1,
      correct: prevSubj.correct + (isCorrect ? 1 : 0),
      totalTimeSec: prevSubj.totalTimeSec + Math.max(0, ans.timeSpentSeconds || 0),
    });

    const prevTopic = topicMap.get(q.topic) || {
      topic: q.topic,
      subject: q.subject,
      encountered: 0,
      correct: 0,
    };
    topicMap.set(q.topic, {
      topic: q.topic,
      subject: q.subject,
      encountered: prevTopic.encountered + 1,
      correct: prevTopic.correct + (isCorrect ? 1 : 0),
    });
  }

  const updatedSubjectPerformance = (
    ['Quantitative Aptitude', 'Reasoning & Intelligence', 'General Awareness', 'English Comprehension'] as SubjectTag[]
  ).map((subj) => {
    const entry = subjectPerfMap.get(subj) || { totalQuestions: 0, correct: 0, totalTimeSec: 0 };
    const accuracy =
      entry.totalQuestions > 0 ? Number(((entry.correct / entry.totalQuestions) * 100).toFixed(1)) : 0;
    const avgTimePerQuestion =
      entry.totalQuestions > 0 ? Number((entry.totalTimeSec / entry.totalQuestions).toFixed(1)) : 0;
    return {
      subject: subj,
      totalQuestions: entry.totalQuestions,
      correct: entry.correct,
      accuracy,
      avgTimePerQuestion,
    };
  });

  const updatedWeakestTopics = Array.from(topicMap.values())
    .map((t) => ({
      topic: t.topic,
      subject: t.subject,
      accuracy: t.encountered > 0 ? Math.round((t.correct / t.encountered) * 100) : 0,
      questionsEncountered: t.encountered,
      recommendedPracticeSlug: t.subject,
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.questionsEncountered - a.questionsEncountered)
    .slice(0, 6);

  // Rolling 30-day history point
  const prevHistory = [...(prev.rolling30DayHistory || [])];
  const existingTodayIdx = prevHistory.findIndex((p) => p.date === isoDate);
  if (existingTodayIdx >= 0) {
    const existing = prevHistory[existingTodayIdx];
    const nextCount = existing.testsCount + 1;
    prevHistory[existingTodayIdx] = {
      date: isoDate,
      label: dateLabel,
      accuracy: Math.round((existing.accuracy * existing.testsCount + attemptAccuracy) / nextCount),
      avgSpeedSec: Number(
        ((existing.avgSpeedSec * existing.testsCount + avgSpeedSec) / nextCount).toFixed(1)
      ),
      score: Number(((existing.score * existing.testsCount + attempt.score) / nextCount).toFixed(2)),
      testsCount: nextCount,
    };
  } else {
    prevHistory.push({
      date: isoDate,
      label: dateLabel,
      accuracy: attemptAccuracy,
      avgSpeedSec,
      score: attempt.score,
      testsCount: 1,
    });
  }
  const updatedRolling = prevHistory.slice(-30);

  const rapidWrongIncrement = (attempt.answers || []).filter((a) => {
    const picked = a.selectedOptionIndex ?? a.selectedOption;
    return (
      typeof picked === 'number' &&
      picked >= 0 &&
      a.timeSpentSeconds < 2 &&
      a.isCorrect === false
    );
  }).length;

  const skillMeta = calculateSkillTier(overallAcc, newTestsTaken, newAvgScore);
  const earnedXp = Math.max(10, Math.round(attempt.correctCount * 10 + (attempt.isDisqualified ? 0 : 20)));

  const nextFrozenDates = new Set<string>(prev.frozenDates || []);
  if (streakResult.freezeConsumed && streakResult.lastFreezeConsumedDate) {
    nextFrozenDates.add(streakResult.lastFreezeConsumedDate);
  }

  const updated: StudentProgressStats = {
    ...prev,
    testsTaken: newTestsTaken,
    averageScore: newAvgScore,
    highestScore: newHighScore,
    marksLostToNegatives: newMarksLost,
    rapidMistakesCount: (prev.rapidMistakesCount || 0) + rapidWrongIncrement,
    currentStreak: streakResult.nextStreak,
    longestStreak: streakResult.nextLongestStreak,
    streakFreezesAvailable: streakResult.nextFreezesAvailable,
    streakFreezesUsed: streakResult.nextFreezesUsed,
    lastActivityDate: streakResult.lastActivityDate,
    lastFreezeConsumedDate: streakResult.lastFreezeConsumedDate ?? prev.lastFreezeConsumedDate,
    frozenDates: Array.from(nextFrozenDates),
    skillTier: skillMeta.tier,
    xpPoints: (prev.xpPoints ?? 0) + earnedXp,
    proAnalyticsUnlocked: prev.proAnalyticsUnlocked || newTestsTaken >= 1,
    overallAccuracy: overallAcc,
    bestRank,
    subjectPerformance: updatedSubjectPerformance,
    weakestTopics: updatedWeakestTopics,
    recentAttempts: updatedRecent,
    rolling30DayHistory: updatedRolling,
  };

  if (user) {
    saveStudentProgressForUser(user, updated);
  }

  return updated;
}

/**
 * Manually activates a Streak Freeze shield to protect a calendar date (defaults to today IST).
 */
export function activateStreakFreezeForDate(
  prev: StudentProgressStats,
  user?: UserProfile,
  targetIsoDate: string = getTodayIsoDateIST()
): StudentProgressStats {
  const available = prev.streakFreezesAvailable ?? 0;
  const frozenSet = new Set<string>(prev.frozenDates || []);
  if (available <= 0 || frozenSet.has(targetIsoDate)) {
    return prev;
  }

  frozenSet.add(targetIsoDate);
  const updated: StudentProgressStats = {
    ...prev,
    streakFreezesAvailable: available - 1,
    streakFreezesUsed: (prev.streakFreezesUsed ?? 0) + 1,
    lastFreezeConsumedDate: targetIsoDate,
    frozenDates: Array.from(frozenSet),
  };

  if (user) {
    saveStudentProgressForUser(user, updated);
  }
  return updated;
}

/**
 * Claims bonus XP and Streak Freezes when a user unlocks a streak milestone reward (3d, 7d, 14d, 30d).
 */
export function claimStreakMilestoneReward(
  prev: StudentProgressStats,
  milestoneDays: number,
  user?: UserProfile
): StudentProgressStats {
  const def = STREAK_MILESTONE_REWARDS.find((m) => m.days === milestoneDays);
  const alreadyClaimed = new Set<number>(prev.claimedMilestones || []);
  const bestReached = Math.max(prev.currentStreak, prev.longestStreak ?? 0);

  if (!def || alreadyClaimed.has(milestoneDays) || bestReached < milestoneDays) {
    return prev;
  }

  alreadyClaimed.add(milestoneDays);
  const existingBadges = new Set(prev.badges || []);
  existingBadges.add(def.title);

  const updated: StudentProgressStats = {
    ...prev,
    claimedMilestones: Array.from(alreadyClaimed),
    xpPoints: (prev.xpPoints ?? 0) + def.bonusXp,
    streakFreezesAvailable: Math.min(5, (prev.streakFreezesAvailable ?? 1) + def.bonusFreezes),
    badges: Array.from(existingBadges),
  };

  if (user) {
    saveStudentProgressForUser(user, updated);
  }
  return updated;
}
