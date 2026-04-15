export const dynamic = 'force-dynamic';

import { getUser } from '@/lib/getUser';
import { connectDB } from '@/lib/db';
import { PlaidItem } from '@/lib/models/PlaidItem';
import { PlaidAccount } from '@/lib/models/PlaidAccount';

/**
 * GET /api/mobile/plaid/items
 * Returns all linked bank items + their accounts for the mobile user.
 * Access tokens are never returned.
 */
export async function GET(request: Request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const [items, accounts] = await Promise.all([
    PlaidItem.find(
      { userId: user.id, status: { $ne: 'disconnected' } },
      { accessToken: 0 }
    ).lean(),
    PlaidAccount.find({ userId: user.id }).lean(),
  ]);

  return Response.json(
    items.map((item) => ({
      id: item._id.toString(),
      itemId: item.itemId,
      institutionName: item.institutionName ?? 'Connected Bank',
      institutionId: item.institutionId,
      lastSyncAt: item.lastSyncAt ?? null,
      status: item.status,
      accounts: accounts
        .filter((a) => a.itemId === item.itemId)
        .map((a) => ({
          id: a._id.toString(),
          accountId: a.accountId,
          name: a.name,
          officialName: a.officialName ?? null,
          type: a.type,
          subtype: a.subtype ?? null,
          mask: a.mask ?? null,
        })),
    }))
  );
}
