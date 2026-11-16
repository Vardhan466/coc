import type { AttemptAnswer, Question, SubjectTag, TestPaper } from '../types/index.ts';
import {
  EXAM_CATEGORIES,
  type AIMCQQuestion,
  type ExamCategory,
  type PublicQuestionPayload,
} from '../types/aiSystem.ts';
import { calculateScore } from './scoring.ts';

const VALID_SUBJECTS: SubjectTag[] = [
  'Quantitative Aptitude',
  'Reasoning & Intelligence',
  'General Awareness',
  'English Comprehension',
];

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export function normalizeQuestionStem(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/\$[^$]*\$/g, (m) => m.replace(/\s+/g, ''))
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isValidExamCategory(value: unknown): value is ExamCategory {
  return typeof value === 'string' && (EXAM_CATEGORIES as readonly string[]).includes(value);
}

export function validateMCQItem(candidate: Partial<AIMCQQuestion>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!candidate.text || typeof candidate.text !== 'string' || candidate.text.trim().length < 10) {
    errors.push('Question statement must be at least 10 characters.');
  }

  if (!Array.isArray(candidate.options) || candidate.options.length !== 4) {
    errors.push('Exactly 4 options (A, B, C, D) are required.');
  } else {
    const cleaned = candidate.options.map((opt) => (typeof opt === 'string' ? opt.trim() : ''));
    if (cleaned.some((opt) => opt.length === 0)) {
      errors.push('All 4 options must be non-empty.');
    }
    const uniqueCount = new Set(cleaned.map((o) => o.toLowerCase())).size;
    if (uniqueCount < 4) {
      errors.push('All 4 options must be distinct.');
    }
  }

  if (
    typeof candidate.correctIndex !== 'number' ||
    !Number.isInteger(candidate.correctIndex) ||
    candidate.correctIndex < 0 ||
    candidate.correctIndex > 3
  ) {
    errors.push('correctIndex must be an integer between 0 and 3.');
  }

  if (!candidate.explanation || typeof candidate.explanation !== 'string' || candidate.explanation.trim().length < 15) {
    errors.push('Detailed explanation (at least 15 characters) is required.');
  }

  if (!candidate.subject || !VALID_SUBJECTS.includes(candidate.subject)) {
    errors.push('Valid subject classification is required.');
  }

  if (!candidate.topic || typeof candidate.topic !== 'string' || candidate.topic.trim().length < 2) {
    errors.push('Topic tag is required.');
  }

  if (
    !candidate.difficulty ||
    !(VALID_DIFFICULTIES as readonly string[]).includes(candidate.difficulty)
  ) {
    errors.push('Difficulty level must be easy, medium, or hard.');
  }

  if (!isValidExamCategory(candidate.examCategory)) {
    errors.push('Valid competitive examination category is required.');
  }

  // Prevent AI-generated items from asserting fabricated official PQP years/shifts
  const sourceType = candidate.sourceType || 'ai_generated';
  const refNote = (candidate.referenceNote || '').toLowerCase();
  if (
    sourceType === 'ai_generated' &&
    /\b(official\s+.*\b(pyq|pqp|previous\s+year|paper)\b|actual\s+.*\b(shift|pyq|paper)\b|verbatim\s+.*\d{4})\b/i.test(
      refNote
    )
  ) {
    errors.push('AI-generated questions must not claim fabricated official PQP shift citations.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function deduplicateQuestions<T extends Pick<Question, 'id' | 'text'>>(
  candidates: T[],
  existingPool: Pick<Question, 'id' | 'text'>[] = []
): { unique: T[]; duplicateCount: number } {
  const seenIds = new Set<string>(existingPool.map((item) => item.id));
  const seenStems = new Set<string>(
    existingPool
      .map((item) => normalizeQuestionStem(item.text))
      .filter((s) => s.length > 0)
  );

  const unique: T[] = [];
  let duplicateCount = 0;

  for (const item of candidates) {
    const norm = normalizeQuestionStem(item.text);
    if (!item.id || seenIds.has(item.id) || (norm && seenStems.has(norm))) {
      duplicateCount += 1;
      continue;
    }
    seenIds.add(item.id);
    if (norm) seenStems.add(norm);
    unique.push(item);
  }

  return { unique, duplicateCount };
}

/**
 * Strips answer keys (correctIndex & all explanation fields) from a Question or TestPaper
 * when served before the configured IST key-release time.
 */
export function toSanitizedQuestion(q: Question | AIMCQQuestion): PublicQuestionPayload {
  return {
    id: q.id,
    qIndex: q.qIndex,
    text: q.text,
    options: q.options,
    subject: q.subject,
    topic: q.topic,
    difficulty: q.difficulty,
    ...('examCategory' in q && q.examCategory ? { examCategory: q.examCategory } : {}),
    ...('referenceNote' in q && q.referenceNote ? { referenceNote: q.referenceNote } : {}),
    ...('sourceType' in q && q.sourceType ? { sourceType: q.sourceType } : {}),
  };
}

export function stripAnswerKeysFromPaper(
  paper: TestPaper,
  keyReleased: boolean
): Omit<TestPaper, 'questions'> & { questions: (Question | (PublicQuestionPayload & { correctIndex: number; explanation: string }))[]; keyReleased: boolean } {
  if (keyReleased) {
    return {
      ...paper,
      keyReleased: true,
    };
  }

  return {
    ...paper,
    keyReleased: false,
    questions: paper.questions.map((q) => ({
      ...toSanitizedQuestion(q),
      correctIndex: -1,
      explanation: '',
    })),
  };
}

export interface ServerGradedResult {
  score: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  gradedAnswers: AttemptAnswer[];
}

export function gradeSubmittedAnswers(
  questions: Question[],
  answers: AttemptAnswer[],
  includeCorrectnessPerItem: boolean
): ServerGradedResult {
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  const answerByQId = new Map<string, AttemptAnswer>();
  for (const ans of answers) {
    if (ans.questionId) answerByQId.set(ans.questionId, ans);
  }

  const gradedAnswers: AttemptAnswer[] = questions.map((q, idx) => {
    const submitted = answerByQId.get(q.id) ?? answers[idx];
    const pickedRaw = submitted?.selectedOptionIndex ?? submitted?.selectedOption;
    const picked =
      typeof pickedRaw === 'number' && Number.isInteger(pickedRaw) && pickedRaw >= 0 && pickedRaw <= 3
        ? pickedRaw
        : null;

    let isCorrect: boolean | undefined = undefined;
    if (picked === null) {
      unattemptedCount += 1;
    } else if (picked === q.correctIndex) {
      correctCount += 1;
      isCorrect = true;
    } else {
      incorrectCount += 1;
      isCorrect = false;
    }

    return {
      questionId: q.id,
      questionIndex: idx,
      selectedOptionIndex: picked,
      selectedOption: picked,
      timeSpentSeconds:
        typeof submitted?.timeSpentSeconds === 'number' ? submitted.timeSpentSeconds : 0,
      submittedAt: submitted?.submittedAt || new Date().toISOString(),
      ...(includeCorrectnessPerItem && isCorrect !== undefined ? { isCorrect } : {}),
    };
  });

  const score = calculateScore(correctCount, incorrectCount);

  return {
    score,
    correctCount,
    incorrectCount,
    unattemptedCount,
    gradedAnswers,
  };
}
