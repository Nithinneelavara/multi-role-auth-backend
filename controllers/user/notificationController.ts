//controllers\user\notificationController.ts
import { Request, Response } from 'express';
import { sendNotification } from '../../socket/index';
import { Notification } from '../../models/db/notification';


export const notifyUser = (req: Request, res: Response) => {
  try {
    const { userId, message, data } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }
    sendNotification(userId, message, data || {});
    return res.status(200).json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
};

export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};
