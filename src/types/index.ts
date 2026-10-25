export type UserRole = 'student' | 'contentAdmin' | 'analyst' | 'superAdmin';

export type ExamTarget = 
  | 'SSC CGL / CHSL' 
  | 'Banking (IBPS / SBI PO & Clerk)' 
  | 'Railways (RRB NTPC / Group D)' 
  | 'State PSC (APPSC / TSPSC / UPPSC)' 
  | 'UPSC Civil Services' 
  | 'Police SI & Constable';

export type LanguageCode = 'en' | 'te' | 'hi';

export interface UserAddress {
  local: string;
  district: string;
  state: string;
  country: string;
}

export interface UserProfile {
  uid: string;
  studentId: string; // e.g. COC-2026-000123
  fullName: string;
  email: string;
  phone: string;
  address: UserAddress;
  examTarget: ExamTarget;
  language: LanguageCode;
  profileComplete: boolean;
  role: UserRole;
  createdAt: string;
  dpdpConsent: boolean;
  subscription: {
    isActive: boolean;
    plan: 'Pro Daily Pass' | 'Annual Elite';
    validUntil: string;
    consecutiveMissedDays: number;
  };
}

export type SubjectTag = 'Quantitative Aptitude' | 'Reasoning & Intelligence' | 'General Awareness' | 'English Comprehension';

export interface Question {
  id: string;
  qIndex: number;
  text: string;
  textTe?: string;
  textHi?: string;
  options: [string, string, string, string];
  optionsTe?: [string, string, string, string];
  optionsHi?: [string, string, string, string];
  correctIndex: number; // 0..3
  subject: SubjectTag;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
  explanationTe?: string;
  explanationHi?: string;
}

export type TestStatus = 'draft' | 'validated' | 'scheduled' | 'live' | 'closed' | 'results_published';

export interface TestPaper {
  id: string;
  testCode: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  windowStart: string; // "19:00" IST
  windowEnd: string; // "19:15" IST
  answerKeyReleaseTime: string; // "20:15" IST
  totalQuestions: number; // 40
  totalDurationSeconds: number; // 320
  questionDurationSeconds: number; // 8
  status: TestStatus;
  questions: Question[];
  lockedForEditing: boolean;
  totalSubscribers: number;
}

export interface AttemptAnswer {
  questionId: string;
  questionIndex: number;
  selectedOptionIndex: number | null; // 0..3 or null if skipped
  timeSpentSeconds: number;
  submittedAt: string;
  isCorrect?: boolean;
}

export interface Attempt {
  id: string;
  testId: string;
  studentId: string;
  studentName: string;
  studentState: string;
  startedAt: string;
  completedAt?: string;
  answers: AttemptAnswer[];
  score: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  timeTakenSeconds: number;
  rank?: number;
  percentile?: number;
  integrityFlags: {
    tabSwitches: number;
    focusLosses: number;
  };
}

export interface QuestionAnalytic {
  questionId: string;
  questionIndex: number;
  subject: SubjectTag;
  topic: string;
  correctRate: number; // 0 to 100%
  skipRate: number; // 0 to 100%
  avgTimeSec: number;
  optionDistribution: [number, number, number, number]; // % distribution across A, B, C, D
  discriminationIndex: number; // -1.0 to 1.0 (Top quartile % - Bottom quartile %)
  isDefective: boolean;
  defectReason?: string;
}

export interface ScoreHistogramBin {
  range: string;
  count: number;
  percentage: number;
}

export interface StateCount {
  state: string;
  count: number;
  avgScore: number;
}

export interface DailyAggregate {
  date: string;
  totalSubscribers: number;
  participants: number;
  participationRate: number; // e.g. 84.5%
  averageScore: number;
  highestScore: number;
  medianScore: number;
  scoreHistogram: ScoreHistogramBin[];
  stateBreakdown: StateCount[];
  atRiskStudentsCount: number;
}

export interface StudentProgressStats {
  testsTaken: number;
  averageScore: number;
  highestScore: number;
  overallAccuracy: number;
  bestRank: number;
  currentStreak: number;
  marksLostToNegatives: number;
  rapidMistakesCount: number; // questions answered in <2s that were wrong
  subjectPerformance: {
    subject: SubjectTag;
    totalQuestions: number;
    correct: number;
    accuracy: number;
    avgTimePerQuestion: number;
  }[];
  weakestTopics: {
    topic: string;
    subject: SubjectTag;
    accuracy: number;
    questionsEncountered: number;
    recommendedPracticeSlug: string;
  }[];
  recentAttempts: {
    testDate: string;
    testTitle: string;
    score: number;
    peerAvgScore: number;
    rank: number;
    percentile: number;
    accuracy: number;
  }[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminName: string;
  adminRole: UserRole;
  action: string;
  details: string;
}
