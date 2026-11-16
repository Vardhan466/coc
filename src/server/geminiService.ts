import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { SubjectTag } from '../types/index.ts';
import {
  EXAM_CATEGORIES,
  type AIMCQQuestion,
  type AIModelOption,
  type AIProviderType,
  type ExamCategory,
  type StudyPlanDay,
} from '../types/aiSystem.ts';
import {
  deduplicateQuestions,
  validateMCQItem,
} from '../utils/aiQuestionValidation.ts';
import {
  appendUsageLog,
  checkAndReserveRateLimit,
  isActiveProviderKeyConfigured,
  isGeminiKeyConfigured,
  isGroqKeyConfigured,
  loadStoreState,
} from './store.ts';

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

function isGeminiModel(model: string): boolean {
  return model.startsWith('gemini-');
}

function resolveProviderAndModel(
  requestedModel?: AIModelOption,
  requestedProvider?: AIProviderType
): { provider: AIProviderType; model: AIModelOption } {
  const state = loadStoreState();
  const model = requestedModel || state.aiConfig.model;
  let provider: AIProviderType = requestedProvider || state.aiConfig.provider;

  if (requestedModel) {
    provider = isGeminiModel(requestedModel) ? 'gemini' : 'groq';
  }

  // Fallback if chosen provider lacks a key while the alternate provider has one
  if (provider === 'gemini' && !isGeminiKeyConfigured() && isGroqKeyConfigured()) {
    return {
      provider: 'groq',
      model: isGeminiModel(model) ? 'openai/gpt-oss-120b' : model,
    };
  }
  if (provider === 'groq' && !isGroqKeyConfigured() && isGeminiKeyConfigured()) {
    return {
      provider: 'gemini',
      model: isGeminiModel(model) ? model : 'gemini-3.8-flash',
    };
  }

  // Keep model aligned with provider
  if (provider === 'groq' && isGeminiModel(model)) {
    return { provider: 'groq', model: 'openai/gpt-oss-120b' };
  }
  if (provider === 'gemini' && !isGeminiModel(model)) {
    return { provider: 'gemini', model: 'gemini-3.8-flash' };
  }

  return { provider, model };
}

function getGroqApiKey(): string {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey || apiKey === 'MY_GROQ_API_KEY') {
    throw new Error('GROQ_API_KEY is not configured in server environment.');
  }
  return apiKey;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured in server environment Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate_limit') ||
    msg.includes('temporarily') ||
    msg.includes('timeout') ||
    msg.includes('network')
  );
}

async function withRetries<T>(
  operation: () => Promise<T>,
  maxRetries: number
): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt <= maxRetries) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries || !isTransientError(err)) {
        throw err;
      }
      const backoffMs = 800 * Math.pow(2, attempt);
      await waitMs(backoffMs);
      attempt += 1;
    }
  }
  throw lastError;
}

