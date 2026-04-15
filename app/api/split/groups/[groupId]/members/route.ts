export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { SplitGroup } from '@/lib/models/SplitGroup';
import { randomUUID } from 'crypto';

const MEMBER_COLORS = [
  '#7c3aed','#2563eb','#059669','#d97706','#dc2626',
  '#0891b2','#9333ea','#16a34a','#ea580c','#be185d',
];

export async function POST(
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

  let body: { name?: string; email?: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) return Response.json({ error: 'Name is required' }, { status: 400 });

  const colorIdx = group.members.length % MEMBER_COLORS.length;
  const newMember = {
    id: randomUUID(),
    name,
    email: body.email?.trim().toLowerCase() || undefined,
    color: MEMBER_COLORS[colorIdx],
  };

  group.members.push(newMember);
  await group.save();

  return Response.json(newMember, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId } = await params;
  const url = new URL(request.url);
  const memberId = url.searchParams.get('memberId');
  if (!memberId) return Response.json({ error: 'memberId required' }, { status: 400 });

  await connectDB();
  const group = await SplitGroup.findById(groupId);
  if (!group || group.ownerId !== session.user.id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const idx = (group.members as Array<{ id: string }>).findIndex((m) => m.id === memberId);
  if (idx === -1) return Response.json({ error: 'Member not found' }, { status: 404 });

  group.members.splice(idx, 1);
  await group.save();

  return Response.json({ success: true });
}
