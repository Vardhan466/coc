import type { TestPaper } from '../types/index.ts';
import type { DailyPaperGenerationMeta, StudyPlanDay } from '../types/aiSystem.ts';
import { deduplicateQuestions } from '../utils/aiQuestionValidation.ts';
import { getTodayIsoDateIST, isAfterISTTime } from '../utils/istTime.ts';
import { generateAIMCQBatch } from './geminiService.ts';
import {
  buildOrGetDailyExamForDate,
  getApprovedDailyAiIdsForTopic,
  getOrAssignDailyTopicForDate,
  loadStoreState,
  needsDailyAiGeneration,
  saveStoreState,
  setDailyPaperGenerationMeta,
} from './store.ts';

const inFlightDailyGenerationDates = new Set<string>();

export function synchronizeDailyPaperStatus(istDate: string = getTodayIsoDateIST()): void {
  const state = loadStoreState();
  const cfg = state.scheduleConfig;
  const paper = state.dailyPapers[istDate];
  if (!paper) return;

  const todayIst = getTodayIsoDateIST();
  let nextStatus = paper.status;
  if (istDate < todayIst || isAfterISTTime(cfg.answerKeyReleaseTime)) {
    nextStatus = 'results_published';
  } else if (isAfterISTTime(cfg.examEndTime)) {
    nextStatus = 'closed';
  } else if (isAfterISTTime(cfg.examStartTime)) {
    nextStatus = 'live';
  } else {
    nextStatus = 'scheduled';
  }

  if (nextStatus !== paper.status) {
    paper.status = nextStatus;
    saveStoreState(state);
  }
}

export async function generateAndAttachDailyTopicMCQs(
  istDate: string = getTodayIsoDateIST(),
  forceGenerate = false
): Promise<{
  generatedCount: number;
  totalTopicAiCount: number;
  paper: TestPaper;
  topic: StudyPlanDay;
  meta: DailyPaperGenerationMeta | null;
}> {
  const assignedTopic = getOrAssignDailyTopicForDate(istDate);

  if (inFlightDailyGenerationDates.has(istDate)) {
    const existingPaper = buildOrGetDailyExamForDate(istDate, false);
    const state = loadStoreState();
    return {
      generatedCount: 0,
      totalTopicAiCount: getApprovedDailyAiIdsForTopic(state, assignedTopic).length,
      paper: existingPaper,
      topic: assignedTopic,
      meta: state.dailyPaperGenerationMeta?.[istDate] || null,
    };
  }

  inFlightDailyGenerationDates.add(istDate);

  try {
    const state = loadStoreState();
    const cfg = state.scheduleConfig;
    const desiredCount = Math.max(10, Math.min(50, cfg.totalQuestions || 30));
    const shouldGenerate = needsDailyAiGeneration(
      state,
      istDate,
      assignedTopic,
      Date.now(),
      forceGenerate
    );

    let totalGenerated = 0;
    let lastError: string | undefined;

    if (shouldGenerate) {
      const existingDailyIds = forceGenerate
        ? []
        : getApprovedDailyAiIdsForTopic(state, assignedTopic);
      const collectedIds: string[] = [...existingDailyIds];

      let remaining = Math.max(0, desiredCount - collectedIds.length);
      const batchSizes: number[] = [];
      while (remaining > 0) {
        const nextChunk = Math.min(10, remaining);
        batchSizes.push(nextChunk);
        remaining -= nextChunk;
      }

      for (const chunkCount of batchSizes) {
        try {
          const freshState = loadStoreState();
          const generated = await generateAIMCQBatch({
            count: chunkCount,
            examCategory: assignedTopic.recommendedExamCategories[0] || 'SSC',
            subject: assignedTopic.subject,
            topic: assignedTopic.topic,
            weekNumber: assignedTopic.weekNumber,
            dayNumber: assignedTopic.dayNumber,
            operation: 'generate_daily_exam',
            existingPool: freshState.questionPool,
          });

          if (generated.accepted.length > 0) {
            const nowIso = new Date().toISOString();
            const approvedBatch = generated.accepted.map((q) => ({
              ...q,
              reviewStatus: 'approved' as const,
              approvedAt: nowIso,
              approvedBy: 'ai-autonomous-scheduler',
            }));
            const deduped = deduplicateQuestions(approvedBatch, freshState.questionPool);
            if (deduped.unique.length > 0) {
              freshState.questionPool = [...deduped.unique, ...freshState.questionPool];
              deduped.unique.forEach((q) => collectedIds.push(q.id));
              totalGenerated += deduped.unique.length;
              saveStoreState(freshState);
            }
          }
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          console.warn('Automated AI daily MCQ batch paused:', lastError);
          break;
        }
      }

      const nowIso = new Date().toISOString();
      if (collectedIds.length > 0) {
        const latestState = loadStoreState();
        latestState.syllabusOverrides[assignedTopic.dayKey] = {
          ...(latestState.syllabusOverrides[assignedTopic.dayKey] || {
            dayKey: assignedTopic.dayKey,
          }),
          dayKey: assignedTopic.dayKey,
          approvalStatus: 'approved',
          dailyMcqIds: collectedIds,
          updatedAt: nowIso,
        };
        saveStoreState(latestState);
      }

      const status: DailyPaperGenerationMeta['status'] =
        collectedIds.length >= desiredCount
          ? 'complete'
          : collectedIds.length > 0
          ? 'partial'
          : 'failed';

      setDailyPaperGenerationMeta(istDate, {
        dayKey: assignedTopic.dayKey,
        topic: assignedTopic.topic,
        aiGeneratedCount: collectedIds.length,
        targetCount: desiredCount,
        status,
        generatedAt: nowIso,
        lastAttemptAt: nowIso,
        autoApproved: true,
        ...(lastError ? { lastError } : {}),
      });
    }

    const paper = buildOrGetDailyExamForDate(istDate, forceGenerate || totalGenerated > 0);
    synchronizeDailyPaperStatus(istDate);

    const updatedState = loadStoreState();
    const updatedTopic = getOrAssignDailyTopicForDate(istDate);
    return {
      generatedCount: totalGenerated,
      totalTopicAiCount: getApprovedDailyAiIdsForTopic(updatedState, updatedTopic).length,
      paper: updatedState.dailyPapers[istDate] || paper,
      topic: updatedTopic,
      meta: updatedState.dailyPaperGenerationMeta?.[istDate] || null,
    };
  } finally {
    inFlightDailyGenerationDates.delete(istDate);
  }
}
