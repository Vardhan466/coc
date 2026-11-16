export type QuestionStatus =
  | 'NOT_VISITED'
  | 'NOT_ANSWERED'
  | 'ANSWERED'
  | 'MARKED_FOR_REVIEW'
  | 'ANSWERED_AND_MARKED_FOR_REVIEW';

export type ExamSubject = 'QUANTITATIVE_APTITUDE' | 'REASONING' | 'ENGLISH' | 'GENERAL_AWARENESS';

export interface Option {
  id: string;
  text: string; // Markdown or plain text with KaTeX formulas
  imageUri?: string;
}

export interface QuestionSchema {
  id: string;
  sectionId: string;
  subject: ExamSubject;
  topic: string;
  subtopic?: string;
  prompt: string; // Contains raw KaTeX syntax: e.g. "Solve for $x$: $x^2 + 5x + 6 = 0$"
  options: Option[];
  correctOptionId: string; // Obfuscated or omitted on client during live test
  positiveMarks: number;
  negativeMarks: number;
  explanation: string;
}

export interface SectionSchema {
  id: string;
  title: string;
  subject: ExamSubject;
  questionIds: string[];
  durationSeconds?: number; // Optional sectional timing rule (e.g. Banking exams)
  cutoffMarks?: number;
}

export interface ExamSchema {
  id: string;
  title: string;
  category: 'SSC' | 'BANKING' | 'RAILWAYS' | 'STATE_PSC';
  totalDurationSeconds: number;
  isSectionalTimer: boolean;
  sections: SectionSchema[];
  questions: Record<string, QuestionSchema>; // Map of questionId -> QuestionSchema
}

export interface QuestionUserAttempt {
  questionId: string;
  selectedOptionId: string | null;
  status: QuestionStatus;
  timeSpentMs: number;
  visitCount: number;
  lastVisitedTimestamp: number;
}

export interface ExamSessionState {
  examId: string;
  activeSectionId: string;
  activeQuestionId: string;
  timeRemainingSeconds: number;
  isSubmitted: boolean;
  attempts: Record<string, QuestionUserAttempt>;
  lastSavedAt?: number;
}

export interface TelemetryReport {
  examId: string;
  totalTimeSpentSeconds: number;
  speedVsAccuracy: {
    fastAndCorrect: number; // Answered < 15s and Correct
    slowAndCorrect: number; // Answered >= 15s and Correct
    fastAndWrong: number;   // Answered < 15s and Wrong
    slowAndWrong: number;   // Answered >= 15s and Wrong
  };
  trapQuestionsIdentified: string[]; // Questions where time spent was high (> 25s) and result was incorrect
  sectionWiseScore: Record<string, { score: number; accuracy: number; total: number; attempted: number; correct: number }>;
}
