import type { Attempt, Question, SubjectTag } from '../types/index.ts';
import type {
  SpeedPracticeSessionRecord,
  StudentComprehensiveAnalytics,
  StudyPlanDay,
  SubjectComparisonMetric,
  TopicMasteryMetric,
  TrendPeriodMetric,
} from '../types/aiSystem.ts';
import type { ErrorBookEntry } from './errorBookStorage.ts';

const ALL_SUBJECTS: SubjectTag[] = [
  'Quantitative Aptitude',
  'Reasoning & Intelligence',
  'General Awareness',
  'English Comprehension',
];

function round1(val: number): number {
  return Number(val.toFixed(1));
}

function getIsoWeekLabel(isoDate: string): string {
  const ts = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(ts)) return isoDate;
  const d = new Date(ts);
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((ts - jan1.getTime()) / 86_400_000 + jan1.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function buildComprehensiveStudentAnalytics(params: {
  attempts: Attempt[];
  speedSessions?: SpeedPracticeSessionRecord[];
  errorBook?: ErrorBookEntry[];
  questionBank?: Question[];
  currentStreak?: number;
  todayTopic?: StudyPlanDay | null;
}): StudentComprehensiveAnalytics {
  const {
    attempts = [],
    speedSessions = [],
    errorBook = [],
    questionBank = [],
    currentStreak = 0,
    todayTopic,
  } = params;

  const questionMap = new Map<string, Question>();
  for (const q of questionBank) {
    questionMap.set(q.id, q);
  }

  const topicStats = new Map<
    string,
    { topic: string; subject: SubjectTag; attempted: number; correct: number; totalSec: number }
  >();
  const subjectStats = new Map<
    SubjectTag,
    { attempted: number; correct: number; totalSec: number }
  >();
  for (const s of ALL_SUBJECTS) {
    subjectStats.set(s, { attempted: 0, correct: 0, totalSec: 0 });
  }

  const activeDaySet = new Set<string>();
  const weeklyMap = new Map<string, { scores: number[]; accuracies: number[] }>();
  const monthlyMap = new Map<string, { scores: number[]; accuracies: number[] }>();

  for (const att of attempts) {
    const isoDate = (att.submittedAt || att.completedAt || att.startedAt || '').slice(0, 10);
    if (isoDate) {
      activeDaySet.add(isoDate);
      const weekKey = getIsoWeekLabel(isoDate);
      const monthKey = isoDate.slice(0, 7);
      const totalAnswered = att.correctCount + att.incorrectCount;
      const acc = totalAnswered > 0 ? (att.correctCount / totalAnswered) * 100 : 0;

      if (!weeklyMap.has(weekKey)) weeklyMap.set(weekKey, { scores: [], accuracies: [] });
      weeklyMap.get(weekKey)!.scores.push(att.score);
      weeklyMap.get(weekKey)!.accuracies.push(acc);

      if (!monthlyMap.has(monthKey)) monthlyMap.set(monthKey, { scores: [], accuracies: [] });
      monthlyMap.get(monthKey)!.scores.push(att.score);
      monthlyMap.get(monthKey)!.accuracies.push(acc);
    }

    for (const ans of att.answers || []) {
      const q = questionMap.get(ans.questionId);
      if (!q) continue;
      const picked = ans.selectedOptionIndex ?? ans.selectedOption;
      if (picked === null || picked === undefined) continue;

      const isCorrect =
        typeof ans.isCorrect === 'boolean' ? ans.isCorrect : picked === q.correctIndex;
      const timeSec = Math.max(0.5, ans.timeSpentSeconds || 0);

      const subjRec = subjectStats.get(q.subject);
      if (subjRec) {
        subjRec.attempted += 1;
        if (isCorrect) subjRec.correct += 1;
        subjRec.totalSec += timeSec;
      }

      const key = `${q.subject}::${q.topic}`;
      const existing = topicStats.get(key) || {
        topic: q.topic,
        subject: q.subject,
        attempted: 0,
        correct: 0,
        totalSec: 0,
      };
      existing.attempted += 1;
      if (isCorrect) existing.correct += 1;
      existing.totalSec += timeSec;
      topicStats.set(key, existing);
    }
  }

  for (const sess of speedSessions) {
    const isoDate = (sess.completedAt || '').slice(0, 10);
    if (isoDate) activeDaySet.add(isoDate);

    if (sess.itemOutcomes && sess.itemOutcomes.length > 0) {
      for (const item of sess.itemOutcomes) {
        const timeSec = Math.max(0.5, item.timeSpentSeconds || 0);
        const subjRec = subjectStats.get(item.subject);
        if (subjRec) {
          subjRec.attempted += 1;
          if (item.isCorrect) subjRec.correct += 1;
          subjRec.totalSec += timeSec;
        }

        const key = `${item.subject}::${item.topic}`;
        const existing = topicStats.get(key) || {
          topic: item.topic,
          subject: item.subject,
          attempted: 0,
          correct: 0,
          totalSec: 0,
        };
        existing.attempted += 1;
        if (item.isCorrect) existing.correct += 1;
        existing.totalSec += timeSec;
        topicStats.set(key, existing);
      }
      continue;
    }

    let mappedAnyFromBank = false;
    const missedSet = new Set(sess.missedQuestionIds || []);
    for (const qId of sess.questionIds || []) {
      const q = questionMap.get(qId);
      if (!q) continue;
      mappedAnyFromBank = true;
      const isCorrect = !missedSet.has(qId);
      const timeSec = Math.max(0.5, sess.avgTimePerQuestionSec || 5);
      const subjRec = subjectStats.get(q.subject);
      if (subjRec) {
        subjRec.attempted += 1;
        if (isCorrect) subjRec.correct += 1;
        subjRec.totalSec += timeSec;
      }
      const key = `${q.subject}::${q.topic}`;
      const existing = topicStats.get(key) || {
        topic: q.topic,
        subject: q.subject,
        attempted: 0,
        correct: 0,
        totalSec: 0,
      };
      existing.attempted += 1;
      if (isCorrect) existing.correct += 1;
      existing.totalSec += timeSec;
      topicStats.set(key, existing);
    }

    if (!mappedAnyFromBank && sess.subject !== 'all' && subjectStats.has(sess.subject)) {
      const subjRec = subjectStats.get(sess.subject)!;
      subjRec.attempted += sess.totalQuestions;
      subjRec.correct += sess.correctCount;
      subjRec.totalSec += sess.avgTimePerQuestionSec * sess.totalQuestions;
    }
  }

  // Also include unmastered error book items as topic focus signals
  const unmasteredTopicsSet = new Set<string>();
  for (const err of errorBook) {
    if (!err.mastered && err.topic) {
      unmasteredTopicsSet.add(err.topic);
      const key = `${err.subject}::${err.topic}`;
      if (!topicStats.has(key)) {
        topicStats.set(key, {
          topic: err.topic,
          subject: err.subject,
          attempted: 1,
          correct: 0,
          totalSec: 8,
        });
      }
    }
  }

  const topicMastery: TopicMasteryMetric[] = Array.from(topicStats.values())
    .map((item) => {
      const accuracy = item.attempted > 0 ? round1((item.correct / item.attempted) * 100) : 0;
      const avgSpeedSec = item.attempted > 0 ? round1(item.totalSec / item.attempted) : 0;
      const status: TopicMasteryMetric['status'] =
        accuracy >= 75 ? 'Strong' : accuracy >= 50 ? 'Developing' : 'Needs Focus';
      return {
        topic: item.topic,
        subject: item.subject,
        attempted: item.attempted,
        correct: item.correct,
        accuracy,
        avgSpeedSec,
        status,
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy || b.attempted - a.attempted);

  const subjectComparison: SubjectComparisonMetric[] = ALL_SUBJECTS.map((subj) => {
    const rec = subjectStats.get(subj)!;
    const accuracy = rec.attempted > 0 ? round1((rec.correct / rec.attempted) * 100) : 0;
    const avgSpeedSec = rec.attempted > 0 ? round1(rec.totalSec / rec.attempted) : 0;
    const tier: SubjectComparisonMetric['tier'] =
      rec.attempted === 0
        ? 'Balanced'
        : accuracy >= 75
        ? 'Strong'
        : accuracy < 55
        ? 'Weak'
        : 'Balanced';
    return {
      subject: subj,
      accuracy,
      avgSpeedSec,
      attempted: rec.attempted,
      tier,
    };
  });

  const buildTrendArray = (
    map: Map<string, { scores: number[]; accuracies: number[] }>
  ): TrendPeriodMetric[] => {
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodLabel, data]) => {
        const count = data.scores.length;
        const avgScore = round1(data.scores.reduce((acc, v) => acc + v, 0) / count);
        const avgAccuracy = round1(data.accuracies.reduce((acc, v) => acc + v, 0) / count);
        const variance =
          count > 1
            ? data.accuracies.reduce((acc, v) => acc + Math.pow(v - avgAccuracy, 2), 0) / count
            : 0;
        const stdDev = Math.sqrt(variance);
        const consistencyIndex = Math.max(0, Math.min(100, Math.round(100 - stdDev * 1.5)));
        return {
          periodLabel,
          testsCount: count,
          avgScore,
          avgAccuracy,
          consistencyIndex,
        };
      });
  };

  const weeklyTrends = buildTrendArray(weeklyMap);
  const monthlyTrends = buildTrendArray(monthlyMap);

  const strongestSubjects = subjectComparison
    .filter((s) => s.attempted > 0 && s.accuracy >= 70)
    .sort((a, b) => b.accuracy - a.accuracy)
    .map((s) => s.subject);

  const weakestSubjects = subjectComparison
    .filter((s) => s.attempted > 0 && s.accuracy < 60)
    .sort((a, b) => a.accuracy - b.accuracy)
    .map((s) => s.subject);

  const missedTopicsNeedingRevision = topicMastery
    .filter((t) => t.status === 'Needs Focus' || unmasteredTopicsSet.has(t.topic))
    .slice(0, 6)
    .map((t) => t.topic);

  // Deterministic consistency score combining streak regularity, active days & accuracy variance
  const allAccuracies = Array.from(weeklyMap.values()).flatMap((w) => w.accuracies);
  const meanAcc =
    allAccuracies.length > 0
      ? allAccuracies.reduce((a, b) => a + b, 0) / allAccuracies.length
      : 0;
  const stability =
    allAccuracies.length > 1
      ? Math.max(
          0,
          100 -
            Math.sqrt(
              allAccuracies.reduce((sum, a) => sum + Math.pow(a - meanAcc, 2), 0) /
                allAccuracies.length
            ) *
              1.6
        )
      : allAccuracies.length === 1
      ? 72
      : 0;
  const streakContribution = Math.min(40, currentStreak * 5);
  const volumeContribution = Math.min(35, (attempts.length + speedSessions.length) * 4);
  const stabilityContribution = Math.round((stability / 100) * 25);
  const consistencyScore =
    attempts.length === 0 && speedSessions.length === 0 && currentStreak === 0
      ? 0
      : Math.min(100, Math.max(10, streakContribution + volumeContribution + stabilityContribution));

  const personalizedInsights: string[] = [];
  if (attempts.length === 0 && speedSessions.length === 0) {
    personalizedInsights.push(
      'Complete your first Daily Competition Exam or a 10-Question Speed Practice session to unlock personalized topic accuracy analytics.'
    );
  } else {
    if (weakestSubjects.length > 0) {
      personalizedInsights.push(
        `Priority Improvement: Focus 15-minute daily drills on ${weakestSubjects[0]} where current accuracy is below 60%.`
      );
    }
    if (strongestSubjects.length > 0) {
      personalizedInsights.push(
        `Scoring Strength: You maintain high accuracy in ${strongestSubjects[0]} — leverage it to bank fast marks early.`
      );
    }
    if (missedTopicsNeedingRevision.length > 0) {
      personalizedInsights.push(
        `Revision Backlog: Revisit ${missedTopicsNeedingRevision.slice(0, 2).join(' and ')} via the Error Book or Speed Practice Incorrect filter.`
      );
    }
    if (speedSessions.some((s) => s.avgTimePerQuestionSec > 9)) {
      personalizedInsights.push(
        'Speed Alert: Your average response time exceeded 9s/Q in recent drills — practice 10s-timer Micro-Challenges to prevent auto-skips at 7:00 PM IST.'
      );
    }
  }

  if (todayTopic) {
    personalizedInsights.push(
      `Today's Daily Exam Focus: ${todayTopic.topic} (${todayTopic.subject}).`
    );
  }

  return {
    consistencyScore,
    activeStudyDays: activeDaySet.size,
    topicMastery,
    weeklyTrends,
    monthlyTrends,
    subjectComparison,
    strongestSubjects,
    weakestSubjects,
    missedTopicsNeedingRevision,
    personalizedInsights,
  };
}
