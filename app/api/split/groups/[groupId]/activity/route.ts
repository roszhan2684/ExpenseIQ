export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { SplitGroup, type IGroupMember } from '@/lib/models/SplitGroup';

// Lightweight endpoint for polling — returns only updatedAt + member count
// Clients compare updatedAt to decide if a full refresh is needed
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId } = await params;
  await connectDB();

  const group = await SplitGroup.findById(groupId)
    .select('updatedAt members ownerId')
    .lean();

  if (!group) return Response.json({ error: 'Not found' }, { status: 404 });

  const isMember = group.ownerId === session.user.id ||
    (group.members as IGroupMember[]).some((m) => m.userId === session.user!.id);
  if (!isMember) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({
    updatedAt: group.updatedAt,
    memberCount: group.members.length,
  });
}
