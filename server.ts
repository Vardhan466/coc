import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { AttemptAnswer, SubjectTag, TestPaper } from './src/types/index.ts';
import {
  EXAM_CATEGORIES,
  type AIModelOption,
  type AIProviderType,
  type ExamCategory,
  type LeaderboardVisibility,
} from './src/types/aiSystem.ts';
import {
  getISTNowParts,
  getTodayIsoDateIST,
  isAfterISTTime,
} from './src/utils/istTime.ts';
import {
  generate100WeekSyllabus,
  getStudyPlanWeek,
} from './src/utils/syllabus100Weeks.ts';
import {
  deduplicateQuestions,
  gradeSubmittedAnswers,
  stripAnswerKeysFromPaper,
  toSanitizedQuestion,
  validateMCQItem,
} from './src/utils/aiQuestionValidation.ts';
import {
  addScheduledTest,
  buildOrGetDailyExamForDate,
  deleteScheduledTest,
  getAIStatusSummary,
  getNextDayStudyPlanDay,
  getOrAssignDailyTopicForDate,
  getScheduledTests,
  getTodayStudyPlanDay,
  getTopicPoolAdminSnapshot,
  getTopicPoolStats,
  isActiveProviderKeyConfigured,
  loadStoreState,
  needsDailyAiGeneration,
  resetTopicPoolCycle,
  saveStoreState,
  updateAIConfig,
} from './src/server/store.ts';
import {
  generateAndAttachDailyTopicMCQs,
  synchronizeDailyPaperStatus,
} from './src/server/dailyExamRunner.ts';
import {
  generateAIMCQBatch,
  generateTopicRefinement,
  testAIConnectivity,
} from './src/server/geminiService.ts';
import { processAdminAIChatCommand } from './src/server/adminAiChatService.ts';

const SUPER_ADMIN_EMAIL = 'ssuspect542@gmail.com';

interface FirebaseConfigSubset {
  apiKey?: string;
  projectId?: string;
  firestoreDatabaseId?: string;
}

function readFirebaseConfig(): FirebaseConfigSubset {
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'firebase-applet-config.json'),
      'utf8'
    );
    return JSON.parse(raw) as FirebaseConfigSubset;
  } catch {
    return {};
  }
}

interface VerifiedFirebaseIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
}

async function verifyFirebaseIdToken(
  idToken: string
): Promise<VerifiedFirebaseIdentity | null> {
  const cfg = readFirebaseConfig();
  if (!cfg.apiKey) return null;

  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
        cfg.apiKey
      )}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      users?: Array<{
        localId?: string;
        email?: string;
        emailVerified?: boolean;
      }>;
    };
    const user = data.users?.[0];
    if (!user?.localId || !user.email) return null;
    return {
      uid: user.localId,
      email: user.email,
      emailVerified: user.emailVerified === true,
    };
  } catch {
    return null;
  }
}

async function checkAdminMembershipInFirestore(
  uid: string,
  idToken: string
): Promise<boolean> {
  const cfg = readFirebaseConfig();
  if (!cfg.projectId || !cfg.firestoreDatabaseId) return false;
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      cfg.projectId
    )}/databases/${encodeURIComponent(cfg.firestoreDatabaseId)}/documents/admins/${encodeURIComponent(
      uid
    )}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    return resp.ok;
  } catch {
    return false;
  }
}

interface AuthenticatedRequest extends Request {
  adminIdentity?: VerifiedFirebaseIdentity;
}

async function requireVerifiedAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match?.[1]) {
    res.status(401).json({
      error: 'Authentication required. Sign in with a verified administrator account.',
    });
    return;
  }

  const token = match[1].trim();
  const identity = await verifyFirebaseIdToken(token);
  if (!identity) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
    return;
  }

  if (!identity.emailVerified) {
    res.status(403).json({ error: 'Administrator email must be verified.' });
    return;
  }

  const isSuper = identity.email.toLowerCase() === SUPER_ADMIN_EMAIL;
  const isDelegatedAdmin = isSuper
    ? true
    : await checkAdminMembershipInFirestore(identity.uid, token);

  if (!isDelegatedAdmin) {
    res.status(403).json({
      error: 'Forbidden: Only authorized administrators can access AI and exam configuration endpoints.',
    });
    return;
  }

  req.adminIdentity = identity;
  next();
}

