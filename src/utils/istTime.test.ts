import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getISTNowParts,
  getTodayIsoDateIST,
  parseHHMMToSeconds,
  getSecondsUntilISTTime,
  isAfterISTTime,
  getSecondsToNextIST7PM,
  getSecondsToTomorrowIST7PM,
  isDailyExamWindowLive,
  isPreExamLobbyIST,
  getDailyLeaderboardPhase,
  getActiveDailyCycleDateIST,
  isCustomTestWindowActiveIST,
  formatCountdownHMS,
} from './istTime';

// Helper to construct UTC epoch ms corresponding to YYYY-MM-DD HH:MM:SS IST (UTC+05:30)
function istMs(year: number, month: number, day: number, hour: number, minute: number, second = 0): number {
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  return Date.UTC(year, month - 1, day, hour, minute, second) - istOffsetMs;
}

test('getISTNowParts handles UTC-to-IST midnight rollover accurately', () => {
  // 2026-04-10 19:00:00 UTC === 2026-04-11 00:30:00 IST
  const utcEvening = Date.UTC(2026, 3, 10, 19, 0, 0);
  const parts = getISTNowParts(utcEvening);
  assert.equal(parts.isoDate, '2026-04-11');
  assert.equal(parts.dateLabel, 'Apr 11');
  assert.equal(parts.hour, 0);
  assert.equal(parts.minute, 30);
  assert.equal(parts.hhmm, '00:30');
  assert.equal(getTodayIsoDateIST(utcEvening), '2026-04-11');
});

test('parseHHMMToSeconds and IST time comparisons handle boundaries', () => {
  assert.equal(parseHHMMToSeconds('19:00'), 19 * 3600);
  assert.equal(parseHHMMToSeconds('20:00:00'), 20 * 3600);

  const at195959 = istMs(2026, 4, 10, 19, 59, 59);
  const at200000 = istMs(2026, 4, 10, 20, 0, 0);

  assert.equal(isAfterISTTime('20:00', at195959), false);
  assert.equal(getSecondsUntilISTTime('20:00', at195959), 1);
  assert.equal(isAfterISTTime('20:00', at200000), true);
  assert.equal(getSecondsUntilISTTime('20:00', at200000), 0);
});

test('daily exam live window & pre-exam lobby follow strict IST schedule', () => {
  const at1759 = istMs(2026, 4, 10, 17, 59, 59);
  const at1830 = istMs(2026, 4, 10, 18, 30, 0);
  const at1900 = istMs(2026, 4, 10, 19, 0, 0);
  const at191459 = istMs(2026, 4, 10, 19, 14, 59);
  const at191500 = istMs(2026, 4, 10, 19, 15, 0);

  assert.equal(isPreExamLobbyIST(at1759), false);
  assert.equal(isPreExamLobbyIST(at1830), true);
  assert.equal(isPreExamLobbyIST(at1900), false);

  assert.equal(isDailyExamWindowLive('19:00', '19:15', at1830), false);
  assert.equal(isDailyExamWindowLive('19:00', '19:15', at1900), true);
  assert.equal(isDailyExamWindowLive('19:00', '19:15', at191459), true);
  assert.equal(isDailyExamWindowLive('19:00', '19:15', at191500), false);
});

test('getSecondsToNextIST7PM & getSecondsToTomorrowIST7PM countdown math', () => {
  const at185950 = istMs(2026, 4, 10, 18, 59, 50);
  const at193000 = istMs(2026, 4, 10, 19, 30, 0);

  assert.equal(getSecondsToNextIST7PM(at185950), 10);
  assert.equal(getSecondsToNextIST7PM(at193000), 23 * 3600 + 30 * 60);
  assert.equal(getSecondsToTomorrowIST7PM(at193000), 23 * 3600 + 30 * 60);
});

test('getDailyLeaderboardPhase & getActiveDailyCycleDateIST handle 19:00 -> 19:25 transitions', () => {
  const at1859 = istMs(2026, 4, 10, 18, 59, 0);
  const at1900 = istMs(2026, 4, 10, 19, 0, 0);
  const at192459 = istMs(2026, 4, 10, 19, 24, 59);
  const at192500 = istMs(2026, 4, 10, 19, 25, 0);

  assert.equal(getDailyLeaderboardPhase(at1859), 'official_locked');
  assert.equal(getDailyLeaderboardPhase(at1900), 'live_scoreboard');
  assert.equal(getDailyLeaderboardPhase(at192459), 'live_scoreboard');
  assert.equal(getDailyLeaderboardPhase(at192500), 'official_locked');

  // Cycle belongs to previous evening until 19:00 IST rollover
  assert.equal(getActiveDailyCycleDateIST(at1859), '2026-04-09');
  assert.equal(getActiveDailyCycleDateIST(at1900), '2026-04-10');
});

test('isCustomTestWindowActiveIST validates scheduled date + time range', () => {
  const testDef = {
    scheduledDate: '2026-04-10',
    scheduledStartTime: '20:30',
    scheduledEndTime: '21:00',
  };

  // Day before -> upcoming (> 24h)
  const dayBefore = istMs(2026, 4, 9, 20, 45, 0);
  const s1 = isCustomTestWindowActiveIST(testDef, dayBefore);
  assert.equal(s1.status, 'upcoming');
  assert.ok(s1.secondsToStart > 80000);

  // Same day before start -> upcoming
  const sameDayEarly = istMs(2026, 4, 10, 20, 20, 0);
  const s2 = isCustomTestWindowActiveIST(testDef, sameDayEarly);
  assert.equal(s2.status, 'upcoming');
  assert.equal(s2.secondsToStart, 600);

  // During window -> live
  const during = istMs(2026, 4, 10, 20, 45, 0);
  const s3 = isCustomTestWindowActiveIST(testDef, during);
  assert.equal(s3.status, 'live');
  assert.equal(s3.secondsToStart, 0);
  assert.equal(s3.secondsToEnd, 900);

  // After window -> concluded
  const after = istMs(2026, 4, 10, 21, 0, 1);
  const s4 = isCustomTestWindowActiveIST(testDef, after);
  assert.equal(s4.status, 'concluded');
});

test('formatCountdownHMS formats padded hours, minutes, seconds safely', () => {
  assert.deepEqual(formatCountdownHMS(3665), {
    hours: '01',
    minutes: '01',
    seconds: '05',
    formatted: '01:01:05',
  });
  assert.deepEqual(formatCountdownHMS(-10), {
    hours: '00',
    minutes: '00',
    seconds: '00',
    formatted: '00:00:00',
  });
});
