export const dynamic = 'force-dynamic';

import { getUser } from '@/lib/getUser';
import { plaidClient } from '@/lib/plaid';
import { Products, CountryCode } from 'plaid';

/**
 * POST /api/mobile/plaid/link-token
 * Creates a Plaid Link token for the mobile app.
 * Auth: Bearer JWT (same token used everywhere in the mobile app).
 */
export async function POST(request: Request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawWebhook = (process.env.PLAID_WEBHOOK_URL ?? '').trim();
  let webhookUrl: string | undefined;
  try {
    const u = new URL(rawWebhook);
    if (u.protocol === 'https:') webhookUrl = rawWebhook;
  } catch { /* skip */ }

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'ExpenseIQ',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: webhookUrl,
    });

    return Response.json({ link_token: response.data.link_token });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    const plaidMsg =
      (err as { response?: { data?: { error_message?: string } } })
        ?.response?.data?.error_message ?? null;
    console.error('[mobile/plaid/link-token]', detail, plaidMsg);
    return Response.json({ error: 'Failed to create link token', plaidError: plaidMsg }, { status: 500 });
  }
}
