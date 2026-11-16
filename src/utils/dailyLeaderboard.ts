import { Attempt, PublicLeaderboardEntry, Question, SubjectTag } from '../types';
import { calculateScore, calculateTieBreakerRank } from './scoring';

export const TARGET_LEADERBOARD_COHORT_SIZE = 15;
const REAL_LEADERBOARD_STORAGE_PREFIX = 'coc_real_daily_lb_';

/**
 * Strips private user PII (email, phone, address, raw answers, telemetry)
 * before publishing an attempt to public daily leaderboards.
 */
export function toPublicLeaderboardEntry(attempt: Attempt): PublicLeaderboardEntry {
  const timeSec =
    typeof attempt.timeTakenSeconds === 'number'
      ? attempt.timeTakenSeconds
      : typeof attempt.totalTimeSeconds === 'number'
      ? attempt.totalTimeSeconds
      : 0;

  return {
    id: attempt.id || attempt.attemptId || `${attempt.testId}_${attempt.studentId}`,
    studentId: attempt.studentId,
    studentName: attempt.studentName,
    studentState: attempt.studentState || 'India',
    ...(attempt.studentCity ? { studentCity: attempt.studentCity } : {}),
    ...(attempt.batch ? { batch: attempt.batch } : {}),
    testId: attempt.testId,
    score: attempt.score,
    correctCount: attempt.correctCount,
    incorrectCount: attempt.incorrectCount,
    unattemptedCount: attempt.unattemptedCount,
    timeTakenSeconds: timeSec,
    submittedAt: attempt.submittedAt || attempt.completedAt || new Date().toISOString(),
    ...(attempt.isDisqualified ? { isDisqualified: true } : {}),
    ...(attempt.skillTier ? { skillTier: attempt.skillTier } : {}),
  };
}

/**
 * Merges incoming live leaderboard attempts with existing rows (one canonical entry per studentId),
 * updating any prior score and re-computing deterministic tie-breaker rankings.
 */
export function mergeLiveLeaderboardAttempts(existing: Attempt[], incoming: Attempt[]): Attempt[] {
  const byStudent = new Map<string, Attempt>();

  for (const att of existing) {
    if (att.studentId) {
      byStudent.set(att.studentId, att);
    }
  }

  for (const att of incoming) {
    if (att.studentId) {
      const prev = byStudent.get(att.studentId);
      if (!prev) {
        byStudent.set(att.studentId, att);
      } else {
        const prevTs = Date.parse(prev.submittedAt || prev.completedAt || '') || 0;
        const nextTs = Date.parse(att.submittedAt || att.completedAt || '') || 0;
        if (nextTs >= prevTs) {
          byStudent.set(att.studentId, { ...prev, ...att });
        }
      }
    }
  }

  return calculateTieBreakerRank(Array.from(byStudent.values()));
}

function hashSeedString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createMulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED_FIRST_NAMES = [
  'Aarav', 'Aditi', 'Akhil', 'Ananya', 'Arjun', 'Bhavana', 'Chaitanya', 'Deepika',
  'Devansh', 'Divya', 'Eshwar', 'Farhan', 'Gayathri', 'Harish', 'Ishita', 'Jayanth',
  'Kavya', 'Kiran', 'Lakshmi', 'Madhav', 'Manasa', 'Nikhil', 'Nandini', 'Pranav',
  'Pooja', 'Raghav', 'Reshma', 'Rohan', 'Saanvi', 'Sai', 'Shruti', 'Siddharth',
  'Sneha', 'Tarun', 'Tejaswi', 'Uday', 'Vaishnavi', 'Varun', 'Vidya', 'Yashwanth',
];

const SEED_LAST_NAMES = [
  'Agarwal', 'Bhat', 'Choudhary', 'Deshmukh', 'Gandhi', 'Gowda', 'Gupta', 'Iyer',
  'Joshi', 'Kulkarni', 'Menon', 'Mishra', 'Naidu', 'Nair', 'Patel', 'Pillai',
  'Rao', 'Reddy', 'Saxena', 'Sen', 'Sharma', 'Shukla', 'Singh', 'Subramanian',
  'Tiwari', 'Trivedi', 'Varma', 'Verma', 'Yadav', 'Kamble', 'Das', 'Prasad',
];

