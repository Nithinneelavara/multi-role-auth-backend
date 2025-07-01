import { Server } from 'socket.io';
import { Notification } from '../models/db/notification';
import { MemberNotification } from '../models/db/memberNotification';
import Group from '../models/db/group';
import Message from '../models/db/message'; 
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET!;


let io: Server;

export const initSocket = (server: any) => {
  io = new Server(server, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
   // const token = socket.handshake.auth?.token;
    const token =
  socket.handshake.auth?.token ||
  socket.handshake.query?.token;  // fallback to query param

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
      console.log(`${role} ${finalId} joined room ${roomName}`);
    } else {
      console.warn(' Connection rejected: No userId, memberId, or groupId provided.');
    }

    //  USER-TO-USER MESSAGE HANDLING
    socket.on('send-user-message', async ({ toUserId, message }) => {
      const fromUserId = socket.handshake.query.userId as string;

      if (!fromUserId || !toUserId || !message) {
        console.warn(' Invalid user-to-user message payload.');
        return;
      }

      const payload = {
        fromUserId,
        toUserId,
        message,
        timestamp: new Date(),
      };

      // 📤 Emit to recipient's room
      io.to(`notification-${toUserId}`).emit(`direct-message-${toUserId}`, payload);
      console.log(` User message sent from ${fromUserId} to ${toUserId}`);

      // 💾 Save user-to-user message
      try {
        await Message.create({
          messageType: 'user',
          senderId: fromUserId,
          senderModel: 'User',
          receiverId: toUserId,
          message,
          timestamp: new Date(),
        });
        console.log(' User-to-user message saved to DB');
      } catch (err) {
        console.error(' Error saving user message:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });
  });

  return io;
};

//  GENERIC NOTIFICATION HANDLER (user / member / group)
export function sendNotification(
  targetId: string,
  message: string,
  data: any = {},
  role: 'user' | 'member' | 'group' = 'user'
) {
  try {
    if (!io) throw new Error('Socket.IO server not initialized');

    const room = `notification-${targetId}`;
    const event = `notification-${targetId}`;
    const payload = { targetId, message, data };

    //  Emit to clients
    io.to(room).emit(event, payload);
    console.log(`✅ ${role} notification sent to ${room}`);

    // ✅ USER or MEMBER Notification: save to DB
    if (role === 'user' || role === 'member') {
      const NotificationModel = role === 'member' ? MemberNotification : Notification;

      const newNotification = new NotificationModel({
        userId: targetId,
        message,
        data,
      });

      newNotification.save().catch((err) => {
        console.error(` Error saving ${role} notification:`, err);
      });
    }

    // 🟡 GROUP: do not save again; it’s already handled in notifySpecificGroup
    else if (role === 'group') {
      console.log(`ℹ Group notification emitted only (not saved again)`);
    }

  } catch (error) {
    console.error(' Error in sendNotification:', error);
  }
}


