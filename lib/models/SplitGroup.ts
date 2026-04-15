import { Schema, model, models } from 'mongoose';

export interface IGroupMember {
  id: string;           // local UUID within the group
  name: string;
  email?: string;       // optional — guest members may have no email
  userId?: string;      // linked app user id (if registered)
  color: string;        // avatar color hex
}

export interface ISplitGroup {
  _id: string;
  ownerId: string;      // userId of creator
  name: string;
  description?: string;
  currency: string;
  members: IGroupMember[];
  createdAt: Date;
  updatedAt: Date;
}

const MemberSchema = new Schema<IGroupMember>(
  {
    id:     { type: String, required: true },
    name:   { type: String, required: true, trim: true },
    email:  { type: String, trim: true, lowercase: true },
    userId: { type: String },
    color:  { type: String, required: true },
  },
  { _id: false },
);

const SplitGroupSchema = new Schema<ISplitGroup>(
  {
    ownerId:     { type: String, required: true },
    name:        { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    currency:    { type: String, default: 'USD' },
    members:     [MemberSchema],
  },
  { timestamps: true },
);

SplitGroupSchema.index({ ownerId: 1 });
SplitGroupSchema.index({ 'members.userId': 1 });

export const SplitGroup =
  models.SplitGroup || model<ISplitGroup>('SplitGroup', SplitGroupSchema);
