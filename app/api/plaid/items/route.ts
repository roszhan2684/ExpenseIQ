export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { PlaidItem } from '@/lib/models/PlaidItem';
import { PlaidAccount } from '@/lib/models/PlaidAccount';

/**
 * GET /api/plaid/items
 * Returns all linked bank items + their accounts for the current user.
 * Access tokens are NEVER included in the response.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const [items, accounts] = await Promise.all([
    PlaidItem.find(
      { userId: session.user.id, status: { $ne: 'disconnected' } },
      { accessToken: 0 } // never expose access token
    ).lean(),
    PlaidAccount.find({ userId: session.user.id }).lean(),
  ]);

  return Response.json(
    items.map((item) => ({
      id: item._id.toString(),
      itemId: item.itemId,
      institutionName: item.institutionName ?? 'Connected Bank',
      institutionId: item.institutionId,
      lastSyncAt: item.lastSyncAt ?? null,
      status: item.status,
      errorCode: item.errorCode ?? null,
      accounts: accounts
        .filter((a) => a.itemId === item.itemId)
        .map((a) => ({
          accountId: a.accountId,
          name: a.name,
          officialName: a.officialName,
          type: a.type,
          subtype: a.subtype,
          mask: a.mask,
        })),
    }))
  );
}
