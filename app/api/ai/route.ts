export const dynamic = 'force-dynamic';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function model(systemInstruction: string, maxTokens = 800) {
  return genai.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction,
    generationConfig: { maxOutputTokens: maxTokens },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, transactions, currency } = body;

    if (!action) {
      return Response.json({ error: 'Missing action' }, { status: 400 });
    }

    // ── Auto-categorize from description ────────────────────────────────
    if (action === 'categorize') {
      const { description, categories } = body;
      const m = model(
        'You are an expense categorizer. Given a transaction description and a list of categories, respond with ONLY the most fitting category name from the list. Do not explain, do not add punctuation.'
      );
      const result = await m.generateContent(
        `Transaction description: "${description}"\n\nCategories: ${(categories as string[]).join(', ')}\n\nWhich category fits best?`
      );
      return Response.json({ category: result.response.text().trim() });
    }

    // ── Monthly summary ─────────────────────────────────────────────────
    if (action === 'summary') {
      const txSummary = JSON.stringify(
        (transactions as { description: string; amount: number; category: string; date: string }[]).map((t) => ({
          description: t.description,
          amount: t.amount,
          category: t.category,
          date: t.date,
        }))
      );
      const m = model(
        'You are a personal finance advisor. Write concise, friendly spending summaries. Focus on patterns, totals by category, and notable trends. Use bullet points. Keep it under 200 words.',
        500
      );
      const result = await m.generateContent(
        `Here are my transactions this month in ${currency}:\n${txSummary}\n\nGive me a monthly spending summary.`
      );
      return Response.json({ result: result.response.text() });
    }

    // ── Roast my spending ────────────────────────────────────────────────
    if (action === 'roast') {
      const txSummary = JSON.stringify(
        (transactions as { description: string; amount: number; category: string }[]).map((t) => ({
          description: t.description,
          amount: t.amount,
          category: t.category,
        }))
      );
      const m = model(
        'You are a brutally funny but genuinely helpful financial roaster. You roast people\'s spending habits with wit and savage humor — like a comedy roast — but always end with one genuinely useful insight. Be specific about their actual purchases. Keep it under 200 words.',
        600
      );
      const result = await m.generateContent(
        `Roast my spending habits based on these transactions (${currency}):\n${txSummary}`
      );
      return Response.json({ result: result.response.text() });
    }

    // ── Cost-cutting suggestions ─────────────────────────────────────────
    if (action === 'suggestions') {
      const txSummary = JSON.stringify(
        (transactions as { description: string; amount: number; category: string }[]).map((t) => ({
          description: t.description,
          amount: t.amount,
          category: t.category,
        }))
      );
      const m = model(
        'You are a practical personal finance advisor. Give exactly 3 actionable, specific cost-cutting suggestions based on the transactions. Format as a numbered list. Be specific to the actual spending, not generic advice. Each suggestion should estimate potential savings.',
        600
      );
      const result = await m.generateContent(
        `Based on these transactions (${currency}), give me the top 3 ways I can cut costs:\n${txSummary}`
      );
      return Response.json({ result: result.response.text() });
    }

    // ── Spending personality ─────────────────────────────────────────────
    if (action === 'personality') {
      const txSummary = JSON.stringify(
        (transactions as { description: string; amount: number; category: string }[]).map((t) => ({
          description: t.description,
          amount: t.amount,
          category: t.category,
        }))
      );
      const m = model(
        'You are a witty financial personality analyst. Based on spending patterns, assign a creative personality type (like "The Impulsive Foodie" or "The Netflix Hermit") and give a 3-4 sentence description of what this says about them. Be funny but insightful.',
        500
      );
      const result = await m.generateContent(
        `Based on these transactions (${currency}), what is my spending personality type?\n${txSummary}`
      );
      return Response.json({ result: result.response.text() });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    console.error('AI API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
