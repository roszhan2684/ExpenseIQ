'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface GroupSummary {
  groupId: string;
  groupName: string;
  currency: string;
  memberCount: number;
  myBalance: number;
}

interface DashboardData {
  totalOwed: number;
  totalOwe: number;
  groups: GroupSummary[];
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

export default function SplitBalanceWidget() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/split/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
      <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-3" />
      <div className="space-y-2">
        {[1, 2].map((i) => <div key={i} className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  if (!data) return null;

  const hasGroups = data.groups.length > 0;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Split Groups</h3>
        </div>
        <Link href="/split" className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium">
          View all
        </Link>
      </div>

      {!hasGroups ? (
        <div className="px-4 pb-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">No groups yet.</p>
          <Link
            href="/split"
            className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create a group
          </Link>
        </div>
      ) : (
        <div className="px-4 pb-4 space-y-2">
          {/* Summary pills — only when there's an open balance */}
          {(data.totalOwed > 0 || data.totalOwe > 0) && (
            <div className="flex gap-2 mb-1">
              {data.totalOwed > 0 && (
                <div className="flex-1 flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2">
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">You are owed</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    +{fmt(data.totalOwed, 'USD')}
                  </span>
                </div>
              )}
              {data.totalOwe > 0 && (
                <div className="flex-1 flex items-center justify-between bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">You owe</span>
                  <span className="text-sm font-bold text-red-500">-{fmt(data.totalOwe, 'USD')}</span>
                </div>
              )}
            </div>
          )}

          {/* All groups */}
          <div className="space-y-1">
            {data.groups.slice(0, 4).map((g) => {
              const settled = Math.abs(g.myBalance) <= 0.01;
              return (
                <Link
                  key={g.groupId}
                  href={`/split/${g.groupId}`}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {g.groupName}
                      </p>
                      <p className="text-[10px] text-zinc-400">{g.memberCount} members</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ml-2 ${
                    settled
                      ? 'text-zinc-400'
                      : g.myBalance > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-500'
                  }`}>
                    {settled
                      ? 'Settled'
                      : `${g.myBalance > 0 ? '+' : ''}${fmt(g.myBalance, g.currency)}`}
                  </span>
                </Link>
              );
            })}
            {data.groups.length > 4 && (
              <Link href="/split" className="block text-center text-xs text-zinc-400 hover:text-violet-500 py-1 transition-colors">
                +{data.groups.length - 4} more groups
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
