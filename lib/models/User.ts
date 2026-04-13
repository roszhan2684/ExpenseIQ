import mongoose, { Schema, model, models } from 'mongoose';

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string; // hashed, only for credentials login
  image?: string;
  provider: 'credentials' | 'google' | 'github' | 'apple';
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String },
    image: { type: String },
    provider: {
      type: String,
      enum: ['credentials', 'google', 'github', 'apple'],
      default: 'credentials',
    },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>('User', UserSchema);
