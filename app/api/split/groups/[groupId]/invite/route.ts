export const dynamic = 'force-dynamic';

import { getUser } from '@/lib/getUser';
import { connectDB } from '@/lib/db';
import { SplitGroup } from '@/lib/models/SplitGroup';
import { randomBytes } from 'crypto';

function generateInviteCode(): string {
  return randomBytes(5).toString('hex').toUpperCase();
}

// GET — return current invite code + link
export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId } = await params;
  await connectDB();
  const group = await SplitGroup.findById(groupId).lean();
  if (!group) return Response.json({ error: 'Not found' }, { status: 404 });

  const isMember = group.ownerId === user.id ||
    group.members.some((m: { userId?: string }) => m.userId === user.id);
  if (!isMember) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({
    inviteCode: group.inviteCode,
    inviteEnabled: group.inviteEnabled,
  });
}

// POST — regenerate invite code (owner only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId } = await params;
  await connectDB();
  const group = await SplitGroup.findById(groupId);
  if (!group || group.ownerId !== user.id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  group.inviteCode = generateInviteCode();
  await group.save();

  return Response.json({ inviteCode: group.inviteCode, inviteEnabled: group.inviteEnabled });
}

// PATCH — toggle invite enabled/disabled (owner only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId } = await params;
  await connectDB();
  const group = await SplitGroup.findById(groupId);
  if (!group || group.ownerId !== user.id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  let body: { inviteEnabled?: boolean };
  try { body = await request.json(); } catch { body = {}; }

  if (typeof body.inviteEnabled === 'boolean') {
    group.inviteEnabled = body.inviteEnabled;
  }
  await group.save();

  return Response.json({ inviteCode: group.inviteCode, inviteEnabled: group.inviteEnabled });
}
