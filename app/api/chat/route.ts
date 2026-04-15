/**
 * app/api/chat/route.ts
 *
 * AI Finance Assistant — POST endpoint.
 *
 * Accepts a user message plus contextual data and returns a JSON
 * response in one of three modes:
 *
 *   MODE 1 — transaction  : AI detected a personal spend/income entry
 *   MODE 2 — answer       : AI answered a finance question
 *   MODE 3 — split        : AI detected a group expense to split
 *
 * The caller (chat page or FloatingChat widget) then presents the
 * appropriate confirmation UI before committing to the database.
 *
 * Relies on generateWithFallback() which tries Gemini models in
 * priority order and returns the first successful text response.
 */

export const dynamic = 'force-dynamic';

import { getUser } from '@/lib/getUser';
import { generateWithFallback } from '@/lib/gemini';

/** A single turn in the conversation history sent for multi-turn context */
interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

/** Minimal group shape passed by the client for AI split-detection context */
interface SplitGroupContext {
  id: string;
  name: string;
  members: { id: string; name: string }[];
}

export async function POST(request: Request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    message: string;
    transactions?: { description: string; amount: number; category: string; date: string; type?: string }[];
    currency?: string;
    categories?: string[];
    history?: ChatHistoryEntry[];
    splitGroups?: SplitGroupContext[];
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { message, transactions = [], currency = 'USD', categories = [], history = [], splitGroups = [] } = body;
  if (!message?.trim()) {
    return Response.json({ error: 'Missing message' }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Build a compact transaction context (max 300 rows)
  const txLines = transactions
    .slice(0, 300)
    .map((t) => `${t.date} | ${t.description} | ${t.type ?? 'expense'} | ${t.amount} ${currency} | ${t.category}`)
    .join('\n');

  // Build split groups context
  const groupsContext = splitGroups.length
    ? splitGroups
        .map((g) => `"${g.name}" (id: ${g.id}) — members: ${g.members.map((m) => m.name).join(', ')}`)
        .join('\n')
    : '(no split groups)';

  const systemPrompt = `You are ExpenseIQ's personal finance assistant. Today is ${today}. Currency: ${currency}.

You have three modes — decide based on the user's message:

MODE 1 — TRANSACTION ENTRY
Triggered when the user describes personal spending or income (e.g. "coffee $6", "spent $45 at Walmart", "got paid $2000 salary") WITHOUT mentioning splitting with other people.
Respond with ONLY valid JSON — no markdown, no extra text:
{"mode":"transaction","transaction":{"description":"...","amount":0.00,"category":"...","date":"YYYY-MM-DD","type":"expense"},"message":"Added: [description] for ${currency}[amount]"}

MODE 2 — QUESTION / ANALYSIS
Triggered when the user asks about their finances (e.g. "how much on food?", "what's my biggest expense?", "am I over budget?").
Respond with ONLY valid JSON:
{"mode":"answer","message":"Your plain-language answer here. Use bullet points (\\n• item) for lists."}

MODE 3 — SPLIT EXPENSE ENTRY
Triggered when the user mentions splitting a cost with named people (e.g. "split dinner $80 with Alice and Bob", "I paid $60 for gas, split with John", "we spent $120 on groceries, me Alice Bob").
Match the people mentioned to a split group and its members from the groups list below.
Respond with ONLY valid JSON:
{"mode":"split","groupId":"...","expense":{"description":"...","amount":0.00,"paidByName":"...","involvedNames":["name1","name2"]},"message":"Short confirmation like: Split $X for [description] in [group name]?"}

Split groups available:
${groupsContext}

MODE 3 rules:
- groupId must be one of the ids listed above — pick the group whose members best match the names mentioned
- paidByName should be "Me" if the user says "I paid" or "I spent", otherwise the name they mentioned
- involvedNames should include everyone involved (including the payer); use exact member names from the group
- If no group matches at all, fall back to MODE 2 and explain you couldn't find a matching group

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
