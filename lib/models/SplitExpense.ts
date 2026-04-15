import { Schema, model, models } from 'mongoose';

export interface ISplitShare {
  memberId: string;   // IGroupMember.id
  amount: number;     // exact amount this member owes
  paid: boolean;      // true when settled
}

export interface ISplitExpense {
  _id: string;
  groupId: string;
  type: 'expense' | 'settlement';
  description: string;
  amount: number;       // total amount (for settlements: amount transferred)
  currency: string;
  paidBy: string;       // memberId who paid (or sent money for settlements)
  splits: ISplitShare[];
  date: Date;
  category?: string;
  notes?: string;
  // if linked to an app transaction
  transactionId?: string;
  createdBy: string;    // userId
  createdAt: Date;
  updatedAt: Date;
}

const SplitShareSchema = new Schema<ISplitShare>(
  {
    memberId: { type: String, required: true },
    amount:   { type: Number, required: true },
    paid:     { type: Boolean, default: false },
  },
  { _id: false },
);

const SplitExpenseSchema = new Schema<ISplitExpense>(
  {
    groupId:       { type: String, required: true },
    type:          { type: String, enum: ['expense', 'settlement'], default: 'expense' },
    description:   { type: String, required: true, trim: true },
    amount:        { type: Number, required: true },
    currency:      { type: String, default: 'USD' },
    paidBy:        { type: String, required: true },
    splits:        [SplitShareSchema],
    date:          { type: Date, default: Date.now },
    category:      { type: String },
    notes:         { type: String, trim: true },
    transactionId: { type: String },
    createdBy:     { type: String, required: true },
  },
  { timestamps: true },
);

SplitExpenseSchema.index({ groupId: 1, date: -1 });
SplitExpenseSchema.index({ createdBy: 1 });

export const SplitExpense =
  models.SplitExpense || model<ISplitExpense>('SplitExpense', SplitExpenseSchema);
