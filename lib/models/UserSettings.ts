import mongoose, { Schema, model, models } from 'mongoose';

export interface IUserSettings {
  _id: mongoose.Types.ObjectId;
  userId: string;
  currency: string;
  customCategories: string[];
  budgets: { category: string; limit: number }[];
  theme: 'light' | 'dark' | 'system';
}

const UserSettingsSchema = new Schema<IUserSettings>({
  userId: { type: String, required: true, unique: true },
  currency: { type: String, default: 'USD' },
  customCategories: { type: [String], default: [] },
  budgets: {
    type: [{ category: String, limit: Number }],
    default: [],
  },
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
});

export const UserSettings =
  models.UserSettings || model<IUserSettings>('UserSettings', UserSettingsSchema);
