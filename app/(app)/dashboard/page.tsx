'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Transaction, CURRENCIES, CATEGORY_COLORS, CategoryBudget } from '@/lib/types';
import { computeMonthlyStats, getTransactionsForMonth, getAllCategories } from '@/lib/storage';
import { AppSettings } from '@/lib/types';
import AddTransactionModal from '@/components/AddTransactionModal';
import StatementUploadModal from '@/components/StatementUploadModal';
import SpendingDonut from '@/components/SpendingDonut';
import PlaidLinkButton from '@/components/PlaidLinkButton';
import SplitBalanceWidget from '@/components/split/SplitBalanceWidget';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

interface LinkedItem {
  id: string;
  itemId: string;
  institutionName: string;
  lastSyncAt: string | null;
  status: 'active' | 'error' | 'disconnected';
  accounts: { accountId: string; name: string; type: string; mask?: string }[];
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never synced';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [loading, setLoading] = useState(true);
  const [linkedItems, setLinkedItems] = useState<LinkedItem[]>([]);
  const [syncingItem, setSyncingItem] = useState<string | null>(null);
  const [unlinkingItem, setUnlinkingItem] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    const res = await fetch('/api/user-settings');
    if (!res.ok) return;
    const s: AppSettings = await res.json();
    setCategories(getAllCategories(s));
    setBudgets(s.budgets ?? []);
    const cur = CURRENCIES.find((c) => c.code === s.currency);
    setCurrencySymbol(cur?.symbol ?? '$');
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/transactions');
    if (!res.ok) { setLoading(false); return; }
    const data: Transaction[] = await res.json();
    setAllTransactions(data);
    setLoading(false);
  }, []);

  const fetchLinkedItems = useCallback(async () => {
    const res = await fetch('/api/plaid/items');
    if (res.ok) setLinkedItems(await res.json());
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchTransactions();
    fetchLinkedItems();
  }, [fetchSettings, fetchTransactions, fetchLinkedItems]);

  useEffect(() => {
    setTransactions(getTransactionsForMonth(allTransactions, selectedYear, selectedMonth));
  }, [allTransactions, selectedYear, selectedMonth]);

  const stats = computeMonthlyStats(transactions);
  const donutData = Object.entries(stats.byCategory).map(([name, value]) => ({ name, value }));

  const handleAdd = async (tx: Omit<Transaction, 'id'>) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });
    if (!res.ok) return;
    const created: Transaction = await res.json();
    setAllTransactions((prev) => [created, ...prev]);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    setAllTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleImport = (imported: Transaction[]) => {
    setAllTransactions((prev) => [...imported, ...prev]);
  };

  const handleBankLinked = useCallback(
    (result: { institution: string; accounts: number; transactionsSynced: number }) => {
      // Refresh both transactions and linked items after successful link
      fetchTransactions();
      fetchLinkedItems();
      console.log(
        `[plaid] Linked "${result.institution}": ${result.accounts} accounts, ${result.transactionsSynced} transactions`
      );
    },
    [fetchTransactions, fetchLinkedItems]
  );

  const handleSync = async (itemId: string) => {
    setSyncingItem(itemId);
    try {
      await fetch('/api/plaid/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      await Promise.all([fetchTransactions(), fetchLinkedItems()]);
    } finally {
      setSyncingItem(null);
    }
  };

  const handleUnlink = async (itemId: string) => {
    if (!confirm('Unlink this bank? Your existing transactions will be kept.')) return;
    setUnlinkingItem(itemId);
    try {
      await fetch(`/api/plaid/items/${itemId}`, { method: 'DELETE' });
      await fetchLinkedItems();
    } finally {
      setUnlinkingItem(null);
    }
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
  const netIsPositive = stats.netBalance >= 0;

  // ── Spending streak (current month only) ───────────────────────────────────
  const streak = useMemo(() => {
    const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
    if (totalBudget === 0 || !isCurrentMonth) return null;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyBudget = totalBudget / daysInMonth;
    const byDay = new Map<string, number>();
    for (const tx of transactions) {
      if ((tx.type ?? 'expense') !== 'expense') continue;
      byDay.set(tx.date, (byDay.get(tx.date) ?? 0) + tx.amount);
    }
    let count = 0;
    for (let d = now.getDate(); d >= 1; d--) {
      const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const spent = byDay.get(key) ?? 0;
      if (spent <= dailyBudget) count++;
      else break;
    }
    return { count, dailyBudget };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, budgets, isCurrentMonth]);

  return (
    <div className="flex-1 p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
          <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Track your spending at a glance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <PlaidLinkButton onLinked={handleBankLinked} />
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs md:text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span className="hidden sm:inline">Import Statement</span>
            <span className="sm:hidden">Import</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 text-white text-xs md:text-sm font-medium hover:bg-violet-700 transition-colors shadow-sm"
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Connected Banks */}
      {linkedItems.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Connected Banks</p>
          <div className="space-y-2">
            {linkedItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{item.institutionName}</p>
                    <p className="text-xs text-zinc-400">
                      {item.accounts.map((a) => `${a.name}${a.mask ? ` ••${a.mask}` : ''}`).join(' · ')}
                      {' · '}
                      <span className={item.status === 'error' ? 'text-red-500' : ''}>
                        {item.status === 'error' ? '⚠ Re-link required' : `Synced ${timeAgo(item.lastSyncAt)}`}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleSync(item.itemId)}
                    disabled={syncingItem === item.itemId}
                    className="text-xs px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                  >
                    {syncingItem === item.itemId ? 'Syncing…' : '↻ Sync'}
                  </button>
                  <button
                    onClick={() => handleUnlink(item.itemId)}
                    disabled={unlinkingItem === item.itemId}
                    className="text-xs px-3 py-1.5 rounded-md text-zinc-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 transition-colors"
                  >
                    Unlink
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month Selector */}
      <div className="flex items-center gap-3">
        <button onClick={goToPrevMonth} className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm">‹</button>
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 w-36 text-center">
          {MONTH_NAMES[selectedMonth]} {selectedYear}
        </span>
        <button onClick={goToNextMonth} className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm">›</button>
        {!isCurrentMonth && (
          <button onClick={() => { setSelectedYear(now.getFullYear()); setSelectedMonth(now.getMonth()); }} className="text-xs text-violet-600 dark:text-violet-400 hover:underline">
            Back to current
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className={`grid gap-4 ${streak ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Total Earned</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{currencySymbol}{stats.totalIncome.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">{transactions.filter(t => t.type === 'income').length} income transactions</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Total Spent</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{currencySymbol}{stats.totalExpense.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">{transactions.filter(t => (t.type ?? 'expense') === 'expense').length} expense transactions</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Net Balance</p>
          <p className={`text-2xl font-bold mt-1 ${netIsPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            {netIsPositive ? '+' : ''}{currencySymbol}{stats.netBalance.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">{netIsPositive ? 'surplus this month' : 'deficit this month'}</p>
        </div>
        {streak && (
          <div className={`rounded-xl border p-5 ${streak.count >= 7 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : streak.count >= 3 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'}`}>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Budget Streak</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl">{streak.count >= 7 ? '🔥' : streak.count >= 3 ? '✨' : '🌱'}</span>
              <p className={`text-2xl font-bold ${streak.count >= 7 ? 'text-amber-600 dark:text-amber-400' : streak.count >= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>
                {streak.count} day{streak.count !== 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {streak.count === 0 ? 'No streak — stay under budget today!' : `under ${currencySymbol}${streak.dailyBudget.toFixed(0)}/day`}
            </p>
          </div>
        )}
      </div>

      {/* Split Balance Widget */}
      <SplitBalanceWidget />

      {/* Chart + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Spending by Category</h2>
          <SpendingDonut data={donutData} currencySymbol={currencySymbol} />
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Category Breakdown</h2>
          {donutData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-zinc-400 dark:text-zinc-600 text-sm">No expenses this month</div>
          ) : (
            <div className="space-y-3 overflow-auto max-h-64 pr-1">
              {donutData.sort((a, b) => b.value - a.value).map((item) => {
                const pct = stats.totalExpense > 0 ? (item.value / stats.totalExpense) * 100 : 0;
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[item.name] ?? '#94a3b8' }} />
                        <span className="text-zinc-700 dark:text-zinc-300">{item.name}</span>
                      </div>
                      <span className="text-zinc-900 dark:text-white font-medium">
                        {currencySymbol}{item.value.toFixed(2)}<span className="text-zinc-400 ml-1">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: CATEGORY_COLORS[item.name] ?? '#94a3b8' }} />
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
        {loading ? (
          <div className="px-6 py-12 text-center text-zinc-400 text-sm">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="px-6 py-12 text-center text-zinc-400 dark:text-zinc-600 text-sm">
            No transactions for {MONTH_NAMES[selectedMonth]}. Add one or connect your bank!
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {transactions.map((tx) => {
              const isIncome = tx.type === 'income';
              const isPlaid = tx.source === 'plaid';
              return (
                <li key={tx.id} className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${isIncome ? 'bg-emerald-500' : ''}`}
                      style={isIncome ? {} : { background: CATEGORY_COLORS[tx.category] ?? '#94a3b8' }}
                    >
                      {isIncome ? '+' : tx.category.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{tx.description}</p>
                        {tx.pending && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">pending</span>
                        )}
                        {isPlaid && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400">bank</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{tx.category} · {tx.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>
                      {isIncome ? '+' : '-'}{currencySymbol}{tx.amount.toFixed(2)}
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
              );
            })}
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

      {showImport && (
        <StatementUploadModal
          currencySymbol={currencySymbol}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
