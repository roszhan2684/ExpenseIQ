export const dynamic = 'force-dynamic';

import { getUser } from '@/lib/getUser';
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
  request: Request,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  // authUser = the authenticated user (renamed to avoid conflict with User model)
  const authUser = await getUser(request);
  if (!authUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { inviteCode } = await params;
  await connectDB();

  const group = await SplitGroup.findOne({
    inviteCode: inviteCode.toUpperCase(),
    inviteEnabled: true,
  });

  if (!group) return Response.json({ error: 'Invalid or expired invite link' }, { status: 404 });

  // Already a member?
  const alreadyMember = (group.members as IGroupMember[]).some(
    (m) => m.userId === authUser.id,
  );
  if (alreadyMember) {
    return Response.json({ groupId: group._id.toString(), alreadyMember: true });
  }

  // Fetch full user document for name + email
  const userDoc = await User.findById(authUser.id).lean();
  const userName = userDoc
    ? `${userDoc.firstName} ${userDoc.lastName}`.trim()
    : authUser.name ?? 'Unknown';

  // Check if there's an existing guest slot with matching email — link it
  const existingSlot = userDoc?.email
    ? (group.members as IGroupMember[]).find(
        (m) => !m.userId && m.email === userDoc.email,
      )
    : null;

  if (existingSlot) {
    // Upgrade the existing slot: attach userId and update name
    await SplitGroup.updateOne(
      { _id: group._id, 'members.id': existingSlot.id },
      {
        $set: {
          'members.$.userId': authUser.id,
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
      email: userDoc?.email,
      userId: authUser.id,
      color: MEMBER_COLORS[colorIdx],
    };
    group.members.push(newMember);
    await group.save();
  }

  return Response.json({ groupId: group._id.toString(), alreadyMember: false });
}
