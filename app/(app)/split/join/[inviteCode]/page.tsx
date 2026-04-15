'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface GroupPreview {
  groupId: string;
  name: string;
  description?: string;
  currency: string;
  memberCount: number;
  memberNames: string[];
}

export default function JoinGroupPage({ params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = use(params);
  const router = useRouter();

  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    fetch(`/api/split/join/${inviteCode}`)
      .then(async (res) => {
        if (!res.ok) { setInvalid(true); return; }
        setPreview(await res.json());
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [inviteCode]);

  const handleJoin = async () => {
    setJoining(true);
    setError('');
    try {
      const res = await fetch(`/api/split/join/${inviteCode}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        // If unauthorized, redirect to login with return URL
        if (res.status === 401) {
          router.push(`/login?callbackUrl=/split/join/${inviteCode}`);
          return;
        }
        setError(data.error ?? 'Failed to join group');
        return;
      }
      router.push(`/split/${data.groupId}`);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  if (invalid) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Invite link expired</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
          This invite link is invalid or has been disabled. Ask the group owner for a new one.
        </p>
        <Link href="/split" className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors">
          Go to Split
        </Link>
      </div>
    </div>
  );

  if (!preview) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xl">
          {/* Banner */}
          <div className="h-2 bg-gradient-to-r from-violet-500 to-indigo-500" />

          <div className="p-6">
            <div className="flex items-center justify-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <svg className="w-7 h-7 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>

            <h1 className="text-xl font-bold text-zinc-900 dark:text-white text-center mb-1">
              You&apos;re invited!
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-5">
              Join this split group on ExpenseIQ
            </p>

            {/* Group info */}
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 mb-5">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-0.5">{preview.name}</h2>
              {preview.description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">{preview.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {preview.memberCount} member{preview.memberCount !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-zinc-400">·</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{preview.currency}</span>
              </div>
              {preview.memberNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {preview.memberNames.slice(0, 6).map((name, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300">
                      {name}
                    </span>
                  ))}
                  {preview.memberNames.length > 6 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-400">
                      +{preview.memberNames.length - 6} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-colors disabled:opacity-60"
            >
              {joining ? 'Joining…' : 'Join group'}
            </button>

            <p className="text-center text-xs text-zinc-400 mt-3">
              You need an ExpenseIQ account to join.{' '}
              <Link href="/register" className="text-violet-500 hover:underline">Sign up free</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
