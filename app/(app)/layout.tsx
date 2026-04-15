import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    const hdrs = await headers();
    const url = hdrs.get('x-invoke-path') ?? '';
    const callbackUrl = url ? `?callbackUrl=${encodeURIComponent(url)}` : '';
    redirect(`/login${callbackUrl}`);
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-auto pb-20 lg:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
