import { Attempt, Question, TestPaper } from '../types';

/**
 * Calculates raw official score:
 * +1.0 for each correct answer
 * -0.25 for each incorrect answer
 * 0.0 for unattempted/skipped questions
 * Strictly no artificial clamping to zero (negative scores are permitted).
 */
export function calculateScore(correct: number, incorrect: number): number {
  const raw = correct * 1.0 - incorrect * 0.25;
  return Number(raw.toFixed(2));
}

/**
 * Calculates the exact marks lost to negative marking penalty.
 */
export function calculateNegativeMarkLoss(incorrect: number): number {
  return Number((incorrect * 0.25).toFixed(2));
}

/**
 * Deterministic ranking with standard competitive tie-breakers:
 * 1. Score (highest first)
 * 2. Most Correct Answers (highest first)
 * 3. Fewer Incorrect Answers (lowest first)
 * 4. Faster Completion Time (lowest seconds first)
 * 5. Identical records share the same rank.
 */
export function calculateTieBreakerRank(attempts: Attempt[]): Attempt[] {
  if (attempts.length === 0) return [];

  const sorted = [...attempts].sort((a, b) => {
    // 1. Score desc
    if (b.score !== a.score) return b.score - a.score;
    // 2. Correct count desc
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    // 3. Incorrect count asc (fewer penalties)
    if (a.incorrectCount !== b.incorrectCount) return a.incorrectCount - b.incorrectCount;
    // 4. Time taken asc (faster submission)
    const aTime = a.timeTakenSeconds ?? a.totalTimeSeconds ?? 0;
    const bTime = b.timeTakenSeconds ?? b.totalTimeSeconds ?? 0;
    if (aTime !== bTime) return aTime - bTime;
    // 5. Stable fallback by studentId
    return a.studentId.localeCompare(b.studentId);
  });

  const total = sorted.length;
  let currentRank = 1;

  return sorted.map((attempt, index) => {
    if (index > 0) {
      const prev = sorted[index - 1];
      const prevTime = prev.timeTakenSeconds ?? prev.totalTimeSeconds ?? 0;
      const attemptTime = attempt.timeTakenSeconds ?? attempt.totalTimeSeconds ?? 0;
      const isIdentical =
        prev.score === attempt.score &&
        prev.correctCount === attempt.correctCount &&
        prev.incorrectCount === attempt.incorrectCount &&
        prevTime === attemptTime;

      if (!isIdentical) {
        currentRank = index + 1;
      }
    } else {
      currentRank = 1;
    }

    // Percentile calculation: (participants below this rank / total participants) * 100
    const studentsBelow = total - currentRank;
    const percentile = total > 1 ? Number(((studentsBelow / (total - 1)) * 100).toFixed(1)) : 100;

    return {
      ...attempt,
      rank: currentRank,
      percentile: Math.max(0, Math.min(100, percentile)),
    };
  });
}

/**
 * Computes the item discrimination index (D) between the top 27% and bottom 27% cohort:
 * D = (P_top - P_bottom)
 * Values > 0.30 indicate high discrimination (top scorers get it right).
 * Negative values indicate a defective or miskeyed question.
 */
export function calculateDiscriminationIndex(
  topGroupCorrect: number,
  topGroupTotal: number,
  bottomGroupCorrect: number,
  bottomGroupTotal: number
): number {
  if (topGroupTotal <= 0 || bottomGroupTotal <= 0) return 0;
  const pTop = topGroupCorrect / topGroupTotal;
  const pBottom = bottomGroupCorrect / bottomGroupTotal;
  const diff = pTop - pBottom;
  return Number(Math.max(-1, Math.min(1, diff)).toFixed(2));
}

/**
 * Flags defective questions based on discrimination index and pass rate.
 */
export function checkQuestionDefect(
  correctRate: number,
  discriminationIndex: number
): { isDefective: boolean; reason?: string } {
  if (discriminationIndex < 0) {
    return {
      isDefective: true,
      reason: 'Negative discrimination: high-scoring cohort missed this more than lower-scoring cohort (potential key error or misleading wording).',
    };
  }
  if (correctRate < 8) {
    return {
      isDefective: true,
      reason: 'Extremely low pass rate (<8%): question exceeds 8-second time budget or has ambiguous options.',
    };
  }
  return { isDefective: false };
}

