export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { getUser } from '@/lib/getUser';
import { connectDB } from '@/lib/db';
import { plaidClient, encryptToken } from '@/lib/plaid';
import { syncPlaidItem } from '@/lib/plaid-sync';
import { PlaidItem } from '@/lib/models/PlaidItem';
import { PlaidAccount } from '@/lib/models/PlaidAccount';
import { CountryCode } from 'plaid';

/**
 * POST /api/mobile/plaid/exchange-token
 * Body: { publicToken: string }
 * Auth: Bearer JWT
 */
export async function POST(request: Request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { publicToken?: string };
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { publicToken } = body;
  if (!publicToken) return Response.json({ error: 'Missing publicToken' }, { status: 400 });

  try {
    const tokenRes = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
    const { access_token, item_id } = tokenRes.data;

    const itemRes = await plaidClient.itemGet({ access_token });
    const institutionId = itemRes.data.item.institution_id ?? undefined;
    let institutionName = 'Connected Bank';

    if (institutionId) {
      try {
        const instRes = await plaidClient.institutionsGetById({
          institution_id: institutionId,
          country_codes: [CountryCode.Us],
          options: { include_optional_metadata: false },
        });
        institutionName = instRes.data.institution.name;
      } catch { /* non-fatal */ }
    }

    const accountsRes = await plaidClient.accountsGet({ access_token });
    const accounts = accountsRes.data.accounts;

    await connectDB();

    await PlaidItem.findOneAndUpdate(
      { itemId: item_id },
      {
        $set: {
          userId: user.id,
          itemId: item_id,
          accessToken: encryptToken(access_token),
          institutionId,
          institutionName,
          status: 'active',
          errorCode: null,
        },
      },
      { upsert: true, new: true }
    );

    if (accounts.length > 0) {
      const ops = accounts.map((a) => ({
        updateOne: {
          filter: { accountId: a.account_id },
          update: {
            $set: {
              userId: user.id,
              itemId: item_id,
              accountId: a.account_id,
              name: a.name,
              officialName: a.official_name ?? undefined,
              type: a.type,
              subtype: a.subtype ?? undefined,
              mask: a.mask ?? undefined,
            },
          },
          upsert: true,
        },
      }));
      await PlaidAccount.bulkWrite(ops, { ordered: false });
    }

    const syncResult = await syncPlaidItem(user.id, item_id);

    return Response.json({
      success: true,
      institution: institutionName,
      accounts: accounts.length,
      transactionsSynced: syncResult.added,
    });
  } catch (err) {
    console.error('[mobile/plaid/exchange-token]', err);
    return Response.json({ error: 'Failed to connect bank account' }, { status: 500 });
  }
}
