'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Transaction, CURRENCIES, AppSettings } from '@/lib/types';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface MonthRow {
  key: string;         // "2025-12"
  label: string;       // "Dec 2025"
  earned: number;
  spent: number;
  net: number;
  running: number;
}

function fmt(symbol: string, n: number) {
  return `${symbol}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BalancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [symbol, setSymbol] = useState('$');
  const [startingBalance, setStartingBalance] = useState('');
  const startingBalanceRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [txRes, settingsRes] = await Promise.all([
      fetch('/api/transactions'),
      fetch('/api/user-settings'),
    ]);
    if (txRes.ok) setTransactions(await txRes.json());
    if (settingsRes.ok) {
      const s: AppSettings = await settingsRes.json();
      const cur = CURRENCIES.find((c) => c.code === s.currency);
      setSymbol(cur?.symbol ?? '$');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Build month rows ────────────────────────────────────────────────────────

  const rows: MonthRow[] = (() => {
    if (transactions.length === 0) return [];

    // Group by YYYY-MM
    const map: Record<string, { earned: number; spent: number }> = {};
    for (const t of transactions) {
      const key = t.date.slice(0, 7); // "2025-12"
      if (!map[key]) map[key] = { earned: 0, spent: 0 };
      if (t.type === 'income') map[key].earned += t.amount;
      else map[key].spent += t.amount;
    }

    const sorted = Object.keys(map).sort();
    const base = parseFloat(startingBalance) || 0;
    let running = base;

    return sorted.map((key) => {
      const { earned, spent } = map[key];
      const net = earned - spent;
      running += net;
      const [yyyy, mm] = key.split('-');
      return {
        key,
        label: `${MONTH_NAMES[parseInt(mm) - 1]} ${yyyy}`,
        earned,
        spent,
        net,
        running,
      };
    });
  })();

  const totalEarned = rows.reduce((s, r) => s + r.earned, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const finalBalance = rows[rows.length - 1]?.running ?? 0;

  const chartData = rows.map((r) => ({
    month: r.label.slice(0, 3) + ' ' + r.key.slice(2, 4),
    balance: parseFloat(r.running.toFixed(2)),
    earned: parseFloat(r.earned.toFixed(2)),
    spent: parseFloat(r.spent.toFixed(2)),
  }));

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Running Balance</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Month-by-month earnings and spending with running total
          </p>
        </div>

        {/* Starting balance input */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
            Starting balance
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">{symbol}</span>
            <input
              ref={startingBalanceRef}
              type="number"
              step="0.01"
              placeholder="0.00"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              className="pl-7 pr-3 py-2 w-36 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-16 text-center">
          <p className="text-zinc-400">No transactions yet. Add some to see your balance history.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Total Earned</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(symbol, totalEarned)}</p>
              <p className="text-xs text-zinc-400 mt-1">across {rows.length} month{rows.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-red-500 dark:text-red-400">{fmt(symbol, totalSpent)}</p>
              <p className="text-xs text-zinc-400 mt-1">all time expenses</p>
            </div>
            <div className={`rounded-2xl border p-5 ${
              finalBalance >= 0
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Current Balance</p>
              <p className={`text-2xl font-bold ${
                finalBalance >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'
              }`}>
                {finalBalance < 0 ? '-' : ''}{fmt(symbol, finalBalance)}
              </p>
              <p className="text-xs text-zinc-400 mt-1">running total</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Balance Over Time</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${symbol}${(v as number).toLocaleString()}`}
                  width={70}
                />
                <Tooltip
                  formatter={(v: number) => [`${symbol}${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Balance']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#balanceGrad)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Month-by-month table */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Month</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Earned</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Spent</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Net</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.key}
                      className={`border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors ${
                        i === rows.length - 1 ? 'font-medium' : ''
                      }`}
                    >
                      <td className="px-5 py-3.5 text-zinc-700 dark:text-zinc-300">{row.label}</td>
                      <td className="px-5 py-3.5 text-right text-emerald-600 dark:text-emerald-400">
                        {row.earned > 0 ? `+${fmt(symbol, row.earned)}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right text-zinc-600 dark:text-zinc-400">
                        {row.spent > 0 ? fmt(symbol, row.spent) : '—'}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-medium ${
                        row.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                      }`}>
                        {row.net >= 0 ? `+${fmt(symbol, row.net)}` : `-${fmt(symbol, row.net)}`}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-semibold ${
                        row.running >= 0 ? 'text-violet-700 dark:text-violet-300' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {row.running < 0 ? '-' : ''}{fmt(symbol, row.running)}
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-t-2 border-zinc-200 dark:border-zinc-700">
                    <td className="px-5 py-3.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">All time</td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      +{fmt(symbol, totalEarned)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-zinc-700 dark:text-zinc-300">
                      {fmt(symbol, totalSpent)}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-bold ${
                      totalEarned - totalSpent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                    }`}>
                      {totalEarned - totalSpent >= 0
                        ? `+${fmt(symbol, totalEarned - totalSpent)}`
                        : `-${fmt(symbol, totalEarned - totalSpent)}`}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-bold ${
                      finalBalance >= 0 ? 'text-violet-700 dark:text-violet-300' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {finalBalance < 0 ? '-' : ''}{fmt(symbol, finalBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
