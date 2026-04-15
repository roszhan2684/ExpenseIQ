export const dynamic = 'force-dynamic';

import { getUser } from '@/lib/getUser';
import { connectDB } from '@/lib/db';
import { SplitGroup, type IGroupMember } from '@/lib/models/SplitGroup';
import { SplitExpense } from '@/lib/models/SplitExpense';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string; expenseId: string }> },
) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId, expenseId } = await params;
  await connectDB();

  const group = await SplitGroup.findById(groupId).lean();
  if (!group) return Response.json({ error: 'Not found' }, { status: 404 });
  const isMember = group.ownerId === user.id ||
    (group.members as IGroupMember[]).some((m) => m.userId === user.id);
  if (!isMember) return Response.json({ error: 'Not found' }, { status: 404 });

  const expense = await SplitExpense.findOne({ _id: expenseId, groupId });
  if (!expense) return Response.json({ error: 'Expense not found' }, { status: 404 });

  let body: {
    description?: string;
    amount?: number;
    paidBy?: string;
    splits?: { memberId: string; amount: number }[];
    date?: string;
    category?: string;
    notes?: string;
  };
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.description?.trim()) expense.description = body.description.trim();
  if (body.amount && body.amount > 0) expense.amount = body.amount;
  if (body.paidBy) expense.paidBy = body.paidBy;
  if (body.splits?.length) {
    expense.splits = body.splits.map((s) => ({ ...s, paid: false }));
  }
  if (body.date) expense.date = new Date(body.date);
  if (body.category !== undefined) expense.category = body.category || undefined;
  if (body.notes !== undefined) expense.notes = body.notes.trim() || undefined;

  await expense.save();
  return Response.json(expense);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupId: string; expenseId: string }> },
) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId, expenseId } = await params;
  await connectDB();

  const group = await SplitGroup.findById(groupId).lean();
  if (!group) return Response.json({ error: 'Not found' }, { status: 404 });
  const isMember = group.ownerId === user.id ||
    (group.members as IGroupMember[]).some((m) => m.userId === user.id);
  if (!isMember) return Response.json({ error: 'Not found' }, { status: 404 });

  const expense = await SplitExpense.findOne({ _id: expenseId, groupId });
  if (!expense) return Response.json({ error: 'Not found' }, { status: 404 });

  await expense.deleteOne();
  return Response.json({ success: true });
}
