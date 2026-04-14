import { Transaction, AppSettings, DEFAULT_CATEGORIES } from './types';

const TRANSACTIONS_KEY = 'expense_tracker_transactions';
const SETTINGS_KEY = 'expense_tracker_settings';

export function getTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTransactions(transactions: Transaction[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
}

export function addTransaction(tx: Transaction): Transaction[] {
  const transactions = getTransactions();
  const updated = [tx, ...transactions];
  saveTransactions(updated);
  return updated;
}

export function deleteTransaction(id: string): Transaction[] {
  const transactions = getTransactions();
  const updated = transactions.filter((t) => t.id !== id);
  saveTransactions(updated);
  return updated;
}

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return { currency: 'USD', customCategories: [], budgets: [], theme: 'system' };
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { currency: 'USD', customCategories: [], budgets: [], theme: 'system' };
    return JSON.parse(raw);
  } catch {
    return { currency: 'USD', customCategories: [], budgets: [], theme: 'system' };
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getAllCategories(settings: AppSettings): string[] {
  return [...DEFAULT_CATEGORIES, ...settings.customCategories];
}

export function getTransactionsForMonth(
  transactions: Transaction[],
  year: number,
  month: number // 0-indexed
): Transaction[] {
  return transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function computeMonthlyStats(transactions: Transaction[]) {
  const expenses = transactions.filter((t) => (t.type ?? 'expense') === 'expense');
  const income = transactions.filter((t) => t.type === 'income');

  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const byCategory: Record<string, number> = {};
  for (const t of expenses) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
  }

  const now = new Date();
  const daysPassed = Math.max(1, now.getDate());
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyAverage = totalExpense / daysPassed;
  const projectedTotal = dailyAverage * daysInMonth;

  const topTransactions = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);
  return { total: totalExpense, totalExpense, totalIncome, netBalance, byCategory, dailyAverage, projectedTotal, topTransactions };
}

export function exportToCSV(transactions: Transaction[], currencySymbol: string): void {
  const header = ['Date', 'Description', 'Category', `Amount (${currencySymbol})`];
  const rows = transactions.map((t) => [
    t.date,
    `"${t.description.replace(/"/g, '""')}"`,
    t.category,
    t.amount.toFixed(2),
  ]);
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
