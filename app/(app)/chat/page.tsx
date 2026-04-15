'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction, CURRENCIES, AppSettings } from '@/lib/types';
import { getAllCategories } from '@/lib/storage';

interface PendingTx {
  description: string;
  amount: number;
  category: string;
  date: string;
  type: 'income' | 'expense';
}

interface SplitMember {
  id: string;
  name: string;
  userId?: string;
  color: string;
}

interface SplitGroup {
  _id: string;
  name: string;
  currency: string;
  members: SplitMember[];
}

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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pendingTx?: PendingTx;
  txConfirmed?: boolean;
  txDeclined?: boolean;
  pendingSplit?: PendingSplit;
  splitConfirmed?: boolean;
  splitDeclined?: boolean;
}

const EXAMPLES = [
  'Coffee at Starbucks $6.50',
  'Spent $45 on groceries today',
  'Got paid $3,200 salary',
  'Split dinner $80 with Alice and Bob',
  'How much did I spend on food this month?',
  'What are my top 3 biggest expenses?',
  'Show me all subscriptions I paid',
  'Am I spending more than last month?',
];

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [splitGroups, setSplitGroups] = useState<SplitGroup[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const voiceTextRef = useRef('');
  const [listening, setListening] = useState(false);

  // Load transactions + settings + split groups on mount
  const loadContext = useCallback(async () => {
    const [txRes, settingsRes, groupsRes] = await Promise.all([
      fetch('/api/transactions'),
      fetch('/api/user-settings'),
      fetch('/api/split/groups'),
    ]);
    if (txRes.ok) setTransactions(await txRes.json());
    if (settingsRes.ok) {
      const s: AppSettings = await settingsRes.json();
      setCategories(getAllCategories(s));
      const cur = CURRENCIES.find((c) => c.code === s.currency);
      setCurrencySymbol(cur?.symbol ?? '$');
      setCurrencyCode(s.currency);
    }
    if (groupsRes.ok) setSplitGroups(await groupsRes.json());
  }, []);

  useEffect(() => { loadContext(); }, [loadContext]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: uid(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Build history for the API (exclude pending tx state — just text)
    const history = messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          transactions: transactions.slice(0, 300),
          currency: currencyCode,
          categories,
          history,
          splitGroups: splitGroups.map((g) => ({
            id: g._id,
            name: g.name,
            members: g.members.map((m) => ({ id: m.id, name: m.name })),
          })),
        }),
      });
      const data = await res.json();

      if (data.mode === 'transaction' && data.transaction) {
        const assistantMsg: Message = {
          id: uid(),
          role: 'assistant',
          content: data.message ?? 'I found a transaction to add:',
          pendingTx: data.transaction as PendingTx,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else if (data.mode === 'split' && data.groupId && data.expense) {
        const group = splitGroups.find((g) => g._id === data.groupId);
        const assistantMsg: Message = {
          id: uid(),
          role: 'assistant',
          content: data.message ?? 'I found a split expense to add:',
          pendingSplit: {
            groupId: data.groupId,
            groupName: group?.name ?? data.groupId,
            expense: data.expense,
          },
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const assistantMsg: Message = {
          id: uid(),
          role: 'assistant',
          content: data.message ?? 'Done.',
        };
        setMessages((prev) => [...prev, assistantMsg]);
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
  }, [loading, messages, transactions, currencyCode, categories, splitGroups]);

  const confirmTx = useCallback(async (msgId: string, tx: PendingTx) => {
    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, txConfirmed: true } : m)
    );
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
        const created: Transaction = await res.json();
        setTransactions((prev) => [created, ...prev]);
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: `✓ Saved! **${tx.description}** (${currencySymbol}${tx.amount.toFixed(2)}) added to your ${tx.date} transactions.`,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', content: 'Failed to save the transaction. Please try again.' },
      ]);
    }
  }, [currencySymbol]);

  const declineTx = useCallback((msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, txDeclined: true } : m)
    );
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: 'assistant', content: "No problem — transaction discarded. Anything else?" },
    ]);
  }, []);

  const confirmSplit = useCallback(async (msgId: string, split: PendingSplit) => {
    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, splitConfirmed: true } : m)
    );
    try {
      const group = splitGroups.find((g) => g._id === split.groupId);
      if (!group) throw new Error('Group not found');

      // Resolve paidByName → member (prefer logged-in user slot when "Me")
      const isMe = split.expense.paidByName.toLowerCase() === 'me';
      const paidByMember = isMe
        ? (group.members.find((m) => m.userId != null) ?? group.members[0])
        : (group.members.find((m) => m.name.toLowerCase() === split.expense.paidByName.toLowerCase())
            ?? group.members.find((m) => m.userId != null)
            ?? group.members[0]);

      if (!paidByMember) throw new Error('Could not find payer member');

      // Resolve involvedNames → involved members
      const involvedMembers = split.expense.involvedNames.length > 0
        ? group.members.filter((m) =>
            split.expense.involvedNames.some((n) =>
              n.toLowerCase() === 'me'
                ? m.userId != null
                : n.toLowerCase() === m.name.toLowerCase()
            )
          )
        : group.members; // all members if none specified

      const involved = involvedMembers.length > 0 ? involvedMembers : group.members;

      // Build equal splits for involved members
      const perPerson = Math.round((split.expense.amount / involved.length) * 100) / 100;
      const splits = involved.map((m, i) => {
        const last = i === involved.length - 1;
        const amt = last
          ? Math.round((split.expense.amount - perPerson * (involved.length - 1)) * 100) / 100
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
            content: `✓ Split expense added to **${split.groupName}**! ${split.expense.description} — $${split.expense.amount.toFixed(2)} paid by ${isMe ? 'you' : split.expense.paidByName}, split ${involved.length} ways.`,
          },
        ]);
      } else {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to add split expense');
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', content: `Failed to add split expense: ${(e as Error).message}` },
      ]);
    }
  }, [splitGroups]);

  const declineSplit = useCallback((msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, splitDeclined: true } : m)
    );
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: 'assistant', content: "No problem — split discarded. Anything else?" },
    ]);
  }, []);

  const toggleVoice = useCallback(() => {
    if (listening) {
      // Stop → send everything accumulated so far
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setListening(false);
      const text = voiceTextRef.current.trim();
      voiceTextRef.current = '';
      if (text) send(text);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Voice input is not supported in this browser. Try Chrome or Safari.');
      return;
    }
    voiceTextRef.current = '';
    const rec = new SR();
    rec.continuous = true;       // stay on until user taps stop
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => setListening(true);
    rec.onresult = (e: { results: SpeechRecognitionResultList; resultIndex: number }) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          voiceTextRef.current = (voiceTextRef.current + ' ' + t).trim();
        } else {
          interim = t;
        }
      }
      setInput((voiceTextRef.current + (interim ? ' ' + interim : '')).trim());
    };
    // Only stop on actual error (not on natural end, since continuous=true keeps it open)
    rec.onerror = (e: { error: string }) => {
      if (e.error !== 'aborted') setListening(false);
    };
    recognitionRef.current = rec;
    rec.start();
  }, [listening, send]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-900 dark:text-white">Finance Assistant</h1>
            <p className="text-xs text-zinc-400">Add transactions or ask anything about your money</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-zinc-400">{transactions.length} transactions loaded</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
        {/* Welcome + examples */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-violet-900/40">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">What can I help with?</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Type a purchase to log it, or ask about your spending
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => send(ex)}
                  className="text-left text-xs px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-violet-300 hover:text-violet-600 dark:hover:border-violet-700 dark:hover:text-violet-400 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] md:max-w-[70%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
              {/* Assistant avatar */}
              {msg.role === 'assistant' && (
                <div className="flex items-end gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    AI
                  </div>
                </div>
              )}

              {/* Bubble */}
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white rounded-br-md'
                    : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-bl-md'
                }`}
              >
                {/* Render with simple markdown: **bold**, bullet points */}
                {msg.content.split('\n').map((line, i) => {
                  const boldLine = line.replace(/\*\*(.+?)\*\*/g, (_, t) => `<strong>${t}</strong>`);
                  return (
                    <p
                      key={i}
                      className={line.startsWith('•') ? 'ml-2' : ''}
                      dangerouslySetInnerHTML={{ __html: boldLine || '&nbsp;' }}
                    />
                  );
                })}
              </div>

              {/* Transaction confirmation card */}
              {msg.pendingTx && !msg.txConfirmed && !msg.txDeclined && (
                <div className="mt-2 bg-white dark:bg-zinc-800 border border-violet-200 dark:border-violet-800 rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-3 uppercase tracking-wide">
                    Confirm transaction
                  </p>
                  <div className="space-y-1.5 mb-4">
                    {[
                      { label: 'Description', value: msg.pendingTx.description },
                      { label: 'Amount', value: `${currencySymbol}${msg.pendingTx.amount.toFixed(2)}` },
                      { label: 'Category', value: msg.pendingTx.category },
                      { label: 'Date', value: msg.pendingTx.date },
                      { label: 'Type', value: msg.pendingTx.type === 'income' ? 'Income' : 'Expense' },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">{row.label}</span>
                        <span className="font-semibold text-zinc-900 dark:text-white">{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmTx(msg.id, msg.pendingTx!)}
                      className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors"
                    >
                      ✓ Add it
                    </button>
                    <button
                      onClick={() => declineTx(msg.id)}
                      className="flex-1 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}

              {/* Confirmed badge */}
              {msg.txConfirmed && (
                <div className="mt-1.5 flex items-center gap-1 text-xs text-emerald-500">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Saved to transactions
                </div>
              )}

              {/* Split confirmation card */}
              {msg.pendingSplit && !msg.splitConfirmed && !msg.splitDeclined && (
                <div className="mt-2 bg-white dark:bg-zinc-800 border border-violet-200 dark:border-violet-800 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-md bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                      <svg className="w-3 h-3 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">
                      Confirm split expense
                    </p>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    {[
                      { label: 'Group', value: msg.pendingSplit.groupName },
                      { label: 'Description', value: msg.pendingSplit.expense.description },
                      { label: 'Amount', value: `$${msg.pendingSplit.expense.amount.toFixed(2)}` },
                      { label: 'Paid by', value: msg.pendingSplit.expense.paidByName },
                      {
                        label: 'Split with',
                        value: msg.pendingSplit.expense.involvedNames.length > 0
                          ? msg.pendingSplit.expense.involvedNames.join(', ')
                          : 'Everyone in group',
                      },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">{row.label}</span>
                        <span className="font-semibold text-zinc-900 dark:text-white text-right max-w-[60%] truncate">{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmSplit(msg.id, msg.pendingSplit!)}
                      className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors"
                    >
                      ✓ Add split
                    </button>
                    <button
                      onClick={() => declineSplit(msg.id)}
                      className="flex-1 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}

              {/* Split confirmed badge */}
              {msg.splitConfirmed && (
                <div className="mt-1.5 flex items-center gap-1 text-xs text-violet-500">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Added to split group
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-end gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                AI
              </div>
              <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={listening ? 'Listening…' : 'e.g. "lunch $12" or "how much on food?"'}
              disabled={loading}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 transition ${
                listening
                  ? 'border-red-400 bg-red-50 dark:bg-red-950/20 dark:border-red-700'
                  : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800'
              }`}
            />
            {listening && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5 items-end h-4">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="w-0.5 rounded-full bg-red-500 animate-bounce"
                    style={{ height: '60%', animationDelay: `${d}ms` }}
                  />
                ))}
              </span>
            )}
          </div>
          {/* Mic button */}
          <button
            onClick={toggleVoice}
            disabled={loading}
            title={listening ? 'Stop listening' : 'Speak your message'}
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              listening
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            {listening ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
          {/* Send button */}
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[10px] text-zinc-400 mt-1.5">
          {listening ? '🎤 Speak now — tap mic to stop' : 'Enter to send · Tap mic to speak · AI may make mistakes'}
        </p>
      </div>
    </div>
  );
}
