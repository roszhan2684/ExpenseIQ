/**
 * AI client — priority chain:
 *
 *  1. Ollama  — local dev (set OLLAMA_BASE_URL=http://localhost:11434)
 *  2. Groq    — free cloud, works on Vercel (set GROQ_API_KEY)
 *               Sign up free at https://console.groq.com
 *  3. Gemini  — fallback cloud (GEMINI_API_KEY, already set)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// ── 1. Ollama (local) ────────────────────────────────────────────────────────

async function generateWithOllama(system: string, prompt: string): Promise<string> {
  const base = (process.env.OLLAMA_BASE_URL ?? '').replace(/\/$/, '');
  const ollamaModel = process.env.OLLAMA_MODEL ?? 'llama3.2';

  const res = await fetch(`${base}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: ollamaModel, system, prompt, stream: false }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Ollama error (${res.status}): ${detail}`);
  }

  const data = await res.json() as { response: string };
  return data.response ?? '';
}

// ── 2. Groq (free cloud) ─────────────────────────────────────────────────────

async function generateWithGroq(
  system: string,
  prompt: string,
  maxOutputTokens: number
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY!;
  const model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxOutputTokens,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Groq error (${res.status}): ${detail}`);
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? '';
}

// ── 3. Gemini fallback chain ─────────────────────────────────────────────────

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
];

function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('overloaded');
}

async function generateWithGemini(
  system: string,
  prompt: string,
  maxOutputTokens: number
): Promise<string> {
  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  let lastErr: unknown;

  for (const modelName of GEMINI_MODELS) {
    try {
      const m = genai.getGenerativeModel({
        model: modelName,
        systemInstruction: system,
        generationConfig: { maxOutputTokens },
      });
      const result = await m.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      lastErr = err;
      if (isRetryable(err)) {
        console.warn(`[Gemini] ${modelName} unavailable, trying next…`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function generateWithFallback(
  systemInstruction: string,
  prompt: string,
  maxOutputTokens = 800
): Promise<string> {
  if (process.env.OLLAMA_BASE_URL) {
    return generateWithOllama(systemInstruction, prompt);
  }
  if (process.env.GROQ_API_KEY) {
    return generateWithGroq(systemInstruction, prompt, maxOutputTokens);
  }
  return generateWithGemini(systemInstruction, prompt, maxOutputTokens);
}
