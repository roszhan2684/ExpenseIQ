'use client';

/**
 * PlaidLinkButton
 *
 * Full flow:
 *  1. User clicks "Connect Bank"
 *  2. Fetches a link_token from /api/plaid/link-token
 *  3. PlaidLinkOpener mounts and auto-opens the Plaid modal
 *  4. User completes auth in the Plaid UI
 *  5. onSuccess fires → POST /api/plaid/exchange-token
 *  6. Backend exchanges token, stores item, runs initial sync
 *  7. onLinked() is called so the parent can refresh data
 */

import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink, PlaidLinkOnSuccess, PlaidLinkOnExit } from 'react-plaid-link';

// ── Inner component — only rendered when we have a token ─────────────────────

function PlaidLinkOpener({
  token,
  onSuccess,
  onExit,
}: {
  token: string;
  onSuccess: PlaidLinkOnSuccess;
  onExit: PlaidLinkOnExit;
}) {
  const { open, ready } = usePlaidLink({ token, onSuccess, onExit });

  // Auto-open as soon as the Plaid script is ready
  useEffect(() => {
    if (ready) open();
  }, [ready, open]);

  return null;
}

// ── Public component ──────────────────────────────────────────────────────────

interface Props {
  /** Called after the bank is successfully linked + initial sync completes. */
  onLinked: (result: { institution: string; accounts: number; transactionsSynced: number }) => void;
  className?: string;
  children?: React.ReactNode;
}

export default function PlaidLinkButton({ onLinked, className, children }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'fetching' | 'open' | 'exchanging' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleClick = async () => {
    if (status !== 'idle' && status !== 'error') return;
    setStatus('fetching');
    setErrorMsg('');

    try {
      const res = await fetch('/api/plaid/link-token', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create link session');
      const { link_token } = await res.json();
      setLinkToken(link_token);
      setStatus('open');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Connection failed');
      setStatus('error');
    }
  };

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken) => {
      setStatus('exchanging');
      setLinkToken(null);

      try {
        const res = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicToken }),
        });

        if (!res.ok) throw new Error('Failed to link account');
        const result = await res.json();
        setStatus('idle');
        onLinked(result);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to link account');
        setStatus('error');
      }
    },
    [onLinked]
  );

  const onExit = useCallback<PlaidLinkOnExit>(() => {
    setLinkToken(null);
    setStatus('idle');
  }, []);

  const isLoading = status === 'fetching' || status === 'exchanging';
  const label =
    status === 'fetching'
      ? 'Opening...'
      : status === 'exchanging'
      ? 'Linking...'
      : children ?? 'Connect Bank';

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={
          className ??
          'flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm'
        }
      >
        {isLoading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
        )}
        {label}
      </button>

      {errorMsg && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errorMsg}</p>
      )}

      {linkToken && status === 'open' && (
        <PlaidLinkOpener token={linkToken} onSuccess={onSuccess} onExit={onExit} />
      )}
    </>
  );
}
