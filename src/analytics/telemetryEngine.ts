import { QuestionSchema, QuestionUserAttempt, TelemetryReport } from '../types/exam';

export function generateTelemetryReport(
  examId: string,
  questions: QuestionSchema[],
  attempts: Record<string, QuestionUserAttempt>,
  totalDurationSeconds: number,
  timeRemainingSeconds: number
): TelemetryReport {
  const totalTimeSpentSeconds = Math.max(0, totalDurationSeconds - timeRemainingSeconds);

  const speedVsAccuracy = {
    fastAndCorrect: 0,
    slowAndCorrect: 0,
    fastAndWrong: 0,
    slowAndWrong: 0,
  };

  const trapQuestionsIdentified: string[] = [];

  const sectionAggregates: Record<
    string,
    { score: number; accuracy: number; total: number; attempted: number; correct: number }
  > = {};

  questions.forEach((q) => {
    const subject = q.subject || 'GENERAL_AWARENESS';
    if (!sectionAggregates[subject]) {
      sectionAggregates[subject] = {
        score: 0,
        accuracy: 0,
        total: 0,
        attempted: 0,
        correct: 0,
      };
    }
    sectionAggregates[subject].total += 1;

    const attempt = attempts[q.id];
    if (!attempt) return;

    const hasAnswered = attempt.selectedOptionId !== null;
    const isCorrect = hasAnswered && attempt.selectedOptionId === q.correctOptionId;
    const timeSpentSec = (attempt.timeSpentMs || 0) / 1000;

    if (hasAnswered) {
      sectionAggregates[subject].attempted += 1;

      if (isCorrect) {
        sectionAggregates[subject].correct += 1;
        sectionAggregates[subject].score += q.positiveMarks ?? 1.0;

        if (timeSpentSec < 15) {
          speedVsAccuracy.fastAndCorrect += 1;
        } else {
          speedVsAccuracy.slowAndCorrect += 1;
        }
      } else {
        sectionAggregates[subject].score -= q.negativeMarks ?? 0.25;

        if (timeSpentSec < 15) {
          speedVsAccuracy.fastAndWrong += 1;
        } else {
          speedVsAccuracy.slowAndWrong += 1;
        }

        // Trap Question: Candidate invested high time (> 25s, or > 12s in rapid tests) but picked wrong answer
        if (timeSpentSec >= 12) {
          trapQuestionsIdentified.push(q.id);
        }
      }
    }
  });

  // Calculate percentage accuracies
  Object.keys(sectionAggregates).forEach((subject) => {
    const stat = sectionAggregates[subject];
    stat.accuracy = stat.attempted > 0 ? Math.round((stat.correct / stat.attempted) * 100) : 0;
    stat.score = Number(stat.score.toFixed(2));
  });

  return {
    examId,
    totalTimeSpentSeconds,
    speedVsAccuracy,
    trapQuestionsIdentified,
    sectionWiseScore: sectionAggregates,
  };
}
