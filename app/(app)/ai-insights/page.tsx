'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTransactionsForMonth } from '@/lib/storage';
import { Transaction, CURRENCIES, AppSettings } from '@/lib/types';

type InsightType = 'summary' | 'roast' | 'suggestions' | 'personality';

const INSIGHTS = [
  { type: 'summary' as InsightType, label: 'Monthly Summary', icon: '📊', description: 'Clear breakdown of spending patterns and key takeaways.', buttonLabel: 'Generate Summary' },
  { type: 'roast' as InsightType, label: 'Roast My Spending', icon: '🔥', description: 'Brutally funny but genuinely helpful critique of your choices.', buttonLabel: 'Roast Me' },
  { type: 'suggestions' as InsightType, label: 'Cost-Cutting Tips', icon: '✂️', description: 'Top 3 actionable suggestions to reduce spending this month.', buttonLabel: 'Get Suggestions' },
  { type: 'personality' as InsightType, label: 'Spending Personality', icon: '🧠', description: 'Discover your spending archetype based on where money goes.', buttonLabel: 'Find My Type' },
];

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function AIInsights() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [selectedMonth] = useState(new Date().getMonth());
  const [selectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState<InsightType | null>(null);
  const [results, setResults] = useState<Record<InsightType, string | null>>({ summary: null, roast: null, suggestions: null, personality: null });
  const [errors, setErrors] = useState<Record<InsightType, string | null>>({ summary: null, roast: null, suggestions: null, personality: null });

  const loadData = useCallback(async () => {
    const [txRes, settingsRes] = await Promise.all([fetch('/api/transactions'), fetch('/api/user-settings')]);
    if (txRes.ok) setAllTransactions(await txRes.json());
    if (settingsRes.ok) {
      const s: AppSettings = await settingsRes.json();
      setCurrency(s.currency ?? 'USD');
      const cur = CURRENCIES.find((c) => c.code === s.currency);
      setCurrencySymbol(cur?.symbol ?? '$');
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const monthTransactions = getTransactionsForMonth(allTransactions, selectedYear, selectedMonth);

  const runInsight = async (type: InsightType) => {
    if (monthTransactions.length === 0) { setErrors((p) => ({ ...p, [type]: 'No transactions this month. Add some first!' })); return; }
    setLoading(type);
    setErrors((p) => ({ ...p, [type]: null }));
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: type, transactions: monthTransactions, currency: currencySymbol }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults((p) => ({ ...p, [type]: data.result }));
    } catch (err: unknown) {
      setErrors((p) => ({ ...p, [type]: err instanceof Error ? err.message : 'Something went wrong' }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">AI Insights</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Claude-powered analysis for {MONTH_NAMES[selectedMonth]} {selectedYear}</p>
      </div>
      {monthTransactions.length === 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
          <span>⚠</span><span>No transactions for this month. Add some to get AI insights.</span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {INSIGHTS.map((insight) => {
          const result = results[insight.type];
          const error = errors[insight.type];
          const isLoading = loading === insight.type;
          return (
            <div key={insight.type} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{insight.icon}</span>
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{insight.label}</h2>
                      <p className="text-xs text-zinc-400 mt-0.5">{insight.description}</p>
                    </div>
                  </div>
                  <button onClick={() => runInsight(insight.type)} disabled={isLoading || monthTransactions.length === 0}
                    className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ml-3">
                    {isLoading ? '...' : result ? 'Refresh' : insight.buttonLabel}
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 min-h-[120px]">
                {isLoading && <div className="flex items-center gap-2 text-sm text-zinc-400"><div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /><span>Asking Claude...</span></div>}
                {!isLoading && error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
                {!isLoading && result && <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{result}</div>}
                {!isLoading && !result && !error && <p className="text-sm text-zinc-400 dark:text-zinc-600">Click &ldquo;{insight.buttonLabel}&rdquo; to generate insights using Claude AI.</p>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-600">
        <span>✦</span><span>Powered by Claude claude-sonnet-4-20250514 · {monthTransactions.length} transactions analyzed · {currency}</span>
      </div>
    </div>
  );
}
