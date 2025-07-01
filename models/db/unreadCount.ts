import mongoose, { Schema, Document } from 'mongoose';

export interface UnreadCountDocument extends Document {
  userId: mongoose.Types.ObjectId;       // The receiver
  contactId: mongoose.Types.ObjectId;    // The sender
  count: number;
}

const unreadCountSchema = new Schema<UnreadCountDocument>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  contactId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  count: { type: Number, default: 0 },
});

unreadCountSchema.index({ userId: 1, contactId: 1 }, { unique: true });

const UnreadCount = mongoose.model<UnreadCountDocument>('UnreadCount', unreadCountSchema);

export default UnreadCount;