async function callGroqChatCompletion(params: {
  model: string;
  systemInstruction?: string;
  userPrompt: string;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = getGroqApiKey();
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (params.systemInstruction) {
    messages.push({ role: 'system', content: params.systemInstruction });
  }
  messages.push({ role: 'user', content: params.userPrompt });

  const body: Record<string, unknown> = {
    model: params.model,
    messages,
    temperature: params.temperature ?? 0.35,
    max_tokens: params.maxTokens ?? 4096,
  };
  if (params.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const resp = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Groq API error (${resp.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq API returned empty completion content.');
  }
  return content.trim();
}

export async function callActiveAIChatCompletion(params: {
  systemInstruction: string;
  prompt: string;
  requestedModel?: AIModelOption;
}): Promise<{ text: string; provider: AIProviderType; model: AIModelOption }> {
  const state = loadStoreState();
  const { provider, model } = resolveProviderAndModel(params.requestedModel);

  if (provider === 'groq') {
    const text = await withRetries(
      () =>
        callGroqChatCompletion({
          model,
          systemInstruction: params.systemInstruction,
          userPrompt: params.prompt,
          temperature: 0.4,
          maxTokens: 2048,
        }),
      state.aiConfig.retryAttempts
    );
    return { text, provider, model };
  }

  const ai = getGeminiClient();
  const res = await withRetries(
    () =>
      ai.models.generateContent({
        model,
        contents: params.prompt,
        config: {
          systemInstruction: params.systemInstruction,
        },
      }),
    state.aiConfig.retryAttempts
  );

  return {
    text: (res.text || '').trim(),
    provider,
    model,
  };
}

export async function testAIConnectivity(
  requestedModel?: AIModelOption,
  requestedProvider?: AIProviderType
): Promise<{
  ok: boolean;
  provider: AIProviderType;
  model: string;
  latencyMs: number;
  message: string;
}> {
  const { provider, model } = resolveProviderAndModel(requestedModel, requestedProvider);

  if (!isActiveProviderKeyConfigured(provider)) {
    return {
      ok: false,
      provider,
      model,
      latencyMs: 0,
      message:
        provider === 'groq'
          ? 'Server GROQ_API_KEY secret is not configured.'
          : 'Server GEMINI_API_KEY secret is not configured. Configure it in Settings > Secrets.',
    };
  }

  const limitCheck = checkAndReserveRateLimit();
  if (!limitCheck.allowed) {
    return {
      ok: false,
      provider,
      model,
      latencyMs: 0,
      message: limitCheck.reason || 'Rate limit reached.',
    };
  }

  const state = loadStoreState();
  const startedAt = Date.now();

  try {
    let text = '';
    if (provider === 'groq') {
      text = await withRetries(
        () =>
          callGroqChatCompletion({
            model,
            userPrompt: 'Reply with only the word CONNECTED.',
            temperature: 0,
            maxTokens: 512,
          }),
        state.aiConfig.retryAttempts
      );
    } else {
      const ai = getGeminiClient();
      const res = await withRetries(
        () =>
          ai.models.generateContent({
            model,
            contents: 'Reply with only the word CONNECTED.',
            config:
              model === 'gemini-3.8-flash'
                ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
                : undefined,
          }),
        state.aiConfig.retryAttempts
      );
      text = (res.text || '').trim();
    }

    const latencyMs = Date.now() - startedAt;
    appendUsageLog({
      operation: 'connectivity_test',
      model: `${provider}:${model}`,
      status: 'success',
      latencyMs,
      itemsGenerated: 0,
      message: `Verified (${text || 'OK'})`,
    });

    return {
      ok: true,
      provider,
      model,
      latencyMs,
      message: `Connected cleanly to ${provider.toUpperCase()} (${model}) in ${latencyMs}ms.`,
    };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const msg = err instanceof Error ? err.message : String(err);
    appendUsageLog({
      operation: 'connectivity_test',
      model: `${provider}:${model}`,
      status: msg.includes('429') ? 'rate_limited' : 'error',
      latencyMs,
      itemsGenerated: 0,
      message: msg.slice(0, 200),
    });

    return {
      ok: false,
      provider,
      model,
      latencyMs,
      message: msg,
    };
  }
}

export async function testGeminiConnectivity(
  requestedModel?: AIModelOption,
  requestedProvider?: AIProviderType
) {
  return testAIConnectivity(requestedModel, requestedProvider);
}

interface RawGeneratedMCQ {
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  subject: SubjectTag;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  examCategory: ExamCategory;
  referenceNote?: string;
}

function extractQuestionsArrayFromResponse(rawJson: string): RawGeneratedMCQ[] {
  const cleaned = rawJson
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const firstObj = cleaned.indexOf('{');
    const lastObj = cleaned.lastIndexOf('}');
    const firstArr = cleaned.indexOf('[');
    const lastArr = cleaned.lastIndexOf(']');
    if (firstObj >= 0 && lastObj > firstObj) {
      parsed = JSON.parse(cleaned.slice(firstObj, lastObj + 1));
    } else if (firstArr >= 0 && lastArr > firstArr) {
      parsed = JSON.parse(cleaned.slice(firstArr, lastArr + 1));
    } else {
      throw new Error('AI response did not contain valid JSON question payload.');
    }
  }

  if (Array.isArray(parsed)) {
    return parsed as RawGeneratedMCQ[];
  }
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.questions)) return obj.questions as RawGeneratedMCQ[];
    if (Array.isArray(obj.mcqs)) return obj.mcqs as RawGeneratedMCQ[];
    if (Array.isArray(obj.items)) return obj.items as RawGeneratedMCQ[];
  }
  return [];
}

