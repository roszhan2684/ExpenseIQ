import mongoose, { Schema, model, models } from 'mongoose';

export interface IUser {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  image?: string;
  dateOfBirth?: string;
  mobileNumber?: string;
  provider: 'credentials' | 'google' | 'github' | 'apple';
  isVerified: boolean;
  otp?: string;
  otpExpiry?: Date;
  createdAt: Date;
  // computed
  name?: string;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: false, trim: true, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
    image: { type: String },
    dateOfBirth: { type: String },
    mobileNumber: { type: String },
    provider: {
      type: String,
      enum: ['credentials', 'google', 'github', 'apple'],
      default: 'credentials',
    },
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpiry: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual so code that reads user.name still works
UserSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

export const User = models.User || model<IUser>('User', UserSchema);
