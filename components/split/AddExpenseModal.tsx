'use client';

import { useState, useRef, useEffect } from 'react';

interface Member { id: string; name: string; color: string }
interface SplitGroup { _id: string; name: string; currency: string; members: Member[] }

interface Props {
  group: SplitGroup;
  onClose: () => void;
  onAdded: () => void;
  // Pre-fill from AI chat
  prefill?: {
    description: string;
    amount: number;
    paidByName?: string;
    involvedNames?: string[];
  };
}

const CATEGORIES = ['Food', 'Transport', 'Accommodation', 'Entertainment', 'Shopping', 'Utilities', 'Other'];

type SplitMode = 'equal' | 'custom';

/** Parse @Name tags from a description string and return matched member ids */
function extractTaggedMembers(text: string, members: Member[]): string[] {
  const tagged = new Set<string>();
  const matches = text.match(/@([\w\s]+?)(?=\s@|\s\$|\s\d|$|[,.])/g);
  if (!matches) return [];
  for (const match of matches) {
    const name = match.slice(1).trim().toLowerCase();
    const found = members.find((m) => m.name.toLowerCase() === name);
    if (found) tagged.add(found.id);
  }
  return [...tagged];
}

export default function AddExpenseModal({ group, onClose, onAdded, prefill }: Props) {
  const [description, setDescription] = useState(prefill?.description ?? '');
  const [amount, setAmount] = useState(prefill?.amount ? prefill.amount.toString() : '');
  const [paidBy, setPaidBy] = useState(() => {
    if (prefill?.paidByName) {
      const m = group.members.find(
        (m) => m.name.toLowerCase() === prefill.paidByName!.toLowerCase()
      );
      if (m) return m.id;
    }
    return group.members[0]?.id ?? '';
  });
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>(
    Object.fromEntries(group.members.map((m) => [m.id, ''])),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // @ mention state
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionAnchor, setMentionAnchor] = useState(0); // index of '@' in description
  const descRef = useRef<HTMLInputElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);

  // Which members are actively involved (from @ tags or prefill)
  const taggedIds = extractTaggedMembers(description, group.members);
  const involvedMembers = taggedIds.length > 0
    ? group.members.filter((m) => taggedIds.includes(m.id))
    : group.members;

  // Auto-select involved members from prefill
  useEffect(() => {
    if (prefill?.involvedNames?.length) {
      // Build description with @ tags for prefilled involved members
      const tags = prefill.involvedNames
        .map((name) => {
          const m = group.members.find(
            (m) => m.name.toLowerCase() === name.toLowerCase()
          );
          return m ? `@${m.name}` : null;
        })
        .filter(Boolean)
        .join(' ');
      if (tags && !prefill.description.includes('@')) {
        setDescription(`${prefill.description} ${tags}`.trim());
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close mention dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (mentionRef.current && !mentionRef.current.contains(e.target as Node)) {
        setMentionOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDescription(val);

    // Detect @ trigger
    const cursor = e.target.selectionStart ?? val.length;
    const textBefore = val.slice(0, cursor);
    const atMatch = textBefore.match(/@([\w ]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1].toLowerCase());
      setMentionAnchor(cursor - atMatch[0].length);
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
    }
  };

  const handleMentionSelect = (member: Member) => {
    const before = description.slice(0, mentionAnchor);
    const after = description.slice(mentionAnchor + 1 + mentionQuery.length);
    const newDesc = `${before}@${member.name}${after.startsWith(' ') ? '' : ' '}${after}`;
    setDescription(newDesc.trim() + ' ');
    setMentionOpen(false);
    setMentionQuery('');
    descRef.current?.focus();
  };

  const filteredMentions = group.members.filter((m) =>
    m.name.toLowerCase().startsWith(mentionQuery)
  );

  const totalAmount = parseFloat(amount) || 0;
  const splitMembers = involvedMembers;
  const equalShare = splitMembers.length > 0
    ? Math.round((totalAmount / splitMembers.length) * 100) / 100
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) { setError('Description required'); return; }
    if (!totalAmount || totalAmount <= 0) { setError('Enter a valid amount'); return; }
    if (!paidBy) { setError('Select who paid'); return; }

    let splits: { memberId: string; amount: number }[];

    if (splitMode === 'equal') {
      splits = splitMembers.map((m, i) => {
        const last = i === splitMembers.length - 1;
        return {
          memberId: m.id,
          amount: last
            ? Math.round((totalAmount - equalShare * (splitMembers.length - 1)) * 100) / 100
            : equalShare,
        };
      });
    } else {
      splits = group.members.map((m) => ({
        memberId: m.id,
        amount: parseFloat(customSplits[m.id] ?? '0') || 0,
      })).filter((s) => s.amount > 0);
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

          {/* Description with @ mention */}
          <div className="relative">
            <label className={labelCls}>
              Description
              <span className="ml-1.5 text-zinc-400 font-normal">· type @ to tag members</span>
            </label>
            <input
              ref={descRef}
              type="text"
              required
              value={description}
              onChange={handleDescriptionChange}
              placeholder="e.g. Dinner @John @Sarah"
              className={inputCls}
              autoFocus={!prefill}
              autoComplete="off"
            />

            {/* @ mention dropdown */}
            {mentionOpen && filteredMentions.length > 0 && (
              <div
                ref={mentionRef}
                className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg z-50 overflow-hidden"
              >
                {filteredMentions.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleMentionSelect(m); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors text-left"
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.name[0].toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{m.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Tagged members chips */}
            {taggedIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-[10px] text-zinc-400 self-center">Splitting with:</span>
                {involvedMembers.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
                    style={{ backgroundColor: m.color }}
                  >
                    {m.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Amount ({group.currency})</label>
              <input
                type="number" required min="0.01" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" className={inputCls}
              />
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
            <div className="flex items-center justify-between mb-2">
              <label className={`${labelCls} mb-0`}>
                Split
                {taggedIds.length > 0 && (
                  <span className="ml-1.5 text-violet-500 font-normal">
                    ({involvedMembers.length} tagged)
                  </span>
                )}
              </label>
              <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                {(['equal', 'custom'] as SplitMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSplitMode(m)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                      splitMode === m
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {splitMode === 'equal' ? (
              <div className="space-y-1.5">
                {splitMembers.map((m, i) => {
                  const last = i === splitMembers.length - 1;
                  const share = last && totalAmount > 0
                    ? Math.round((totalAmount - equalShare * (splitMembers.length - 1)) * 100) / 100
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
                {taggedIds.length > 0 && taggedIds.length < group.members.length && (
                  <p className="text-[10px] text-violet-500 px-1">
                    Only splitting with tagged members · {group.members.length - taggedIds.length} others excluded
                  </p>
                )}
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
