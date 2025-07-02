import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  messageType: 'admin' | 'user';
  senderId: mongoose.Types.ObjectId;
  senderModel: 'User' | 'Admin';
  receiverId?: mongoose.Types.ObjectId;
  groupId?: mongoose.Types.ObjectId;
  groupName?: string;
  message: string;
  iv: string; 
  isRead?: boolean;
  file?: string;
  scheduledTime?: Date;
  isSent?: boolean;
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
      refPath: 'senderModel',
    },
    senderModel: {
      type: String,
      required: true,
      enum: ['User', 'Admin'],
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    iv: {
      type: String,
      required: true, 
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    file: {
      type: String,
    },
    scheduledTime: {
      type: Date,
    },
    isSent: {
      type: Boolean,
      default: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }
);

export default mongoose.model<IMessage>('Message', messageSchema);