const SEED_LOCATIONS: Array<{ city: string; state: string }> = [
  { city: 'Guntur', state: 'Andhra Pradesh' },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { city: 'Vijayawada', state: 'Andhra Pradesh' },
  { city: 'Hyderabad', state: 'Telangana' },
  { city: 'Warangal', state: 'Telangana' },
  { city: 'Bengaluru Urban', state: 'Karnataka' },
  { city: 'Mysuru', state: 'Karnataka' },
  { city: 'Chennai', state: 'Tamil Nadu' },
  { city: 'Coimbatore', state: 'Tamil Nadu' },
  { city: 'Pune', state: 'Maharashtra' },
  { city: 'Nagpur', state: 'Maharashtra' },
  { city: 'New Delhi', state: 'Delhi (NCT)' },
  { city: 'Lucknow', state: 'Uttar Pradesh' },
  { city: 'Prayagraj', state: 'Uttar Pradesh' },
  { city: 'Jaipur', state: 'Rajasthan' },
  { city: 'Ahmedabad', state: 'Gujarat' },
  { city: 'Kolkata', state: 'West Bengal' },
  { city: 'Patna', state: 'Bihar' },
  { city: 'Bhubaneswar', state: 'Odisha' },
  { city: 'Kochi', state: 'Kerala' },
  { city: 'Indore', state: 'Madhya Pradesh' },
  { city: 'Chandigarh', state: 'Chandigarh' },
];

const SEED_BATCHES = [
  'Morning Prelims Alpha',
  'Evening Super 100',
  'National Merit Cohort',
];

const RESERVED_STUDENT_IDS = new Set([
  'COC-2026-000123',
  'COC-2026-000615',
]);

/**
 * Generates deterministic daily-rotated seeded benchmark entries keyed by IST calendar date.
 * Different dates yield different candidate names, Student IDs, cities, and score distributions
 * so the leaderboard never freezes on the same static names every day.
 */
export function generateDailySeededLeaderboardAttempts(
  examDate: string,
  count: number = TARGET_LEADERBOARD_COHORT_SIZE
): Attempt[] {
  if (count <= 0) return [];
  const rand = createMulberry32(hashSeedString(`coc-daily-cohort:${examDate}`));

  // Pick a non-repeating index walk for names & locations
  const usedNames = new Set<string>();
  const usedIds = new Set<string>(RESERVED_STUDENT_IDS);
  const year = examDate.slice(0, 4) || '2026';
  const generated: Attempt[] = [];

  for (let i = 0; i < count; i++) {
    let fullName = '';
    for (let guard = 0; guard < 50; guard++) {
      const first = SEED_FIRST_NAMES[Math.floor(rand() * SEED_FIRST_NAMES.length)];
      const last = SEED_LAST_NAMES[Math.floor(rand() * SEED_LAST_NAMES.length)];
      const candidate = `${first} ${last}`;
      if (!usedNames.has(candidate)) {
        fullName = candidate;
        usedNames.add(candidate);
        break;
      }
    }
    if (!fullName) {
      fullName = `Candidate ${i + 1}`;
    }

    let studentId = '';
    for (let guard = 0; guard < 50; guard++) {
      const code = Math.floor(100000 + rand() * 899999);
      const candidateId = `COC-${year}-${code}`;
      if (!usedIds.has(candidateId)) {
        studentId = candidateId;
        usedIds.add(candidateId);
        break;
      }
    }
    if (!studentId) {
      studentId = `COC-${year}-${910000 + i}`;
    }

    const loc = SEED_LOCATIONS[Math.floor(rand() * SEED_LOCATIONS.length)];
    const batch = SEED_BATCHES[Math.floor(rand() * SEED_BATCHES.length)];

    // Spread cohort smoothly across Bronze, Silver, Gold & lower-Grandmaster bands (~12.00 to ~25.00)
    const bandRatio = 1 - i / Math.max(1, count - 1);
    const jitter = (rand() - 0.5) * 2.2;
    const targetCorrect = Math.max(12, Math.min(25, Math.round(13 + bandRatio * 11 + jitter)));
    const maxIncorrect = Math.max(0, 30 - targetCorrect);
    const incorrectCount = Math.min(maxIncorrect, Math.floor(rand() * 6));
    const unattemptedCount = Math.max(0, 30 - targetCorrect - incorrectCount);
    const score = calculateScore(targetCorrect, incorrectCount);
    const timeTakenSeconds = Math.max(115, Math.min(298, Math.round(150 + (1 - bandRatio) * 115 + (rand() - 0.5) * 35)));

    generated.push({
      id: `seed-${examDate}-${studentId}`,
      studentId,
      studentName: fullName,
      studentState: loc.state,
      studentCity: loc.city,
      batch,
      testId: `test-${examDate}`,
      score,
      correctCount: targetCorrect,
      incorrectCount,
      unattemptedCount,
      timeTakenSeconds,
      submittedAt: `${examDate}T13:${String(30 + (i % 25)).padStart(2, '0')}:00.000Z`,
      answers: [],
      isSeededBenchmark: true,
    });
  }

  return calculateTieBreakerRank(generated);
}

