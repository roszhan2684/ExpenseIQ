export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '@/auth';
import { DEFAULT_CATEGORIES } from '@/lib/types';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `You are a precise bank statement parser. Extract every real spending transaction from the document.

INCLUDE:
- All debit card purchases / card withdrawals
- Zelle payments SENT (PMT To ...) — these are money the account holder spent
- Electronic withdrawals to merchants, universities, utilities, subscriptions
- ATM cash withdrawals
- Credit card bill payments (AMEX, Discover, etc.) — real outgoing money

EXCLUDE:
- Deposits, credits, money received (Zelle PMT From, payroll, mobile check deposits, refunds)
- Internal bank-to-bank transfers between the holder's own accounts
- Opening/closing balances, interest, bank fees

YEAR INFERENCE: The statement header contains a period like "Dec 10, 2025 through Jan 12, 2026". Use it to assign the correct full year to every date. "Dec 10" → 2025-12-10, "Jan 5" → 2026-01-05.

DATE FORMAT: YYYY-MM-DD only.

DESCRIPTION: Clean merchant name — strip store numbers, REF numbers, city/state, ALL-CAPS noise:
  "PANDA EXPRESS #1 FULLERTON CA" → "Panda Express"
  "TRADER JOE S #01 BREA CA" → "Trader Joe's"
  "NAYAX VENDING 60" → "Vending Machine"
  "CSC SERVICEWORKS" → "CSC ServiceWorks (Laundry)"
  "APPLE.COM/BILL" → "Apple Subscription"
  "OVERLEAF* TRIAL" → "Overleaf"
  "AMC 0437 ORANGE" → "AMC Movies"
  "TST* PARIS BAGUE" → "Paris Baguette"
  "10359 CAVA COLLE" → "Cava"
  "PMT To Yashwanth" → "Zelle - Yashwanth"
  "PMT To Ibad" → "Zelle - Ibad"
  "To CSUF FEE PAYMENT" → "CSUF Fee Payment"
  "To AMEX EPAYMENT" → "Amex Payment"
  "To DISCOVER" → "Discover Payment"

AMOUNT: Positive number, no minus sign, 2 decimal places.

Output ONLY a raw JSON array, no markdown, no explanation:
[{"date":"YYYY-MM-DD","description":"Merchant","amount":0.00,"category":"Category"}]
If no transactions: []`;

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

    const MAX_BYTES = 20 * 1024 * 1024;
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
    const userPrompt = `Extract all spending transactions. Assign each a category from: ${categoriesList}\n\nReturn only the raw JSON array, no markdown.`;

    const geminiModel = genai.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { maxOutputTokens: 8192 },
    });

    let responseText: string;

    if (isPDF) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');

      const result = await geminiModel.generateContent([
        {
          inlineData: {
            data: base64,
            mimeType: 'application/pdf',
          },
        },
        userPrompt,
      ]);
      responseText = result.response.text();
    } else {
      const text = await file.text();
      const MAX_CHARS = 60_000;
      const truncated = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text;

      const result = await geminiModel.generateContent(
        `${userPrompt}\n\nStatement:\n${truncated}`
      );
      responseText = result.response.text();
    }

    // Strip any accidental markdown fences
    const match = responseText.trim().match(/\[[\s\S]*\]/);
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
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: `Failed to parse statement: ${msg}` }, { status: 500 });
  }
}
