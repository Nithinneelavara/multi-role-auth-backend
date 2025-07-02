import { Request, Response } from 'express';
import { sendNotification } from '../../socket/index';
import { MemberNotification } from '../../models/db/memberNotification';

export const notifyMember = async (req: Request, res: Response) => {
  try {
    const { memberId, message, data } = req.body;

    if (!memberId || !message) {
      return res.status(400).json({ error: 'memberId and message are required' });
    }

    await MemberNotification.create({
      userId: memberId,
      message,
      data: data || {},
    });

    // Send real-time notification via Socket.IO
    sendNotification(memberId, message, data || {});

    return res.status(200).json({ message: 'Notification sent and saved successfully' });
  } catch (error) {
    console.error('Error sending member notification:', error);
    return res.status(500).json({ error: 'Failed to send member notification' });
  }
};

export const getMemberNotifications = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;

    const notifications = await MemberNotification.find({ userId: memberId }).sort({ createdAt: -1 });

    return res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching member notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch member notifications' });
  }
};
