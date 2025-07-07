import cron from 'node-cron';
import Message from '../models/db/message';
import User from '../models/db/user';
import Group from '../models/db/group';
import { sendNotification } from '../socket';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

dotenv.config();

const generateS3Url = (fileName: string): string => {
  const bucket = process.env.S3_BUCKET_NAME!;
  const region = process.env.AWS_REGION!;
  return `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;
};

export const startMessageScheduler = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const now = dayjs().tz("Asia/Kolkata").toDate();

      const pendingMessages = await Message.find({
        scheduledTime: { $lte: now },
        isSent: false,
      });

      console.log(`[Scheduler] Found ${pendingMessages.length} pending message(s)`);

      for (const msg of pendingMessages) {
        const payload = {
          groupId: msg.groupId?.toString() || '',
          groupName: msg.groupName || '',
          file: msg.file ? generateS3Url(msg.file) : '',
        };

        //  If it's a group message
        if (msg.groupId) {
          const group = await Group.findById(msg.groupId);
          if (!group) {
            console.warn`([Scheduler] Group not found: ${msg.groupId})`;
            continue;
          }

          const approvedUsers = await User.find({ _id: { $in: group.members } });

          // Send to each approved user
          for (const user of approvedUsers) {
            sendNotification(user._id.toString(), msg.message, payload, 'user');
            console.log(`[Scheduler] Sent to user ${user._id}`);
          }

          // Also emit to group room via socket
          sendNotification(`group-${group._id}`, msg.message, payload, 'group');
          console.log(`[Scheduler] Sent to group room: group-${group._id}`);
        }

        //  If it's a direct user-to-user message
        else if (msg.receiverId) {
          sendNotification(msg.receiverId.toString(), msg.message, payload, 'user');
          console.log(`[Scheduler] Sent to receiver ${msg.receiverId}`);
        }

        msg.isSent = true;
        await msg.save();
        console.log(`[Scheduler] Marked as sent: ${msg._id}`);
      }
    } catch (error) {
      console.error('[Scheduler] Error:', error);
    }
  });
};