/**
 * Validates a test paper for official publication:
 * Requires exactly 30 valid questions, 4 options each, valid correct index, tags.
 */
export function validateTestPaper(test: Partial<TestPaper>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!test.title || test.title.trim().length === 0) {
    errors.push('Test paper title is required.');
  }

  if (!test.questions || test.questions.length !== 30) {
    errors.push(`Official test must contain exactly 30 questions (found ${test.questions?.length ?? 0}).`);
  } else {
    test.questions.forEach((q, idx) => {
      const qNum = idx + 1;
      if (!q.text || q.text.trim().length === 0) {
        errors.push(`Question #${qNum}: Question text is empty.`);
      }
      if (!q.options || q.options.length !== 4) {
        errors.push(`Question #${qNum}: Must have exactly 4 options.`);
      } else {
        q.options.forEach((opt, optIdx) => {
          if (!opt || opt.trim().length === 0) {
            errors.push(`Question #${qNum}: Option ${String.fromCharCode(65 + optIdx)} is empty.`);
          }
        });
      }
      if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
        errors.push(`Question #${qNum}: Correct option index must be between 0 (A) and 3 (D).`);
      }
      if (!q.subject) {
        errors.push(`Question #${qNum}: Subject tag is missing.`);
      }
      if (!q.topic || q.topic.trim().length === 0) {
        errors.push(`Question #${qNum}: Topic tag is missing.`);
      }
      if (!q.difficulty) {
        errors.push(`Question #${qNum}: Difficulty level is missing.`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generates an immutable, system-assigned student ID.
 * Example: formatStudentId(123, 2026) -> "COC-2026-000123"
 */
export function formatStudentId(sequenceNumber: number, year = 2026): string {
  const padded = String(Math.max(1, sequenceNumber)).padStart(6, '0');
  return `COC-${year}-${padded}`;
}

export const INDIAN_STATES_AND_DISTRICTS: Record<string, string[]> = {
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada (NTR)', 'Guntur', 'Kurnool', 'Tirupati',
    'Nellore', 'Kakinada', 'Anantapur', 'Kadapa (YSR)', 'Rajahmundry', 'Chittoor'
  ],
  'Telangana': [
    'Hyderabad', 'Rangareddy', 'Medchal-Malkajgiri', 'Warangal', 'Karimnagar',
    'Nizamabad', 'Khammam', 'Nalgonda', 'Mahabubnagar', 'Suryapet'
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Prayagraj (Allahabad)', 'Varanasi', 'Kanpur', 'Agra',
    'Gorakhpur', 'Meerut', 'Noida (GB Nagar)', 'Bareilly', 'Jhansi'
  ],
  'Bihar': [
    'Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga',
    'Purnia', 'Begusarai', 'Nalanda', 'Samastipur', 'Arrah (Bhojpur)'
  ],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Kota', 'Ajmer', 'Udaipur', 'Bikaner', 'Alwar', 'Sikar'
  ],
  'Madhya Pradesh': [
    'Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Rewa'
  ],
  'Maharashtra': [
    'Mumbai City', 'Mumbai Suburban', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Chhatrapati Sambhajinagar', 'Solapur'
  ],
  'Delhi (NCT)': [
    'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'South Delhi', 'West Delhi'
  ],
  'Karnataka': [
    'Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi', 'Kalaburagi'
  ],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode'
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'North 24 Parganas', 'South 24 Parganas', 'Hooghly', 'Purba Medinipur', 'Siliguri'
  ],
  'Odisha': [
    'Bhubaneswar (Khurda)', 'Cuttack', 'Rourkela (Sundargarh)', 'Berhampur (Ganjam)', 'Sambalpur', 'Balasore'
  ],
  'Haryana': [
    'Gurugram', 'Faridabad', 'Hisar', 'Rohtak', 'Panipat', 'Ambala', 'Karnal'
  ],
  'Punjab': [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali (SAS Nagar)'
  ]
};
