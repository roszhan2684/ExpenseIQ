export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { NetWorth, INetWorthItem, INetWorthSnapshot } from '@/lib/models/NetWorth';

function currentMonth() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Compute and upsert the snapshot for the current month */
async function saveSnapshot(userId: string) {
  const doc = await NetWorth.findOne({ userId });
  if (!doc) return;

  const totalAssets = doc.items
    .filter((i: INetWorthItem) => i.type === 'asset')
    .reduce((s: number, i: INetWorthItem) => s + i.value, 0);

  const totalLiabilities = doc.items
    .filter((i: INetWorthItem) => i.type === 'liability')
    .reduce((s: number, i: INetWorthItem) => s + i.value, 0);

  const netWorth = totalAssets - totalLiabilities;
  const month = currentMonth();

  const idx = doc.snapshots.findIndex((s: INetWorthSnapshot) => s.month === month);
  if (idx >= 0) {
    doc.snapshots[idx].netWorth = netWorth;
    doc.snapshots[idx].totalAssets = totalAssets;
    doc.snapshots[idx].totalLiabilities = totalLiabilities;
  } else {
    doc.snapshots.push({ month, netWorth, totalAssets, totalLiabilities });
    // Keep last 24 months
    if (doc.snapshots.length > 24) {
      doc.snapshots.sort((a: INetWorthSnapshot, b: INetWorthSnapshot) => a.month.localeCompare(b.month));
      doc.snapshots.splice(0, doc.snapshots.length - 24);
    }
  }

  await doc.save();
}

// ── GET /api/net-worth ────────────────────────────────────────────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const doc = await NetWorth.findOne({ userId: session.user.id }).lean();

  if (!doc) return Response.json({ items: [], snapshots: [] });

  return Response.json({
    items: doc.items,
    snapshots: [...doc.snapshots].sort((a, b) => a.month.localeCompare(b.month)),
  });
}

// ── POST /api/net-worth  (add item) ──────────────────────────────────────────
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { name?: string; value?: number; type?: string; category?: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, value, type, category } = body;
  if (!name || value === undefined || !type || !category) {
    return Response.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (!['asset', 'liability'].includes(type)) {
    return Response.json({ error: 'type must be asset or liability' }, { status: 400 });
  }

  await connectDB();

  const newItem: INetWorthItem = {
    id: randomId(),
    name: name.trim(),
    value: Number(value),
    type: type as 'asset' | 'liability',
    category,
  };

  await NetWorth.findOneAndUpdate(
    { userId: session.user.id },
    { $push: { items: newItem } },
    { upsert: true, new: true },
  );

  await saveSnapshot(session.user.id);

  return Response.json(newItem, { status: 201 });
}

// ── PATCH /api/net-worth  (update item value) ─────────────────────────────────
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { id?: string; name?: string; value?: number; category?: string };
  try { body = await request.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, name, value, category } = body;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  await connectDB();

  const update: Record<string, unknown> = {};
  if (value !== undefined) update['items.$.value'] = Number(value);
  if (name) update['items.$.name'] = name.trim();
  if (category) update['items.$.category'] = category;

  await NetWorth.findOneAndUpdate(
    { userId: session.user.id, 'items.id': id },
    { $set: update },
  );

  await saveSnapshot(session.user.id);

  return Response.json({ ok: true });
}

// ── DELETE /api/net-worth  (remove item) ──────────────────────────────────────
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  await connectDB();

  await NetWorth.findOneAndUpdate(
    { userId: session.user.id },
    { $pull: { items: { id } } },
  );

  await saveSnapshot(session.user.id);

  return Response.json({ ok: true });
}
