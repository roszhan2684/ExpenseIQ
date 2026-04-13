'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getTransactions,
  addTransaction,
  deleteTransaction,
  getSettings,
  getAllCategories,
  getTransactionsForMonth,
  computeMonthlyStats,
} from '@/lib/storage';
import { Transaction, CURRENCIES, CATEGORY_COLORS } from '@/lib/types';
import AddTransactionModal from '@/components/AddTransactionModal';
import SpendingDonut from '@/components/SpendingDonut';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  const loadData = useCallback(() => {
    const txs = getTransactions();
    const settings = getSettings();
    setTransactions(txs);
    setCategories(getAllCategories(settings));
    const cur = CURRENCIES.find((c) => c.code === settings.currency);
    setCurrencySymbol(cur?.symbol ?? '$');
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const monthTransactions = getTransactionsForMonth(transactions, selectedYear, selectedMonth);
  const stats = computeMonthlyStats(monthTransactions);

  const donutData = Object.entries(stats.byCategory).map(([name, value]) => ({ name, value }));

  const handleAdd = async (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = { ...tx, id: crypto.randomUUID() };
    const updated = addTransaction(newTx);
    setTransactions(updated);
  };

  const handleDelete = (id: string) => {
    const updated = deleteTransaction(id);
    setTransactions(updated);
  };

  const goToPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  };
  const goToNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  };

  const now = new Date();
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Track your spending at a glance
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm"
        >
          <span className="text-lg leading-none">+</span> Add Transaction
        </button>
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
        {!isCurrentMonth && (
          <button
            onClick={() => { setSelectedYear(now.getFullYear()); setSelectedMonth(now.getMonth()); }}
            className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
          >
            Back to current
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Total Spent</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {currencySymbol}{stats.total.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">{monthTransactions.length} transactions</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Daily Average</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {currencySymbol}{stats.dailyAverage.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">per day</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            {isCurrentMonth ? 'Projected Total' : 'Month Total'}
          </p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {currencySymbol}{stats.projectedTotal.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {isCurrentMonth ? 'by end of month' : 'final'}
          </p>
        </div>
      </div>

      {/* Chart + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Spending by Category</h2>
          <SpendingDonut data={donutData} currencySymbol={currencySymbol} />
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Category Breakdown</h2>
          {donutData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-zinc-400 dark:text-zinc-600 text-sm">
              No transactions this month
            </div>
          ) : (
            <div className="space-y-3 overflow-auto max-h-64 pr-1">
              {donutData
                .sort((a, b) => b.value - a.value)
                .map((item) => {
                  const pct = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                  return (
                    <div key={item.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: CATEGORY_COLORS[item.name] ?? '#94a3b8' }}
                          />
                          <span className="text-zinc-700 dark:text-zinc-300">{item.name}</span>
                        </div>
                        <span className="text-zinc-900 dark:text-white font-medium">
                          {currencySymbol}{item.value.toFixed(2)}
                          <span className="text-zinc-400 ml-1">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: CATEGORY_COLORS[item.name] ?? '#94a3b8',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Transactions</h2>
        </div>
        {monthTransactions.length === 0 ? (
          <div className="px-6 py-12 text-center text-zinc-400 dark:text-zinc-600 text-sm">
            No transactions for {MONTH_NAMES[selectedMonth]}. Add one!
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {monthTransactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: CATEGORY_COLORS[tx.category] ?? '#94a3b8' }}
                  >
                    {tx.category.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{tx.description}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{tx.category} · {tx.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                    -{currencySymbol}{tx.amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 transition-colors text-base"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showModal && (
        <AddTransactionModal
          categories={categories}
          currencySymbol={currencySymbol}
          onAdd={handleAdd}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
