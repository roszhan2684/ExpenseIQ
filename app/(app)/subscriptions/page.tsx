'use client';

import { useState, useEffect, useCallback } from 'react';
import { Transaction, CURRENCIES, AppSettings } from '@/lib/types';
import { detectRecurring, RecurringCharge } from '@/lib/recurring';

const FREQ_LABEL: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  annual: 'Annual',
};

const FREQ_COLOR: Record<string, string> = {
  weekly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  monthly: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  annual: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

export default function Subscriptions() {
  const [recurring, setRecurring] = useState<RecurringCharge[]>([]);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'monthly' | 'weekly' | 'annual'>('all');

  const load = useCallback(async () => {
    const [txRes, settingsRes] = await Promise.all([
      fetch('/api/transactions'),
      fetch('/api/user-settings'),
    ]);
    if (!txRes.ok) { setLoading(false); return; }
    const txs: Transaction[] = await txRes.json();
    if (settingsRes.ok) {
      const s: AppSettings = await settingsRes.json();
      const cur = CURRENCIES.find((c) => c.code === s.currency);
      setCurrencySymbol(cur?.symbol ?? '$');
    }
    setRecurring(detectRecurring(txs));
    try {
      const saved = localStorage.getItem('flaggedRecurring');
      if (saved) setFlagged(new Set(JSON.parse(saved)));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleFlag = (key: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem('flaggedRecurring', JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  const visible = filter === 'all' ? recurring : recurring.filter((r) => r.frequency === filter);
  const totalMonthly = recurring.reduce((s, r) => s + r.monthlyEquivalent, 0);
  const flaggedTotal = recurring.filter((r) => flagged.has(r.key)).reduce((s, r) => s + r.monthlyEquivalent, 0);
  const annualCost = totalMonthly * 12;

  return (
    <div className="flex-1 p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">Recurring Charges</h1>
        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Auto-detected subscriptions and repeating expenses from your transaction history
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Detected</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{recurring.length}</p>
          <p className="text-xs text-zinc-400 mt-0.5">recurring charges</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Monthly cost</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {currencySymbol}{totalMonthly.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">across all recurring</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Annual cost</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {currencySymbol}{annualCost.toFixed(0)}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">projected per year</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Flagged savings</p>
          <p className="text-2xl font-bold text-red-500 dark:text-red-400 mt-1">
            {currencySymbol}{flaggedTotal.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">{flagged.size} items to cancel</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg p-1 w-fit">
        {(['all', 'monthly', 'weekly', 'annual'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize ${
              filter === f
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {filter === 'all' ? 'All Recurring' : FREQ_LABEL[filter]} · {visible.length} found
          </h2>
          {flagged.size > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold">
              {flagged.size} flagged to cancel
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-sm">
            <div className="text-3xl mb-3 animate-pulse">🔄</div>
            Analyzing your transaction history…
          </div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 dark:text-zinc-600 text-sm">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-medium">No recurring charges detected yet.</p>
            <p className="text-xs mt-1 text-zinc-400">Connect your bank or import 2+ months of statements to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {visible.map((r) => {
              const isFlagged = flagged.has(r.key);
              return (
                <li
                  key={r.key}
                  className={`flex items-center justify-between px-4 md:px-6 py-4 gap-4 transition-colors ${
                    isFlagged
                      ? 'bg-red-50/60 dark:bg-red-900/10'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  {/* Left: icon + info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                        isFlagged
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                      }`}
                    >
                      {r.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate max-w-[160px] md:max-w-none">
                          {r.name}
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${FREQ_COLOR[r.frequency]}`}>
                          {FREQ_LABEL[r.frequency]}
                        </span>
                        {isFlagged && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold">
                            Cancel
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {r.category} · seen {r.occurrences}× · last {r.lastDate}
                      </p>
                    </div>
                  </div>

                  {/* Right: amounts + button */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">
                        {currencySymbol}{r.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {currencySymbol}{r.monthlyEquivalent.toFixed(2)}/mo
                      </p>
                    </div>
                    <button
                      onClick={() => toggleFlag(r.key)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all ${
                        isFlagged
                          ? 'border-red-300 dark:border-red-700 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-red-300 hover:text-red-500 dark:hover:border-red-700 dark:hover:text-red-400'
                      }`}
                    >
                      {isFlagged ? '✕ Unflag' : '⚑ Flag'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Tip */}
      {recurring.length > 0 && (
        <p className="text-xs text-zinc-400 dark:text-zinc-600 text-center">
          Tip: Flag subscriptions you want to cancel to track your potential savings.
          Cancelling flagged items would save {currencySymbol}{flaggedTotal.toFixed(2)}/mo
          ({currencySymbol}{(flaggedTotal * 12).toFixed(0)}/yr).
        </p>
      )}
    </div>
  );
}
