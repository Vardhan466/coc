import type {
  DailyExamScheduleConfig,
  NotificationEventItem,
  NotificationPreferences,
  NotificationTriggerId,
  StudyPlanDay,
} from '../types/aiSystem.ts';
import { getISTNowParts, getTodayIsoDateIST, parseHHMMToSeconds } from './istTime.ts';

export type SentNotificationLog = Record<string, string[]>; // key: istDate -> trigger IDs already dispatched

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: true,
  preExamMinutes: 10,
  notifyOnExamOpen: true,
  notifyOnKeyRelease: true,
  notifyOnDailyTopic: true,
  soundEnabled: true,
};

/**
 * Pure evaluator that checks whether any IST scheduled notification trigger should fire right now
 * without repeating any trigger already sent for the current IST date.
 */
export function evaluateDueNotifications(
  prefs: NotificationPreferences,
  schedule: DailyExamScheduleConfig,
  todayTopic?: StudyPlanDay | null,
  sentLog: SentNotificationLog = {},
  nowMs: number = Date.now()
): NotificationEventItem[] {
  if (!prefs.enabled) return [];

  const istDate = getTodayIsoDateIST(nowMs);
  const nowSeconds = getISTNowParts(nowMs).secondsSinceMidnight;
  const alreadySent = new Set<string>(sentLog[istDate] || []);
  const due: NotificationEventItem[] = [];

  const examStartSec = parseHHMMToSeconds(schedule.examStartTime);
  const examEndSec = parseHHMMToSeconds(schedule.examEndTime);
  const keyReleaseSec = parseHHMMToSeconds(schedule.answerKeyReleaseTime);
  const preExamStartSec = Math.max(0, examStartSec - prefs.preExamMinutes * 60);

  const pushIfNew = (
    id: NotificationTriggerId,
    title: string,
    body: string,
    targetTab: 'tests' | 'results' | 'practice'
  ) => {
    if (!alreadySent.has(id)) {
      due.push({ id, istDate, title, body, targetTab });
    }
  };

  // 1. Daily Study Topic morning readiness alert (anytime >= 06:00 IST before exam end)
  if (
    prefs.notifyOnDailyTopic &&
    todayTopic &&
    nowSeconds >= 6 * 3600 &&
    nowSeconds < examEndSec
  ) {
    pushIfNew(
      'daily_topic',
      'Daily Study Focus Ready',
      `Today's focus: ${todayTopic.topic} (${todayTopic.subject}). Launch a Speed Practice warmup now.`,
      'practice'
    );
  }

  // 2. Pre-Exam reminder window (e.g. 10m / 15m / 30m before examStartTime up to examStartTime)
  if (nowSeconds >= preExamStartSec && nowSeconds < examStartSec) {
    const minsLeft = Math.max(1, Math.ceil((examStartSec - nowSeconds) / 60));
    pushIfNew(
      'pre_exam',
      `Daily Mock Starts in ${minsLeft} Minute${minsLeft === 1 ? '' : 's'}`,
      `Prepare for ${schedule.totalQuestions} questions (${Math.round(
        schedule.examDurationSeconds / 60
      )} min CBT). Entry opens at ${schedule.examStartTime} IST.`,
      'tests'
    );
  }

  // 3. Exam Window LIVE alert
  if (
    prefs.notifyOnExamOpen &&
    nowSeconds >= examStartSec &&
    nowSeconds < examEndSec
  ) {
    pushIfNew(
      'exam_open',
      'Live Daily Exam Window Open Now',
      `The ${schedule.examStartTime}–${schedule.examEndTime} IST daily competition test is now live. Enter the exam hall before the gate locks.`,
      'tests'
    );
  }

  // 4. Official Answer Key Released alert (fires within first 2 hours after release time)
  if (
    prefs.notifyOnKeyRelease &&
    nowSeconds >= keyReleaseSec &&
    nowSeconds < Math.min(24 * 3600, keyReleaseSec + 2 * 3600)
  ) {
    pushIfNew(
      'key_released',
      'Official Answer Key & Explanations Unlocked',
      `Detailed explanations and solutions for today's exam are now available after ${schedule.answerKeyReleaseTime} IST.`,
      'results'
    );
  }

  return due;
}
