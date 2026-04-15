export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { SplitGroup, type IGroupMember } from '@/lib/models/SplitGroup';
import { SplitExpense } from '@/lib/models/SplitExpense';
import { Transaction } from '@/lib/models/Transaction';

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

  const expenses = await SplitExpense.find({ groupId }).sort({ date: -1 }).lean();
  return Response.json(expenses);
}

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
    description?: string;
    amount?: number;
    paidBy?: string;
    splits?: { memberId: string; amount: number }[];
    date?: string;
    category?: string;
    notes?: string;
    transactionId?: string;
    splitMode?: 'equal' | 'custom';
  };
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const description = body.description?.trim();
  if (!description) return Response.json({ error: 'Description required' }, { status: 400 });
  if (!body.amount || body.amount <= 0) return Response.json({ error: 'Amount must be positive' }, { status: 400 });
  if (!body.paidBy) return Response.json({ error: 'paidBy required' }, { status: 400 });

  // Validate paidBy is a group member
  const groupMembers = group.members as IGroupMember[];
  const paidByMember = groupMembers.find((m) => m.id === body.paidBy);
  if (!paidByMember) return Response.json({ error: 'Invalid paidBy member' }, { status: 400 });

  let splits = body.splits ?? [];

  // Auto-split equally if not provided
  if (!splits.length || body.splitMode === 'equal') {
    const perPerson = Math.round((body.amount / groupMembers.length) * 100) / 100;
    splits = groupMembers.map((m: IGroupMember, i: number) => {
      // Last person absorbs rounding diff
      const last = i === groupMembers.length - 1;
      const amt = last
        ? Math.round((body.amount! - perPerson * (groupMembers.length - 1)) * 100) / 100
        : perPerson;
      return { memberId: m.id, amount: amt };
    });
  }

  // Validate split amounts sum to total
  const splitTotal = splits.reduce((s, sp) => s + sp.amount, 0);
  if (Math.abs(splitTotal - body.amount) > 0.02) {
    return Response.json({ error: 'Split amounts must sum to total' }, { status: 400 });
  }

  const expense = await SplitExpense.create({
    groupId,
    type: 'expense',
    description,
    amount: body.amount,
    currency: group.currency,
    paidBy: body.paidBy,
    splits: splits.map((s) => ({ ...s, paid: false })),
    date: body.date ? new Date(body.date) : new Date(),
    category: body.category || undefined,
    notes: body.notes?.trim() || undefined,
    transactionId: body.transactionId || undefined,
    createdBy: session.user.id,
  });

  // Auto-record in payer's personal transaction ledger
  if (paidByMember.userId) {
    const txDate = body.date
      ? new Date(body.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    await Transaction.create({
      userId: paidByMember.userId,
      amount: body.amount,
      description: `[Split] ${description}`,
      category: body.category || 'Split',
      date: txDate,
      type: 'expense',
      source: 'manual',
      pending: false,
    }).catch(() => { /* non-fatal */ });
  }

  // Touch the group updatedAt
  await SplitGroup.updateOne({ _id: groupId }, { $set: { updatedAt: new Date() } });

  return Response.json(expense, { status: 201 });
}
