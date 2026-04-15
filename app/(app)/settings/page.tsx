'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAllCategories, exportToCSV } from '@/lib/storage';
import { AppSettings, CURRENCIES, DEFAULT_CATEGORIES, CategoryBudget } from '@/lib/types';

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>({ currency: 'USD', customCategories: [], budgets: [], theme: 'system' });
  const [newCategory, setNewCategory] = useState('');
  const [budgetCategory, setBudgetCategory] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/user-settings');
    if (res.ok) setSettings(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (updated: AppSettings) => {
    setSettings(updated);
    await fetch('/api/user-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed || settings.customCategories.includes(trimmed) || DEFAULT_CATEGORIES.includes(trimmed)) return;
    save({ ...settings, customCategories: [...settings.customCategories, trimmed] });
    setNewCategory('');
  };

  const removeCategory = (cat: string) => save({ ...settings, customCategories: settings.customCategories.filter((c) => c !== cat) });

  const addBudget = () => {
    if (!budgetCategory || !budgetAmount) return;
    const limit = parseFloat(budgetAmount);
    if (isNaN(limit) || limit <= 0) return;
    save({ ...settings, budgets: [...settings.budgets.filter((b) => b.category !== budgetCategory), { category: budgetCategory, limit }] });
    setBudgetCategory('');
    setBudgetAmount('');
  };

  const removeBudget = (cat: string) => save({ ...settings, budgets: settings.budgets.filter((b) => b.category !== cat) });

  const handleExport = async () => {
    const res = await fetch('/api/transactions');
    if (!res.ok) return;
    const transactions = await res.json();
    const cur = CURRENCIES.find((c) => c.code === settings.currency);
    exportToCSV(transactions, cur?.symbol ?? '$');
  };

  const allCategories = getAllCategories(settings);
  const currencyInfo = CURRENCIES.find((c) => c.code === settings.currency);

  return (
    <div className="flex-1 p-3 md:p-6 space-y-4 md:space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Settings</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Customize your experience</p>
        </div>
        {saved && <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-800">✓ Saved</span>}
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Currency</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CURRENCIES.map((c) => (
            <button key={c.code} onClick={() => save({ ...settings, currency: c.code })}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${settings.currency === c.code ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
              <span className="font-mono font-bold text-base w-6">{c.symbol}</span><span>{c.code}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Custom Categories</h2>
        <div className="flex gap-2">
          <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} placeholder="New category name..." className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          <button onClick={addCategory} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors">Add</button>
        </div>
        {settings.customCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {settings.customCategories.map((cat) => (
              <span key={cat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-medium border border-violet-200 dark:border-violet-800">
                {cat}<button onClick={() => removeCategory(cat)} className="text-violet-400 hover:text-violet-700 dark:hover:text-violet-200 leading-none">×</button>
              </span>
            ))}
          </div>
        )}
        <div>
          <p className="text-xs text-zinc-400 dark:text-zinc-600 mb-2">Default categories:</p>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_CATEGORIES.map((cat) => (<span key={cat} className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs">{cat}</span>))}
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Budget Limits</h2>
        <div className="flex gap-2">
          <select value={budgetCategory} onChange={(e) => setBudgetCategory(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="">Select category...</option>
            {allCategories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
          </select>
          <input type="number" min="1" step="0.01" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} placeholder={`Limit (${currencyInfo?.symbol ?? '$'})`} className="w-36 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          <button onClick={addBudget} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors">Set</button>
        </div>
        {settings.budgets.length > 0 ? (
          <div className="space-y-2">
            {settings.budgets.map((b: CategoryBudget) => (
              <div key={b.category} className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{b.category}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">{currencyInfo?.symbol ?? '$'}{b.limit.toFixed(2)}</span>
                  <button onClick={() => removeBudget(b.category)} className="text-zinc-400 hover:text-red-500 transition-colors text-base">×</button>
                </div>
              </div>
            ))}
          </div>
        ) : (<p className="text-xs text-zinc-400 dark:text-zinc-600">No budgets set yet.</p>)}
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">Export Data</h2>
        <p className="text-xs text-zinc-400 dark:text-zinc-600 mb-4">Download all your transactions as a CSV file.</p>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">↓ Export to CSV</button>
      </div>
    </div>
  );
}
