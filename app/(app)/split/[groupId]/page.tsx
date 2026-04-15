'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import AddExpenseModal from '@/components/split/AddExpenseModal';
import RecordSettlementModal from '@/components/split/RecordSettlementModal';

interface Member { id: string; name: string; color: string; email?: string; userId?: string }
interface SplitShare { memberId: string; amount: number; paid: boolean }
interface SplitExpense {
  _id: string;
  type: 'expense' | 'settlement';
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  splits: SplitShare[];
  date: string;
  category?: string;
  notes?: string;
}
interface SplitGroup {
  _id: string;
  ownerId: string;
  name: string;
  description?: string;
  currency: string;
  members: Member[];
}
interface Debt { from: string; fromName: string; to: string; toName: string; amount: number }
interface Balance { memberId: string; memberName: string; net: number }

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function dateStr(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type Tab = 'expenses' | 'balances';

export default function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);

  const [group, setGroup] = useState<SplitGroup | null>(null);
  const [expenses, setExpenses] = useState<SplitExpense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const [settleDebt, setSettleDebt] = useState<Debt | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [gRes, eRes, bRes] = await Promise.all([
      fetch(`/api/split/groups/${groupId}`),
      fetch(`/api/split/groups/${groupId}/expenses`),
      fetch(`/api/split/groups/${groupId}/balances`),
    ]);
    if (gRes.ok) setGroup(await gRes.json());
    if (eRes.ok) setExpenses(await eRes.json());
    if (bRes.ok) {
      const bd = await bRes.json();
      setDebts(bd.debts ?? []);
      setBalances(bd.balances ?? []);
    }
    setLoading(false);
  }, [groupId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    setDeletingId(id);
    await fetch(`/api/split/groups/${groupId}/expenses/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    fetchAll();
  };

  const handleSettle = (debt: Debt) => {
    setSettleDebt(debt);
    setShowSettle(true);
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="h-8 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
      <div className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
    </div>
  );

  if (!group) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <p className="text-zinc-500">Group not found.</p>
      <Link href="/split" className="mt-4 inline-block text-violet-600 text-sm hover:underline">← Back to Split</Link>
    </div>
  );

  const memberMap = new Map(group.members.map((m) => [m.id, m]));
  const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/split" className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white truncate">{group.name}</h1>
          {group.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{group.description}</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Total spent</p>
          <p className="text-base font-bold text-zinc-900 dark:text-white">{fmt(totalExpenses, group.currency)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Members</p>
          <p className="text-base font-bold text-zinc-900 dark:text-white">{group.members.length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Pending</p>
          <p className="text-base font-bold text-zinc-900 dark:text-white">{debts.length}</p>
        </div>
      </div>

      {/* Members row */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {group.members.map((m) => (
          <div key={m.id} className="flex flex-col items-center gap-1 shrink-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: m.color }}
            >
              {m.name[0].toUpperCase()}
            </div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-[48px] truncate text-center">{m.name}</span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setShowAddExpense(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add expense
        </button>
        <button
          onClick={() => { setSettleDebt(null); setShowSettle(true); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Settle up
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 mb-4">
        {(['expenses', 'balances'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'expenses' && (
        <div className="space-y-2">
          {expenses.length === 0 ? (
            <div className="text-center py-10 text-zinc-400 dark:text-zinc-500 text-sm">
              No expenses yet. Add one above.
            </div>
          ) : expenses.map((exp) => {
            const payer = memberMap.get(exp.paidBy);
            const isSettlement = exp.type === 'settlement';
            return (
              <div
                key={exp._id}
                className={`bg-white dark:bg-zinc-900 rounded-2xl border p-4 ${
                  isSettlement
                    ? 'border-emerald-200 dark:border-emerald-800/50'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSettlement ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-violet-100 dark:bg-violet-900/30'
                    }`}>
                      {isSettlement
                        ? <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        : <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{exp.description}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {isSettlement ? 'Settlement' : `Paid by ${payer?.name ?? 'Unknown'}`} · {dateStr(exp.date)}
                      </p>
                      {!isSettlement && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {exp.splits.map((s) => {
                            const m = memberMap.get(s.memberId);
                            return (
                              <span key={s.memberId} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: m?.color }} />
                                {m?.name ?? '?'}: {fmt(s.amount, exp.currency)}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-base font-bold ${isSettlement ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'}`}>
                      {fmt(exp.amount, exp.currency)}
                    </span>
                    <button
                      onClick={() => handleDeleteExpense(exp._id)}
                      disabled={deletingId === exp._id}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'balances' && (
        <div className="space-y-4">
          {/* Simplified debts */}
          {debts.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Who owes who</h3>
              <div className="space-y-2">
                {debts.map((debt, i) => {
                  const from = memberMap.get(debt.from);
                  const to = memberMap.get(debt.to);
                  return (
                    <div key={i} className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: from?.color }}>
                          {debt.fromName[0].toUpperCase()}
                        </div>
                        <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: to?.color }}>
                          {debt.toName[0].toUpperCase()}
                        </div>
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          <span className="font-medium">{debt.fromName}</span>
                          <span className="text-zinc-400"> owes </span>
                          <span className="font-medium">{debt.toName}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-red-500">{fmt(debt.amount, group.currency)}</span>
                        <button
                          onClick={() => handleSettle(debt)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                        >
                          Settle
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {debts.length === 0 && (
            <div className="text-center py-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/50">
              <svg className="w-8 h-8 text-emerald-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">All settled up!</p>
            </div>
          )}

          {/* Per-member balances */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Member balances</h3>
            <div className="space-y-2">
              {balances.map((b) => {
                const m = memberMap.get(b.memberId);
                return (
                  <div key={b.memberId} className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: m?.color }}>
                        {b.memberName[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{b.memberName}</span>
                    </div>
                    <span className={`text-sm font-bold ${
                      b.net > 0.01 ? 'text-emerald-600 dark:text-emerald-400' :
                      b.net < -0.01 ? 'text-red-500' : 'text-zinc-400'
                    }`}>
                      {b.net > 0.01 ? '+' : ''}{fmt(b.net, group.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showAddExpense && (
        <AddExpenseModal
          group={group}
          onClose={() => setShowAddExpense(false)}
          onAdded={() => { setShowAddExpense(false); fetchAll(); }}
        />
      )}

      {showSettle && (
        <RecordSettlementModal
          group={group}
          prefilledDebt={settleDebt}
          onClose={() => { setShowSettle(false); setSettleDebt(null); }}
          onSettled={() => { setShowSettle(false); setSettleDebt(null); fetchAll(); }}
        />
      )}
    </div>
  );
}
