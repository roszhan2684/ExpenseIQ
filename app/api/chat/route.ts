export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { generateWithFallback } from '@/lib/gemini';

interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    message: string;
    transactions?: { description: string; amount: number; category: string; date: string; type?: string }[];
    currency?: string;
    categories?: string[];
    history?: ChatHistoryEntry[];
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { message, transactions = [], currency = 'USD', categories = [], history = [] } = body;
  if (!message?.trim()) {
    return Response.json({ error: 'Missing message' }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Build a compact transaction context (max 300 rows)
  const txLines = transactions
    .slice(0, 300)
    .map((t) => `${t.date} | ${t.description} | ${t.type ?? 'expense'} | ${t.amount} ${currency} | ${t.category}`)
    .join('\n');

  const systemPrompt = `You are ExpenseIQ's personal finance assistant. Today is ${today}. Currency: ${currency}.

You have two modes — decide based on the user's message:

MODE 1 — TRANSACTION ENTRY
Triggered when the user describes spending or income (e.g. "coffee $6", "spent $45 at Walmart", "got paid $2000 salary").
Respond with ONLY valid JSON — no markdown, no extra text:
{"mode":"transaction","transaction":{"description":"...","amount":0.00,"category":"...","date":"YYYY-MM-DD","type":"expense"},"message":"Added: [description] for ${currency}[amount]"}

MODE 2 — QUESTION / ANALYSIS
Triggered when the user asks about their finances (e.g. "how much on food?", "what's my biggest expense?", "am I over budget?").
Respond with ONLY valid JSON:
{"mode":"answer","message":"Your plain-language answer here. Use bullet points (\\n• item) for lists."}

Rules:
- Available categories: ${categories.length ? categories.join(', ') : 'Food & Dining, Transportation, Shopping, Entertainment, Housing, Healthcare, Utilities, Travel, Subscriptions, Other'}
- For dates: "today" = ${today}, "yesterday" = ${new Date(Date.now() - 86400000).toISOString().slice(0, 10)}, infer other relative dates
- For income transactions set type to "income"
- Keep answers concise and specific to actual data — no generic advice unless data is empty
- ALWAYS output valid JSON only — nothing else`;

  const historyText = history
    .slice(-6) // last 6 turns for context
    .map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
    .join('\n');

  const prompt = `Transaction history:
${txLines || '(no transactions loaded)'}

${historyText ? `Conversation so far:\n${historyText}\n` : ''}User: ${message}`;

  try {
    const raw = await generateWithFallback(systemPrompt, prompt, 400);

    // Extract JSON robustly — models sometimes add backticks or prose
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI response');
    const parsed = JSON.parse(jsonMatch[0]);

    // Validate shape
    if (!parsed.mode || !parsed.message) throw new Error('Invalid response shape');

    return Response.json(parsed);
  } catch (err) {
    console.error('[chat/route]', err);
    // Return a graceful fallback so the UI never breaks
    return Response.json({
      mode: 'answer',
      message: "Sorry, I couldn't process that. Try rephrasing — for example: \"coffee $5\" to add a transaction, or \"how much on food?\" to query your spending.",
    });
  }
}
