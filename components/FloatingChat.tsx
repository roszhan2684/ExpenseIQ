/**
 * components/FloatingChat.tsx
 *
 * A floating AI-chat widget that lives in the bottom-right corner of
 * every authenticated page. Clicking the trigger button opens a compact
 * chat panel where the user can:
 *
 *   • MODE 1 — log a personal transaction ("coffee $6")
 *   • MODE 2 — ask a finance question ("how much on food?")
 *   • MODE 3 — add a split expense ("split dinner $80 with Alice and Bob")
 *
 * The widget is hidden automatically on /chat (the full-page assistant)
 * so the two UIs never overlap. On mobile it sits above the BottomNav.
 *
 * All API calls go through the shared /api/chat route — the same one
 * used by the full chat page, so behaviour is identical.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

/* ─── Type definitions ──────────────────────────────────────────── */

/** A single split-group member slot returned by /api/split/groups */
interface SplitMember {
  id: string;
  name: string;
  userId?: string;
  color: string;
}

/** Minimal shape of a split group used for context passing to the AI */
interface SplitGroup {
  _id: string;
  name: string;
  currency: string;
  members: SplitMember[];
}

/** A personal transaction the AI wants to create (MODE 1) */
interface PendingTx {
  description: string;
  amount: number;
  category: string;
  date: string;
  type: 'income' | 'expense';
}

/** A split expense the AI wants to create (MODE 3) */
interface PendingSplit {
  groupId: string;
  groupName: string;
  expense: {
    description: string;
    amount: number;
    paidByName: string;
    involvedNames: string[];
  };
}

/** A single chat message in the conversation thread */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Pending personal transaction awaiting user confirmation */
  pendingTx?: PendingTx;
  txConfirmed?: boolean;
  txDeclined?: boolean;
  /** Pending split expense awaiting user confirmation */
  pendingSplit?: PendingSplit;
  splitConfirmed?: boolean;
  splitDeclined?: boolean;
}

/* ─── Utility ───────────────────────────────────────────────────── */

/** Generates a short random ID for keying messages */
function uid() {
  return Math.random().toString(36).slice(2);
}

/* ─── Component ─────────────────────────────────────────────────── */

