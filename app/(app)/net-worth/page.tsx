'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { CURRENCIES, AppSettings } from '@/lib/types';

interface NetWorthItem {
  id: string;
  name: string;
  value: number;
  type: 'asset' | 'liability';
  category: string;
}

interface Snapshot {
  month: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

const ASSET_CATEGORIES = ['Cash & Savings', 'Investments', 'Real Estate', 'Vehicle', 'Retirement', 'Other Asset'];
const LIABILITY_CATEGORIES = ['Credit Card', 'Student Loan', 'Car Loan', 'Mortgage', 'Personal Loan', 'Other Liability'];

const ASSET_ICONS: Record<string, string> = {
  'Cash & Savings': '💵', Investments: '📈', 'Real Estate': '🏠', Vehicle: '🚗',
  Retirement: '🏦', 'Other Asset': '📦',
};
const LIABILITY_ICONS: Record<string, string> = {
  'Credit Card': '💳', 'Student Loan': '🎓', 'Car Loan': '🚙',
  Mortgage: '🏡', 'Personal Loan': '📋', 'Other Liability': '📄',
};

const DEFAULT_FORM = { name: '', value: '', type: 'asset' as 'asset' | 'liability', category: 'Cash & Savings' };

export default function NetWorthPage() {
  const [items, setItems] = useState<NetWorthItem[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const load = useCallback(async () => {
    const [nwRes, settingsRes] = await Promise.all([
      fetch('/api/net-worth'),
      fetch('/api/user-settings'),
    ]);
    if (nwRes.ok) {
      const d = await nwRes.json();
      setItems(d.items ?? []);
      setSnapshots(d.snapshots ?? []);
    }
    if (settingsRes.ok) {
      const s: AppSettings = await settingsRes.json();
      const cur = CURRENCIES.find((c) => c.code === s.currency);
      setCurrencySymbol(cur?.symbol ?? '$');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalAssets = items.filter((i) => i.type === 'asset').reduce((s, i) => s + i.value, 0);
  const totalLiabilities = items.filter((i) => i.type === 'liability').reduce((s, i) => s + i.value, 0);
  const netWorth = totalAssets - totalLiabilities;
  const isPositive = netWorth >= 0;

  const addItem = async () => {
    if (!form.name.trim() || !form.value || Number(form.value) <= 0) return;
    setSaving(true);
    const res = await fetch('/api/net-worth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, value: Number(form.value), type: form.type, category: form.category }),
    });
    if (res.ok) {
      const created: NetWorthItem = await res.json();
      setItems((prev) => [...prev, created]);
      setForm(DEFAULT_FORM);
      setShowForm(false);
      // Refresh snapshots
      const nwRes = await fetch('/api/net-worth');
      if (nwRes.ok) { const d = await nwRes.json(); setSnapshots(d.snapshots ?? []); }
    }
    setSaving(false);
  };

  const updateValue = async (id: string) => {
    const val = Number(editValue);
    if (!val || val <= 0) return;
    await fetch('/api/net-worth', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, value: val }),
    });
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, value: val } : i));
    setEditId(null);
    // Refresh snapshots
    const nwRes = await fetch('/api/net-worth');
    if (nwRes.ok) { const d = await nwRes.json(); setSnapshots(d.snapshots ?? []); }
  };

  const deleteItem = async (id: string) => {
    await fetch(`/api/net-worth?id=${id}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((i) => i.id !== id));
    const nwRes = await fetch('/api/net-worth');
    if (nwRes.ok) { const d = await nwRes.json(); setSnapshots(d.snapshots ?? []); }
  };

  const fmt = (n: number) => `${currencySymbol}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const assets = items.filter((i) => i.type === 'asset');
  const liabilities = items.filter((i) => i.type === 'liability');

  const chartData = snapshots.map((s) => ({
    label: s.month,
    'Net Worth': s.netWorth,
    Assets: s.totalAssets,
    Liabilities: s.totalLiabilities,
  }));

  const categories = form.type === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;

  return (
    <div className="flex-1 p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">Net Worth</h1>
          <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Total assets minus liabilities — your true financial picture
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 text-white text-xs md:text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm shrink-0"
        >
          <span className="text-base leading-none">+</span> Add item
        </button>
      </div>

      {/* Net worth hero */}
      <div className={`rounded-2xl p-6 text-white ${isPositive ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
        <p className="text-sm font-medium opacity-80">Total Net Worth</p>
        <p className="text-4xl font-extrabold mt-1 tracking-tight">
          {isPositive ? '' : '-'}{fmt(Math.abs(netWorth))}
        </p>
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div>
            <p className="opacity-70 text-xs">Total Assets</p>
            <p className="font-bold">{fmt(totalAssets)}</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <p className="opacity-70 text-xs">Total Liabilities</p>
            <p className="font-bold">{fmt(totalLiabilities)}</p>
          </div>
          {snapshots.length >= 2 && (() => {
            const last = snapshots[snapshots.length - 1]?.netWorth ?? 0;
            const prev = snapshots[snapshots.length - 2]?.netWorth ?? 0;
            const diff = last - prev;
            return diff !== 0 ? (
              <>
                <div className="w-px h-8 bg-white/20" />
                <div>
                  <p className="opacity-70 text-xs">vs last month</p>
                  <p className={`font-bold ${diff > 0 ? 'text-white' : 'text-red-200'}`}>
                    {diff > 0 ? '+' : ''}{fmt(diff)}
                  </p>
                </div>
              </>
            ) : null;
          })()}
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-violet-200 dark:border-violet-800 p-5 space-y-4">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">Add asset or liability</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Type toggle */}
            <div className="sm:col-span-2 flex gap-2">
              {(['asset', 'liability'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, type: t, category: t === 'asset' ? ASSET_CATEGORIES[0] : LIABILITY_CATEGORIES[0] }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors capitalize ${
                    form.type === t
                      ? t === 'asset'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-red-500 border-red-500 text-white'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {t === 'asset' ? '+ Asset' : '- Liability'}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Name (e.g. Chase Savings)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <input
              type="number"
              placeholder="Value"
              min="0"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              className="px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="sm:col-span-2 px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addItem}
              disabled={saving || !form.name.trim() || !form.value}
              className="flex-1 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Add item'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(DEFAULT_FORM); }}
              className="px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-6">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Net Worth Over Time</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:[&>line]:stroke-zinc-800" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => `${currencySymbol}${Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
              <Tooltip formatter={(v) => [`${currencySymbol}${Number(v).toLocaleString()}`, '']} />
              <Area type="monotone" dataKey="Net Worth" stroke="#10b981" strokeWidth={2.5} fill="url(#nwGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-zinc-400 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-zinc-400 dark:text-zinc-600">
          <div className="text-4xl mb-3">💼</div>
          <p className="font-medium text-zinc-500 dark:text-zinc-400">No items yet</p>
          <p className="text-xs mt-1">Add your first asset or liability to start tracking net worth.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Assets */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Assets
              </h2>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalAssets)}</span>
            </div>
            {assets.length === 0 ? (
              <p className="px-6 py-8 text-xs text-zinc-400 text-center">No assets added yet</p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {assets.map((item) => (
                  <li key={item.id} className="flex items-center justify-between px-4 md:px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{ASSET_ICONS[item.category] ?? '📦'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{item.name}</p>
                        <p className="text-xs text-zinc-400">{item.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {editId === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-28 px-2 py-1 text-xs rounded border border-violet-300 dark:border-violet-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none"
                            autoFocus
                          />
                          <button onClick={() => updateValue(item.id)} className="text-xs px-2 py-1 rounded bg-violet-600 text-white hover:bg-violet-700">✓</button>
                          <button onClick={() => setEditId(null)} className="text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500">✕</button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(item.value)}</span>
                          <button onClick={() => { setEditId(item.id); setEditValue(String(item.value)); }} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs">✎</button>
                          <button onClick={() => deleteItem(item.id)} className="text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 text-base">×</button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Liabilities */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Liabilities
              </h2>
              <span className="text-sm font-bold text-red-500 dark:text-red-400">{fmt(totalLiabilities)}</span>
            </div>
            {liabilities.length === 0 ? (
              <p className="px-6 py-8 text-xs text-zinc-400 text-center">No liabilities added yet</p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {liabilities.map((item) => (
                  <li key={item.id} className="flex items-center justify-between px-4 md:px-6 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{LIABILITY_ICONS[item.category] ?? '📄'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{item.name}</p>
                        <p className="text-xs text-zinc-400">{item.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {editId === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-28 px-2 py-1 text-xs rounded border border-violet-300 dark:border-violet-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none"
                            autoFocus
                          />
                          <button onClick={() => updateValue(item.id)} className="text-xs px-2 py-1 rounded bg-violet-600 text-white hover:bg-violet-700">✓</button>
                          <button onClick={() => setEditId(null)} className="text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500">✕</button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-red-500 dark:text-red-400">{fmt(item.value)}</span>
                          <button onClick={() => { setEditId(item.id); setEditValue(String(item.value)); }} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs">✎</button>
                          <button onClick={() => deleteItem(item.id)} className="text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 text-base">×</button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
