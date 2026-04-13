'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  getTransactions,
  getSettings,
  getTransactionsForMonth,
  computeMonthlyStats,
} from '@/lib/storage';
import { Transaction, CURRENCIES, CATEGORY_COLORS, CategoryBudget } from '@/lib/types';

const MONTH_NAMES = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

export default function Analytics() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);

  const loadData = useCallback(() => {
    const txs = getTransactions();
    const settings = getSettings();
    setTransactions(txs);
    setBudgets(settings.budgets ?? []);
    const cur = CURRENCIES.find((c) => c.code === settings.currency);
    setCurrencySymbol(cur?.symbol ?? '$');
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const monthTransactions = getTransactionsForMonth(transactions, selectedYear, selectedMonth);
  const stats = computeMonthlyStats(monthTransactions);

  // 12-month spending trend
  const trendData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(selectedYear, selectedMonth - 11 + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const txs = getTransactionsForMonth(transactions, y, m);
    const total = txs.reduce((s, t) => s + t.amount, 0);
    return { month: MONTH_NAMES[m], total };
  });

  // Budget alerts
  const overBudget = budgets.filter((b) => {
    const spent = stats.byCategory[b.category] ?? 0;
    return spent > b.limit;
  });

  const goToPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  };
  const goToNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Analytics</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Deeper insights into your spending</p>
      </div>

      {/* Month Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={goToPrevMonth}
          className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 w-36 text-center">
          {MONTH_NAMES[selectedMonth]} {selectedYear}
        </span>
        <button
          onClick={goToNextMonth}
          className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm"
        >
          ›
        </button>
      </div>

      {/* Over-budget Alerts */}
      {overBudget.length > 0 && (
        <div className="space-y-2">
          {overBudget.map((b) => {
            const spent = stats.byCategory[b.category] ?? 0;
            return (
              <div
                key={b.category}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              >
                <span className="text-red-500 text-lg">⚠</span>
                <div className="text-sm">
                  <span className="font-semibold text-red-700 dark:text-red-400">{b.category}</span>
                  <span className="text-red-600 dark:text-red-400">
                    {' '}is over budget — spent {currencySymbol}{spent.toFixed(2)} of {currencySymbol}{b.limit.toFixed(2)} limit
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 12-month Trend */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">12-Month Spending Trend</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={trendData} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${currencySymbol}${v}`} />
            <Tooltip
              formatter={(v) => [`${currencySymbol}${Number(v).toFixed(2)}`, 'Spent']}
              contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e4e4e7' }}
            />
            <Bar dataKey="total" fill="#7c3aed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Budget Progress */}
      {budgets.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Budget Progress</h2>
          <div className="space-y-4">
            {budgets.map((b) => {
              const spent = stats.byCategory[b.category] ?? 0;
              const pct = Math.min(100, (spent / b.limit) * 100);
              const over = spent > b.limit;
              return (
                <div key={b.category}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: CATEGORY_COLORS[b.category] ?? '#94a3b8' }}
                      />
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">{b.category}</span>
                    </div>
                    <span className={`font-medium ${over ? 'text-red-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                      {currencySymbol}{spent.toFixed(2)} / {currencySymbol}{b.limit.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: over ? '#ef4444' : (CATEGORY_COLORS[b.category] ?? '#7c3aed'),
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top 5 Transactions */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Top 5 Biggest Transactions</h2>
        {stats.topTransactions.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-600">No transactions this month.</p>
        ) : (
          <div className="space-y-2">
            {stats.topTransactions.map((tx, i) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{tx.description}</p>
                    <p className="text-xs text-zinc-400">{tx.category} · {tx.date}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                  -{currencySymbol}{tx.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Daily Average</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {currencySymbol}{stats.dailyAverage.toFixed(2)}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Projected Month-End</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {currencySymbol}{stats.projectedTotal.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
