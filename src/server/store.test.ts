import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildOrGetDailyExamForDate,
  getNextDayStudyPlanDay,
  getOrAssignDailyTopicForDate,
  getTodayStudyPlanDay,
  getTopicPoolAdminSnapshot,
  getTopicPoolStats,
  isActiveProviderKeyConfigured,
  isGroqKeyConfigured,
  loadStoreState,
  needsDailyAiGeneration,
  resetStoreMemoryForTests,
  resetTopicPoolCycle,
  saveStoreState,
  setDailyPaperGenerationMeta,
  updateAIConfig,
} from './store.ts';

const TEMP_STORE_FILE = path.join(
  os.tmpdir(),
  `coc-store-test-${process.pid}-${Date.now()}.json`
);
let prevStoreEnv: string | undefined;

test.before(() => {
  prevStoreEnv = process.env.AI_STORE_FILE_PATH;
  process.env.AI_STORE_FILE_PATH = TEMP_STORE_FILE;
  resetStoreMemoryForTests();
});

test.after(() => {
  resetStoreMemoryForTests();
  if (prevStoreEnv === undefined) {
    delete process.env.AI_STORE_FILE_PATH;
  } else {
    process.env.AI_STORE_FILE_PATH = prevStoreEnv;
  }
  if (fs.existsSync(TEMP_STORE_FILE)) {
    fs.unlinkSync(TEMP_STORE_FILE);
  }
});

test('updateAIConfig switches cleanly between Groq and Gemini providers with matching models', () => {
  const groqConfig = updateAIConfig({
    provider: 'groq',
    model: 'openai/gpt-oss-120b',
  });
  assert.equal(groqConfig.provider, 'groq');
  assert.equal(groqConfig.model, 'openai/gpt-oss-120b');

  // Switching provider without passing model auto-aligns model to provider default
  const geminiConfig = updateAIConfig({
    provider: 'gemini',
  });
  assert.equal(geminiConfig.provider, 'gemini');
  assert.equal(geminiConfig.model, 'gemini-3.8-flash');

  // Passing a Groq model auto-aligns provider back to 'groq'
  const backToGroq = updateAIConfig({
    model: 'qwen/qwen3.8-27b',
  });
  assert.equal(backToGroq.provider, 'groq');
  assert.equal(backToGroq.model, 'qwen/qwen3.8-27b');
});

test('isGroqKeyConfigured and isActiveProviderKeyConfigured reflect environment key presence safely', () => {
  const prevGroq = process.env.GROQ_API_KEY;
  try {
    process.env.GROQ_API_KEY = 'groq_test_example_key_1234567890';
    assert.equal(isGroqKeyConfigured(), true);
    assert.equal(isActiveProviderKeyConfigured('groq'), true);

    process.env.GROQ_API_KEY = 'MY_GROQ_API_KEY';
    assert.equal(isGroqKeyConfigured(), false);
    assert.equal(isActiveProviderKeyConfigured('groq'), false);
  } finally {
    if (prevGroq === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = prevGroq;
    }
  }
});

test('loadStoreState auto-migrates legacy Gemini default to Groq when GROQ_API_KEY is configured', () => {
  const prevGroq = process.env.GROQ_API_KEY;
  try {
    process.env.GROQ_API_KEY = 'groq_test_example_key_1234567890';
    fs.writeFileSync(
      TEMP_STORE_FILE,
      JSON.stringify({
        aiConfig: {
          provider: 'gemini',
          model: 'gemini-3.8-flash',
          updatedAt: '2026-11-12T04:49:18.630Z',
        },
      }),
      'utf8'
    );
    resetStoreMemoryForTests();
    const migrated = loadStoreState();
    assert.equal(migrated.aiConfig.provider, 'groq');
    assert.equal(migrated.aiConfig.model, 'openai/gpt-oss-120b');
  } finally {
    if (prevGroq === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = prevGroq;
    }
  }
});

