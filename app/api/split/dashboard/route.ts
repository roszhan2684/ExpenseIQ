export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { SplitGroup } from '@/lib/models/SplitGroup';
import { SplitExpense } from '@/lib/models/SplitExpense';
import { computeNetBalances } from '@/lib/split-balance';
import type { IGroupMember } from '@/lib/models/SplitGroup';
import type { ISplitExpense } from '@/lib/models/SplitExpense';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();

  const groups = await SplitGroup.find({
    $or: [
      { ownerId: session.user.id },
      { 'members.userId': session.user.id },
    ],
  }).lean();

  if (!groups.length) return Response.json({ totalOwed: 0, totalOwe: 0, groups: [] });

  const summaries = await Promise.all(
    groups.map(async (group) => {
      const expenses = await SplitExpense.find({ groupId: group._id.toString() }).lean();
      const balances = computeNetBalances(
        group.members as IGroupMember[],
        expenses as unknown as ISplitExpense[],
      );

      // Find my member entry in this group
      const myMember = (group.members as IGroupMember[]).find((m) => m.userId === session.user!.id);
      const myBalance = myMember
        ? (balances.find((b) => b.memberId === myMember.id)?.net ?? 0)
        : 0;

      return {
        groupId: group._id.toString(),
        groupName: group.name,
        currency: group.currency,
        memberCount: group.members.length,
        myBalance,
      };
    }),
  );

  const totalOwed = summaries.filter((s) => s.myBalance > 0).reduce((t, s) => t + s.myBalance, 0);
  const totalOwe = summaries.filter((s) => s.myBalance < 0).reduce((t, s) => t + Math.abs(s.myBalance), 0);

  return Response.json({
    totalOwed: Math.round(totalOwed * 100) / 100,
    totalOwe: Math.round(totalOwe * 100) / 100,
    groups: summaries,
  });
}
