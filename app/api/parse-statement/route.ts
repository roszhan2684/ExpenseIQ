export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { auth } from '@/auth';
import { DEFAULT_CATEGORIES, INCOME_CATEGORIES } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────

interface ParsedTx {
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
}

interface YearRange {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

// ── Year detection ────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function detectYearRange(text: string): YearRange {
  const now = new Date();
  const fallback: YearRange = {
    startYear: now.getFullYear(), startMonth: 1,
    endYear: now.getFullYear(), endMonth: 12,
  };

  // "December 10, 2025 through January 12, 2026"
  const m = text.match(
    /(\w{3,9})\s+\d{1,2},?\s+(\d{4})\s+through\s+(\w{3,9})\s+\d{1,2},?\s+(\d{4})/i
  );
  if (m) {
    return {
      startYear: parseInt(m[2]),
      startMonth: MONTH_MAP[m[1].slice(0, 3).toLowerCase()] ?? 1,
      endYear: parseInt(m[4]),
      endMonth: MONTH_MAP[m[3].slice(0, 3).toLowerCase()] ?? 12,
    };
  }

  // "12/10/2025 through 01/12/2026"
  const m2 = text.match(
    /(\d{1,2})\/\d{1,2}\/(\d{4})\s+(?:through|to|-)\s+(\d{1,2})\/\d{1,2}\/(\d{4})/i
  );
  if (m2) {
    return {
      startYear: parseInt(m2[2]), startMonth: parseInt(m2[1]),
      endYear: parseInt(m2[4]), endMonth: parseInt(m2[3]),
    };
  }

  return fallback;
}

