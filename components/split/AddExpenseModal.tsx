'use client';

import { useState } from 'react';

interface Member { id: string; name: string; color: string }
interface SplitGroup { _id: string; name: string; currency: string; members: Member[] }

interface Props {
  group: SplitGroup;
  onClose: () => void;
  onAdded: () => void;
}

const CATEGORIES = ['Food', 'Transport', 'Accommodation', 'Entertainment', 'Shopping', 'Utilities', 'Other'];

type SplitMode = 'equal' | 'custom';

export default function AddExpenseModal({ group, onClose, onAdded }: Props) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(group.members[0]?.id ?? '');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>(
    Object.fromEntries(group.members.map((m) => [m.id, ''])),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalAmount = parseFloat(amount) || 0;
  const equalShare = group.members.length > 0
    ? Math.round((totalAmount / group.members.length) * 100) / 100
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) { setError('Description required'); return; }
    if (!totalAmount || totalAmount <= 0) { setError('Enter a valid amount'); return; }
    if (!paidBy) { setError('Select who paid'); return; }

    let splits: { memberId: string; amount: number }[];

    if (splitMode === 'equal') {
      splits = group.members.map((m, i) => {
        const last = i === group.members.length - 1;
        return {
          memberId: m.id,
          amount: last
            ? Math.round((totalAmount - equalShare * (group.members.length - 1)) * 100) / 100
            : equalShare,
        };
      });
    } else {
      splits = group.members.map((m) => ({
        memberId: m.id,
        amount: parseFloat(customSplits[m.id] ?? '0') || 0,
      }));
      const sum = splits.reduce((s, sp) => s + sp.amount, 0);
      if (Math.abs(sum - totalAmount) > 0.02) {
        setError(`Custom splits must sum to ${totalAmount.toFixed(2)}. Current: ${sum.toFixed(2)}`);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/split/groups/${group._id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          amount: totalAmount,
          paidBy,
          splits,
          date,
          category: category || undefined,
          notes: notes.trim() || undefined,
          splitMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to add expense'); return; }
      onAdded();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-zinc-400';
  const labelCls = 'block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Add expense</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className={labelCls}>Description</label>
            <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Dinner at Mario's" className={inputCls} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount ({group.currency})</label>
              <input type="number" required min="0.01" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Paid by</label>
            <div className="flex flex-wrap gap-2">
              {group.members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaidBy(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    paidBy === m.id
                      ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 ring-1 ring-violet-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{ backgroundColor: m.color }}>
                    {m.name[0].toUpperCase()}
                  </span>
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Category <span className="text-zinc-400 font-normal">(optional)</span></label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              <option value="">No category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Split mode */}
          <div>
            <label className={labelCls}>Split</label>
            <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 mb-3">
              {(['equal', 'custom'] as SplitMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSplitMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    splitMode === m
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {splitMode === 'equal' ? (
              <div className="space-y-1.5">
                {group.members.map((m, i) => {
                  const last = i === group.members.length - 1;
                  const share = last && totalAmount > 0
                    ? Math.round((totalAmount - equalShare * (group.members.length - 1)) * 100) / 100
                    : equalShare;
                  return (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: m.color }}>
                          {m.name[0].toUpperCase()}
                        </span>
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">{m.name}</span>
                      </div>
                      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        {totalAmount > 0 ? `${group.currency} ${share.toFixed(2)}` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {group.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: m.color }}>
                      {m.name[0].toUpperCase()}
                    </span>
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{m.name}</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={customSplits[m.id]}
                      onChange={(e) => setCustomSplits((prev) => ({ ...prev, [m.id]: e.target.value }))}
                      placeholder="0.00"
                      className="w-24 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-right"
                    />
                  </div>
                ))}
                {totalAmount > 0 && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 text-right">
                    Total: {Object.values(customSplits).reduce((s, v) => s + (parseFloat(v) || 0), 0).toFixed(2)} / {totalAmount.toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Notes <span className="text-zinc-400 font-normal">(optional)</span></label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details" className={inputCls} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'Adding…' : 'Add expense'}
          </button>
        </form>
      </div>
    </div>
  );
}
