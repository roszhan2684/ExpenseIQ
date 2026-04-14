export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { PlaidItem } from '@/lib/models/PlaidItem';
import { syncPlaidItem } from '@/lib/plaid-sync';

/**
 * POST /api/plaid/sync
 * Body: { itemId: string }
 *
 * Manual refresh — fetches latest transactions for one linked item.
 * Safe to call multiple times (idempotent).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { itemId } = await request.json().catch(() => ({})) as { itemId?: string };
  if (!itemId) {
    return Response.json({ error: 'Missing itemId' }, { status: 400 });
  }

  await connectDB();

  // Verify the item belongs to this user before syncing
  const item = await PlaidItem.findOne({ userId: session.user.id, itemId });
  if (!item) {
    return Response.json({ error: 'Item not found' }, { status: 404 });
  }
  if (item.status === 'disconnected') {
    return Response.json({ error: 'Bank is disconnected' }, { status: 409 });
  }

  try {
    const result = await syncPlaidItem(session.user.id, itemId);
    return Response.json(result);
  } catch (err) {
    console.error('[plaid/sync]', err);
    return Response.json({ error: 'Sync failed' }, { status: 500 });
  }
}
