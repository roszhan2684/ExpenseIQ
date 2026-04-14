export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { plaidClient, decryptToken } from '@/lib/plaid';
import { PlaidItem } from '@/lib/models/PlaidItem';
import { PlaidAccount } from '@/lib/models/PlaidAccount';
import { Transaction } from '@/lib/models/Transaction';

/**
 * DELETE /api/plaid/items/[itemId]
 * Unlinks a bank account:
 * 1. Revokes the access token at Plaid (best-effort)
 * 2. Removes PlaidItem + PlaidAccount from DB
 * 3. Keeps transactions — they represent real financial history
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { itemId } = await params;

  await connectDB();

  const item = await PlaidItem.findOne({ userId: session.user.id, itemId });
  if (!item) {
    return Response.json({ error: 'Item not found' }, { status: 404 });
  }

  // Revoke at Plaid — best-effort, don't fail the request if Plaid errors
  try {
    const accessToken = decryptToken(item.accessToken);
    await plaidClient.itemRemove({ access_token: accessToken });
  } catch (err) {
    console.warn('[plaid/items] Failed to revoke item at Plaid:', err);
  }

  // Remove from DB
  await Promise.all([
    PlaidItem.deleteOne({ itemId }),
    PlaidAccount.deleteMany({ itemId }),
    // Detach transactions from the item but keep the financial history
    Transaction.updateMany({ plaidItemId: itemId, userId: session.user.id }, {
      $unset: { plaidItemId: '', plaidAccountId: '' },
    }),
  ]);

  console.log(`[plaid/items] Unlinked item=${itemId} user=${session.user.id}`);

  return Response.json({ success: true });
}