async function maybeGetVerifiedAdmin(req: Request): Promise<VerifiedFirebaseIdentity | null> {
  const authHeader = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match?.[1]) return null;
  const token = match[1].trim();
  const identity = await verifyFirebaseIdToken(token);
  if (!identity || !identity.emailVerified) return null;
  if (identity.email.toLowerCase() === SUPER_ADMIN_EMAIL) return identity;
  const isAdmin = await checkAdminMembershipInFirestore(identity.uid, token);
  return isAdmin ? identity : null;
}

async function runAutomatedDailySchedulerTick(): Promise<void> {
  const state = loadStoreState();
  const todayIst = getTodayIsoDateIST();
  const cfg = state.scheduleConfig;

  // Always ensure Today & Tomorrow both have non-repeating unused PDF topics selected cleanly
  const todayTopic = getTodayStudyPlanDay();
  getNextDayStudyPlanDay();

  // 1. Ensure daily exam exists & has full autonomous AI topic MCQs once generation window arrives
  //    (Runs even if a static fallback paper was already built earlier in the day, zero admin approval needed)
  if (isAfterISTTime(cfg.questionGenerationTime)) {
    const freshState = loadStoreState();
    if (needsDailyAiGeneration(freshState, todayIst, todayTopic)) {
      await generateAndAttachDailyTopicMCQs(todayIst, false);
    } else if (!freshState.dailyPapers[todayIst]) {
      buildOrGetDailyExamForDate(todayIst, false);
    }
  }

  // 2. Refresh daily QOTD at most once per IST day if autoGenerateQotd enabled
  const qotdState = loadStoreState();
  if (
    qotdState.questionOfTheDay.istDate !== todayIst &&
    qotdState.aiConfig.autoGenerateQotd &&
    isActiveProviderKeyConfigured()
  ) {
    try {
      const todayPlan = getTodayStudyPlanDay();
      const batch = await generateAIMCQBatch({
        count: 1,
        examCategory: todayPlan.recommendedExamCategories[0] || 'SSC',
        subject: todayPlan.subject,
        topic: todayPlan.topic,
        difficulty: 'medium',
        weekNumber: todayPlan.weekNumber,
        dayNumber: todayPlan.dayNumber,
        operation: 'generate_qotd',
        existingPool: qotdState.questionPool,
      });
      if (batch.accepted[0]) {
        const qotdItem = { ...batch.accepted[0], reviewStatus: 'approved' as const };
        qotdState.questionOfTheDay = {
          istDate: todayIst,
          question: qotdItem,
        };
        saveStoreState(qotdState);
      }
    } catch {
      // Keep default QOTD seamlessly
    }
  }

  // 3. Synchronize status transitions on today's paper automatically by IST window
  synchronizeDailyPaperStatus(todayIst);
}

