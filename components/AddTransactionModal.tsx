'use client';

import { useState } from 'react';
import { Transaction, DEFAULT_CATEGORIES, INCOME_CATEGORIES } from '@/lib/types';

interface Props {
  categories: string[];
  currencySymbol: string;
  onAdd: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  onClose: () => void;
}

export default function AddTransactionModal({ categories, currencySymbol, onAdd, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [categorizing, setCategorizing] = useState(false);

  const availableCategories = txType === 'income' ? INCOME_CATEGORIES : categories;

  const handleTypeChange = (t: 'expense' | 'income') => {
    setTxType(t);
    setCategory(t === 'income' ? INCOME_CATEGORIES[0] : (categories[0] ?? 'Other'));
  };

  const handleDescriptionBlur = async () => {
    if (!description.trim() || txType === 'income') return;
    setCategorizing(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'categorize', description, categories: availableCategories }),
      });
      const data = await res.json();
      if (data.category && availableCategories.includes(data.category)) setCategory(data.category);
    } catch { /* ignore */ } finally {
      setCategorizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;
    setLoading(true);
    await onAdd({ amount: num, description, category, date, type: txType });
    setLoading(false);
    onClose();
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Add Transaction</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <button type="button" onClick={() => handleTypeChange('expense')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${txType === 'expense' ? 'bg-violet-600 text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
              Expense
            </button>
            <button type="button" onClick={() => handleTypeChange('income')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${txType === 'income' ? 'bg-emerald-600 text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
              Income
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Amount ({currencySymbol})</label>
            <input type="number" step="0.01" min="0.01" required value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Description</label>
            <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder={txType === 'income' ? 'e.g. Monthly paycheck' : 'e.g. Dinner at Olive Garden'}
              className={inputCls} />
            {categorizing && <p className="text-xs text-violet-500 mt-1">Auto-categorizing...</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {availableCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Date</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className={`flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60 ${txType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-violet-600 hover:bg-violet-700'}`}>
              {loading ? 'Adding...' : `Add ${txType === 'income' ? 'Income' : 'Expense'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
