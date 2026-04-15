export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { SplitGroup, type IGroupMember } from '@/lib/models/SplitGroup';
import { SplitExpense } from '@/lib/models/SplitExpense';

export async function POST(
  request: Request,
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

  let body: {
    fromMemberId?: string;  // who is paying
    toMemberId?: string;    // who is receiving
    amount?: number;
    date?: string;
    notes?: string;
  };
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.fromMemberId) return Response.json({ error: 'fromMemberId required' }, { status: 400 });
  if (!body.toMemberId) return Response.json({ error: 'toMemberId required' }, { status: 400 });
  if (!body.amount || body.amount <= 0) return Response.json({ error: 'Amount must be positive' }, { status: 400 });

  const fromMember = (group.members as IGroupMember[]).find((m) => m.id === body.fromMemberId);
  const toMember = (group.members as IGroupMember[]).find((m) => m.id === body.toMemberId);
  if (!fromMember || !toMember) {
    return Response.json({ error: 'Invalid member ids' }, { status: 400 });
  }

  const settlement = await SplitExpense.create({
    groupId,
    type: 'settlement',
    description: `${fromMember.name} paid ${toMember.name}`,
    amount: body.amount,
    currency: group.currency,
    paidBy: body.fromMemberId,
    splits: [{ memberId: body.toMemberId, amount: body.amount, paid: true }],
    date: body.date ? new Date(body.date) : new Date(),
    notes: body.notes?.trim() || undefined,
    createdBy: session.user.id,
  });

  await SplitGroup.updateOne({ _id: groupId }, { $set: { updatedAt: new Date() } });

  return Response.json(settlement, { status: 201 });
}
