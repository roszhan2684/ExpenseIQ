export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { plaidClient, encryptToken } from '@/lib/plaid';
import { syncPlaidItem } from '@/lib/plaid-sync';
import { PlaidItem } from '@/lib/models/PlaidItem';
import { PlaidAccount } from '@/lib/models/PlaidAccount';
import { CountryCode } from 'plaid';

/**
 * POST /api/plaid/exchange-token
 * Body: { publicToken: string }
 *
 * 1. Exchanges Plaid public_token → access_token + item_id
 * 2. Fetches institution name and account details
 * 3. Stores encrypted access_token in PlaidItem
 * 4. Stores linked accounts in PlaidAccount
 * 5. Runs initial transaction sync
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { publicToken?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { publicToken } = body;
  if (!publicToken) {
    return Response.json({ error: 'Missing publicToken' }, { status: 400 });
  }

  try {
    // ── 1. Exchange public_token ──────────────────────────────────────────────
    const tokenRes = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
    const { access_token, item_id } = tokenRes.data;

    // ── 2. Get institution name ───────────────────────────────────────────────
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
      } catch {
        // Non-fatal — institution name is cosmetic
      }
    }

    // ── 3. Get linked accounts ────────────────────────────────────────────────
    const accountsRes = await plaidClient.accountsGet({ access_token });
    const accounts = accountsRes.data.accounts;

    // ── 4. Persist to DB ──────────────────────────────────────────────────────
    await connectDB();

    // Upsert so re-linking the same item doesn't create duplicates
    await PlaidItem.findOneAndUpdate(
      { itemId: item_id },
      {
        $set: {
          userId: session.user.id,
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

    // Store/update accounts
    if (accounts.length > 0) {
      const accountOps = accounts.map((a) => ({
        updateOne: {
          filter: { accountId: a.account_id },
          update: {
            $set: {
              userId: session.user.id,
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
      await PlaidAccount.bulkWrite(accountOps, { ordered: false });
    }

    // ── 5. Initial sync ───────────────────────────────────────────────────────
    const syncResult = await syncPlaidItem(session.user.id, item_id);

    console.log(
      `[plaid/exchange] user=${session.user.id} item=${item_id} institution="${institutionName}" accounts=${accounts.length} synced=${syncResult.added}`
    );

    return Response.json({
      success: true,
      institution: institutionName,
      accounts: accounts.length,
      transactionsSynced: syncResult.added,
    });
  } catch (err) {
    console.error('[plaid/exchange-token]', err);
    return Response.json({ error: 'Failed to connect bank account' }, { status: 500 });
  }
}
