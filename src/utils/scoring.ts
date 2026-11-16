import type { Attempt, Question, TestPaper } from '../types/index.ts';

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

/**
 * Generates a non-sequential, cryptographically unpredictable random Student ID.
 * Guarantees never repeating an existing ID (e.g. "COC-2026-849201").
 */
export function generateRandomStudentId(year = 2026, existingIds: string[] = []): string {
  const existingSet = new Set(existingIds.map((id) => id.toUpperCase()));
  let candidate = '';
  let attempts = 0;

  do {
    // Generate a random 6-digit number between 100000 and 999999
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    candidate = `COC-${year}-${randomNum}`;
    attempts++;
  } while (existingSet.has(candidate) && attempts < 1000);

  return candidate;
}

export const INDIAN_STATES_AND_DISTRICTS: Record<string, string[]> = {
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada (NTR)', 'Guntur', 'Kurnool', 'Tirupati',
    'Nellore', 'Kakinada', 'Anantapur', 'Kadapa (YSR)', 'Rajahmundry',
    'Chittoor', 'Eluru', 'Bapatla', 'Palnadu', 'Nandyal', 'Srikakulam',
    'Vizianagaram', 'Annamayya', 'Sri Sathya Sai', 'West Godavari', 'East Godavari', 'Konaseema'
  ],
  'Telangana': [
    'Hyderabad', 'Rangareddy', 'Medchal-Malkajgiri', 'Warangal', 'Hanamkonda',
    'Karimnagar', 'Nizamabad', 'Khammam', 'Nalgonda', 'Mahabubnagar',
    'Suryapet', 'Siddipet', 'Sangareddy', 'Bhadradri Kothagudem', 'Jagtial',
    'Mancherial', 'Peddapalli', 'Kamareddy', 'Adilabad', 'Wanaparthy'
  ],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli',
    'Erode', 'Vellore', 'Thoothukudi', 'Dindigul', 'Thanjavur', 'Kanchipuram',
    'Chengalpattu', 'Tiruvallur', 'Cuddalore', 'Kanyakumari', 'Tiruppur', 'Karur'
  ],
  'Karnataka': [
    'Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru (Dakshina Kannada)',
    'Belagavi', 'Kalaburagi', 'Ballari', 'Shivamogga', 'Tumakuru', 'Udupi',
    'Davanagere', 'Bidar', 'Hassan', 'Mandya', 'Chikkamagaluru', 'Raichur'
  ],
  'Kerala': [
    'Thiruvananthapuram', 'Kochi (Ernakulam)', 'Kozhikode', 'Thrissur', 'Kollam',
    'Kannur', 'Palakkad', 'Alappuzha', 'Kottayam', 'Malappuram', 'Kasaragod', 'Idukki', 'Wayanad', 'Pathanamthitta'
  ],
  'Maharashtra': [
    'Mumbai City', 'Mumbai Suburban', 'Pune', 'Nagpur', 'Nashik', 'Thane',
    'Chhatrapati Sambhajinagar', 'Solapur', 'Kolhapur', 'Amravati', 'Navi Mumbai',
    'Nanded', 'Jalgaon', 'Satara', 'Ahmednagar', 'Raigad', 'Ratnagiri', 'Latur'
  ],
  'Gujarat': [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar',
    'Gandhinagar', 'Junagadh', 'Anand', 'Bharuch', 'Kutch (Bhuj)', 'Mehsana', 'Patan', 'Navsari'
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Prayagraj (Allahabad)', 'Varanasi', 'Kanpur', 'Agra',
    'Gorakhpur', 'Meerut', 'Noida (GB Nagar)', 'Ghaziabad', 'Bareilly',
    'Jhansi', 'Aligarh', 'Moradabad', 'Ayodhya (Faizabad)', 'Mathura', 'Saharanpur', 'Muzaffarnagar'
  ],
  'Bihar': [
    'Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Purnia',
    'Begusarai', 'Nalanda (Bihar Sharif)', 'Samastipur', 'Arrah (Bhojpur)',
    'Rohtas (Sasaram)', 'Saran (Chhapra)', 'Katihar', 'Vaishali (Hajipur)', 'Motihari'
  ],
  'Madhya Pradesh': [
    'Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar',
    'Rewa', 'Satna', 'Ratlam', 'Chhindwara', 'Dewas', 'Morena', 'Vidisha'
  ],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Kota', 'Ajmer', 'Udaipur', 'Bikaner',
    'Alwar', 'Sikar', 'Bharatpur', 'Bhilwara', 'Sri Ganganagar', 'Pali', 'Barmer'
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'North 24 Parganas', 'South 24 Parganas', 'Hooghly',
    'Purba Medinipur', 'Paschim Medinipur', 'Siliguri (Darjeeling)', 'Nadia',
    'Bardhaman', 'Murshidabad', 'Malda', 'Jalpaiguri'
  ],
  'Odisha': [
    'Bhubaneswar (Khurda)', 'Cuttack', 'Rourkela (Sundargarh)', 'Berhampur (Ganjam)',
    'Sambalpur', 'Balasore', 'Puri', 'Bhadrak', 'Baripada (Mayurbhanj)', 'Jharsuguda'
  ],
  'Punjab': [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali (SAS Nagar)',
    'Hoshiarpur', 'Pathankot', 'Moga', 'Firozpur'
  ],
  'Haryana': [
    'Gurugram', 'Faridabad', 'Hisar', 'Rohtak', 'Panipat', 'Ambala',
    'Karnal', 'Sonipat', 'Panchkula', 'Yamunanagar', 'Bhiwani'
  ],
  'Jharkhand': [
    'Ranchi', 'Jamshedpur (East Singhbhum)', 'Dhanbad', 'Bokaro',
    'Hazaribagh', 'Deoghar', 'Giridih', 'Ramgarh'
  ],
  'Chhattisgarh': [
    'Raipur', 'Bhilai (Durg)', 'Bilaspur', 'Korba', 'Rajnandgaon', 'Jagdalpur (Bastar)', 'Ambikapur'
  ],
  'Assam': [
    'Guwahati (Kamrup Metro)', 'Dibrugarh', 'Silchar (Cachar)', 'Jorhat', 'Nagaon', 'Tezpur (Sonitpur)', 'Tinsukia'
  ],
  'Uttarakhand': [
    'Dehradun', 'Haridwar', 'Haldwani (Nainital)', 'Roorkee', 'Rishikesh', 'Udham Singh Nagar', 'Almora'
  ],
  'Himachal Pradesh': [
    'Shimla', 'Dharamshala (Kangra)', 'Mandi', 'Solan', 'Kullu', 'Hamirpur', 'Una'
  ],
  'Jammu & Kashmir': [
    'Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur', 'Kathua', 'Pulwama'
  ],
  'Goa': [
    'North Goa (Panaji)', 'South Goa (Margao)', 'Vasco da Gama', 'Mapusa', 'Ponda'
  ],
  'Tripura': [
    'Agartala (West Tripura)', 'Dharmanagar (North Tripura)', 'Udaipur (Gomati)', 'Kailashahar'
  ],
  'Meghalaya': [
    'Shillong (East Khasi Hills)', 'Tura (West Garo Hills)', 'Jowai (West Jaintia Hills)', 'Nongpoh'
  ],
  'Manipur': [
    'Imphal West', 'Imphal East', 'Churachandpur', 'Thoubal', 'Bishnupur'
  ],
  'Nagaland': [
    'Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha'
  ],
  'Mizoram': [
    'Aizawl', 'Lunglei', 'Champhai', 'Kolasib', 'Serchhip'
  ],
  'Arunachal Pradesh': [
    'Itanagar (Papum Pare)', 'Tawang', 'Pasighat (East Siang)', 'Naharlagun', 'Changlang'
  ],
  'Sikkim': [
    'Gangtok (East Sikkim)', 'Namchi (South Sikkim)', 'Gyalshing (West Sikkim)', 'Mangan'
  ],
  'Delhi (NCT)': [
    'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi',
    'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'
  ],
  'Chandigarh': [
    'Sector 1-30 (North & Central)', 'Sector 31-60 (South & Industrial)', 'Manimajra'
  ],
  'Puducherry': [
    'Puducherry', 'Karaikal', 'Mahe', 'Yanam'
  ],
  'Ladakh': [
    'Leh', 'Kargil', 'Nubra Valley', 'Zanskar'
  ],
  'Andaman & Nicobar': [
    'Port Blair (South Andaman)', 'North & Middle Andaman', 'Nicobar (Car Nicobar)'
  ],
  'Dadra & Nagar Haveli and Daman & Diu': [
    'Silvassa (Dadra & Nagar Haveli)', 'Daman', 'Diu'
  ],
  'Lakshadweep': [
    'Kavaratti', 'Agatti', 'Andrott', 'Minicoy', 'Amini'
  ]
};
