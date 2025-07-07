import { Request, Response } from 'express';
import { sendNotification } from '../../socket/index';
import { MemberNotification } from '../../models/db/memberNotification';
import mongoose from 'mongoose';
import Member from '../../models/db/member';

export const notifyMember = async (req: Request, res: Response) => {
  try {
    const { memberId, message, data } = req.body;

    if (!memberId || !message) {
      return res.status(400).json({ error: 'memberId and message are required' });
    }

     if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ error: 'Invalid memberId format' });
    }

    const memberExists = await Member.findById(memberId);
    if (!memberExists) {
      return res.status(404).json({ error: 'Member not found' });
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
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid memberId format' });
    }

    const notifications = await MemberNotification.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching member notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch member notifications' });
  }
};
