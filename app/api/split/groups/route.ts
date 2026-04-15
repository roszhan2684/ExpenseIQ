export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { SplitGroup } from '@/lib/models/SplitGroup';
import { randomUUID } from 'crypto';

const MEMBER_COLORS = [
  '#7c3aed','#2563eb','#059669','#d97706','#dc2626',
  '#0891b2','#9333ea','#16a34a','#ea580c','#be185d',
];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  // Return groups where user is owner OR a member
  const groups = await SplitGroup.find({
    $or: [
      { ownerId: session.user.id },
      { 'members.userId': session.user.id },
    ],
  }).sort({ updatedAt: -1 }).lean();

  return Response.json(groups);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { name?: string; description?: string; currency?: string; memberNames?: string[] };
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) return Response.json({ error: 'Group name is required' }, { status: 400 });

  await connectDB();

  // Creator is automatically the first member
  const ownerMemberId = randomUUID();
  const members: Array<{ id: string; name: string; userId?: string; color: string }> = [
    {
      id: ownerMemberId,
      name: session.user.name ?? 'Me',
      userId: session.user.id,
      color: MEMBER_COLORS[0],
    },
  ];

  // Add any extra members by name
  const extras = (body.memberNames ?? []).filter((n) => n.trim());
  extras.forEach((memberName, idx) => {
    members.push({
      id: randomUUID(),
      name: memberName.trim(),
      color: MEMBER_COLORS[(idx + 1) % MEMBER_COLORS.length],
    });
  });

  const group = await SplitGroup.create({
    ownerId: session.user.id,
    name,
    description: body.description?.trim() || undefined,
    currency: body.currency ?? 'USD',
    members,
  });

  return Response.json(group, { status: 201 });
}
