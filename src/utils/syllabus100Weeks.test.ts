import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOTAL_SYLLABUS_TOPICS,
  findStudyPlanDayByKey,
  formatDayKey,
  generate100WeekSyllabus,
  getDifficultyDistributionForWeek,
  getPhaseLabelForWeek,
  getStudyPlanWeek,
  resolveCurrentStudyDay,
  shiftIsoDate,
} from './syllabus100Weeks.ts';
import { getTopicFormulaSlides } from './topicCheatCodes.ts';

test('generate100WeekSyllabus builds exact 100 weeks x 5 days (500 PDF topics)', () => {
  const full = generate100WeekSyllabus();
  assert.equal(TOTAL_SYLLABUS_TOPICS, 500);
  assert.equal(full.length, 500);
  assert.equal(full[0].weekNumber, 1);
  assert.equal(full[0].dayNumber, 1);
  assert.equal(full[0].dayKey, 'W001_D1');
  assert.equal(full[0].topic, 'Types of Numbers');
  assert.equal(full[499].weekNumber, 100);
  assert.equal(full[499].dayNumber, 5);
  assert.equal(full[499].dayKey, 'W100_D5');
  assert.equal(full[499].topic, 'Famous Personalities');

  const keys = new Set(full.map((d) => d.dayKey));
  assert.equal(keys.size, 500);
});

test('every week has 5 study days and follows exact PDF phase distribution (W1-35 Quant, W36-60 Reasoning, W61-73 English, W74-100 GA)', () => {
  const full = generate100WeekSyllabus();
  const phase1 = full.filter((d) => d.weekNumber <= 35);
  const phase2 = full.filter((d) => d.weekNumber >= 36 && d.weekNumber <= 60);
  const phase3 = full.filter((d) => d.weekNumber >= 61 && d.weekNumber <= 73);
  const phase4 = full.filter((d) => d.weekNumber >= 74);

  assert.equal(phase1.length, 175);
  assert.equal(phase2.length, 125);
  assert.equal(phase3.length, 65);
  assert.equal(phase4.length, 135);
  assert.ok(phase1.every((d) => d.subject === 'Quantitative Aptitude'));
  assert.ok(phase2.every((d) => d.subject === 'Reasoning & Intelligence'));
  assert.ok(phase3.every((d) => d.subject === 'English Comprehension'));
  assert.ok(phase4.every((d) => d.subject === 'General Awareness'));

  assert.match(getPhaseLabelForWeek(1), /Quantitative/i);
  assert.match(getPhaseLabelForWeek(40), /Reasoning/i);
  assert.match(getPhaseLabelForWeek(65), /English/i);
  assert.match(getPhaseLabelForWeek(85), /General Awareness/i);

  for (const w of [1, 25, 50, 75, 100]) {
    const week = getStudyPlanWeek(w);
    assert.equal(week.length, 5);
    for (let i = 0; i < 5; i++) {
      assert.equal(week[i].dayNumber, i + 1);
      assert.equal(week[i].dayType, 'study');
      assert.ok(week[i].topic.length > 0);
      assert.ok(week[i].learningObjectives.length >= 2);
    }
  }
});

test('difficulty progression shifts from Foundation (Week 1) to Mastery (Week 100)', () => {
  const early = getDifficultyDistributionForWeek(1);
  const late = getDifficultyDistributionForWeek(95);
  assert.equal(early.easy + early.medium + early.hard, 100);
  assert.equal(late.easy + late.medium + late.hard, 100);
  assert.ok(early.easy > late.easy);
  assert.ok(late.hard > early.hard);
});

test('resolveCurrentStudyDay wraps across 500 topics and honors overrides, shiftIsoDate, and findStudyPlanDayByKey', () => {
  const start = '2026-10-01';
  const day1Ms = Date.parse('2026-10-01T06:30:00Z');
  const day5Ms = Date.parse('2026-10-05T06:30:00Z');
  const day6Ms = Date.parse('2026-10-06T06:30:00Z');

  assert.equal(resolveCurrentStudyDay(start, day1Ms).dayKey, 'W001_D1');
  assert.equal(resolveCurrentStudyDay(start, day5Ms).dayKey, 'W001_D5');
  assert.equal(resolveCurrentStudyDay(start, day6Ms).dayKey, 'W002_D1');
  assert.equal(shiftIsoDate('2026-10-31', 1), '2026-11-01');
  assert.equal(findStudyPlanDayByKey('W036_D1')?.subject, 'Reasoning & Intelligence');

  const key = formatDayKey(1, 1);
  const overridden = resolveCurrentStudyDay(start, day1Ms, {
    [key]: {
      dayKey: key,
      topic: 'Custom Admin Topic: RBI Policy Tools',
      approvalStatus: 'rescheduled',
      updatedAt: '2026-10-01T01:00:00Z',
    },
  });
  assert.equal(overridden.topic, 'Custom Admin Topic: RBI Policy Tools');
  assert.equal(overridden.approvalStatus, 'rescheduled');
});

test('getTopicFormulaSlides maps all 500 PDF topics to specialized cheat-code decks', () => {
  const full = generate100WeekSyllabus();
  const genericFallbacks = full.filter((day) => getTopicFormulaSlides(day).topicKey.startsWith('generic_'));
  assert.equal(
    genericFallbacks.length,
    0,
    `Expected zero generic fallbacks, got: ${genericFallbacks.map((d) => `${d.dayKey}:${d.topic}`).join(', ')}`
  );
});
