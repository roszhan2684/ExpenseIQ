'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import CreateGroupModal from '@/components/split/CreateGroupModal';

interface SplitGroup {
  _id: string;
  name: string;
  description?: string;
  currency: string;
  members: { id: string; name: string; color: string }[];
  updatedAt: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SplitPage() {
  const [groups, setGroups] = useState<SplitGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/split/groups');
    if (res.ok) setGroups(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Split</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Split expenses with friends & groups</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New group
        </button>
      </div>

      {/* Groups list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-1">No groups yet</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Create a group to start splitting expenses with friends.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            Create your first group
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Link
              key={group._id}
              href={`/split/${group._id}`}
              className="block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-zinc-900 dark:text-white truncate">{group.name}</h3>
                  {group.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{group.description}</p>
                  )}
                </div>
                <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0 ml-3">{timeAgo(group.updatedAt)}</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex -space-x-1.5">
                  {group.members.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      className="w-6 h-6 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center text-white text-[9px] font-bold"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.name[0].toUpperCase()}
                    </div>
                  ))}
                  {group.members.length > 5 && (
                    <div className="w-6 h-6 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center text-zinc-600 dark:text-zinc-300 text-[9px] font-bold">
                      +{group.members.length - 5}
                    </div>
                  )}
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                </span>
                <span className="ml-auto text-xs font-medium text-zinc-400 dark:text-zinc-500">{group.currency}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchGroups(); }}
        />
      )}
    </div>
  );
}
