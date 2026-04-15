import { Transaction } from './types';

export interface RecurringCharge {
  key: string;
  name: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'annual';
  lastDate: string;
  occurrences: number;
  category: string;
  monthlyEquivalent: number;
}

function normalize(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/\d{1,4}[/-]\d{1,2}([/-]\d{2,4})?/g, '') // remove inline dates
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi, '')
    .replace(/\b\d{4,}\b/g, '')   // long order/ref numbers
    .replace(/\b\d{2,3}\b/g, '')  // standalone 2-3 digit numbers
    .replace(/[^a-z\s&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectRecurring(transactions: Transaction[]): RecurringCharge[] {
  const expenses = transactions.filter(
    (t) => (t.type ?? 'expense') === 'expense' && !t.pending,
  );

  // Group by normalized description
  const groups = new Map<string, Transaction[]>();
  for (const tx of expenses) {
    const key = normalize(tx.description);
    if (key.length < 3) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }

  const recurring: RecurringCharge[] = [];

  for (const [key, txs] of groups) {
    if (txs.length < 2) continue;

    // Sort by date ascending
    txs.sort((a, b) => a.date.localeCompare(b.date));

    // Amount consistency: max 12% variance
    const amounts = txs.map((t) => t.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const maxVar = Math.max(...amounts.map((a) => Math.abs(a - avg) / avg));
    if (maxVar > 0.12) continue;

    // Gap analysis
    const dates = txs.map((t) => new Date(t.date).getTime());
    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      gaps.push((dates[i] - dates[i - 1]) / 86_400_000); // days
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    // Must span at least 2 different months unless weekly
    const months = new Set(txs.map((t) => t.date.slice(0, 7)));

    let frequency: RecurringCharge['frequency'];
    let monthlyEquivalent: number;

    if (avgGap <= 10 && txs.length >= 3) {
      frequency = 'weekly';
      monthlyEquivalent = avg * 4.33;
    } else if (avgGap >= 11 && avgGap <= 45 && months.size >= 2) {
      frequency = 'monthly';
      monthlyEquivalent = avg;
    } else if (avgGap >= 300 && avgGap <= 400) {
      frequency = 'annual';
      monthlyEquivalent = avg / 12;
    } else if (months.size >= 2 && avgGap <= 45) {
      frequency = 'monthly';
      monthlyEquivalent = avg;
    } else {
      continue;
    }

    recurring.push({
      key,
      name: txs[txs.length - 1].description,
      amount: amounts[amounts.length - 1],
      frequency,
      lastDate: txs[txs.length - 1].date,
      occurrences: txs.length,
      category: txs[txs.length - 1].category,
      monthlyEquivalent,
    });
  }

  return recurring
    .sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent)
    .slice(0, 25);
}
