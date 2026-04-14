import mongoose, { Schema, model, models } from 'mongoose';

export interface IPlaidItem {
  _id: mongoose.Types.ObjectId;
  userId: string;
  itemId: string;        // Plaid item_id — unique per linked institution
  accessToken: string;  // AES-256-GCM encrypted Plaid access_token
  institutionId?: string;
  institutionName?: string;
  cursor?: string;       // transactions/sync pagination cursor (persisted between syncs)
  lastSyncAt?: Date;
  status: 'active' | 'error' | 'disconnected';
  errorCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlaidItemSchema = new Schema<IPlaidItem>(
  {
    userId:          { type: String, required: true, index: true },
    itemId:          { type: String, required: true, unique: true },
    accessToken:     { type: String, required: true },   // never returned to client
    institutionId:   { type: String },
    institutionName: { type: String },
    cursor:          { type: String },
    lastSyncAt:      { type: Date },
    status:          { type: String, enum: ['active', 'error', 'disconnected'], default: 'active' },
    errorCode:       { type: String },
  },
  { timestamps: true }
);

export const PlaidItem = models.PlaidItem || model<IPlaidItem>('PlaidItem', PlaidItemSchema);
