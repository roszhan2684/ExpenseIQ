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

  // Only include webhook if it's a valid https:// URL
  const rawWebhook = (process.env.PLAID_WEBHOOK_URL ?? '').trim();
  let webhookUrl: string | undefined;
  try {
    const u = new URL(rawWebhook);
    if (u.protocol === 'https:') webhookUrl = rawWebhook;
  } catch {
    // invalid or missing — skip webhook
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
      webhook: webhookUrl,
    });

    return Response.json({ link_token: response.data.link_token });
  } catch (err: unknown) {
    // Extract the real Plaid error so we can diagnose it
    const detail =
      err instanceof Error ? err.message : String(err);
    // Plaid SDK wraps HTTP errors — try to pull the response body
    const plaidMsg =
      (err as { response?: { data?: { error_message?: string; error_code?: string } } })
        ?.response?.data?.error_message ?? null;
    console.error('[plaid/link-token]', detail, plaidMsg);
    return Response.json(
      { error: 'Failed to create link token', detail, plaidError: plaidMsg },
      { status: 500 }
    );
  }
}