export async function generateAIMCQBatch(params: {
  count: number;
  examCategory: ExamCategory;
  subject?: SubjectTag | 'Mixed';
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  weekNumber?: number;
  dayNumber?: number;
  operation?: 'generate_mcqs' | 'generate_qotd' | 'generate_daily_exam';
  existingPool?: { id: string; text: string }[];
}): Promise<{
  accepted: AIMCQQuestion[];
  rejectedCount: number;
  duplicateCount: number;
  model: string;
}> {
  const state = loadStoreState();
  const { provider, model } = resolveProviderAndModel();

  if (!isActiveProviderKeyConfigured(provider)) {
    throw new Error(
      'Server AI API key is not configured. Using curated question bank instead.'
    );
  }

  const limitCheck = checkAndReserveRateLimit();
  if (!limitCheck.allowed) {
    appendUsageLog({
      operation: params.operation || 'generate_mcqs',
      model: `${provider}:${model}`,
      status: 'rate_limited',
      latencyMs: 0,
      itemsGenerated: 0,
      message: limitCheck.reason,
    });
    throw new Error(limitCheck.reason);
  }

  const safeCount = Math.max(1, Math.min(15, Math.round(params.count)));
  const subjectHint =
    !params.subject || params.subject === 'Mixed'
      ? 'balanced across Quantitative Aptitude, Reasoning & Intelligence, General Awareness, and English Comprehension'
      : params.subject;
  const difficultyHint =
    !params.difficulty || params.difficulty === 'mixed'
      ? 'balanced mix of easy, medium, and hard'
      : params.difficulty;
  const topicHint = params.topic
    ? `Primary Topic Focus: "${params.topic}".`
    : 'Standard high-yield exam syllabus topics.';

  const adminRules = Array.isArray(state.adminRules) ? state.adminRules : [];
  const rulesBlock =
    adminRules.length > 0
      ? [
          '',
          'MANDATORY ADMINISTRATOR RULES (MUST FOLLOW STRICTLY):',
          ...adminRules.map((r, i) => `${i + 1}. ${r}`),
        ]
      : [];

  const systemInstruction = [
    'You are a senior Indian Government Competitive Examination question paper setter.',
    'Generate original, unambiguous, syllabus-authentic multiple-choice questions matching official exam difficulty and 10-second speed-solving standards.',
    'Supported subjects ONLY: "Quantitative Aptitude", "Reasoning & Intelligence", "General Awareness", "English Comprehension".',
    `Supported examCategory values ONLY: ${EXAM_CATEGORIES.join(', ')}.`,
    'CRITICAL INTEGRITY RULES:',
    '1. Do NOT invent or claim any fake official previous-year exam citation (never say "Official SSC 2023 Shift 2 PYQ"). Set referenceNote strictly to a syllabus attribution like "AI-Generated Syllabus Practice (SSC)".',
    '2. Provide exactly 4 distinct options in English.',
    '3. Verify mathematical computations and factual keys carefully before setting correctIndex (0-3 integer).',
    '4. Use standard inline LaTeX wrapped in single $...$ only where equations benefit (e.g. $x^2 + 1/x^2$).',
    '5. Provide a crisp, clear explanation proving why correctIndex is right.',
    ...rulesBlock,
  ].join('\n');

  const promptText = `Generate ${safeCount} original government competitive exam MCQ(s) targeting exam category "${params.examCategory}". Subject: ${subjectHint}. ${topicHint} Difficulty: ${difficultyHint}. Do NOT repeat any of these existing question stems: ${(
    params.existingPool || []
  )
    .slice(0, 12)
    .map((q) => q.text.slice(0, 80))
    .join(' | ')}`;

  const startedAt = Date.now();

  try {
    let rawJson = '[]';

    if (provider === 'groq') {
      const groqJsonPrompt = `${promptText}

Return STRICT JSON matching this exact object schema (no markdown fences):
{
  "questions": [
    {
      "text": "Question statement",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "1-2 concise sentences proving why the option at correctIndex is right",
      "subject": "Quantitative Aptitude | Reasoning & Intelligence | General Awareness | English Comprehension",
      "topic": "${params.topic ? params.topic.replace(/"/g, '\\"') : 'Specific syllabus topic name'}",
      "difficulty": "easy | medium | hard",
      "examCategory": "${params.examCategory}",
      "referenceNote": "AI-Generated Syllabus Practice (${params.examCategory})"
    }
  ]
}`;
      rawJson = await withRetries(
        () =>
          callGroqChatCompletion({
            model,
            systemInstruction,
            userPrompt: groqJsonPrompt,
            jsonMode: true,
            temperature: 0.4,
            maxTokens: 8192,
          }),
        state.aiConfig.retryAttempts
      );
    } else {
      const ai = getGeminiClient();
      const response = await withRetries(
        () =>
          ai.models.generateContent({
            model,
            contents: promptText,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              ...(model === 'gemini-3.8-flash'
                ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
                : {}),
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING, description: 'Clear question statement' },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Exactly 4 distinct answer choices',
                    },
                    correctIndex: {
                      type: Type.INTEGER,
                      description: 'Zero-based index of the single correct option (0..3)',
                    },
                    explanation: {
                      type: Type.STRING,
                      description: 'Step-by-step concise explanation for students',
                    },
                    subject: {
                      type: Type.STRING,
                      description:
                        'One of: Quantitative Aptitude, Reasoning & Intelligence, General Awareness, English Comprehension',
                    },
                    topic: { type: Type.STRING, description: 'Specific syllabus topic name' },
                    difficulty: {
                      type: Type.STRING,
                      description: 'One of: easy, medium, hard',
                    },
                    examCategory: {
                      type: Type.STRING,
                      description: `Target exam category such as ${params.examCategory}`,
                    },
                    referenceNote: {
                      type: Type.STRING,
                      description: 'Syllabus practice attribution without claiming fake official shifts',
                    },
                  },
                  required: [
                    'text',
                    'options',
                    'correctIndex',
                    'explanation',
                    'subject',
                    'topic',
                    'difficulty',
                    'examCategory',
                  ],
                },
              },
            },
          }),
        state.aiConfig.retryAttempts
      );
      rawJson = (response.text || '[]').trim();
    }

    const latencyMs = Date.now() - startedAt;
    const parsed = extractQuestionsArrayFromResponse(rawJson);
    const nowIso = new Date().toISOString();

    const validCandidates: AIMCQQuestion[] = [];
    let rejectedCount = 0;

    if (Array.isArray(parsed)) {
      parsed.forEach((item, idx) => {
        const candidate: AIMCQQuestion = {
          id: `ai_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          qIndex: idx,
          text: String(item.text || '').trim(),
          options: (Array.isArray(item.options) && item.options.length === 4
            ? item.options.map((o) => String(o || '').trim())
            : ['Option A', 'Option B', 'Option C', 'Option D']) as [
            string,
            string,
            string,
            string,
          ],
          correctIndex: Number(item.correctIndex),
          subject: (item.subject ||
            (params.subject && params.subject !== 'Mixed'
              ? params.subject
              : 'General Awareness')) as SubjectTag,
          topic:
            params.operation === 'generate_daily_exam' && params.topic
              ? params.topic
              : String(item.topic || params.topic || 'General Syllabus').trim(),
          difficulty: (item.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
          explanation: String(item.explanation || '').trim(),
          examCategory: (item.examCategory || params.examCategory) as ExamCategory,
          sourceType: 'ai_generated',
          referenceNote:
            item.referenceNote && !/official\s+pyq|shift\s*\d+/i.test(item.referenceNote)
              ? String(item.referenceNote).trim()
              : `AI-Generated Syllabus Practice (${params.examCategory})`,
          reviewStatus: 'pending',
          ...(params.weekNumber ? { weekNumber: params.weekNumber } : {}),
          ...(params.dayNumber ? { dayNumber: params.dayNumber } : {}),
          createdAt: nowIso,
        };

        const check = validateMCQItem(candidate);
        if (check.valid) {
          validCandidates.push(candidate);
        } else {
          rejectedCount += 1;
        }
      });
    }

    const { unique, duplicateCount } = deduplicateQuestions(
      validCandidates,
      params.existingPool || state.questionPool
    );

    appendUsageLog({
      operation: params.operation || 'generate_mcqs',
      model: `${provider}:${model}`,
      status: 'success',
      latencyMs,
      itemsGenerated: unique.length,
      message: `Generated ${unique.length} valid MCQ(s) via ${provider.toUpperCase()} for ${params.examCategory} (${duplicateCount} dup, ${rejectedCount} invalid).`,
    });

    return {
      accepted: unique,
      rejectedCount,
      duplicateCount,
      model: `${provider}:${model}`,
    };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const msg = err instanceof Error ? err.message : String(err);
    appendUsageLog({
      operation: params.operation || 'generate_mcqs',
      model: `${provider}:${model}`,
      status: msg.includes('429') ? 'rate_limited' : 'error',
      latencyMs,
      itemsGenerated: 0,
      message: msg.slice(0, 220),
    });
    throw err;
  }
}

export async function generateTopicRefinement(
  day: StudyPlanDay
): Promise<{
  topic: string;
  topicDescription: string;
  learningObjectives: string[];
}> {
  const state = loadStoreState();
  const { provider, model } = resolveProviderAndModel();

  if (!isActiveProviderKeyConfigured(provider)) {
    throw new Error('Server AI API key is required to AI-regenerate study plan topics.');
  }

  const limitCheck = checkAndReserveRateLimit();
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.reason);
  }

  const startedAt = Date.now();
  const userContent = `Refine and enrich this government competitive exam daily study topic for Week ${day.weekNumber}, Day ${day.dayNumber} (${day.dayType}), Subject: ${day.subject}, Current Topic: ${day.topic}. Target exams: ${day.recommendedExamCategories.join(', ')}.`;
  let rawJson = '{}';

  if (provider === 'groq') {
    rawJson = await withRetries(
      () =>
        callGroqChatCompletion({
          model,
          systemInstruction:
            'You are an academic syllabus architect for Indian government competitive exams (SSC, Banking, Railways, UPSC, State PSC). Output concise, actionable syllabus metadata strictly in JSON: {"topic": "...", "topicDescription": "...", "learningObjectives": ["...", "...", "..."]}.',
          userPrompt: userContent,
          jsonMode: true,
          temperature: 0.35,
          maxTokens: 1024,
        }),
      state.aiConfig.retryAttempts
    );
  } else {
    const ai = getGeminiClient();
    const res = await withRetries(
      () =>
        ai.models.generateContent({
          model,
          contents: userContent,
          config: {
            systemInstruction:
              'You are an academic syllabus architect for Indian government competitive exams (SSC, Banking, Railways, UPSC, State PSC). Output concise, actionable syllabus metadata in JSON.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                topicDescription: { type: Type.STRING },
                learningObjectives: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['topic', 'topicDescription', 'learningObjectives'],
            },
          },
        }),
      state.aiConfig.retryAttempts
    );
    rawJson = (res.text || '{}').trim();
  }

  const parsed = JSON.parse(
    rawJson.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  ) as {
    topic?: string;
    topicDescription?: string;
    learningObjectives?: string[];
  };

  appendUsageLog({
    operation: 'generate_topic_notes',
    model: `${provider}:${model}`,
    status: 'success',
    latencyMs: Date.now() - startedAt,
    itemsGenerated: 1,
    message: `Refined topic ${day.dayKey}`,
  });

  return {
    topic: parsed.topic?.trim() || day.topic,
    topicDescription: parsed.topicDescription?.trim() || day.topicDescription,
    learningObjectives:
      Array.isArray(parsed.learningObjectives) && parsed.learningObjectives.length > 0
        ? parsed.learningObjectives.slice(0, 4).map((o) => String(o).trim())
        : day.learningObjectives,
  };
}
