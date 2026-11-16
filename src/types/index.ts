export type UserRole = 'student' | 'contentAdmin' | 'analyst' | 'superAdmin';

export type ExamTarget = 
  | 'SSC CGL / CHSL' 
  | 'Banking (IBPS / SBI PO & Clerk)' 
  | 'Railways (RRB NTPC / Group D)' 
  | 'State PSC (APPSC / TSPSC / UPPSC)' 
  | 'UPSC Civil Services' 
  | 'Police SI & Constable';

export type LanguageCode = 'en' | 'te' | 'hi';
export type DataSource = 'firestore' | 'mock' | 'local';

export interface UserAddress {
  local: string;
  district: string;
  state: string;
  country: string;
  stateCode?: string;
  districtCode?: string;
  otherStateText?: string;
  otherDistrictText?: string;
}

export type SkillTier = 'Bronze' | 'Silver' | 'Gold' | 'Grandmaster';
export type LeaderboardTimeframe = 'today' | 'weekly' | 'monthly' | 'all_time';

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
  referralCode?: string;
  referredBy?: string;
  skillTier?: SkillTier;
  badges?: string[];
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
  answerKeyReleaseTime: string; // "20:00" IST
  totalQuestions: number; // 30
  totalDurationSeconds: number; // 300
  questionDurationSeconds: number; // 10
  resultsPublishAt?: string; // "19:30" IST (default)
  status: TestStatus;
  questions: Question[];
  lockedForEditing: boolean;
  totalSubscribers: number;
  dataSource?: DataSource;
  isCustomScheduled?: boolean; // Flag for ad-hoc / admin-scheduled tests outside 7 PM
  scheduledDate?: string; // YYYY-MM-DD
  scheduledStartTime?: string; // e.g. "20:30"
  scheduledEndTime?: string; // e.g. "20:45"
  windowMinutes?: number;
  scheduledWindowMinutes?: number;
  category?: string;
  creatorEmail?: string;
  createdAt?: string;
  isSpeedPractice?: boolean;
}

export interface AttemptAnswer {
  questionId: string;
  questionIndex: number;
  selectedOptionIndex?: number | null; // 0..3 or null if skipped
  selectedOption?: number | null;
  timeSpentSeconds: number;
  submittedAt?: string;
  timestamp?: string;
  isCorrect?: boolean;
}

export interface Attempt {
  id?: string;
  attemptId?: string;
  testId: string;
  studentId: string;
  studentName: string;
  studentState: string;
  studentCity?: string;
  batch?: string;
  startedAt?: string;
  completedAt?: string;
  submittedAt?: string;
  answers: AttemptAnswer[];
  score: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  timeTakenSeconds?: number;
  totalTimeSeconds?: number;
  rank?: number;
  percentile?: number;
  isCustomTest?: boolean;
  customTestTitle?: string;
  integrityFlags?: {
    tabSwitches: number;
    focusLosses: number;
  };
  telemetry?: import('./exam').TelemetryReport;
  isDisqualified?: boolean;
  disqualificationReason?: string;
  skillTier?: SkillTier;
  xpEarned?: number;
  dataSource?: DataSource;
  isSeededBenchmark?: boolean;
}

export interface OverallProgressEntry {
  rank: number;
  studentId: string;
  studentName: string;
  studentState: string;
  studentCity?: string;
  batch?: string;
  totalMarks: number;
  accuracy: number;
  testsAttended: number;
  streakDays: number;
  dataSource: DataSource;
}

export * from './exam';
export * from './aiSystem';

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

export interface RollingDayPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Oct 24"
  accuracy: number;
  avgSpeedSec: number;
  score: number;
  testsCount: number;
}

export interface DiagnosticResponseItem {
  questionId: string;
  selectedOptionIndex: number | null;
  timeSpentSeconds: number;
  isCorrect: boolean;
  subject: SubjectTag;
}

export interface DiagnosticResult {
  completedAt: string;
  score: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  accuracy: number;
  avgTimePerQuestionSec: number;
  estimatedPercentile: number;
  estimatedRank: number;
  assignedTier: SkillTier;
  weakSubject?: SubjectTag;
  strengthSubject?: SubjectTag;
  responses: DiagnosticResponseItem[];
}

export interface SmartTriggerNotification {
  id: string;
  type: 'rank_drop' | 'streak_risk' | 'streak_freeze' | 'referral_unlock' | 'mistake_leak';
  title: string;
  message: string;
  actionLabel: string;
  targetTab: 'tests' | 'results' | 'progress' | 'practice' | 'profile';
  createdAt: string;
  read: boolean;
}

export interface StudentProgressStats {
  testsTaken: number;
  averageScore: number;
  highestScore: number;
  overallAccuracy: number;
  bestRank: number;
  currentStreak: number;
  longestStreak?: number;
  streakFreezesAvailable?: number;
  streakFreezesUsed?: number;
  lastActivityDate?: string;
  lastFreezeConsumedDate?: string;
  frozenDates?: string[];
  claimedMilestones?: number[];
  skillTier?: SkillTier;
  xpPoints?: number;
  proAnalyticsUnlocked?: boolean;
  referralsCount?: number;
  badges?: string[];
  diagnosticResult?: DiagnosticResult;
  rolling30DayHistory?: RollingDayPoint[];
  dailyGoalScore?: number;
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
    isoDate?: string;
    testTitle: string;
    score: number;
    peerAvgScore: number;
    rank: number;
    percentile: number;
    accuracy: number;
    avgSpeedSec?: number;
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

export interface PreviousYearPaper {
  id: string;
  title: string;
  examBoard: string;
  year: number;
  shiftLabel?: string;
  questions: Question[];
  totalQuestions: number;
  totalDurationSeconds: number;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface PublicLeaderboardEntry {
  id: string;
  studentId: string;
  studentName: string;
  studentState: string;
  studentCity?: string;
  batch?: string;
  testId: string;
  score: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  timeTakenSeconds: number;
  submittedAt: string;
  isDisqualified?: boolean;
  skillTier?: SkillTier;
}

export interface KeySheetDoc {
  examDate: string;
  releaseAt: string;
  questions: Question[];
  updatedAt?: string;
}

export interface DailyKeySheet {
  id: string;
  date: string;
  title: string;
  publishedAt: string;
  entries: Question[];
  unlockTime: string; // "20:00" IST
}