test('500-topic non-repeating pool selects distinct unused topics across consecutive dates and distinct today/tomorrow', () => {
  if (fs.existsSync(TEMP_STORE_FILE)) {
    fs.unlinkSync(TEMP_STORE_FILE);
  }
  resetStoreMemoryForTests();

  const pickedKeys = new Set<string>();
  for (let i = 1; i <= 15; i++) {
    const iso = `2026-12-${String(i).padStart(2, '0')}`;
    const picked = getOrAssignDailyTopicForDate(iso);
    assert.ok(!pickedKeys.has(picked.dayKey), `Repeated topic ${picked.dayKey} on ${iso}`);
    pickedKeys.add(picked.dayKey);
    // Re-querying the same date must return the same locked topic
    assert.equal(getOrAssignDailyTopicForDate(iso).dayKey, picked.dayKey);
  }

  const stats = getTopicPoolStats();
  assert.equal(stats.totalTopics, 500);
  assert.equal(stats.usedCount + stats.remainingCount, 500);
  assert.ok(stats.usedCount >= 15);

  const nowMs = Date.parse('2026-11-20T06:00:00Z');
  const today = getTodayStudyPlanDay(nowMs);
  const tomorrow = getNextDayStudyPlanDay(nowMs);
  assert.notEqual(today.dayKey, tomorrow.dayKey);

  const paper = buildOrGetDailyExamForDate('2026-12-01');
  const day01Topic = getOrAssignDailyTopicForDate('2026-12-01');
  assert.ok(paper.description.includes(day01Topic.topic));
  assert.ok(paper.questions.length >= 10);

  const snapshot = getTopicPoolAdminSnapshot(nowMs);
  assert.equal(snapshot.todayTopic.dayKey, today.dayKey);
  assert.equal(snapshot.nextDayTopic.dayKey, tomorrow.dayKey);

  const afterReset = resetTopicPoolCycle(true);
  assert.ok(afterReset.stats.cycleCount >= 2);
  assert.ok(afterReset.stats.usedCount <= 2);
});

test('needsDailyAiGeneration detects fallback-only papers and prioritizes AI dailyMcqIds', () => {
  if (fs.existsSync(TEMP_STORE_FILE)) {
    fs.unlinkSync(TEMP_STORE_FILE);
  }
  resetStoreMemoryForTests();

  const prevGroq = process.env.GROQ_API_KEY;
  try {
    process.env.GROQ_API_KEY = 'groq_test_example_key_1234567890';
    const testDate = '2026-12-20';
    const topic = getOrAssignDailyTopicForDate(testDate);

    // Build fallback paper first (simulates pre-18:00 student load before AI runs)
    const fallbackPaper = buildOrGetDailyExamForDate(testDate);
    assert.ok(fallbackPaper.description.includes(topic.topic));

    // Even though dailyPapers[testDate] exists with topic in description, AI generation MUST still be needed
    let state = loadStoreState();
    assert.equal(needsDailyAiGeneration(state, testDate, topic, Date.now(), false), true);

    // Cooldown prevents tight retry loops within 3 minutes
    const attemptMs = Date.now();
    setDailyPaperGenerationMeta(testDate, {
      dayKey: topic.dayKey,
      topic: topic.topic,
      aiGeneratedCount: 0,
      targetCount: 30,
      status: 'failed',
      generatedAt: new Date(attemptMs).toISOString(),
      lastAttemptAt: new Date(attemptMs).toISOString(),
      autoApproved: true,
      lastError: 'Simulated transient timeout',
    });
    state = loadStoreState();
    assert.equal(needsDailyAiGeneration(state, testDate, topic, attemptMs + 30_000, false), false);
    // forceGenerate bypasses cooldown
    assert.equal(needsDailyAiGeneration(state, testDate, topic, attemptMs + 30_000, true), true);

    // Attach 30 approved AI MCQs and complete meta -> needsDailyAiGeneration becomes false & paper puts AI MCQs first
    const aiQuestions = Array.from({ length: 30 }, (_, i) => ({
      id: `ai_daily_test_${i}`,
      qIndex: i,
      text: `Unique AI Daily Exam Question ${i + 1} for ${topic.topic}?`,
      options: ['Alpha', 'Beta', 'Gamma', 'Delta'] as [string, string, string, string],
      correctIndex: 1,
      subject: topic.subject,
      topic: topic.topic,
      difficulty: 'medium' as const,
      explanation: `Detailed autonomous AI explanation ${i + 1}.`,
      examCategory: 'SSC' as const,
      sourceType: 'ai_generated' as const,
      referenceNote: 'AI-Generated Syllabus Practice (SSC)',
      reviewStatus: 'approved' as const,
      createdAt: new Date().toISOString(),
      approvedBy: 'ai-autonomous-scheduler',
    }));

    state.questionPool = [...aiQuestions, ...state.questionPool];
    state.syllabusOverrides[topic.dayKey] = {
      dayKey: topic.dayKey,
      dailyMcqIds: aiQuestions.map((q) => q.id),
      approvalStatus: 'approved',
      updatedAt: new Date().toISOString(),
    };
    saveStoreState(state);

    const rebuilt = buildOrGetDailyExamForDate(testDate, true);
    assert.equal(rebuilt.questions[0].id, 'ai_daily_test_0');
    assert.equal(rebuilt.questions[29].id, 'ai_daily_test_29');

    setDailyPaperGenerationMeta(testDate, {
      dayKey: topic.dayKey,
      topic: topic.topic,
      aiGeneratedCount: 30,
      targetCount: 30,
      status: 'complete',
      generatedAt: new Date().toISOString(),
      lastAttemptAt: new Date().toISOString(),
      autoApproved: true,
    });

    state = loadStoreState();
    assert.equal(needsDailyAiGeneration(state, testDate, topic, Date.now(), false), false);
  } finally {
    if (prevGroq === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = prevGroq;
  }
});

