export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { SplitGroup, type IGroupMember } from '@/lib/models/SplitGroup';
import { User } from '@/lib/models/User';
import { randomUUID } from 'crypto';

const MEMBER_COLORS = [
  '#7c3aed','#2563eb','#059669','#d97706','#dc2626',
  '#0891b2','#9333ea','#16a34a','#ea580c','#be185d',
];

// GET — preview group info before joining (no auth required for preview)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const { inviteCode } = await params;
  await connectDB();

  const group = await SplitGroup.findOne({
    inviteCode: inviteCode.toUpperCase(),
    inviteEnabled: true,
  }).lean();

  if (!group) return Response.json({ error: 'Invalid or expired invite link' }, { status: 404 });

  // Return safe preview info (no sensitive details)
  return Response.json({
    groupId: group._id.toString(),
    name: group.name,
    description: group.description,
    currency: group.currency,
    memberCount: group.members.length,
    memberNames: (group.members as IGroupMember[]).map((m) => m.name),
  });
}

// POST — join the group (requires auth)
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { inviteCode } = await params;
  await connectDB();

  const group = await SplitGroup.findOne({
    inviteCode: inviteCode.toUpperCase(),
    inviteEnabled: true,
  });

  if (!group) return Response.json({ error: 'Invalid or expired invite link' }, { status: 404 });

  // Already a member?
  const alreadyMember = (group.members as IGroupMember[]).some(
    (m) => m.userId === session.user!.id,
  );
  if (alreadyMember) {
    return Response.json({ groupId: group._id.toString(), alreadyMember: true });
  }

  // Fetch full user details for their name
  const user = await User.findById(session.user.id).lean();
  const userName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : session.user.name ?? 'Unknown';

  // Check if there's an existing guest slot with matching email — link it
  const existingSlot = user?.email
    ? (group.members as IGroupMember[]).find(
        (m) => !m.userId && m.email === user.email,
      )
    : null;

  if (existingSlot) {
    // Upgrade the existing slot: set userId + update name
    await SplitGroup.updateOne(
      { _id: group._id, 'members.id': existingSlot.id },
      {
        $set: {
          'members.$.userId': session.user.id,
          'members.$.name': userName,
          updatedAt: new Date(),
        },
      },
    );
  } else {
    // Add a new member slot
    const colorIdx = group.members.length % MEMBER_COLORS.length;
    const newMember: IGroupMember = {
      id: randomUUID(),
      name: userName,
      email: user?.email,
      userId: session.user.id,
      color: MEMBER_COLORS[colorIdx],
    };
    group.members.push(newMember);
    await group.save();
  }

  return Response.json({ groupId: group._id.toString(), alreadyMember: false });
}
