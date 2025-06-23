import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
  groupName: string;
  maxUsers: number;
  members: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
}

const groupSchema = new Schema<IGroup>(
  {
    groupName: { type: String, required: true },
    maxUsers: { type: Number, required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IGroup>('Group', groupSchema);
