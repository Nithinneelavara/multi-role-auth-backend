import { Server } from 'socket.io';
import { Notification } from '../models/db/notification';
import { MemberNotification } from '../models/db/memberNotification';
import Message from '../models/db/message';
import UnreadCount from '../models/db/unreadCount';

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;

let io: Server;

/**
 * Initializes the Socket.IO server and sets up all events.
 */
export const initSocket = (server: any): Server => {
  io = new Server(server, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token;  
    let userId: string | null = null;

    if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      userId = decoded.id;
    } catch (err) {
      console.warn('Invalid token. Connection rejected.');
      socket.disconnect();
      return;
    }
  } else {
    console.warn('No token provided. Connection rejected.');
    socket.disconnect();
    return;
  }

    const memberId = socket.handshake.query.memberId as string;
    const groupId = socket.handshake.query.groupId as string;
    const finalId = userId || memberId || groupId;

    if (finalId) {
      const roomName = `notification-${finalId}`;
      socket.join(roomName);
      const role = userId ? 'User' : memberId ? 'Member' : 'Group';
      console.log(`✅ ${role} ${finalId} joined room ${roomName}`);
    } else {
      console.warn('⚠️ Connection rejected: No userId, memberId, or groupId provided.');
    }

    // ✅ USER-TO-USER MESSAGE HANDLING
    socket.on('send-user-message', async ({ toUserId, message }) => {

      const fromUserId = socket.handshake.query.userId as string;

      if (!fromUserId || !toUserId || !message) {
        console.warn('⚠️ Invalid user-to-user message payload.');
        return;
      }

      const timestamp = new Date();
      const payload = {
        fromUserId,
        toUserId,
        message,
        timestamp,
      };

      try {
        // Emit message to recipient
        io.to(`notification-${toUserId}`).emit(`direct-message-${toUserId}`, payload);
        console.log(` Message sent from ${fromUserId} to ${toUserId}`);

        //  Save message to DB
        await Message.create({
          messageType: 'user',
          senderId: fromUserId,
          senderModel: 'User',
          receiverId: toUserId,
          message,
          isRead: false,
          timestamp,
        });
        console.log(' Message saved to DB');

        //  Increment unread count
        await UnreadCount.findOneAndUpdate(
          { userId: toUserId, contactId: fromUserId },
          { $inc: { count: 1 } },
          { upsert: true, new: true }
        );
        console.log(' Unread count incremented');
      } catch (err) {
        console.error(' Error during message or unread count save:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });
  });

  return io;
};

/**
 * Returns the active Socket.IO instance (for use in controllers).
 */
export const getSocketInstance = (): Server => {
  if (!io) throw new Error('❌ Socket.IO server not initialized');
  return io;
};
export function sendNotification(
  targetId: string,
  message: string,
  data: any = {},
  role: 'user' | 'member' | 'group' = 'user'
): void {
  try {
    if (!io) throw new Error('❌ Socket.IO server not initialized');

    const room = `notification-${targetId}`;
    const event = `notification-${targetId}`;
    const payload = { targetId, message, data };

    io.to(room).emit(event, payload);
    console.log(`✅ ${role} notification sent to ${room}`);

    // 💾 Save notification
    if (role === 'user' || role === 'member') {
      const NotificationModel = role === 'member' ? MemberNotification : Notification;
      const newNotification = new NotificationModel({ userId: targetId, message, data });

      newNotification.save().catch((err) => {
        console.error(`❌ Error saving ${role} notification:`, err);
      });
    } else if (role === 'group') {
      console.log('ℹ️ Group notification emitted only (not saved again)');
    }
  } catch (error) {
    console.error('❌ Error in sendNotification:', error);
  }
}
