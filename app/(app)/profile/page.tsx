'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

type PasswordStep = 'form' | 'otp' | 'done';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [name, setName] = useState(session?.user?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [passwordStep, setPasswordStep] = useState<PasswordStep>('form');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [nameStatus, setNameStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'sending' | 'verifying' | 'error'>('idle');
  const [nameError, setNameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const isOAuth = !!(session?.user?.email && (session?.user as { provider?: string })?.provider !== 'credentials');

  const startCooldown = () => {
    setResendCooldown(60);
    const iv = setInterval(() => setResendCooldown((p) => { if (p <= 1) { clearInterval(iv); return 0; } return p - 1; }), 1000);
  };

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setNameStatus('saving');
    setNameError('');
    const res = await fetch('/api/account', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) { setNameError(data.error); setNameStatus('error'); return; }
    await update({ name: data.name });
    setNameStatus('saved');
    setTimeout(() => setNameStatus('idle'), 2500);
  };

  const requestPasswordOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match.'); return; }
    if (newPassword.length < 8) { setPasswordError('Password must be at least 8 characters.'); return; }
    setPasswordStatus('sending');
    const res = await fetch('/api/auth/send-password-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword }),
    });
    const data = await res.json();
    if (!res.ok) { setPasswordError(data.error); setPasswordStatus('error'); return; }
    setPasswordStep('otp');
    setPasswordStatus('idle');
    startCooldown();
  };

  const verifyAndUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) { setPasswordError('Enter the 6-digit code.'); return; }
    setPasswordStatus('verifying');
    setPasswordError('');
    const res = await fetch('/api/account', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword, otp: otpCode }),
    });
    const data = await res.json();
    if (!res.ok) { setPasswordError(data.error); setPasswordStatus('error'); return; }
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setOtpCode('');
    setPasswordStep('done');
    setPasswordStatus('idle');
    setTimeout(() => setPasswordStep('form'), 3000);
  };

  const resendPasswordOTP = async () => {
    if (resendCooldown > 0) return;
    const res = await fetch('/api/auth/send-password-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword }),
    });
    if (res.ok) startCooldown();
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    await fetch('/api/account', { method: 'DELETE' });
    await signOut({ callbackUrl: '/' });
  };

  const inputCls = 'w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500';
  const pwdWrap = 'relative';
  const eyeBtn = 'absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300';

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
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name"
              className="flex-1 px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            <button type="submit" disabled={nameStatus === 'saving'}
              className="px-4 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-60">
              {nameStatus === 'saving' ? 'Saving...' : nameStatus === 'saved' ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">Change password</h2>
        {isOAuth ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-600 mt-2">Password management is not available for OAuth accounts.</p>
        ) : passwordStep === 'done' ? (
          <div className="flex items-center gap-3 mt-4 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            <p className="text-sm text-green-700 dark:text-green-400">Password updated successfully.</p>
          </div>
        ) : passwordStep === 'otp' ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              A 6-digit verification code was sent to <span className="font-medium text-zinc-700 dark:text-zinc-300">{session?.user?.email}</span>. Enter it below to confirm.
            </p>
            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
            <form onSubmit={verifyAndUpdatePassword} className="space-y-4">
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className={`${inputCls} text-center text-2xl font-bold tracking-[0.5em]`}
                autoFocus />
              <div className="flex gap-3">
                <button type="button" onClick={() => { setPasswordStep('form'); setPasswordError(''); setOtpCode(''); }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  Back
                </button>
                <button type="submit" disabled={passwordStatus === 'verifying' || otpCode.length !== 6}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-60">
                  {passwordStatus === 'verifying' ? 'Verifying…' : 'Confirm change'}
                </button>
              </div>
            </form>
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              Didn&apos;t get it?{' '}
              {resendCooldown > 0
                ? <span className="text-zinc-400">Resend in {resendCooldown}s</span>
                : <button onClick={resendPasswordOTP} className="text-violet-600 dark:text-violet-400 font-medium hover:underline">Resend code</button>
              }
            </p>
          </div>
        ) : (
          <form onSubmit={requestPasswordOTP} className="space-y-4 mt-4">
            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Current password</label>
              <div className={pwdWrap}>
                <input type={showCurrent ? 'text' : 'password'} value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)} required placeholder="••••••••"
                  className={`${inputCls} pr-10`} />
                <button type="button" tabIndex={-1} onClick={() => setShowCurrent((v) => !v)} className={eyeBtn}>
                  {showCurrent ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">New password</label>
              <div className={pwdWrap}>
                <input type={showNew ? 'text' : 'password'} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} required placeholder="Min. 8 characters"
                  className={`${inputCls} pr-10`} />
                <button type="button" tabIndex={-1} onClick={() => setShowNew((v) => !v)} className={eyeBtn}>
                  {showNew ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Confirm new password</label>
              <div className={pwdWrap}>
                <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Repeat new password"
                  className={`${inputCls} pr-10`} />
                <button type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)} className={eyeBtn}>
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={passwordStatus === 'sending'}
              className="px-5 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-60">
              {passwordStatus === 'sending' ? 'Sending code…' : 'Send verification code'}
            </button>
          </form>
        )}
      </div>

      {/* Sign-in method */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Sign-in method</h2>
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm">
          <span className="text-zinc-400">{isOAuth ? '🔗' : '✉'}</span>
          <span className="text-zinc-700 dark:text-zinc-300">{isOAuth ? 'Signed in via OAuth' : 'Email & Password'}</span>
          <span className="ml-auto text-xs text-zinc-400">{session?.user?.email}</span>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-red-200 dark:border-red-900 p-6">
        <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">Danger zone</h2>
        <p className="text-xs text-zinc-400 mb-4">Permanently delete your account and all data. This cannot be undone.</p>
        {!showDelete ? (
          <button onClick={() => setShowDelete(true)}
            className="px-4 py-2.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            Delete my account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">Type <strong>DELETE</strong> to confirm:</p>
            <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE"
              className="w-full px-3.5 py-2.5 rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
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
