import { QuestionStatus, QuestionUserAttempt } from '../types/exam';

export type QuestionAction =
  | { type: 'VISIT' }
  | { type: 'SELECT_OPTION'; optionId: string }
  | { type: 'CLEAR_RESPONSE' }
  | { type: 'SAVE_AND_NEXT' }
  | { type: 'MARK_FOR_REVIEW_AND_NEXT' }
  | { type: 'NAVIGATE_AWAY' };

/**
 * Deterministic Question Palette Finite State Machine (FSM).
 * Handles all standard NTA/CBT exam state transitions:
 * - NOT_VISITED (Gray)
 * - NOT_ANSWERED (Red)
 * - ANSWERED (Green)
 * - MARKED_FOR_REVIEW (Purple/Violet)
 * - ANSWERED_AND_MARKED_FOR_REVIEW (Purple/Violet with small green indicator)
 */
export function transitionQuestionState(
  currentState: QuestionUserAttempt,
  action: QuestionAction
): QuestionUserAttempt {
  const next = { ...currentState };

  switch (action.type) {
    case 'VISIT':
      next.visitCount += 1;
      next.lastVisitedTimestamp = Date.now();
      if (next.status === 'NOT_VISITED') {
        next.status = 'NOT_ANSWERED';
      }
      return next;

    case 'SELECT_OPTION':
      next.selectedOptionId = action.optionId;
      return next;

    case 'CLEAR_RESPONSE':
      next.selectedOptionId = null;
      if (next.status === 'ANSWERED') {
        next.status = 'NOT_ANSWERED';
      } else if (next.status === 'ANSWERED_AND_MARKED_FOR_REVIEW') {
        next.status = 'MARKED_FOR_REVIEW';
      }
      return next;

    case 'SAVE_AND_NEXT':
      if (next.selectedOptionId !== null) {
        next.status = 'ANSWERED';
      } else {
        next.status = 'NOT_ANSWERED';
      }
      return next;

    case 'MARK_FOR_REVIEW_AND_NEXT':
      if (next.selectedOptionId !== null) {
        next.status = 'ANSWERED_AND_MARKED_FOR_REVIEW';
      } else {
        next.status = 'MARKED_FOR_REVIEW';
      }
      return next;

    case 'NAVIGATE_AWAY':
      if (next.selectedOptionId !== null) {
        if (
          next.status !== 'ANSWERED' &&
          next.status !== 'ANSWERED_AND_MARKED_FOR_REVIEW'
        ) {
          next.status = 'ANSWERED';
        }
      } else {
        if (next.status === 'NOT_VISITED') {
          next.status = 'NOT_ANSWERED';
        }
      }
      return next;

    default:
      return next;
  }
}

export interface PaletteSummary {
  answered: number;
  notAnswered: number;
  notVisited: number;
  markedForReview: number;
  answeredAndMarkedForReview: number;
  total: number;
}

export function computePaletteSummary(
  questionIds: string[],
  attempts: Record<string, QuestionUserAttempt>
): PaletteSummary {
  const summary: PaletteSummary = {
    answered: 0,
    notAnswered: 0,
    notVisited: 0,
    markedForReview: 0,
    answeredAndMarkedForReview: 0,
    total: questionIds.length,
  };

  questionIds.forEach((id) => {
    const attempt = attempts[id];
    const status = attempt ? attempt.status : 'NOT_VISITED';
    switch (status) {
      case 'ANSWERED':
        summary.answered++;
        break;
      case 'NOT_ANSWERED':
        summary.notAnswered++;
        break;
      case 'MARKED_FOR_REVIEW':
        summary.markedForReview++;
        break;
      case 'ANSWERED_AND_MARKED_FOR_REVIEW':
        summary.answeredAndMarkedForReview++;
        break;
      case 'NOT_VISITED':
      default:
        summary.notVisited++;
        break;
    }
  });

  return summary;
}
