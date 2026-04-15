import { Schema, model, models } from 'mongoose';

export interface INetWorthItem {
  id: string;
  name: string;
  value: number;
  type: 'asset' | 'liability';
  category: string; // e.g. 'cash', 'investment', 'property', 'vehicle', 'other' | 'credit_card', 'loan', 'mortgage', 'other'
}

export interface INetWorthSnapshot {
  month: string;       // "YYYY-MM"
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

export interface INetWorth {
  userId: string;
  items: INetWorthItem[];
  snapshots: INetWorthSnapshot[];
}

const NetWorthSchema = new Schema<INetWorth>(
  {
    userId: { type: String, required: true, unique: true },
    items: [
      {
        id:       { type: String, required: true },
        name:     { type: String, required: true, trim: true },
        value:    { type: Number, required: true, min: 0 },
        type:     { type: String, enum: ['asset', 'liability'], required: true },
        category: { type: String, required: true },
      },
    ],
    snapshots: [
      {
        month:             { type: String, required: true },
        netWorth:          { type: Number, required: true },
        totalAssets:       { type: Number, required: true },
        totalLiabilities:  { type: Number, required: true },
      },
    ],
  },
  { timestamps: true },
);

export const NetWorth =
  models.NetWorth || model<INetWorth>('NetWorth', NetWorthSchema);
