export const dynamic = 'force-dynamic';

import { getUser } from '@/lib/getUser';
import { connectDB } from '@/lib/db';
import { PlaidItem } from '@/lib/models/PlaidItem';
import { plaidClient, decryptToken } from '@/lib/plaid';

/**
 * DELETE /api/mobile/plaid/disconnect
 * Body: { itemId: string }
 * Removes a linked bank item for the user.
 */
export async function DELETE(request: Request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { itemId?: string };
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { itemId } = body;
  if (!itemId) return Response.json({ error: 'Missing itemId' }, { status: 400 });

  await connectDB();

  const item = await PlaidItem.findOne({ itemId, userId: user.id });
  if (!item) return Response.json({ error: 'Item not found' }, { status: 404 });

  // Tell Plaid to remove the item
  try {
    const accessToken = decryptToken(item.accessToken);
    await plaidClient.itemRemove({ access_token: accessToken });
  } catch { /* non-fatal — still mark disconnected locally */ }

  await PlaidItem.updateOne({ itemId, userId: user.id }, { $set: { status: 'disconnected' } });

  return Response.json({ success: true });
}
