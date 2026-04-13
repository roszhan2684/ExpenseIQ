export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string; // ISO date string
  currency?: string;
}

export interface CategoryBudget {
  category: string;
  limit: number;
}

export interface AppSettings {
  currency: string;
  customCategories: string[];
  budgets: CategoryBudget[];
  theme: 'light' | 'dark' | 'system';
}

export interface MonthlyStats {
  total: number;
  byCategory: Record<string, number>;
  dailyAverage: number;
  projectedTotal: number;
  topTransactions: Transaction[];
}

export const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Housing',
  'Healthcare',
  'Utilities',
  'Travel',
  'Education',
  'Personal Care',
  'Subscriptions',
  'Other',
];

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
];

export const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#f97316',
  'Transportation': '#3b82f6',
  'Shopping': '#a855f7',
  'Entertainment': '#ec4899',
  'Housing': '#14b8a6',
  'Healthcare': '#22c55e',
  'Utilities': '#eab308',
  'Travel': '#06b6d4',
  'Education': '#6366f1',
  'Personal Care': '#f43f5e',
  'Subscriptions': '#8b5cf6',
  'Other': '#94a3b8',
};
