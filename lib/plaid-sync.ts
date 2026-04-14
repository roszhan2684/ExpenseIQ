/**
 * Plaid transaction sync — reusable by:
 *   • exchange-token route (initial link)
 *   • webhook handler (SYNC_UPDATES_AVAILABLE)
 *   • manual refresh endpoint
 *
 * Uses /transactions/sync for cursor-based incremental updates.
 * All DB operations are upserts keyed on plaidTransactionId → fully idempotent.
 */

import type { Transaction as PlaidTx } from 'plaid';
import { plaidClient, decryptToken } from './plaid';
import { connectDB } from './db';
import { PlaidItem } from './models/PlaidItem';
import { Transaction } from './models/Transaction';
import { DEFAULT_CATEGORIES, INCOME_CATEGORIES } from './types';

// ── Plaid category → app category mapping ─────────────────────────────────────

const PLAID_TO_APP: Record<string, string> = {
  INCOME:                    'Paycheck / Salary',
  TRANSFER_IN:               'Transfer In',
  TRANSFER_OUT:              'Other',
  FOOD_AND_DRINK:            'Food & Dining',
  TRANSPORTATION:            'Transportation',
  GENERAL_MERCHANDISE:       'Shopping',
  ENTERTAINMENT:             'Entertainment',
  HOME_IMPROVEMENT:          'Housing',
  RENT_AND_UTILITIES:        'Utilities',
  MEDICAL:                   'Healthcare',
  PERSONAL_CARE:             'Personal Care',
  TRAVEL:                    'Travel',
  LOAN_PAYMENTS:             'Other',
  BANK_FEES:                 'Other',
  GENERAL_SERVICES:          'Other',
  GOVERNMENT_AND_NON_PROFIT: 'Other',
};

const ALL_CATEGORIES = [...DEFAULT_CATEGORIES, ...INCOME_CATEGORIES];

function mapCategory(plaidPrimary: string | null | undefined, type: 'income' | 'expense'): string {
  const mapped = plaidPrimary ? (PLAID_TO_APP[plaidPrimary] ?? null) : null;
  if (mapped && ALL_CATEGORIES.includes(mapped)) return mapped;
  return type === 'income' ? 'Other Income' : 'Other';
}

// ── Type determination ─────────────────────────────────────────────────────────

function determineType(tx: PlaidTx): 'income' | 'expense' {
  const primary = tx.personal_finance_category?.primary;
  // Plaid's own income/transfer-in classification is authoritative
  if (primary === 'INCOME' || primary === 'TRANSFER_IN') return 'income';
  // Plaid convention: negative amount = credit (money in)
  if (tx.amount < 0) return 'income';
  return 'expense';
}

// ── Transform a Plaid transaction into our DB shape ───────────────────────────

function buildDoc(tx: PlaidTx, userId: string, itemId: string) {
  const type = determineType(tx);
  const amount = Math.round(Math.abs(tx.amount) * 100) / 100;
  const description = (tx.merchant_name ?? tx.name).trim().slice(0, 200);

  return {
    userId,
    amount,
    description,
    merchantName: tx.merchant_name ?? undefined,
    category: mapCategory(tx.personal_finance_category?.primary, type),
    date: tx.date,
    authorizedDate: tx.authorized_date ?? undefined,
    type,
    source: 'plaid' as const,
    plaidTransactionId: tx.transaction_id,
    plaidAccountId: tx.account_id,
    plaidItemId: itemId,
    pending: tx.pending,
    paymentChannel: tx.payment_channel ?? undefined,
  };
}

// ── Main sync function ────────────────────────────────────────────────────────

export interface SyncResult {
  added: number;
  modified: number;
  removed: number;
  cursor: string;
}

/**
 * Fetch all pending updates from Plaid for one item and persist them.
 * Safe to call multiple times — all writes are idempotent upserts.
 */
export async function syncPlaidItem(userId: string, itemId: string): Promise<SyncResult> {
  await connectDB();

  const item = await PlaidItem.findOne({ userId, itemId });
  if (!item) throw new Error(`PlaidItem not found: ${itemId}`);
  if (item.status === 'disconnected') throw new Error(`PlaidItem is disconnected: ${itemId}`);

  const accessToken = decryptToken(item.accessToken);

  let cursor: string | undefined = item.cursor ?? undefined;
  let hasMore = true;
  let totalAdded = 0;
  let totalModified = 0;
  let totalRemoved = 0;

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      ...(cursor ? { cursor } : {}),
      options: { include_personal_finance_category: true },
    });

    const { added, modified, removed, has_more, next_cursor } = response.data;

    // ── Added ─────────────────────────────────────────────────────────────────
    if (added.length > 0) {
      const ops = added.map((tx) => ({
        updateOne: {
          filter: { plaidTransactionId: tx.transaction_id },
          update: { $setOnInsert: buildDoc(tx, userId, itemId) },
          upsert: true,
        },
      }));
      const res = await Transaction.bulkWrite(ops, { ordered: false });
      totalAdded += res.upsertedCount;
    }

    // ── Modified ──────────────────────────────────────────────────────────────
    if (modified.length > 0) {
      const ops = modified.map((tx) => ({
        updateOne: {
          filter: { plaidTransactionId: tx.transaction_id },
          update: { $set: buildDoc(tx, userId, itemId) },
          upsert: true,
        },
      }));
      await Transaction.bulkWrite(ops, { ordered: false });
      totalModified += modified.length;
    }

    // ── Removed (pending → posted transition or deletions) ────────────────────
    if (removed.length > 0) {
      const ids = removed.map((r) => r.transaction_id);
      const { deletedCount } = await Transaction.deleteMany({
        plaidTransactionId: { $in: ids },
        userId, // safety: only delete own records
      });
      totalRemoved += deletedCount;
    }

    cursor = next_cursor;
    hasMore = has_more;
  }

  // Persist the cursor so the next sync only fetches deltas
  await PlaidItem.updateOne(
    { itemId, userId },
    { $set: { cursor, lastSyncAt: new Date(), status: 'active' } }
  );

  console.log(
    `[plaid-sync] item=${itemId} added=${totalAdded} modified=${totalModified} removed=${totalRemoved}`
  );

  return { added: totalAdded, modified: totalModified, removed: totalRemoved, cursor: cursor ?? '' };
}
