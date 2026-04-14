import mongoose, { Schema, model, models } from 'mongoose';

export interface ITransaction {
  _id: mongoose.Types.ObjectId;
  userId: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: 'income' | 'expense';
  // Origin tracking
  source: 'manual' | 'plaid';
  // Plaid-specific (only set when source === 'plaid')
  plaidTransactionId?: string;
  plaidAccountId?: string;
  plaidItemId?: string;
  merchantName?: string;
  authorizedDate?: string;
  pending: boolean;
  paymentChannel?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId:             { type: String, required: true },
    amount:             { type: Number, required: true, min: 0.01 },
    description:        { type: String, required: true, trim: true },
    category:           { type: String, required: true },
    date:               { type: String, required: true },
    type:               { type: String, enum: ['income', 'expense'], default: 'expense' },
    source:             { type: String, enum: ['manual', 'plaid'], default: 'manual' },
    plaidTransactionId: { type: String },
    plaidAccountId:     { type: String },
    plaidItemId:        { type: String },
    merchantName:       { type: String },
    authorizedDate:     { type: String },
    pending:            { type: Boolean, default: false },
    paymentChannel:     { type: String },
  },
  { timestamps: true }
);

// Efficient per-user queries sorted by date
TransactionSchema.index({ userId: 1, date: -1 });
// Plaid transaction deduplication — sparse so null values don't collide
TransactionSchema.index({ plaidTransactionId: 1 }, { unique: true, sparse: true });

export const Transaction =
  models.Transaction || model<ITransaction>('Transaction', TransactionSchema);
