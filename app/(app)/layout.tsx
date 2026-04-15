/**
 * app/(app)/layout.tsx
 *
 * Root layout for all authenticated app pages.
 *
 * Responsibilities:
 *  1. Auth guard — unauthenticated visitors are redirected to /login with
 *     the original URL preserved as ?callbackUrl so they land back here
 *     after signing in.
 *  2. Shell structure — Sidebar (desktop) + BottomNav (mobile) + page content.
 *  3. FloatingChat — the persistent AI chat widget rendered on every page
 *     (the widget itself hides on /chat to avoid duplication).
 */

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import FloatingChat from '@/components/FloatingChat';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Verify session server-side; redirect to login if missing
  const session = await auth();
  if (!session) {
    // Preserve the attempted URL so the login page can redirect back after auth
    const hdrs = await headers();
    const url = hdrs.get('x-invoke-path') ?? '';
    const callbackUrl = url ? `?callbackUrl=${encodeURIComponent(url)}` : '';
    redirect(`/login${callbackUrl}`);
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop sidebar navigation */}
      <Sidebar />

      {/* Page content — bottom padding on mobile makes room for BottomNav */}
      <main className="flex-1 min-w-0 overflow-auto pb-20 lg:pb-0">{children}</main>

      {/* Mobile bottom navigation bar */}
      <BottomNav />

      {/* Floating AI chat widget — visible on every page except /chat */}
      <FloatingChat />
    </div>
  );
}
