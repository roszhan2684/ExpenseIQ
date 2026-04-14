export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { plaidClient } from '@/lib/plaid';
import { Products, CountryCode } from 'plaid';

/**
 * POST /api/plaid/link-token
 * Creates a short-lived Plaid Link token for the current user.
 * The frontend passes this token to react-plaid-link to open the Link modal.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: session.user.id },
      client_name: 'ExpenseIQ',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      // Plaid sends SYNC_UPDATES_AVAILABLE to this URL when new transactions arrive.
      // Must be a publicly reachable HTTPS URL — set PLAID_WEBHOOK_URL in env.
      webhook: process.env.PLAID_WEBHOOK_URL ?? undefined,
    });

    return Response.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error('[plaid/link-token]', err);
    return Response.json({ error: 'Failed to create link token' }, { status: 500 });
  }
}
