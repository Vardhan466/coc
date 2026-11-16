import { DiagnosticResponseItem, DiagnosticResult, Question, SkillTier, SubjectTag } from '../types';
import { calculateScore } from './scoring';
import { calculateSkillTier } from './gamification';

/**
 * Selects 3 balanced high-signal diagnostic questions (Quant + Reasoning + GA)
 * for Frictionless Lazy Registration onboarding.
 */
export function getDiagnosticQuestions(questionBank: Question[]): Question[] {
  const quant = questionBank.find((q) => q.subject === 'Quantitative Aptitude');
  const reasoning = questionBank.find((q) => q.subject === 'Reasoning & Intelligence');
  const ga = questionBank.find((q) => q.subject === 'General Awareness');

  const selected = [ga, quant, reasoning].filter(Boolean) as Question[];
  if (selected.length === 3) {
    return selected.map((q, idx) => ({ ...q, qIndex: idx }));
  }
  return questionBank.slice(0, 3).map((q, idx) => ({ ...q, qIndex: idx }));
}

export interface DiagnosticSubmissionItem {
  question: Question;
  selectedOptionIndex: number | null;
  timeSpentSeconds: number;
}

/**
 * Scores the 3-question diagnostic micro-quiz and produces an immediate
 * rank estimate, percentile, Skill Tier placement, and subject signal.
 */
export function evaluateDiagnosticQuiz(items: DiagnosticSubmissionItem[]): DiagnosticResult {
  let correctCount = 0;
  let incorrectCount = 0;
  let skippedCount = 0;
  let totalTimeSec = 0;

  const responses: DiagnosticResponseItem[] = items.map(({ question, selectedOptionIndex, timeSpentSeconds }) => {
    const safeTime = Math.max(1, Math.round(timeSpentSeconds));
    totalTimeSec += safeTime;

    if (selectedOptionIndex === null || selectedOptionIndex === undefined) {
      skippedCount += 1;
      return {
        questionId: question.id,
        selectedOptionIndex: null,
        timeSpentSeconds: safeTime,
        isCorrect: false,
        subject: question.subject,
      };
    }

    const isCorrect = selectedOptionIndex === question.correctIndex;
    if (isCorrect) {
      correctCount += 1;
    } else {
      incorrectCount += 1;
    }

    return {
      questionId: question.id,
      selectedOptionIndex,
      timeSpentSeconds: safeTime,
      isCorrect,
      subject: question.subject,
    };
  });

  const maxScore = items.length;
  const score = calculateScore(correctCount, incorrectCount);
  const attempted = correctCount + incorrectCount;
  const accuracy = attempted > 0 ? Math.round((correctCount / attempted) * 100) : 0;
  const avgTimePerQuestionSec = items.length > 0 ? Number((totalTimeSec / items.length).toFixed(1)) : 0;

  // Deterministic national benchmark mapping out of 4,850 daily participants
  const normalizedScoreRatio = Math.max(0, Math.min(1, score / Math.max(1, maxScore)));
  const speedBonusPct = avgTimePerQuestionSec > 0 && avgTimePerQuestionSec <= 8 ? 4.5 : 0;
  const estimatedPercentile = Number(
    Math.min(99.4, Math.max(24.0, 28.0 + normalizedScoreRatio * 66.5 + speedBonusPct)).toFixed(1)
  );
  const estimatedRank = Math.max(18, Math.round(((100 - estimatedPercentile) / 100) * 4850));

  const tierMeta = calculateSkillTier(accuracy, 3, (score / Math.max(1, maxScore)) * 30);
  let assignedTier: SkillTier = tierMeta.tier;
  if (correctCount === maxScore && avgTimePerQuestionSec <= 7) {
    assignedTier = 'Gold';
  } else if (correctCount >= 2 && assignedTier === 'Bronze') {
    assignedTier = 'Silver';
  }

  const weakItem = responses.find((r) => !r.isCorrect);
  const strengthItem = responses.find((r) => r.isCorrect);

  return {
    completedAt: new Date().toISOString(),
    score,
    maxScore,
    correctCount,
    incorrectCount,
    skippedCount,
    accuracy,
    avgTimePerQuestionSec,
    estimatedPercentile,
    estimatedRank,
    assignedTier,
    weakSubject: weakItem?.subject as SubjectTag | undefined,
    strengthSubject: strengthItem?.subject as SubjectTag | undefined,
    responses,
  };
}
