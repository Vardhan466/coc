import type { TestPaper } from '../types/index.ts';
import { getCalendarDayDifference } from './gamification.ts';

/** Fixed UTC+05:30 offset for India Standard Time (Asia/Kolkata, zero DST). */
export const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

const MONTHS_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface ISTDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  isoDate: string;
  dateLabel: string;
  hhmm: string;
  secondsSinceMidnight: number;
}

export type DailyLeaderboardPhase = 'live_scoreboard' | 'official_locked';

export interface CustomTestWindowStatus {
  status: 'upcoming' | 'live' | 'concluded';
  secondsToStart: number;
  secondsToEnd: number;
}

/**
 * Returns deterministic India Standard Time (IST / UTC+05:30) wall-clock parts
 * for the given epoch timestamp (defaults to Date.now()).
 */
export function getISTNowParts(nowMs: number = Date.now()): ISTDateParts {
  const shifted = new Date(nowMs + IST_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const hour = shifted.getUTCHours();
  const minute = shifted.getUTCMinutes();
  const second = shifted.getUTCSeconds();

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const min = String(minute).padStart(2, '0');

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    isoDate: `${year}-${mm}-${dd}`,
    dateLabel: `${MONTHS_SHORT_EN[month - 1] || 'Jan'} ${day}`,
    hhmm: `${hh}:${min}`,
    secondsSinceMidnight: hour * 3600 + minute * 60 + second,
  };
}

export function getTodayIsoDateIST(nowMs: number = Date.now()): string {
  return getISTNowParts(nowMs).isoDate;
}

export function formatISTDateLabel(nowMs: number = Date.now()): string {
  return getISTNowParts(nowMs).dateLabel;
}

/**
 * Parses "HH:MM" or "HH:MM:SS" into seconds since midnight (0..86399).
 */
export function parseHHMMToSeconds(hhmm: string): number {
  if (!hhmm || typeof hhmm !== 'string') return 0;
  const segments = hhmm.trim().split(':').map((s) => Number(s));
  const h = Number.isFinite(segments[0]) ? Math.max(0, Math.min(23, Math.trunc(segments[0]))) : 0;
  const m = Number.isFinite(segments[1]) ? Math.max(0, Math.min(59, Math.trunc(segments[1]))) : 0;
  const s = Number.isFinite(segments[2]) ? Math.max(0, Math.min(59, Math.trunc(segments[2]))) : 0;
  return h * 3600 + m * 60 + s;
}

/**
 * Seconds remaining until target "HH:MM" IST on the same IST day. Returns 0 if reached or passed today.
 */
export function getSecondsUntilISTTime(targetHHMM: string, nowMs: number = Date.now()): number {
  const nowParts = getISTNowParts(nowMs);
  const targetSec = parseHHMMToSeconds(targetHHMM);
  return Math.max(0, targetSec - nowParts.secondsSinceMidnight);
}

export function isAfterISTTime(targetHHMM: string, nowMs: number = Date.now()): boolean {
  const nowParts = getISTNowParts(nowMs);
  return nowParts.secondsSinceMidnight >= parseHHMMToSeconds(targetHHMM);
}

export function getSecondsToIST7PM(nowMs: number = Date.now()): number {
  return getSecondsUntilISTTime('19:00', nowMs);
}

/**
 * Seconds until the next upcoming 7:00 PM (19:00:00) IST cutoff.
 * If before 19:00:00 IST today, returns seconds to today 19:00:00 IST.
 * If at or past 19:00:00 IST today, returns seconds to tomorrow 19:00:00 IST.
 */
export function getSecondsToNextIST7PM(nowMs: number = Date.now()): number {
  const nowParts = getISTNowParts(nowMs);
  const sevenPmSec = 19 * 3600;
  if (nowParts.secondsSinceMidnight < sevenPmSec) {
    return sevenPmSec - nowParts.secondsSinceMidnight;
  }
  return 86400 - nowParts.secondsSinceMidnight + sevenPmSec;
}

/**
 * Returns seconds from `nowMs` until tomorrow's 7:00 PM (19:00:00) IST.
 * Used when today's exam window is already completed or closed.
 */
