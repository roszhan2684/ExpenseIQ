import mongoose, { Schema, model, models } from 'mongoose';

export interface ITransaction {
  _id: mongoose.Types.ObjectId;
  userId: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: 'income' | 'expense';
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    date: { type: String, required: true },
    type: { type: String, enum: ['income', 'expense'], default: 'expense' },
  },
  { timestamps: true }
);

export const Transaction =
  models.Transaction || model<ITransaction>('Transaction', TransactionSchema);
