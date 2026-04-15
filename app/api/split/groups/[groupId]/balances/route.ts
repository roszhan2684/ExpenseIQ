export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { SplitGroup } from '@/lib/models/SplitGroup';
import { SplitExpense } from '@/lib/models/SplitExpense';
import { getGroupDebts } from '@/lib/split-balance';
import type { IGroupMember } from '@/lib/models/SplitGroup';
import type { ISplitExpense } from '@/lib/models/SplitExpense';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId } = await params;
  await connectDB();

  const group = await SplitGroup.findById(groupId).lean();
  if (!group) return Response.json({ error: 'Not found' }, { status: 404 });
  const isMember = group.ownerId === session.user.id ||
    (group.members as IGroupMember[]).some((m) => m.userId === session.user.id);
  if (!isMember) return Response.json({ error: 'Not found' }, { status: 404 });

  const expenses = await SplitExpense.find({ groupId }).lean();

  const { balances, debts } = getGroupDebts(
    group.members as IGroupMember[],
    expenses as unknown as ISplitExpense[],
  );

  return Response.json({ balances, debts });
}