export function getSecondsToTomorrowIST7PM(nowMs: number = Date.now()): number {
  const nowParts = getISTNowParts(nowMs);
  const sevenPmSec = 19 * 3600;
  return 86400 - nowParts.secondsSinceMidnight + sevenPmSec;
}

export const getSecondsToNextDate7PM = getSecondsToTomorrowIST7PM;

/**
 * True only when IST clock is inside [windowStart, windowEnd).
 */
export function isDailyExamWindowLive(
  windowStart = '19:00',
  windowEnd = '19:15',
  nowMs: number = Date.now()
): boolean {
  const sec = getISTNowParts(nowMs).secondsSinceMidnight;
  const startSec = parseHHMMToSeconds(windowStart);
  const endSec = parseHHMMToSeconds(windowEnd);
  return sec >= startSec && sec < endSec;
}

export function isPreExamLobbyIST(nowMs: number = Date.now()): boolean {
  const sec = getISTNowParts(nowMs).secondsSinceMidnight;
  return sec >= 18 * 3600 && sec < 19 * 3600;
}

/**
 * Daily Scoreboard Lifecycle:
 * - 19:00:00 – 19:24:59 IST: Live second-by-second scoreboard ticker
 * - 19:25:00 IST onward through next day 18:59:59 IST: Official locked rankings
 */
export function getDailyLeaderboardPhase(nowMs: number = Date.now()): DailyLeaderboardPhase {
  const sec = getISTNowParts(nowMs).secondsSinceMidnight;
  const liveStart = 19 * 3600;
  const officialLock = 19 * 3600 + 25 * 60;
  if (sec >= liveStart && sec < officialLock) {
    return 'live_scoreboard';
  }
  return 'official_locked';
}

/**
 * Returns the active daily exam cycle date in IST (YYYY-MM-DD):
 * From 19:00 IST onward it belongs to today's date; from 00:00–18:59 IST it carries
 * the previous IST evening's cycle until 19:00 IST rollover.
 */
export function getActiveDailyCycleDateIST(nowMs: number = Date.now()): string {
  const parts = getISTNowParts(nowMs);
  if (parts.secondsSinceMidnight >= 19 * 3600) {
    return parts.isoDate;
  }
  const yesterday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day - 1));
  return yesterday.toISOString().split('T')[0];
}

/**
 * Computes exact custom scheduled exam status strictly in IST, comparing both scheduledDate and time window.
 */
export function isCustomTestWindowActiveIST(
  test: Partial<Pick<TestPaper, 'scheduledDate' | 'date' | 'scheduledStartTime' | 'scheduledEndTime' | 'windowStart' | 'windowMinutes'>>,
  nowMs: number = Date.now()
): CustomTestWindowStatus {
  const nowParts = getISTNowParts(nowMs);
  const targetDate = test.scheduledDate || test.date || nowParts.isoDate;
  const startStr = test.scheduledStartTime || test.windowStart || '20:30';
  const startSec = parseHHMMToSeconds(startStr);
  const endSec = test.scheduledEndTime
    ? parseHHMMToSeconds(test.scheduledEndTime)
    : startSec + (test.windowMinutes || 30) * 60;

  const dayDiff = getCalendarDayDifference(nowParts.isoDate, targetDate);
  const startOffsetSec = dayDiff * 86400 + (startSec - nowParts.secondsSinceMidnight);
  const endOffsetSec = dayDiff * 86400 + (endSec - nowParts.secondsSinceMidnight);

  if (startOffsetSec > 0) {
    return {
      status: 'upcoming',
      secondsToStart: startOffsetSec,
      secondsToEnd: Math.max(0, endOffsetSec),
    };
  }
  if (endOffsetSec >= 0) {
    return {
      status: 'live',
      secondsToStart: 0,
      secondsToEnd: endOffsetSec,
    };
  }
  return {
    status: 'concluded',
    secondsToStart: 0,
    secondsToEnd: 0,
  };
}

export function formatCountdownHMS(totalSeconds: number): {
  hours: string;
  minutes: string;
  seconds: string;
  formatted: string;
} {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;

  const hours = String(h).padStart(2, '0');
  const minutes = String(m).padStart(2, '0');
  const seconds = String(s).padStart(2, '0');

  return {
    hours,
    minutes,
    seconds,
    formatted: `${hours}:${minutes}:${seconds}`,
  };
}
