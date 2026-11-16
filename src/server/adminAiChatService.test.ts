import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { processAdminAIChatCommand } from './adminAiChatService.ts';
import {
  getAdminRules,
  getScheduledTests,
  loadStoreState,
  resetStoreMemoryForTests,
} from './store.ts';

const TEMP_STORE_FILE = path.join(
  os.tmpdir(),
  `coc-admin-chat-test-${process.pid}-${Date.now()}.json`
);
let prevStoreEnv: string | undefined;
let prevGroqEnv: string | undefined;
let prevGeminiEnv: string | undefined;

test.before(() => {
  prevStoreEnv = process.env.AI_STORE_FILE_PATH;
  prevGroqEnv = process.env.GROQ_API_KEY;
  prevGeminiEnv = process.env.GEMINI_API_KEY;
  process.env.AI_STORE_FILE_PATH = TEMP_STORE_FILE;
  delete process.env.GROQ_API_KEY;
  delete process.env.GEMINI_API_KEY;
  resetStoreMemoryForTests();
});

test.after(() => {
  resetStoreMemoryForTests();
  if (prevStoreEnv === undefined) delete process.env.AI_STORE_FILE_PATH;
  else process.env.AI_STORE_FILE_PATH = prevStoreEnv;
  if (prevGroqEnv === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = prevGroqEnv;
  if (prevGeminiEnv === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = prevGeminiEnv;
  if (fs.existsSync(TEMP_STORE_FILE)) {
    fs.unlinkSync(TEMP_STORE_FILE);
  }
});

test('processAdminAIChatCommand: orders AI to schedule a custom test', async () => {
  const result = await processAdminAIChatCommand({
    message: 'Schedule a test on Time & Work tonight at 20:30 with 15 questions',
    adminEmail: 'ssuspect542@gmail.com',
  });

  assert.ok(result.reply.includes('Time & Work'));
  assert.equal(result.action?.type, 'schedule_test');
  assert.ok(result.action?.scheduledTest);
  assert.equal(result.action.scheduledTest.windowStart, '20:30');
  assert.equal(result.action.scheduledTest.totalQuestions, 15);
  assert.equal(result.action.scheduledTest.isCustomScheduled, true);

  const allScheduled = getScheduledTests();
  assert.ok(allScheduled.some((t) => t.id === result.action?.scheduledTest?.id));
});

test('processAdminAIChatCommand: orders AI to generate MCQs', async () => {
  const result = await processAdminAIChatCommand({
    message: 'Generate 10 questions on Algebra & Polynomials for SSC',
    adminEmail: 'ssuspect542@gmail.com',
  });

  assert.equal(result.action?.type, 'generate_mcqs');
  assert.ok(result.action?.generatedQuestions);
  assert.equal(result.action.generatedQuestions.length, 10);
  assert.ok(result.reply.includes('10 questions'));
});

test('processAdminAIChatCommand: orders AI to reschedule daily test', async () => {
  const result = await processAdminAIChatCommand({
    message: 'Reschedule daily test start time to 20:00',
    adminEmail: 'ssuspect542@gmail.com',
  });

  assert.equal(result.action?.type, 'update_schedule');
  assert.equal(result.action?.updatedSchedule?.examStartTime, '20:00');
  assert.equal(result.action?.updatedSchedule?.examEndTime, '20:15');

  const state = loadStoreState();
  assert.equal(state.scheduleConfig.examStartTime, '20:00');
});

test('processAdminAIChatCommand: orders AI to delete scheduled test', async () => {
  const sched = await processAdminAIChatCommand({
    message: 'Schedule a test on Percentages tonight at 21:00 with 10 questions',
    adminEmail: 'ssuspect542@gmail.com',
  });
  const testId = sched.action?.scheduledTest?.id;
  assert.ok(testId);

  const delResult = await processAdminAIChatCommand({
    message: `Delete scheduled test ${testId}`,
    adminEmail: 'ssuspect542@gmail.com',
  });

  assert.equal(delResult.action?.type, 'delete_scheduled_test');
  assert.equal(delResult.action?.deletedId, testId);

  const remaining = getScheduledTests();
  assert.ok(!remaining.some((t) => t.id === testId));
});

test('processAdminAIChatCommand: records, lists, and clears admin standing AI rules', async () => {
  const addRes = await processAdminAIChatCommand({
    message: 'Rule: Always emphasize 10-second mental calculation shortcuts',
    adminEmail: 'ssuspect542@gmail.com',
  });
  assert.equal(addRes.action?.title, 'Standing AI Rule Saved');
  assert.ok(getAdminRules().includes('Always emphasize 10-second mental calculation shortcuts'));

  const listRes = await processAdminAIChatCommand({
    message: 'Show rules',
    adminEmail: 'ssuspect542@gmail.com',
  });
  assert.ok(listRes.reply.includes('Always emphasize 10-second mental calculation shortcuts'));

  const clearRes = await processAdminAIChatCommand({
    message: 'Clear rules',
    adminEmail: 'ssuspect542@gmail.com',
  });
  assert.equal(clearRes.action?.title, 'AI Rules Cleared');
  assert.equal(getAdminRules().length, 0);
});

test('processAdminAIChatCommand: answers general command inquiry when no action requested', async () => {
  const result = await processAdminAIChatCommand({
    message: 'Hello what actions can you perform?',
    adminEmail: 'ssuspect542@gmail.com',
  });

  assert.ok(result.reply.length > 20);
  assert.ok(result.action?.type === 'general_query');
});

test('processAdminAIChatCommand: lists commands, toggles autonomous mode, edits today topic, and runs daily exam', async () => {
  const helpRes = await processAdminAIChatCommand({
    message: 'Commands',
    adminEmail: 'ssuspect542@gmail.com',
  });
  assert.equal(helpRes.action?.title, 'Autonomous AI Commands Guide');
  assert.ok(helpRes.reply.includes('Run daily test now'));
  assert.ok(helpRes.reply.includes("Edit today's topic"));

  const pauseRes = await processAdminAIChatCommand({
    message: 'Pause auto daily test',
    adminEmail: 'ssuspect542@gmail.com',
  });
  assert.equal(pauseRes.action?.title, 'Autonomous Daily AI Paused');
  assert.equal(loadStoreState().aiConfig.autoGenerateDailyExam, false);

  const enableRes = await processAdminAIChatCommand({
    message: 'Enable auto daily test without approval',
    adminEmail: 'ssuspect542@gmail.com',
  });
  assert.equal(enableRes.action?.title, 'Autonomous Daily AI Enabled');
  assert.equal(loadStoreState().aiConfig.autoGenerateDailyExam, true);

  const editTopicRes = await processAdminAIChatCommand({
    message: "Edit today's topic to Profit, Loss & Discount",
    adminEmail: 'ssuspect542@gmail.com',
  });
  assert.equal(editTopicRes.action?.type, 'update_daily_topic');
  assert.equal(editTopicRes.action?.assignedTopic?.topic, 'Profit, Loss & Discount');
  assert.equal(editTopicRes.action?.assignedTopic?.subject, 'Quantitative Aptitude');

  const runDailyRes = await processAdminAIChatCommand({
    message: 'Run daily test now',
    adminEmail: 'ssuspect542@gmail.com',
  });
  assert.equal(runDailyRes.action?.type, 'run_daily_exam');
  assert.ok(runDailyRes.action?.scheduledTest);
  assert.ok(runDailyRes.reply.includes('No Admin Approval Required'));
});