async function createServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Ensure initial store state exists cleanly at boot
  loadStoreState();

  // Public Health Route
  app.get('/api/health', (_req, res) => {
    const ist = getISTNowParts();
    res.json({
      ok: true,
      timezone: 'Asia/Kolkata',
      istDate: ist.isoDate,
      istTime: ist.hhmm,
    });
  });

  // Public Schedule, Non-Secret Leaderboard Policy & Current Week/Day Syllabus
  app.get('/api/config/public', (_req, res) => {
    const state = loadStoreState();
    const ist = getISTNowParts();
    const todayTopic = getTodayStudyPlanDay();
    const nextDayTopic = getNextDayStudyPlanDay();
    const topicPoolStats = getTopicPoolStats();
    const keyReleased = isAfterISTTime(state.scheduleConfig.answerKeyReleaseTime);
    const todayPaper = state.dailyPapers[ist.isoDate];
    const todayGenerationMeta = state.dailyPaperGenerationMeta?.[ist.isoDate] || null;
    const todayPaperAiCount = todayPaper
      ? todayPaper.questions.filter((q: any) => q?.sourceType === 'ai_generated').length
      : 0;

    res.json({
      timezone: state.scheduleConfig.timezone,
      istDate: ist.isoDate,
      istTime: ist.hhmm,
      scheduleConfig: state.scheduleConfig,
      keyReleased,
      aiReady: isActiveProviderKeyConfigured(),
      aiProvider: state.aiConfig.provider,
      aiModel: state.aiConfig.model,
      autoGenerateDailyExam: state.aiConfig.autoGenerateDailyExam,
      todayPaperAiGenerated: todayPaperAiCount > 0 || (todayGenerationMeta?.aiGeneratedCount || 0) > 0,
      todayPaperAiCount,
      todayGenerationMeta,
      todayTopic,
      nextDayTopic,
      topicPoolStats,
    });
  });

  // Public Landing Page AI Question of the Day (No correctIndex or explanation leaked prematurely)
  app.get('/api/public/question-of-the-day', (_req, res) => {
    const state = loadStoreState();
    const q = state.questionOfTheDay.question;
    res.json({
      istDate: state.questionOfTheDay.istDate,
      question: toSanitizedQuestion(q),
    });
  });

  // Public QOTD Interactive Check (Returns correctness + explanation cleanly on user selection)
  app.post('/api/public/question-of-the-day/check', (req, res) => {
    const { selectedIndex } = req.body as { selectedIndex?: unknown };
    if (
      typeof selectedIndex !== 'number' ||
      !Number.isInteger(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex > 3
    ) {
      res.status(400).json({ error: 'selectedIndex must be 0, 1, 2, or 3.' });
      return;
    }

    const state = loadStoreState();
    const q = state.questionOfTheDay.question;
    res.json({
      isCorrect: selectedIndex === q.correctIndex,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      referenceNote: q.referenceNote || 'AI-Generated Syllabus Practice',
    });
  });

  // 100-Week Syllabus Read Endpoint
  app.get('/api/syllabus', (req, res) => {
    const state = loadStoreState();
    const weekParam = Number(req.query.week);
    const todayTopic = getTodayStudyPlanDay();

    if (Number.isInteger(weekParam) && weekParam >= 1 && weekParam <= 100) {
      res.json({
        weekNumber: weekParam,
        todayDayKey: todayTopic.dayKey,
        days: getStudyPlanWeek(weekParam, state.syllabusOverrides),
      });
      return;
    }

    const full = generate100WeekSyllabus(state.syllabusOverrides);
    res.json({
      totalWeeks: 100,
      totalDays: full.length,
      todayTopic,
      days: full,
    });
  });

  // Daily Exam Retrieval (Strictly Strips Answer Keys Until Scheduled IST Release Time)
  app.get('/api/daily-exam/current', (req, res) => {
    const requestedDate =
      typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
        ? req.query.date
        : getTodayIsoDateIST();
    const state = loadStoreState();
    const paper = buildOrGetDailyExamForDate(requestedDate);
    const todayIst = getTodayIsoDateIST();
    const isPastDate = requestedDate < todayIst;
    const isReleased = isPastDate || isAfterISTTime(paper.answerKeyReleaseTime || state.scheduleConfig.answerKeyReleaseTime);

    res.json(stripAnswerKeysFromPaper(paper, isReleased));
  });

  // Server-Side Exam Attempt Grading (Never Reveals Full Explanations Before Answer Key Release Time)
  app.post('/api/daily-exam/grade', (req, res) => {
    const { answers, examDate } = req.body as {
      answers?: AttemptAnswer[];
      examDate?: string;
    };

    if (!Array.isArray(answers)) {
      res.status(400).json({ error: 'answers array is required.' });
      return;
    }

    const targetDate =
      examDate && /^\d{4}-\d{2}-\d{2}$/.test(examDate) ? examDate : getTodayIsoDateIST();
    const state = loadStoreState();
    const paper = buildOrGetDailyExamForDate(targetDate);
    const isReleased =
      targetDate < getTodayIsoDateIST() ||
      isAfterISTTime(paper.answerKeyReleaseTime || state.scheduleConfig.answerKeyReleaseTime);

    const graded = gradeSubmittedAnswers(paper.questions, answers, isReleased);

    res.json({
      examDate: targetDate,
      keyReleased: isReleased,
      answerKeyReleaseTime: paper.answerKeyReleaseTime || state.scheduleConfig.answerKeyReleaseTime,
      score: graded.score,
      correctCount: graded.correctCount,
      incorrectCount: graded.incorrectCount,
      unattemptedCount: graded.unattemptedCount,
      gradedAnswers: graded.gradedAnswers,
    });
  });

  // Time-Gated Daily Answer Key Endpoint (403 Locked Until Release Time Unless Verified Admin)
  app.get('/api/daily-exam/key', async (req, res) => {
    const targetDate =
      typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
        ? req.query.date
        : getTodayIsoDateIST();

    const state = loadStoreState();
    const paper = buildOrGetDailyExamForDate(targetDate);
    const releaseHHMM =
      paper.answerKeyReleaseTime || state.scheduleConfig.answerKeyReleaseTime;
    const isReleased = targetDate < getTodayIsoDateIST() || isAfterISTTime(releaseHHMM);

    if (!isReleased) {
      const admin = await maybeGetVerifiedAdmin(req);
      if (!admin) {
        res.status(403).json({
          locked: true,
          releaseTimeIST: releaseHHMM,
          error: `Answer key vault is locked until ${releaseHHMM} IST to preserve All-India integrity.`,
        });
        return;
      }
    }

    res.json({
      locked: false,
      examDate: targetDate,
      title: paper.title,
      releaseTimeIST: releaseHHMM,
      questions: paper.questions,
    });
  });

  // Sanitized Question Bank for Speed Practice Interactive Drills (Never Leaks Pending/Rejected AI Items)
  app.get('/api/practice/questions', (req, res) => {
    const state = loadStoreState();
    const categoryFilter = typeof req.query.category === 'string' ? req.query.category : 'all';
    const subjectFilter = typeof req.query.subject === 'string' ? req.query.subject : 'all';
    const difficultyFilter = typeof req.query.difficulty === 'string' ? req.query.difficulty : 'all';

    let approved = state.questionPool.filter((q) => q.reviewStatus === 'approved');
    if (categoryFilter !== 'all') {
      approved = approved.filter((q) => q.examCategory === categoryFilter);
    }
    if (subjectFilter !== 'all') {
      approved = approved.filter((q) => q.subject === subjectFilter);
    }
    if (difficultyFilter !== 'all') {
      approved = approved.filter((q) => q.difficulty === difficultyFilter);
    }

    res.json({
      total: approved.length,
      questions: approved,
    });
  });

  // ===========================================================================
  // ADMIN-ONLY PROTECTED ENDPOINTS (Verified Firebase Identity + Email Check)
  // ===========================================================================

  app.get('/api/ai/status', requireVerifiedAdmin, (_req, res) => {
    const state = loadStoreState();
    res.json({
      status: getAIStatusSummary(),
      scheduleConfig: state.scheduleConfig,
      recentLogs: state.usageLogs.slice(0, 30),
    });
  });

  app.put('/api/ai/config', requireVerifiedAdmin, (req, res) => {
    const body = req.body as {
      provider?: AIProviderType;
      model?: AIModelOption;
      dailyRequestLimit?: number;
      perMinuteLimit?: number;
      retryAttempts?: number;
      autoGenerateDailyExam?: boolean;
      autoGenerateQotd?: boolean;
    };

    const updated = updateAIConfig(body);
    res.json({
      aiConfig: updated,
      status: getAIStatusSummary(),
    });
  });

  app.post('/api/ai/test', requireVerifiedAdmin, async (req, res) => {
    const body = (req.body || {}) as { model?: AIModelOption; provider?: AIProviderType };
    const result = await testAIConnectivity(body.model, body.provider);
    res.status(result.ok ? 200 : 400).json(result);
  });

  app.post('/api/ai/generate-mcqs', requireVerifiedAdmin, async (req, res) => {
    const {
      count = 5,
      examCategory = 'SSC',
      subject = 'Mixed',
      topic,
      difficulty = 'mixed',
      weekNumber,
      dayNumber,
    } = (req.body || {}) as {
      count?: number;
      examCategory?: ExamCategory;
      subject?: SubjectTag | 'Mixed';
      topic?: string;
      difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
      weekNumber?: number;
      dayNumber?: number;
    };

    if (!(EXAM_CATEGORIES as readonly string[]).includes(examCategory)) {
      res.status(400).json({ error: 'Unsupported examCategory requested.' });
      return;
    }

    try {
      const state = loadStoreState();
      const result = await generateAIMCQBatch({
        count,
        examCategory,
        subject,
        topic,
        difficulty,
        weekNumber,
        dayNumber,
        operation: 'generate_mcqs',
        existingPool: state.questionPool,
      });

      if (result.accepted.length > 0) {
        const deduped = deduplicateQuestions(result.accepted, state.questionPool);
        state.questionPool = [...deduped.unique, ...state.questionPool];
        saveStoreState(state);
      }

      res.json({
        generated: result.accepted,
        rejectedCount: result.rejectedCount,
        duplicateCount: result.duplicateCount,
        model: result.model,
        status: getAIStatusSummary(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(502).json({ error: message });
    }
  });

  app.post('/api/ai/generate-qotd', requireVerifiedAdmin, async (req, res) => {
    const { examCategory = 'Banking', subject = 'Mixed', topic } = (req.body || {}) as {
      examCategory?: ExamCategory;
      subject?: SubjectTag | 'Mixed';
      topic?: string;
    };

    try {
      const state = loadStoreState();
      const result = await generateAIMCQBatch({
        count: 1,
        examCategory,
        subject,
        topic,
        difficulty: 'medium',
        operation: 'generate_qotd',
        existingPool: [state.questionOfTheDay.question, ...state.questionPool],
      });

      if (!result.accepted[0]) {
        res.status(422).json({
          error: 'Generated question did not pass validation/deduplication rules. Please retry.',
        });
        return;
      }

      const todayIst = getTodayIsoDateIST();
      const qotdItem = {
        ...result.accepted[0],
        reviewStatus: 'approved' as const,
        approvedAt: new Date().toISOString(),
        approvedBy: (req as AuthenticatedRequest).adminIdentity?.email,
      };
      state.questionOfTheDay = {
        istDate: todayIst,
        question: qotdItem,
      };
      state.questionPool = [qotdItem, ...state.questionPool];
      saveStoreState(state);

      res.json({
        istDate: todayIst,
        question: qotdItem,
        status: getAIStatusSummary(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(502).json({ error: message });
    }
  });

  app.get('/api/ai/logs', requireVerifiedAdmin, (_req, res) => {
    const state = loadStoreState();
    res.json({ logs: state.usageLogs });
  });

  app.get('/api/admin/questions', requireVerifiedAdmin, (req, res) => {
    const state = loadStoreState();
    const status = typeof req.query.status === 'string' ? req.query.status : 'all';
    const items =
      status === 'all'
        ? state.questionPool
        : state.questionPool.filter((q) => q.reviewStatus === status);

    res.json({
      counts: {
        total: state.questionPool.length,
        pending: state.questionPool.filter((q) => q.reviewStatus === 'pending').length,
        approved: state.questionPool.filter((q) => q.reviewStatus === 'approved').length,
        rejected: state.questionPool.filter((q) => q.reviewStatus === 'rejected').length,
      },
      questions: items,
    });
  });

  app.put('/api/admin/questions/:id', requireVerifiedAdmin, (req, res) => {
    const state = loadStoreState();
    const qId = req.params.id;
    const idx = state.questionPool.findIndex((q) => q.id === qId);
    if (idx === -1) {
      res.status(404).json({ error: 'Question not found.' });
      return;
    }

    const patch = req.body as Partial<(typeof state.questionPool)[number]>;
    const updated = {
      ...state.questionPool[idx],
      ...(patch.text ? { text: String(patch.text).trim() } : {}),
      ...(Array.isArray(patch.options) && patch.options.length === 4
        ? { options: patch.options }
        : {}),
      ...(typeof patch.correctIndex === 'number' ? { correctIndex: patch.correctIndex } : {}),
      ...(patch.explanation ? { explanation: String(patch.explanation).trim() } : {}),
      ...(patch.subject ? { subject: patch.subject } : {}),
      ...(patch.topic ? { topic: String(patch.topic).trim() } : {}),
      ...(patch.difficulty ? { difficulty: patch.difficulty } : {}),
      ...(patch.examCategory ? { examCategory: patch.examCategory } : {}),
      ...(patch.reviewStatus ? { reviewStatus: patch.reviewStatus } : {}),
      approvedAt:
        patch.reviewStatus === 'approved'
          ? new Date().toISOString()
          : state.questionPool[idx].approvedAt,
      approvedBy:
        patch.reviewStatus === 'approved'
          ? (req as AuthenticatedRequest).adminIdentity?.email
          : state.questionPool[idx].approvedBy,
    };

    const validation = validateMCQItem(updated);
    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join(' ') });
      return;
    }

    state.questionPool[idx] = updated;
    saveStoreState(state);
    res.json({ question: updated });
  });

  app.delete('/api/admin/questions/:id', requireVerifiedAdmin, (req, res) => {
    const state = loadStoreState();
    const qId = req.params.id;
    const before = state.questionPool.length;
    state.questionPool = state.questionPool.filter((q) => q.id !== qId);
    if (state.questionPool.length === before) {
      res.status(404).json({ error: 'Question not found.' });
      return;
    }
    saveStoreState(state);
    res.json({ deleted: true, id: qId });
  });

  app.put('/api/admin/schedule', requireVerifiedAdmin, (req, res) => {
    const state = loadStoreState();
    const patch = (req.body || {}) as {
      questionGenerationTime?: string;
      examStartTime?: string;
      examEndTime?: string;
      answerKeyReleaseTime?: string;
      totalQuestions?: number;
      examDurationSeconds?: number;
      questionDurationSeconds?: number;
      cohortStartDate?: string;
      leaderboardVisibility?: LeaderboardVisibility;
    };

    const hhmmRegex = /^\d{2}:\d{2}$/;
    state.scheduleConfig = {
      ...state.scheduleConfig,
      ...(patch.questionGenerationTime && hhmmRegex.test(patch.questionGenerationTime)
        ? { questionGenerationTime: patch.questionGenerationTime }
        : {}),
      ...(patch.examStartTime && hhmmRegex.test(patch.examStartTime)
        ? { examStartTime: patch.examStartTime }
        : {}),
      ...(patch.examEndTime && hhmmRegex.test(patch.examEndTime)
        ? { examEndTime: patch.examEndTime }
        : {}),
      ...(patch.answerKeyReleaseTime && hhmmRegex.test(patch.answerKeyReleaseTime)
        ? { answerKeyReleaseTime: patch.answerKeyReleaseTime }
        : {}),
      ...(typeof patch.totalQuestions === 'number' &&
      patch.totalQuestions >= 10 &&
      patch.totalQuestions <= 50
        ? { totalQuestions: Math.round(patch.totalQuestions) }
        : {}),
      ...(typeof patch.examDurationSeconds === 'number' &&
      patch.examDurationSeconds >= 60 &&
      patch.examDurationSeconds <= 3600
        ? { examDurationSeconds: Math.round(patch.examDurationSeconds) }
        : {}),
      ...(typeof patch.questionDurationSeconds === 'number' &&
      patch.questionDurationSeconds >= 5 &&
      patch.questionDurationSeconds <= 120
        ? { questionDurationSeconds: Math.round(patch.questionDurationSeconds) }
        : {}),
      ...(patch.cohortStartDate && /^\d{4}-\d{2}-\d{2}$/.test(patch.cohortStartDate)
        ? { cohortStartDate: patch.cohortStartDate }
        : {}),
      ...(patch.leaderboardVisibility &&
      ['public', 'top_only', 'hidden_from_students'].includes(patch.leaderboardVisibility)
        ? { leaderboardVisibility: patch.leaderboardVisibility }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    saveStoreState(state);
    const todayIst = getTodayIsoDateIST();
    const rebuiltPaper = buildOrGetDailyExamForDate(todayIst, true);

    res.json({
      scheduleConfig: state.scheduleConfig,
      dailyExamSummary: {
        id: rebuiltPaper.id,
        totalQuestions: rebuiltPaper.totalQuestions,
        windowStart: rebuiltPaper.windowStart,
        windowEnd: rebuiltPaper.windowEnd,
        answerKeyReleaseTime: rebuiltPaper.answerKeyReleaseTime,
      },
    });
  });

  app.post('/api/admin/schedule/run-daily-job', requireVerifiedAdmin, async (_req, res) => {
    const todayIst = getTodayIsoDateIST();
    const { generatedCount, totalTopicAiCount, paper, topic, meta } =
      await generateAndAttachDailyTopicMCQs(todayIst, true);
    getNextDayStudyPlanDay();
    res.json({
      ok: true,
      istDate: todayIst,
      title: paper.title,
      totalQuestions: paper.totalQuestions,
      generatedCount,
      totalTopicAiCount,
      topic: topic.topic,
      status: paper.status,
      meta,
      overview: getTopicPoolAdminSnapshot(),
    });
  });

  // --- ADMIN 500-TOPIC POOL MANAGEMENT ENDPOINTS ---
  app.get('/api/admin/topics', requireVerifiedAdmin, (_req, res) => {
    res.json(getTopicPoolAdminSnapshot());
  });

  app.post('/api/admin/topics/select-random', requireVerifiedAdmin, async (req, res) => {
    const { target = 'today', dayKey, regeneratePaper = false } = (req.body || {}) as {
      target?: 'today' | 'tomorrow';
      dayKey?: string;
      regeneratePaper?: boolean;
    };
    const snapshotBefore = getTopicPoolAdminSnapshot();
    const targetIst = target === 'tomorrow' ? snapshotBefore.tomorrowIst : snapshotBefore.todayIst;

    const assignedTopic = getOrAssignDailyTopicForDate(targetIst, {
      forceReroll: !dayKey,
      targetDayKey: dayKey,
    });

    let generatedCount = 0;
    let paperTitle: string | undefined;
    if (target === 'today') {
      if (regeneratePaper) {
        const resGen = await generateAndAttachDailyTopicMCQs(targetIst, true);
        generatedCount = resGen.generatedCount;
        paperTitle = resGen.paper.title;
      } else {
        const rebuilt = buildOrGetDailyExamForDate(targetIst, true);
        paperTitle = rebuilt.title;
      }
    }

    res.json({
      overview: getTopicPoolAdminSnapshot(),
      assignedTopic,
      generatedCount,
      paperTitle,
    });
  });

  app.post('/api/admin/topics/reset-cycle', requireVerifiedAdmin, (req, res) => {
    const preserveActiveDates = req.body?.preserveActiveDates !== false;
    const overview = resetTopicPoolCycle(preserveActiveDates);
    res.json(overview);
  });

  // --- SCHEDULED TESTS ENDPOINTS ---
  app.get('/api/scheduled-tests', (_req, res) => {
    res.json({ scheduledTests: getScheduledTests() });
  });

  app.post('/api/admin/scheduled-tests', requireVerifiedAdmin, (req, res) => {
    const paper = req.body as TestPaper;
    if (!paper || !paper.title) {
      res.status(400).json({ error: 'Valid TestPaper object is required.' });
      return;
    }
    const saved = addScheduledTest({
      ...paper,
      id: paper.id || `sched_${Date.now()}`,
      isCustomScheduled: true,
      creatorEmail: (req as AuthenticatedRequest).adminIdentity?.email,
      createdAt: paper.createdAt || new Date().toISOString(),
    });
    res.json({ test: saved });
  });

  app.delete('/api/admin/scheduled-tests/:id', requireVerifiedAdmin, (req, res) => {
    const deleted = deleteScheduledTest(req.params.id);
    res.json({ deleted, id: req.params.id });
  });

  // --- ADMIN AI CHAT & COMMAND CONTROLLER ---
  app.post('/api/admin/ai-chat', requireVerifiedAdmin, async (req, res) => {
    const { message, history } = (req.body || {}) as {
      message?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'Message cannot be empty.' });
      return;
    }

    try {
      const result = await processAdminAIChatCommand({
        message,
        history,
        adminEmail: (req as AuthenticatedRequest).adminIdentity?.email,
      });
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(502).json({ error: msg });
    }
  });

  app.put('/api/admin/syllabus/:dayKey', requireVerifiedAdmin, (req, res) => {
    const state = loadStoreState();
    const { dayKey } = req.params;
    if (!/^W\d{3}_D[1-5]$/.test(dayKey)) {
      res.status(400).json({ error: 'Invalid dayKey format (expected W001_D1..W100_D5).' });
      return;
    }

    const patch = (req.body || {}) as {
      subject?: SubjectTag;
      topic?: string;
      topicDescription?: string;
      learningObjectives?: string[];
      approvalStatus?: 'approved' | 'pending_review' | 'rescheduled';
      scheduledDateOverride?: string;
    };

    state.syllabusOverrides[dayKey] = {
      ...(state.syllabusOverrides[dayKey] || { dayKey }),
      ...patch,
      dayKey,
      updatedAt: new Date().toISOString(),
    };

    saveStoreState(state);
    const updatedDay = generate100WeekSyllabus(state.syllabusOverrides).find(
      (d) => d.dayKey === dayKey
    );
    res.json({ day: updatedDay });
  });

  app.post('/api/admin/syllabus/:dayKey/regenerate', requireVerifiedAdmin, async (req, res) => {
    const state = loadStoreState();
    const { dayKey } = req.params;
    const allDays = generate100WeekSyllabus(state.syllabusOverrides);
    const targetDay = allDays.find((d) => d.dayKey === dayKey);
    if (!targetDay) {
      res.status(404).json({ error: 'Syllabus day not found.' });
      return;
    }

    try {
      const refined = await generateTopicRefinement(targetDay);
      state.syllabusOverrides[dayKey] = {
        ...(state.syllabusOverrides[dayKey] || { dayKey }),
        dayKey,
        topic: refined.topic,
        topicDescription: refined.topicDescription,
        learningObjectives: refined.learningObjectives,
        approvalStatus: 'approved',
        updatedAt: new Date().toISOString(),
      };
      saveStoreState(state);
      const updated = generate100WeekSyllabus(state.syllabusOverrides).find(
        (d) => d.dayKey === dayKey
      );
      res.json({ day: updated });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(502).json({ error: msg });
    }
  });

  // Unmatched /api/* routes return JSON 404 rather than HTML fallback
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Frontend Hosting (Vite dev middleware in dev, static dist in prod)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await import('vite');
    const viteServer = await vite.createServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } else {
    const distDir = path.join(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.use((_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Club Of Competition server active on http://0.0.0.0:${port}`);
  });

  // Background IST Automated Daily Scheduler loop (30-second check)
  void runAutomatedDailySchedulerTick();
  setInterval(() => {
    void runAutomatedDailySchedulerTick();
  }, 30_000);
}

void createServer();
