export const dynamic = 'force-dynamic';
export const maxDuration = 60; // allow up to 60s for large PDFs

import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@/auth';
import { DEFAULT_CATEGORIES } from '@/lib/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
    if (file.size > MAX_BYTES) {
      return Response.json({ error: 'File too large. Maximum 20 MB.' }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const isPDF = name.endsWith('.pdf');
    const isCSV = name.endsWith('.csv') || name.endsWith('.txt') || name.endsWith('.tsv');

    if (!isPDF && !isCSV) {
      return Response.json(
        { error: 'Unsupported format. Please upload a PDF or CSV file.' },
        { status: 400 }
      );
    }

    const categoriesList = DEFAULT_CATEGORIES.join(', ');

    const systemPrompt = `You are a precise bank statement parser. Extract every debit/expense/withdrawal transaction from the document.

Rules:
- Skip: credits, deposits, refunds, opening/closing balances, bank fees unless they are clear expenses
- date must be YYYY-MM-DD (infer year from statement context if not shown)
- description: clean merchant name, remove transaction IDs, reference numbers, extra whitespace
- amount: positive number representing money spent
- category: pick the BEST match from the list provided

Respond with ONLY a raw JSON array — no markdown, no code fences, no explanation:
[{"date":"YYYY-MM-DD","description":"Merchant Name","amount":0.00,"category":"Category"}]

If the document contains no recognisable transactions, return an empty array: []`;

    const userPrompt = `Extract all expense transactions. Assign each a category from: ${categoriesList}\n\nReturn only the JSON array.`;

    let responseText: string;

    if (isPDF) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');

      const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                },
              } as { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } },
              { type: 'text', text: userPrompt },
            ],
          },
        ],
      });

      responseText = (msg.content[0] as { type: string; text: string }).text;
    } else {
      const text = await file.text();

      const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `${userPrompt}\n\nStatement:\n${text}`,
          },
        ],
      });

      responseText = (msg.content[0] as { type: string; text: string }).text;
    }

    // Extract JSON array from the response (guard against any stray prose)
    const match = responseText.match(/\[[\s\S]*\]/);
    if (!match) {
      return Response.json({ transactions: [] });
    }

    const raw = JSON.parse(match[0]) as Array<{
      date?: unknown;
      description?: unknown;
      amount?: unknown;
      category?: unknown;
    }>;

    const transactions = raw
      .filter(
        (t) =>
          typeof t.date === 'string' &&
          typeof t.description === 'string' &&
          typeof t.amount === 'number' &&
          t.amount > 0
      )
      .map((t) => ({
        date: String(t.date).slice(0, 10),
        description: String(t.description).slice(0, 200).trim(),
        amount: Math.round(Math.abs(Number(t.amount)) * 100) / 100,
        category: DEFAULT_CATEGORIES.includes(String(t.category)) ? String(t.category) : 'Other',
      }));

    return Response.json({ transactions });
  } catch (err) {
    console.error('[parse-statement]', err);
    return Response.json({ error: 'Failed to parse statement. Please try again.' }, { status: 500 });
  }
}
