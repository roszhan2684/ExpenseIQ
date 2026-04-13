'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [name, setName] = useState(session?.user?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameStatus, setNameStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [nameError, setNameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const isOAuth = session?.user?.email && !session?.user?.name?.startsWith('credentials');

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setNameStatus('saving');
    setNameError('');
    const res = await fetch('/api/account', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) { setNameError(data.error); setNameStatus('error'); return; }
    await update({ name: data.name });
    setNameStatus('saved');
    setTimeout(() => setNameStatus('idle'), 2500);
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match.'); return; }
    if (newPassword.length < 8) { setPasswordError('Password must be at least 8 characters.'); return; }
    setPasswordStatus('saving');
    const res = await fetch('/api/account', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) { setPasswordError(data.error); setPasswordStatus('error'); return; }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordStatus('saved');
    setTimeout(() => setPasswordStatus('idle'), 2500);
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    await fetch('/api/account', { method: 'DELETE' });
    await signOut({ callbackUrl: '/' });
  };

  return (
    <div className="flex-1 p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Account & Profile</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Manage your personal details and security</p>
      </div>

      {/* Profile info */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center gap-4 mb-6">
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt={session.user.name ?? ''} className="w-16 h-16 rounded-full object-cover ring-2 ring-violet-100 dark:ring-violet-900" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
              {(session?.user?.name ?? 'U')[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-base font-semibold text-zinc-900 dark:text-white">{session?.user?.name}</p>
            <p className="text-sm text-zinc-400">{session?.user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-medium">
              {isOAuth ? 'OAuth account' : 'Email account'}
            </span>
          </div>
        </div>

        <form onSubmit={saveName} className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Edit name</h2>
          {nameError && <p className="text-sm text-red-500">{nameError}</p>}
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="flex-1 px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button type="submit" disabled={nameStatus === 'saving'}
              className="px-4 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-60">
              {nameStatus === 'saving' ? 'Saving...' : nameStatus === 'saved' ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </form>
      </div>

      {/* Change password — only for credentials users */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">Change password</h2>
        {isOAuth ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-600">Password management is not available for accounts signed in with Google, GitHub, or Apple. Your sign-in is managed by your OAuth provider.</p>
        ) : (
          <form onSubmit={savePassword} className="space-y-4 mt-4">
            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
            {passwordStatus === 'saved' && <p className="text-sm text-green-600 dark:text-green-400">✓ Password updated successfully.</p>}
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Current password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">New password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Min. 8 characters"
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Confirm new password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Repeat new password"
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <button type="submit" disabled={passwordStatus === 'saving'}
              className="px-5 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-60">
              {passwordStatus === 'saving' ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}
      </div>

      {/* Connected accounts */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Sign-in method</h2>
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm">
          <span className="text-zinc-400">
            {isOAuth ? '🔗' : '✉'}
          </span>
          <span className="text-zinc-700 dark:text-zinc-300">
            {isOAuth ? `Signed in via OAuth` : `Email & Password`}
          </span>
          <span className="ml-auto text-xs text-zinc-400">{session?.user?.email}</span>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-red-200 dark:border-red-900 p-6">
        <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">Danger zone</h2>
        <p className="text-xs text-zinc-400 mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
        {!showDelete ? (
          <button onClick={() => setShowDelete(true)}
            className="px-4 py-2.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">Type <strong>DELETE</strong> to confirm:</p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3.5 py-2.5 rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
              <button onClick={deleteAccount} disabled={deleteConfirm !== 'DELETE'}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40">
                Permanently delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
