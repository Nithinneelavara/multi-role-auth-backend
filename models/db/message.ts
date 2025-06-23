import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  messageType: 'admin' | 'user'; // Who sent the message
  senderId: mongoose.Types.ObjectId;
  senderModel: 'User' | 'Admin'; // Add this to support both references
  receiverId?: mongoose.Types.ObjectId; // For user-to-user
  groupId?: mongoose.Types.ObjectId;    // For group messages
  groupName?: string;
  message: string;
  timestamp: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    messageType: {
      type: String,
      enum: ['admin', 'user'],
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'senderModel', // Dynamically reference either 'User' or 'Admin'
    },
    senderModel: {
      type: String,
      required: true,
      enum: ['User', 'Admin'], // Must match model names
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Only used for user-to-user messages
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
    },
    groupName: {
      type: String,
    },
    message: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
);

export default mongoose.model<IMessage>('Message', messageSchema);
