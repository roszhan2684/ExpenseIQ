import mongoose, { Schema, model, models } from 'mongoose';

export interface IPlaidAccount {
  _id: mongoose.Types.ObjectId;
  userId: string;
  itemId: string;       // references PlaidItem.itemId
  accountId: string;    // Plaid account_id — unique
  name: string;
  officialName?: string;
  type: string;         // checking | savings | credit | loan | investment | other
  subtype?: string;
  mask?: string;        // last 4 digits of account number
}

const PlaidAccountSchema = new Schema<IPlaidAccount>({
  userId:       { type: String, required: true, index: true },
  itemId:       { type: String, required: true, index: true },
  accountId:    { type: String, required: true, unique: true },
  name:         { type: String, required: true },
  officialName: { type: String },
  type:         { type: String, required: true },
  subtype:      { type: String },
  mask:         { type: String },
});

export const PlaidAccount =
  models.PlaidAccount || model<IPlaidAccount>('PlaidAccount', PlaidAccountSchema);
