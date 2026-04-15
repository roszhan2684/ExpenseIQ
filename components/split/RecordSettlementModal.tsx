'use client';

import { useState } from 'react';

interface Member { id: string; name: string; color: string }
interface SplitGroup { _id: string; currency: string; members: Member[] }
interface Debt { from: string; fromName: string; to: string; toName: string; amount: number }

interface Props {
  group: SplitGroup;
  prefilledDebt: Debt | null;
  onClose: () => void;
  onSettled: () => void;
}

export default function RecordSettlementModal({ group, prefilledDebt, onClose, onSettled }: Props) {
  const [fromMemberId, setFromMemberId] = useState(prefilledDebt?.from ?? group.members[0]?.id ?? '');
  const [toMemberId, setToMemberId] = useState(prefilledDebt?.to ?? group.members[1]?.id ?? '');
  const [amount, setAmount] = useState(prefilledDebt ? prefilledDebt.amount.toString() : '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (fromMemberId === toMemberId) { setError('From and to must be different members'); return; }

    setLoading(true);
    try {
      const res = await fetch(`/api/split/groups/${group._id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromMemberId,
          toMemberId,
          amount: amt,
          date,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to record settlement'); return; }
      onSettled();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-zinc-400';
  const labelCls = 'block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5';

  const fromMember = group.members.find((m) => m.id === fromMemberId);
  const toMember = group.members.find((m) => m.id === toMemberId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Record settlement</h2>
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

          {/* Visual flow */}
          <div className="flex items-center justify-center gap-3 py-3">
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: fromMember?.color ?? '#7c3aed' }}>
                {fromMember?.name[0].toUpperCase() ?? '?'}
              </div>
              <span className="text-xs text-zinc-500">{fromMember?.name ?? '—'}</span>
              <span className="text-[10px] text-zinc-400">pays</span>
            </div>
            <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: toMember?.color ?? '#059669' }}>
                {toMember?.name[0].toUpperCase() ?? '?'}
              </div>
              <span className="text-xs text-zinc-500">{toMember?.name ?? '—'}</span>
              <span className="text-[10px] text-zinc-400">receives</span>
            </div>
          </div>

          <div>
            <label className={labelCls}>From (who is paying)</label>
            <select value={fromMemberId} onChange={(e) => setFromMemberId(e.target.value)} className={inputCls}>
              {group.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>To (who receives)</label>
            <select value={toMemberId} onChange={(e) => setToMemberId(e.target.value)} className={inputCls}>
              {group.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount ({group.currency})</label>
              <input type="number" required min="0.01" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes <span className="text-zinc-400 font-normal">(optional)</span></label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cash payment" className={inputCls} />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'Recording…' : 'Record settlement'}
          </button>
        </form>
      </div>
    </div>
  );
}
