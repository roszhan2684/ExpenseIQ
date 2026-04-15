export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { SplitGroup, type IGroupMember } from '@/lib/models/SplitGroup';

async function getGroupAndVerify(groupId: string, userId: string) {
  const group = await SplitGroup.findById(groupId);
  if (!group) return null;
  const isMember = group.ownerId === userId ||
    (group.members as IGroupMember[]).some((m) => m.userId === userId);
  if (!isMember) return null;
  return group;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId } = await params;
  await connectDB();
  const group = await getGroupAndVerify(groupId, session.user.id);
  if (!group) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json(group);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId } = await params;
  await connectDB();
  const group = await SplitGroup.findById(groupId);
  if (!group || group.ownerId !== session.user.id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  let body: { name?: string; description?: string; currency?: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.name?.trim()) group.name = body.name.trim();
  if (body.description !== undefined) group.description = body.description.trim() || undefined;
  if (body.currency) group.currency = body.currency;
  await group.save();

  return Response.json(group);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId } = await params;
  await connectDB();
  const group = await SplitGroup.findById(groupId);
  if (!group || group.ownerId !== session.user.id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  await group.deleteOne();
  // Also delete all expenses in this group
  const { SplitExpense } = await import('@/lib/models/SplitExpense');
  await SplitExpense.deleteMany({ groupId });

  return Response.json({ success: true });
}
