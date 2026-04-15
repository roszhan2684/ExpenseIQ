'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

type View = 'login' | 'forgot-email' | 'forgot-otp' | 'forgot-done';

const EyeOn = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const EyeOff = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
  const [view, setView] = useState<View>('login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Forgot password state
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpShowPassword, setFpShowPassword] = useState(false);
  const [fpConfirmPassword, setFpConfirmPassword] = useState('');
  const [fpError, setFpError] = useState('');
  const [fpLoading, setFpLoading] = useState(false);

  // ── Sign in ────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (!result || result.error) {
        setLoginError('Invalid email or password. Please check and try again.');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setLoginError('Something went wrong. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Forgot: send OTP ───────────────────────────────────────────────────────
  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError('');
    setFpLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFpError(data.error ?? 'Failed to send code');
      } else {
        setView('forgot-otp');
      }
    } catch {
      setFpError('Something went wrong. Please try again.');
    } finally {
      setFpLoading(false);
    }
  };

  // ── Forgot: verify OTP + set new password ─────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError('');
    if (fpNewPassword !== fpConfirmPassword) {
      setFpError('Passwords do not match.');
      return;
    }
    if (fpNewPassword.length < 8) {
      setFpError('Password must be at least 8 characters.');
      return;
    }
    setFpLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fpEmail.trim().toLowerCase(),
          otp: fpOtp.trim(),
          newPassword: fpNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFpError(data.error ?? 'Failed to reset password');
      } else {
        setView('forgot-done');
      }
    } catch {
      setFpError('Something went wrong. Please try again.');
    } finally {
      setFpLoading(false);
    }
  };

  const resetForgotFlow = () => {
    setFpEmail('');
    setFpOtp('');
    setFpNewPassword('');
    setFpConfirmPassword('');
    setFpError('');
    setView('login');
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (view === 'forgot-done') {
    return (
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Password reset!</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Your password has been updated. You can now sign in with your new password.
          </p>
        </div>
        <button
          onClick={() => { resetForgotFlow(); setEmail(fpEmail); }}
          className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-colors"
        >
          Sign in now
        </button>
      </div>
    );
  }

  if (view === 'forgot-otp') {
    return (
      <div className="w-full max-w-sm">
        <button onClick={() => setView('forgot-email')} className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          Back
        </button>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Check your email</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            We sent a 6-digit code to <span className="font-medium text-zinc-700 dark:text-zinc-300">{fpEmail}</span>
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          {fpError && (
            <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {fpError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
              6-digit code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={fpOtp}
              onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-zinc-300 placeholder:tracking-normal"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">New password</label>
            <div className="relative">
              <input
                type={fpShowPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={fpNewPassword}
                onChange={(e) => setFpNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-3.5 py-3 pr-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-zinc-400"
              />
              <button type="button" tabIndex={-1} onClick={() => setFpShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                {fpShowPassword ? <EyeOff /> : <EyeOn />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Confirm new password</label>
            <input
              type={fpShowPassword ? 'text' : 'password'}
              required
              value={fpConfirmPassword}
              onChange={(e) => setFpConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-zinc-400"
            />
          </div>

          <button
            type="submit"
            disabled={fpLoading || fpOtp.length < 6 || !fpNewPassword}
            className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-colors disabled:opacity-60"
          >
            {fpLoading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-400 mt-5">
          Didn&apos;t get the email?{' '}
          <button onClick={() => setView('forgot-email')} className="text-violet-600 dark:text-violet-400 hover:underline">
            Resend
          </button>
        </p>
      </div>
    );
  }

  if (view === 'forgot-email') {
    return (
      <div className="w-full max-w-sm">
        <button onClick={resetForgotFlow} className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          Back to sign in
        </button>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Forgot your password?</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Enter your email and we&apos;ll send you a reset code.
          </p>
        </div>

        <form onSubmit={handleSendReset} className="space-y-4">
          {fpError && (
            <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {fpError}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Email address</label>
            <input
              type="email"
              required
              value={fpEmail}
              onChange={(e) => setFpEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-zinc-400"
            />
          </div>
          <button
            type="submit"
            disabled={fpLoading || !fpEmail}
            className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-colors disabled:opacity-60"
          >
            {fpLoading ? 'Sending…' : 'Send reset code'}
          </button>
        </form>
      </div>
    );
  }

  // ── Default: login view ────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Welcome back</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">Sign in to your ExpenseIQ account</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {loginError && (
          <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {loginError}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Email</label>
          <input
            type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-zinc-400"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Password</label>
            <button
              type="button"
              onClick={() => { setFpEmail(email); setView('forgot-email'); }}
              className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'} required value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-3 pr-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-zinc-400"
            />
            <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              {showPassword ? <EyeOff /> : <EyeOn />}
            </button>
          </div>
        </div>

        <button
          type="submit" disabled={loginLoading}
          className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-colors disabled:opacity-60"
        >
          {loginLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-violet-600 dark:text-violet-400 font-medium hover:underline">
          Sign up free
        </Link>
      </p>
    </div>
  );
}
