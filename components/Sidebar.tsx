'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from './ThemeProvider';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/analytics', label: 'Analytics', icon: '◉' },
  { href: '/ai-insights', label: 'AI Insights', icon: '✦' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
  { href: '/profile', label: 'Account', icon: '○' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme, theme } = useTheme();
  const { data: session } = useSession();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 sticky top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
            $
          </div>
          <span className="font-semibold text-zinc-900 dark:text-white text-base tracking-tight">
            ExpenseIQ
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user + theme + sign out */}
      <div className="px-3 py-4 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
        {session?.user && (
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? ''}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center text-xs font-bold">
                {(session.user.name ?? 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-900 dark:text-white truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-zinc-400 truncate">{session.user.email}</p>
            </div>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <span className="text-base">{resolvedTheme === 'dark' ? '☀' : '☽'}</span>
          {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>

        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
        >
          <span className="text-base">→</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
