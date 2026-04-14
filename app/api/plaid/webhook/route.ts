export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/plaid/webhook
 *
 * PUBLIC endpoint — no session auth (Plaid calls this server-to-server).
 * Configure this URL in the Plaid Dashboard → Team → Webhooks:
 *   https://<your-vercel-domain>/api/plaid/webhook
 *
 * Plaid also sends a Plaid-Verification header for production webhook verification.
 * TODO: Add signature verification using plaid.verifyWebhook() for production hardening.
 */

import { connectDB } from '@/lib/db';
import { PlaidItem } from '@/lib/models/PlaidItem';
import { syncPlaidItem } from '@/lib/plaid-sync';

// Plaid webhook events we care about (transactions/sync model)
const SYNC_EVENTS = new Set([
  'SYNC_UPDATES_AVAILABLE',
  'DEFAULT_UPDATE',      // legacy fallback
  'INITIAL_UPDATE',      // first 30 days imported
  'HISTORICAL_UPDATE',   // full history imported
]);

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { webhook_type, webhook_code, item_id } = body as {
    webhook_type?: string;
    webhook_code?: string;
    item_id?: string;
    error?: { error_code?: string };
  };

  console.log('[plaid-webhook]', webhook_type, webhook_code, item_id ?? '');

  // ── Handle item errors (e.g. user changed bank password) ─────────────────
  if (webhook_type === 'ITEM' && webhook_code === 'ERROR') {
    if (item_id) {
      await connectDB();
      const errorCode = (body.error as { error_code?: string } | null)?.error_code ?? 'UNKNOWN';
      await PlaidItem.updateOne(
        { itemId: item_id },
        { $set: { status: 'error', errorCode } }
      );
      console.warn(`[plaid-webhook] Item error: ${item_id} code=${errorCode}`);
    }
    return Response.json({ received: true });
  }

  // ── Handle transaction sync events ────────────────────────────────────────
  if (webhook_type === 'TRANSACTIONS' && webhook_code && SYNC_EVENTS.has(webhook_code)) {
    if (!item_id) {
      return Response.json({ error: 'Missing item_id' }, { status: 400 });
    }

    await connectDB();
    const item = await PlaidItem.findOne({ itemId: item_id, status: 'active' });

    if (!item) {
      // Unknown or inactive item — acknowledge but skip
      return Response.json({ received: true });
    }

    try {
      await syncPlaidItem(item.userId, item_id);
    } catch (err) {
      // Log but still return 200 so Plaid doesn't retry indefinitely
      console.error('[plaid-webhook] sync error:', err);
    }
  }

  return Response.json({ received: true });
}
