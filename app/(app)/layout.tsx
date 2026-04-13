import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