function assignYear(mmdd: string, yr: YearRange): string | null {
  const parts = mmdd.split('/');
  const mm = parseInt(parts[0]);
  const dd = parseInt(parts[1]);
  if (!mm || !dd || mm > 12 || dd > 31) return null;

  let year = yr.endYear;
  if (yr.startYear !== yr.endYear) {
    // Months in the start-year half (e.g. Dec) → startYear; rest → endYear
    year = mm >= yr.startMonth ? yr.startYear : yr.endYear;
  }

  return `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

// ── Income / expense detection ────────────────────────────────────────────────

const INCOME_RE = [
  /\bpayroll\b/i,
  /\bdirect\s+deposit\b/i,
  /pmt\s+from\b/i,
  /mobile\s+check\s+deposit/i,
  /check\s+deposit/i,
  /\bdeposit\b/i,
  /\brefund\b/i,
  /purchase\s+ret/i,          // "Debit Purchase Ret"
  /transfer\s+from\b/i,
  /transfer\s+in\b/i,
];

function detectType(raw: string): 'income' | 'expense' {
  for (const p of INCOME_RE) if (p.test(raw)) return 'income';
  return 'expense';
}

// ── Description cleaning ──────────────────────────────────────────────────────

const CLEAN_RULES: Array<[RegExp | string, string]> = [
  [/\bdebit\s+purchase\s+ret(?:urn)?\s*-?\s*/i, ''],
  [/\bdebit\s+purchase\s*-?\s*/i, ''],
  [/pmt\s+from\s+/i, 'Zelle - '],
  [/pmt\s+to\s+/i, 'Zelle - '],
  [/mobile\s+check\s+deposit\b.*/i, 'Check Deposit'],
  [/mobile\s+banking\s+transfer\s+to\s+account\b.*/i, 'Transfer Out'],
  [/mobile\s+banking\s+transfer\s+from\s+account\b.*/i, 'Transfer In'],
  [/\s+[a-z]{2}\s+\d{5}.*$/i, ''],   // strip "CA 92831 ..."
  [/\s+[a-z]{2}\s*$/i, ''],           // strip trailing state abbrev
  [/\s+#\d+\b/g, ''],                  // strip store numbers
  [/\s{2,}/g, ' '],
];

function cleanDescription(raw: string): string {
  let s = raw.trim();
  for (const [pattern, replacement] of CLEAN_RULES) {
    s = typeof pattern === 'string'
      ? s.split(pattern).join(replacement)
      : s.replace(pattern, replacement);
  }
  return s.trim().slice(0, 200);
}

// ── Category mapping ──────────────────────────────────────────────────────────

const CATEGORY_MAP: Array<[RegExp, string]> = [
  // Income categories first
  [/payroll|salary|direct\s+deposit/i, 'Paycheck / Salary'],
  [/pmt\s+from|check\s+deposit|mobile\s+check/i, 'Transfer In'],
  [/refund|purchase\s+ret/i, 'Refund'],
  [/transfer\s+from|transfer\s+in/i, 'Transfer In'],
  // Expense categories
  [/restaurant|cafe|café|coffee|starbucks|panda|domino|pizza|burger|taco|sushi|boba|chipotle|chick.fil|mcdonald|subway|wendy|kfc|dunkin|denny|ihop|applebee|olive\s+garden|cheesecake|baguette|paris\s+baguette|empori.yum|cava|poke|wingstop|raising\s+cane|in.n.out|habit\s+burger|shake\s+shack/i, 'Food & Dining'],
  [/grocery|trader\s+joe|whole\s+foods|safeway|vons|walmart\s+(?:super|grocery)|target\s+(?:food|grocery)|costco\s+(?:food|biz)|smart\s+and\s+final|northgate|ralphs|kroger|heb\b|publix|aldi|lidl|sprouts|vons|pavilions|market/i, 'Food & Dining'],
  [/vending|food\s+court|titan\s+shops|csuf\s+emp/i, 'Food & Dining'],
  [/uber|lyft|parking|chevron|shell|arco|76\s+\b|bp\s+\b|exxon|mobil|texaco|fuel|amtrak|metro(?:link|card)?|transit|toll\b|fastrak|bart\b/i, 'Transportation'],
  [/amazon(?!\s*prime\s*video)|ebay|etsy|shopify|bestbuy|best\s+buy|macys|nordstrom|\bh&m\b|\bzara\b|\bgap\b|old\s+navy|forever\s+21|tj\s+maxx|marshalls|ross\s+dress|dollar\s+tree|dollar\s+general|five\s+below|target(?!\s+food)|walmart(?!\s+(?:super|grocery))/i, 'Shopping'],
  [/netflix|hulu|disney\+?|hbo|spotify|amazon\s+prime\s*video|youtube\s+premium|peacock|paramount|crunchyroll|twitch|xbox|playstation|steam\b|amc\s+(?:movies?|theatre)|cinema|regal|alamo\s+draft|movie/i, 'Entertainment'],
  [/apple\.com\/bill|apple\s+sub|icloud|overleaf|adobe|microsoft\s+365|google\s+one|dropbox|slack\b|zoom\b|github\b|notion\b|figma|canva|nordvpn|lastpass|1password/i, 'Subscriptions'],
  [/rent\b|apartment|mortgage|hoa\b|landlord/i, 'Housing'],
  [/laundry|csc\s+service(?:works)?/i, 'Housing'],
  [/electric\b|water\s+bill|pg&e|sdge|southern\s+cal(?:ifornia\s+)?(?:gas|edison)|internet|comcast|xfinity|att\s+(?:wireless|internet)|verizon|t.mobile|sprint|cox\s+\b|spectrum\b/i, 'Utilities'],
  [/doctor|hospital|pharmacy|cvs\b|walgreens|rite\s+aid|urgent\s+care|dental|vision|optometry|lab\s+corp|quest\s+diag|insurance\s+(?:pay|prem)/i, 'Healthcare'],
  [/tuition|csuf\b|fee\s+payment|university|college\s+\b|textbook|udemy|coursera|khan\s+academy/i, 'Education'],
  [/haircut|barber|salon|spa\b|nail\s+(?:salon|bar)|massage|beauty\s+supply/i, 'Personal Care'],
  [/hotel|airbnb|flight\b|airline|southwest\b|delta\b|united\s+air|american\s+air|spirit\s+air|frontier\s+air|booking\.com|expedia|kayak\b|hertz\b|avis\b|enterprise\s+rent/i, 'Travel'],
];

function assignCategory(raw: string, type: 'income' | 'expense'): string {
  for (const [pattern, cat] of CATEGORY_MAP) {
    if (!pattern.test(raw)) continue;
    if (type === 'income' && INCOME_CATEGORIES.includes(cat)) return cat;
    if (type === 'expense' && DEFAULT_CATEGORIES.includes(cat)) return cat;
  }
  return type === 'income' ? 'Other Income' : 'Other';
}

// ── Text (PDF-extracted) line parser ─────────────────────────────────────────

function parseTransactionLine(line: string, yr: YearRange): ParsedTx | null {
  // Must start with MM/DD
  const dateMatch = line.match(/^(\d{1,2}\/\d{1,2})\s+/);
  if (!dateMatch) return null;

  const rest = line.slice(dateMatch[0].length).trim();
  if (!rest) return null;

  // Find all decimal amounts (digits, optional commas, dot, exactly 2 decimals)
  const amounts = [...rest.matchAll(/\b([\d,]+\.\d{2})\b/g)];
  if (amounts.length === 0) return null;

  // ≥2 amounts: second-to-last = transaction, last = running balance
  // 1 amount: that IS the transaction
  const txAmtMatch = amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[0];
  const amount = parseFloat(txAmtMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return null;

  // Description = everything before the transaction amount column
  const rawDesc = rest.slice(0, txAmtMatch.index!).trim();
  if (!rawDesc || rawDesc.length < 3) return null;

  const date = assignYear(dateMatch[1], yr);
  if (!date) return null;

  const type = detectType(rawDesc);
  return {
    date,
    description: cleanDescription(rawDesc),
    amount: Math.round(amount * 100) / 100,
    category: assignCategory(rawDesc, type),
    type,
  };
}

function parseText(text: string): ParsedTx[] {
  const yr = detectYearRange(text);
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !/^--- PAGE \d+ ---/.test(l))
    .map(l => parseTransactionLine(l, yr))
    .filter((t): t is ParsedTx => t !== null);
}

// ── CSV / TSV parser ──────────────────────────────────────────────────────────

function parseCsvRow(line: string, sep: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuote = !inQuote; continue; }
    if (c === sep && !inQuote) { cols.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  cols.push(cur.trim());
  return cols;
}

function parseCsv(text: string): ParsedTx[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const sep = lines[0].includes('\t') ? '\t' : ',';
  const header = parseCsvRow(lines[0], sep).map(h => h.toLowerCase().replace(/"/g, ''));

  const dateIdx = header.findIndex(h => h.includes('date'));
  const descIdx = header.findIndex(h =>
    h.includes('name') || h.includes('description') || h.includes('narration') || h.includes('memo')
  );
  const amtIdx = header.findIndex(h =>
    h.includes('amount') || h.includes('debit') || h.includes('credit')
  );

  if (dateIdx === -1 || amtIdx === -1) return [];

  const now = new Date().getFullYear();
  const txs: ParsedTx[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvRow(lines[i], sep);
    if (cols.length < 2) continue;

    const rawDate = cols[dateIdx] ?? '';
    const rawAmt = cols[amtIdx] ?? '';
    const rawDesc = descIdx >= 0 ? cols[descIdx] : cols[1] ?? '';

    const amount = parseFloat(rawAmt.replace(/[$,\s]/g, ''));
    if (isNaN(amount) || amount === 0) continue;

    // Parse date — accepts MM/DD/YYYY, YYYY-MM-DD, MM/DD/YY
    let date = '';
    const dm = rawDate.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    const iso = rawDate.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      date = rawDate.slice(0, 10);
    } else if (dm) {
      const mm = parseInt(dm[1]);
      const dd = parseInt(dm[2]);
      const yy = dm[3] ? (dm[3].length === 2 ? 2000 + parseInt(dm[3]) : parseInt(dm[3])) : now;
      date = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    } else continue;

    const absAmount = Math.round(Math.abs(amount) * 100) / 100;
    // Negative = debit (expense), positive = credit (income)
    const type: 'income' | 'expense' = amount < 0 ? 'expense' : 'income';

    txs.push({
      date,
      description: cleanDescription(rawDesc),
      amount: absAmount,
      category: assignCategory(rawDesc, type),
      type,
    });
  }
  return txs;
}

// ── Deduplication ─────────────────────────────────────────────────────────────

function dedup(txs: ParsedTx[]): ParsedTx[] {
  const seen = new Set<string>();
  return txs.filter(t => {
    const key = `${t.date}|${t.amount}|${t.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return Response.json({ error: 'No file provided' }, { status: 400 });

    const MAX_BYTES = 20 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return Response.json({ error: 'File too large. Maximum 20 MB.' }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const isSupported =
      name.endsWith('.pdf') || name.endsWith('.txt') ||
      name.endsWith('.csv') || name.endsWith('.tsv');

    if (!isSupported) {
      return Response.json(
        { error: 'Unsupported format. Please upload a PDF, CSV, or TXT file.' },
        { status: 400 }
      );
    }

    const text = await file.text();

    // Choose parser based on file type / content
    const isCsv = name.endsWith('.csv') || name.endsWith('.tsv') ||
      // auto-detect: first non-blank line has comma-separated header words
      /^[\w\s"']+(?:,[\w\s"']+){2,}/.test(text.split('\n').find(l => l.trim()) ?? '');

    const rawTxs = isCsv ? parseCsv(text) : parseText(text);
    const transactions = dedup(rawTxs).filter(t => t.amount > 0);

    return Response.json({ transactions });
  } catch (err) {
    console.error('[parse-statement]', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: `Failed to parse statement: ${msg}` }, { status: 500 });
  }
}