export default function FloatingChat() {
  /* ── visibility ── */
  const pathname = usePathname();
  // Hide the widget when already on the full chat page — redundant UX
  const isOnChatPage = pathname === '/chat';

  /* ── open/close state ── */
  const [open, setOpen] = useState(false);

  /* ── message thread ── */
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  /* ── context loaded from APIs ── */
  const [splitGroups, setSplitGroups] = useState<SplitGroup[]>([]);
  // We'll also pass the user's recent transactions so the AI can answer
  // finance questions. Loaded lazily when the panel first opens.
  const [transactions, setTransactions] = useState<
    { description: string; amount: number; category: string; date: string; type?: string }[]
  >([]);
  const [currency, setCurrency] = useState('USD');
  const [contextLoaded, setContextLoaded] = useState(false);

  /* ── refs ── */
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── load context once when the panel is first opened ── */
  useEffect(() => {
    if (!open || contextLoaded) return;

    (async () => {
      try {
        // Fetch transactions, settings and split groups in parallel
        const [txRes, settingsRes, groupsRes] = await Promise.all([
          fetch('/api/transactions'),
          fetch('/api/user-settings'),
          fetch('/api/split/groups'),
        ]);
        if (txRes.ok) setTransactions(await txRes.json());
        if (settingsRes.ok) {
          const s = await settingsRes.json();
          setCurrency(s.currency ?? 'USD');
        }
        if (groupsRes.ok) setSplitGroups(await groupsRes.json());
      } catch {
        // Non-fatal — AI will just have less context
      } finally {
        setContextLoaded(true);
      }
    })();
  }, [open, contextLoaded]);

  /* ── auto-scroll to the newest message ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* ── focus input when panel opens ── */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  /* ─────────────────────────────────────────────────────────────── */
  /* send — submits a user message and processes the AI response      */
  /* ─────────────────────────────────────────────────────────────── */
  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // Add user bubble immediately for responsive feel
    const userMsg: Message = { id: uid(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Build a short history window (last 6 turns) for multi-turn context
    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          transactions: transactions.slice(0, 200), // cap to keep payload small
          currency,
          history,
          // Pass split groups so the AI can detect split intent (MODE 3)
          splitGroups: splitGroups.map((g) => ({
            id: g._id,
            name: g.name,
            members: g.members.map((m) => ({ id: m.id, name: m.name })),
          })),
        }),
      });

      const data = await res.json();

      if (data.mode === 'transaction' && data.transaction) {
        /* ── MODE 1: personal transaction ── */
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: data.message ?? 'I found a transaction to add:',
            pendingTx: data.transaction as PendingTx,
          },
        ]);
      } else if (data.mode === 'split' && data.groupId && data.expense) {
        /* ── MODE 3: split expense ── */
        const group = splitGroups.find((g) => g._id === data.groupId);
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: data.message ?? 'I found a split expense to add:',
            pendingSplit: {
              groupId: data.groupId,
              groupName: group?.name ?? data.groupId,
              expense: data.expense,
            },
          },
        ]);
      } else {
        /* ── MODE 2: plain answer ── */
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: 'assistant', content: data.message ?? 'Done.' },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', content: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loading, messages, transactions, currency, splitGroups]);

  /* ─────────────────────────────────────────────────────────────── */
  /* confirmTx — saves a pending personal transaction to the DB       */
  /* ─────────────────────────────────────────────────────────────── */
  const confirmTx = useCallback(async (msgId: string, tx: PendingTx) => {
    // Mark the card as accepted immediately so it greys out
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, txConfirmed: true } : m));

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: tx.description,
          amount: tx.amount,
          category: tx.category,
          date: tx.date,
          type: tx.type ?? 'expense',
        }),
      });
      if (res.ok) {
        // Keep the local cache fresh so the next question has current data
        const created = await res.json();
        setTransactions((prev) => [created, ...prev]);
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: `✓ Saved! **${tx.description}** ($${tx.amount.toFixed(2)}) added to your transactions.`,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', content: 'Failed to save — please try again.' },
      ]);
    }
  }, []);

  /** Dismisses a pending transaction without saving */
  const declineTx = useCallback((msgId: string) => {
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, txDeclined: true } : m));
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: 'assistant', content: 'No problem — discarded. Anything else?' },
    ]);
  }, []);

  /* ─────────────────────────────────────────────────────────────── */
  /* confirmSplit — posts a split expense to the group's expense API  */
  /* ─────────────────────────────────────────────────────────────── */
  const confirmSplit = useCallback(async (msgId: string, split: PendingSplit) => {
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, splitConfirmed: true } : m));

    try {
      const group = splitGroups.find((g) => g._id === split.groupId);
      if (!group) throw new Error('Group not found');

      /* Resolve paidByName → a member record.
         "Me" always maps to the currently logged-in user's member slot. */
      const isMe = split.expense.paidByName.toLowerCase() === 'me';
      const paidByMember = isMe
        ? (group.members.find((m) => m.userId != null) ?? group.members[0])
        : (group.members.find(
            (m) => m.name.toLowerCase() === split.expense.paidByName.toLowerCase()
          ) ?? group.members.find((m) => m.userId != null) ?? group.members[0]);

      if (!paidByMember) throw new Error('Could not identify payer');

      /* Resolve involvedNames → the subset of members to split between.
         Falls back to the entire group when the AI returned no names. */
      const involvedMembers =
        split.expense.involvedNames.length > 0
          ? group.members.filter((m) =>
              split.expense.involvedNames.some((n) =>
                n.toLowerCase() === 'me'
                  ? m.userId != null
                  : n.toLowerCase() === m.name.toLowerCase()
              )
            )
          : group.members;

      const involved = involvedMembers.length > 0 ? involvedMembers : group.members;

      /* Build equal-share splits with last-member rounding correction */
      const perPerson =
        Math.round((split.expense.amount / involved.length) * 100) / 100;
      const splits = involved.map((m, i) => {
        const last = i === involved.length - 1;
        const amt = last
          ? Math.round(
              (split.expense.amount - perPerson * (involved.length - 1)) * 100,
            ) / 100
          : perPerson;
        return { memberId: m.id, amount: amt };
      });

      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/split/groups/${split.groupId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: split.expense.description,
          amount: split.expense.amount,
          paidBy: paidByMember.id,
          splits,
          date: today,
        }),
      });

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: `✓ Split added to **${split.groupName}**! ${split.expense.description} — $${split.expense.amount.toFixed(2)} split ${involved.length} ways.`,
          },
        ]);
      } else {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to add split expense');
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: `Failed to add split: ${(e as Error).message}`,
        },
      ]);
    }
  }, [splitGroups]);

  /** Dismisses a pending split without posting */
  const declineSplit = useCallback((msgId: string) => {
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, splitDeclined: true } : m));
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: 'assistant', content: 'No problem — split discarded. Anything else?' },
    ]);
  }, []);

  /* ── keyboard submit ── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  /* ─── Don't render on the full chat page ─────────────────────── */
  if (isOnChatPage) return null;

  /* ─── Render ─────────────────────────────────────────────────── */
  return (
    /**
     * Wrapper: fixed to viewport, above everything (z-50).
     * Mobile: sits above the BottomNav (bottom-[88px]).
     * Desktop: standard bottom-right padding (bottom-6 right-6).
     */
    <div className="fixed bottom-[88px] right-4 lg:bottom-6 lg:right-6 z-50 flex flex-col items-end gap-3">

      {/* ── Chat panel (slides up from the trigger button) ───────── */}
      {open && (
        <div
          className="
            w-[340px] max-w-[calc(100vw-2rem)]
            bg-white dark:bg-zinc-900
            border border-zinc-200 dark:border-zinc-800
            rounded-2xl shadow-2xl shadow-zinc-900/20 dark:shadow-zinc-950/60
            flex flex-col overflow-hidden
            animate-in slide-in-from-bottom-4 fade-in duration-200
          "
          style={{ height: 'min(480px, calc(100vh - 140px))' }}
        >
          {/* ── Panel header ───────────────────────────────────── */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            {/* Brand avatar */}
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-tight">ExpenseIQ AI</p>
              <p className="text-[10px] text-zinc-400 leading-tight">Log expenses · Ask · Split</p>
            </div>
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Close chat"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Messages area ──────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">

            {/* Welcome prompt when no messages yet */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center pb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-0.5">How can I help?</p>
                <p className="text-[10px] text-zinc-400 mb-3 leading-relaxed">
                  Log a purchase, ask about spending,<br />or split an expense with friends.
                </p>
                {/* Quick-action chips */}
                {['Coffee $4.50', 'Split dinner $60 with friends', 'How much on food?'].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => send(ex)}
                    className="w-full text-left text-[10px] px-2.5 py-1.5 mb-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-violet-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors truncate"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}

            {/* Render each message bubble */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[85%] space-y-1.5">

                  {/* Message bubble */}
                  <div
                    className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white rounded-br-sm'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-sm'
                    }`}
                  >
                    {/* Render simple **bold** and bullet points from AI responses */}
                    {msg.content.split('\n').map((line, i) => {
                      const boldLine = line.replace(
                        /\*\*(.+?)\*\*/g,
                        (_, t) => `<strong>${t}</strong>`,
                      );
                      return (
                        <p
                          key={i}
                          className={line.startsWith('•') ? 'ml-1.5' : ''}
                          dangerouslySetInnerHTML={{ __html: boldLine || '&nbsp;' }}
                        />
                      );
                    })}
                  </div>

                  {/* ── Transaction confirmation card (MODE 1) ─── */}
                  {msg.pendingTx && !msg.txConfirmed && !msg.txDeclined && (
                    <div className="bg-white dark:bg-zinc-800 border border-violet-200 dark:border-violet-800 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-2">
                        Confirm transaction
                      </p>
                      <div className="space-y-1 mb-3">
                        {[
                          { label: 'Description', value: msg.pendingTx.description },
                          { label: 'Amount', value: `$${msg.pendingTx.amount.toFixed(2)}` },
                          { label: 'Category', value: msg.pendingTx.category },
                          { label: 'Date', value: msg.pendingTx.date },
                          { label: 'Type', value: msg.pendingTx.type === 'income' ? 'Income' : 'Expense' },
                        ].map((row) => (
                          <div key={row.label} className="flex justify-between text-[10px]">
                            <span className="text-zinc-400">{row.label}</span>
                            <span className="font-semibold text-zinc-900 dark:text-white">{row.value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => confirmTx(msg.id, msg.pendingTx!)}
                          className="flex-1 py-1.5 rounded-lg bg-violet-600 text-white text-[10px] font-bold hover:bg-violet-700 transition-colors"
                        >
                          ✓ Add it
                        </button>
                        <button
                          onClick={() => declineTx(msg.id)}
                          className="flex-1 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-[10px] hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Transaction confirmed badge */}
                  {msg.txConfirmed && (
                    <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Saved to transactions
                    </p>
                  )}

                  {/* ── Split confirmation card (MODE 3) ─────────── */}
                  {msg.pendingSplit && !msg.splitConfirmed && !msg.splitDeclined && (
                    <div className="bg-white dark:bg-zinc-800 border border-violet-200 dark:border-violet-800 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <svg className="w-3 h-3 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide">
                          Confirm split
                        </p>
                      </div>
                      <div className="space-y-1 mb-3">
                        {[
                          { label: 'Group', value: msg.pendingSplit.groupName },
                          { label: 'Description', value: msg.pendingSplit.expense.description },
                          { label: 'Amount', value: `$${msg.pendingSplit.expense.amount.toFixed(2)}` },
                          { label: 'Paid by', value: msg.pendingSplit.expense.paidByName },
                          {
                            label: 'Split with',
                            value:
                              msg.pendingSplit.expense.involvedNames.length > 0
                                ? msg.pendingSplit.expense.involvedNames.join(', ')
                                : 'Everyone',
                          },
                        ].map((row) => (
                          <div key={row.label} className="flex justify-between text-[10px] gap-2">
                            <span className="text-zinc-400 shrink-0">{row.label}</span>
                            <span className="font-semibold text-zinc-900 dark:text-white text-right truncate max-w-[55%]">{row.value}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => confirmSplit(msg.id, msg.pendingSplit!)}
                          className="flex-1 py-1.5 rounded-lg bg-violet-600 text-white text-[10px] font-bold hover:bg-violet-700 transition-colors"
                        >
                          ✓ Add split
                        </button>
                        <button
                          onClick={() => declineSplit(msg.id)}
                          className="flex-1 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-[10px] hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Split confirmed badge */}
                  {msg.splitConfirmed && (
                    <p className="text-[10px] text-violet-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Added to split group
                    </p>
                  )}

                </div>
              </div>
            ))}

            {/* Typing indicator — three bouncing dots */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1 items-center h-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Invisible sentinel div — we scroll here on new messages */}
            <div ref={bottomRef} />
          </div>

          {/* ── Input bar ──────────────────────────────────────── */}
          <div className="shrink-0 px-3 py-2.5 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='e.g. "lunch $12" or "split $60 with Alice"'
                disabled={loading}
                className="
                  flex-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700
                  bg-zinc-50 dark:bg-zinc-800
                  text-xs text-zinc-900 dark:text-white
                  placeholder-zinc-400
                  focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
                  disabled:opacity-50 transition
                "
              />
              {/* Send button */}
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                aria-label="Send message"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Trigger button (always visible) ───────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="
          w-14 h-14 rounded-full
          bg-gradient-to-br from-violet-500 to-indigo-600
          text-white shadow-lg shadow-violet-500/40
          flex items-center justify-center
          hover:scale-105 active:scale-95 transition-transform
          focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
        "
        aria-label={open ? 'Close AI chat' : 'Open AI chat'}
      >
        {open ? (
          /* X icon when panel is open */
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          /* Spark / lightbulb icon when closed */
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )}
      </button>

    </div>
  );
}
