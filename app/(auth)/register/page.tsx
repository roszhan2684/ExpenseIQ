'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const GitHubIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

type Step = 'details' | 'otp';

export default function RegisterPage() {
  const router = useRouter();

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  // UI state
  const [step, setStep] = useState<Step>('details');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), firstName: firstName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to send OTP.');
        return;
      }
      setOtpSent(true);
      setStep('otp');
      startCooldown();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), firstName: firstName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to resend OTP.');
        return;
      }
      startCooldown();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          password,
          dateOfBirth: dateOfBirth || undefined,
          mobileNumber: mobileNumber.trim() || undefined,
          otp,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Verification failed.');
        return;
      }
      // Auto sign-in after account created
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (result?.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        // Account created but auto-login failed — redirect to login
        router.push('/login?registered=1');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: string) => {
    setOauthLoading(provider);
    try {
      await signIn(provider, { callbackUrl: '/dashboard' });
    } catch {
      setError('OAuth sign-up failed. Try again.');
      setOauthLoading(null);
    }
  };

  const inputCls = 'w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-zinc-400';
  const labelCls = 'block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5';

  if (step === 'otp') {
    return (
      <div className="w-full max-w-sm">
        <button
          onClick={() => { setStep('details'); setError(''); setOtp(''); }}
          className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Check your email</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            We sent a 6-digit code to<br />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <div>
            <label className={labelCls}>Verification code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className={`${inputCls} text-center text-2xl font-bold tracking-[0.5em] letter-spacing-widest`}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'Verifying…' : 'Verify & create account'}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-5">
          Didn&apos;t receive it?{' '}
          {resendCooldown > 0 ? (
            <span className="text-zinc-400">Resend in {resendCooldown}s</span>
          ) : (
            <button
              onClick={handleResendOtp}
              disabled={loading}
              className="text-violet-600 dark:text-violet-400 font-medium hover:underline disabled:opacity-50"
            >
              Resend code
            </button>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Create your account</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">Free forever. No credit card required.</p>
      </div>

      <div className="space-y-3 mb-6">
        {[
          { id: 'google', label: 'Sign up with Google', icon: <GoogleIcon /> },
          { id: 'github', label: 'Sign up with GitHub', icon: <GitHubIcon /> },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => handleOAuth(p.id)}
            disabled={!!oauthLoading || loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-60"
          >
            {oauthLoading === p.id
              ? <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
              : p.icon}
            {p.label}
          </button>
        ))}
      </div>

      <div className="relative flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
        <span className="text-xs text-zinc-400">or sign up with email</span>
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
      </div>

      <form onSubmit={handleSendOtp} className="space-y-4">
        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>First name</label>
            <input
              type="text" required value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jane"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Last name</label>
            <input
              type="text" required value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Date of birth</label>
            <input
              type="date" value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Mobile <span className="text-zinc-400 font-normal">(optional)</span></label>
            <input
              type="tel" value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="+1 555 0100"
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Password</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} required value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters"
              className={`${inputCls} pr-10`} />
            <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              {showPassword
                ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              }
            </button>
          </div>
        </div>

        <div>
          <label className={labelCls}>Confirm password</label>
          <div className="relative">
            <input type={showConfirmPassword ? 'text' : 'password'} required value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat your password"
              className={`${inputCls} pr-10`} />
            <button type="button" tabIndex={-1} onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              {showConfirmPassword
                ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              }
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !!oauthLoading}
          className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-colors disabled:opacity-60"
        >
          {loading ? 'Sending code…' : 'Send verification code'}
        </button>
      </form>

      <p className="text-center text-xs text-zinc-400 mt-5">
        By signing up, you agree to our{' '}
        <Link href="/terms" className="text-violet-500 hover:underline">Terms of Service</Link> and{' '}
        <Link href="/privacy" className="text-violet-500 hover:underline">Privacy Policy</Link>.
      </p>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-4">
        Already have an account?{' '}
        <Link href="/login" className="text-violet-600 dark:text-violet-400 font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