/**
 * Builds today's live leaderboard prioritizing real user attempts:
 * - Real attempts are ranked strictly by earned marks via calculateTieBreakerRank.
 * - Seeded daily benchmark accounts only backfill open slots up to `targetSize`.
 * - Once `realAttempts.length >= targetSize`, zero seeded accounts appear (100% real cohort).
 */
export function buildDynamicDailyLeaderboard(
  realAttempts: Attempt[],
  examDate: string,
  targetSize: number = TARGET_LEADERBOARD_COHORT_SIZE
): Attempt[] {
  const realByStudent = new Map<string, Attempt>();
  const usedNames = new Set<string>();

  for (const att of realAttempts) {
    if (!att || att.isSeededBenchmark || !att.studentId) continue;
    const prev = realByStudent.get(att.studentId);
    const cleanAttempt: Attempt = { ...att, isSeededBenchmark: false };
    if (!prev) {
      realByStudent.set(att.studentId, cleanAttempt);
    } else {
      const prevTs = Date.parse(prev.submittedAt || prev.completedAt || '') || 0;
      const nextTs = Date.parse(cleanAttempt.submittedAt || cleanAttempt.completedAt || '') || 0;
      if (nextTs >= prevTs) {
        realByStudent.set(att.studentId, { ...prev, ...cleanAttempt });
      }
    }
  }

  const dedupedReal = Array.from(realByStudent.values());
  dedupedReal.forEach((a) => {
    if (a.studentName) usedNames.add(a.studentName.trim().toLowerCase());
  });

  const remainingSlots = Math.max(0, targetSize - dedupedReal.length);
  if (remainingSlots === 0) {
    return calculateTieBreakerRank(dedupedReal);
  }

  const candidateFillers = generateDailySeededLeaderboardAttempts(
    examDate,
    targetSize + dedupedReal.length + 5
  );
  const selectedFillers: Attempt[] = [];
  for (const filler of candidateFillers) {
    if (selectedFillers.length >= remainingSlots) break;
    if (realByStudent.has(filler.studentId)) continue;
    if (usedNames.has(filler.studentName.trim().toLowerCase())) continue;
    selectedFillers.push(filler);
  }

  return calculateTieBreakerRank([...dedupedReal, ...selectedFillers]);
}

export function loadLocalRealLeaderboardAttempts(examDate: string): Attempt[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${REAL_LEADERBOARD_STORAGE_PREFIX}${examDate}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Attempt => Boolean(item && item.studentId && !item.isSeededBenchmark))
      .map((item) => ({ ...item, isSeededBenchmark: false }));
  } catch {
    return [];
  }
}

export function saveLocalRealLeaderboardAttempt(examDate: string, attempt: Attempt): Attempt[] {
  const existing = loadLocalRealLeaderboardAttempts(examDate);
  const clean: Attempt = { ...attempt, isSeededBenchmark: false };
  const byStudent = new Map<string, Attempt>();

  for (const row of existing) {
    if (row.studentId) byStudent.set(row.studentId, row);
  }
  if (clean.studentId) {
    const prev = byStudent.get(clean.studentId);
    byStudent.set(clean.studentId, prev ? { ...prev, ...clean } : clean);
  }

  const updated = calculateTieBreakerRank(Array.from(byStudent.values()));
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`${REAL_LEADERBOARD_STORAGE_PREFIX}${examDate}`, JSON.stringify(updated));
    } catch {
      // Ignore quota errors
    }
  }
  return updated;
}

function normalizeStem(text: string): string {
  return (text || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Selects up to `targetCount` strictly deduplicated questions matching `subject`
 * across `primaryPool` and `secondaryPool` (deduped by both ID and question stem).
 * Never repeats a question to pad length.
 */
export function buildUniqueMockQuestions(
  subject: SubjectTag | 'all',
  targetCount: number,
  primaryPool: Question[],
  secondaryPool: Question[] = []
): Question[] {
  const seenIds = new Set<string>();
  const seenStems = new Set<string>();
  const result: Question[] = [];

  const collect = (pool: Question[]) => {
    for (const q of pool) {
      if (result.length >= targetCount) break;
      if (subject !== 'all' && q.subject !== subject) continue;
      const normStem = normalizeStem(q.text);
      if (seenIds.has(q.id) || (normStem && seenStems.has(normStem))) continue;

      seenIds.add(q.id);
      if (normStem) seenStems.add(normStem);
      result.push({ ...q, qIndex: result.length });
    }
  };

  collect(primaryPool);
  collect(secondaryPool);

  return result;
}
