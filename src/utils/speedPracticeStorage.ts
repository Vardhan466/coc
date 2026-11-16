import type { Attempt } from '../types/index.ts';
import type { SpeedPracticeSessionRecord } from '../types/aiSystem.ts';
import type { ErrorBookEntry } from './errorBookStorage.ts';

const STORAGE_PREFIX = 'coc_speed_sessions';
const MAX_SESSIONS_PER_USER = 100;

function getSpeedStorageKey(userId?: string): string {
  return userId && userId.trim().length > 0
    ? `${STORAGE_PREFIX}_${userId.trim()}`
    : `${STORAGE_PREFIX}_guest`;
}

export function getSpeedPracticeSessions(userId?: string): SpeedPracticeSessionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getSpeedStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSpeedPracticeSession(
  userId: string | undefined,
  session: SpeedPracticeSessionRecord
): SpeedPracticeSessionRecord[] {
  const existing = getSpeedPracticeSessions(userId).filter((s) => s.id !== session.id);
  const next = [session, ...existing].slice(0, MAX_SESSIONS_PER_USER);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getSpeedStorageKey(userId), JSON.stringify(next));
    } catch (err) {
      console.warn('Failed to store speed practice sessions locally', err);
    }
  }
  return next;
}

export function extractAttemptedQuestionIds(
  attempts: Attempt[] = [],
  errorEntries: ErrorBookEntry[] = [],
  sessions: SpeedPracticeSessionRecord[] = []
): {
  attemptedIds: Set<string>;
  incorrectIds: Set<string>;
} {
  const attemptedIds = new Set<string>();
  const incorrectIds = new Set<string>();

  for (const att of attempts) {
    for (const ans of att.answers || []) {
      const picked = ans.selectedOptionIndex ?? ans.selectedOption;
      if (picked !== undefined && picked !== null && ans.questionId) {
        attemptedIds.add(ans.questionId);
        if (ans.isCorrect === false) {
          incorrectIds.add(ans.questionId);
        }
      }
    }
  }

  for (const err of errorEntries) {
    if (err.questionId) {
      attemptedIds.add(err.questionId);
      if (!err.mastered) {
        incorrectIds.add(err.questionId);
      }
    }
  }

  for (const sess of sessions) {
    for (const qId of sess.questionIds || []) {
      attemptedIds.add(qId);
    }
    for (const missedId of sess.missedQuestionIds || []) {
      incorrectIds.add(missedId);
    }
  }

  return { attemptedIds, incorrectIds };
}
