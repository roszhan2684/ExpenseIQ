'use client';

import { useState } from 'react';

interface SplitGroup {
  _id: string;
  ownerId: string;
  name: string;
  currency: string;
  members: { id: string; name: string; color: string; userId?: string }[];
  inviteCode: string;
  inviteEnabled: boolean;
}

interface Props {
  group: SplitGroup;
  currentUserId: string;
  onClose: () => void;
  onUpdated: () => void;
  onLeft: () => void;
}

export default function InviteSheet({ group, currentUserId, onClose, onUpdated, onLeft }: Props) {
  const [inviteCode, setInviteCode] = useState(group.inviteCode);
  const [inviteEnabled, setInviteEnabled] = useState(group.inviteEnabled);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const isOwner = group.ownerId === currentUserId;
  const myMember = group.members.find((m) => m.userId === currentUserId);

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this group?`)) return;
    setRemovingId(memberId);
    try {
      const res = await fetch(
        `/api/split/groups/${group._id}/members?memberId=${memberId}`,
        { method: 'DELETE' },
      );
      if (res.ok) onUpdated();
    } finally {
      setRemovingId(null);
    }
  };

  const handleLeave = async () => {
    if (!myMember) return;
    if (!confirm('Leave this group? You will lose access to all expenses.')) return;
    setLeaving(true);
    try {
      const res = await fetch(
        `/api/split/groups/${group._id}/members?memberId=${myMember.id}`,
        { method: 'DELETE' },
      );
      if (res.ok) onLeft();
    } finally {
      setLeaving(false);
    }
  };

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/split/join/${inviteCode}`
    : `/split/join/${inviteCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join "${group.name}" on ExpenseIQ`,
          text: `You're invited to split expenses in "${group.name}"`,
          url: inviteUrl,
        });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerate invite link? The old link will stop working.')) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/split/groups/${group._id}/invite`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setInviteCode(data.inviteCode);
        onUpdated();
      }
    } finally {
      setRegenerating(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await fetch(`/api/split/groups/${group._id}/invite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteEnabled: !inviteEnabled }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteEnabled(data.inviteEnabled);
        onUpdated();
      }
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Invite people</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Share this link with ExpenseIQ users to invite them to <span className="font-medium text-zinc-700 dark:text-zinc-300">{group.name}</span>.
          </p>

          {/* Link box */}
          <div className={`rounded-xl border p-4 space-y-3 transition-opacity ${!inviteEnabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2.5">
              <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-xs text-zinc-600 dark:text-zinc-400 flex-1 truncate font-mono">{inviteUrl}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopy}
                disabled={!inviteEnabled}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy link
                  </>
                )}
              </button>
              <button
                onClick={handleShare}
                disabled={!inviteEnabled}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            </div>
          </div>

          {/* Invite code badge */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Invite code</p>
              <p className="font-mono text-lg font-bold text-zinc-900 dark:text-white tracking-widest">{inviteCode}</p>
            </div>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {regenerating ? '…' : '↻ Reset'}
            </button>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Invite link active</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Disable to stop new members from joining</p>
            </div>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                inviteEnabled ? 'bg-violet-600' : 'bg-zinc-300 dark:bg-zinc-600'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                inviteEnabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Members overview */}
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Current members</p>
            <div className="space-y-1.5">
              {group.members.map((m) => {
                const isMe = m.userId === currentUserId;
                const memberIsOwner = group.ownerId === m.userId;
                const canRemove = isOwner && !isMe && !memberIsOwner;
                return (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: m.color }}>
                      {m.name[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1 truncate">
                      {m.name}
                      {isMe && <span className="ml-1 text-zinc-400">(you)</span>}
                    </span>
                    {memberIsOwner && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-medium shrink-0">
                        Owner
                      </span>
                    )}
                    {!memberIsOwner && m.userId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium shrink-0">
                        Joined
                      </span>
                    )}
                    {!m.userId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 font-medium shrink-0">
                        Guest
                      </span>
                    )}
                    {canRemove && (
                      <button
                        onClick={() => handleRemoveMember(m.id, m.name)}
                        disabled={removingId === m.id}
                        className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 shrink-0"
                        title={`Remove ${m.name}`}
                      >
                        {removingId === m.id
                          ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        }
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leave group (non-owner members only) */}
          {!isOwner && myMember && (
            <button
              onClick={handleLeave}
              disabled={leaving}
              className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60"
            >
              {leaving ? 'Leaving…' : 'Leave group'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
