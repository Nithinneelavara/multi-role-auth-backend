import { Request, Response, NextFunction } from 'express';
import Group from '../../models/db/group';
import User from '../../models/db/user';
import GroupMessage from '../../models/db/message';
import { sendNotification } from '../../socket';

// Helper to safely extract user ID from request
function getUserId(req: Request): string {
  if (req.user && typeof req.user === 'object' && '_id' in req.user) {
    return (req.user as any)._id;
  }
  throw new Error('Invalid or missing user');
}

// Send notification to all groups of the admin
export const notifyGroupMembersViaSocket = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminId = getUserId(req);
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      req.apiResponse = {
        success: false,
        message: 'Notification message is required.',
      };
      return next();
    }

    const groups = await Group.find({ createdBy: adminId });
    if (!groups.length) {
      req.apiResponse = {
        success: false,
        message: 'No groups found for this admin.',
      };
      return next();
    }

    let totalNotified = 0;

    for (const group of groups) {
      const approvedMembers = await User.find({
        _id: { $in: group.members },
      });

      approvedMembers.forEach((user) => {
        sendNotification(
          user._id.toString(),
          message,
          { groupId: group._id, groupName: group.groupName },
          'user'
        );
      });

      sendNotification(
        group._id.toString(),
        message,
        { groupId: group._id, groupName: group.groupName },
        'group'
      );

      await GroupMessage.create({
        messageType: 'admin',
        senderId: adminId,
        senderModel: 'Admin',
        groupId: group._id,
        groupName: group.groupName,
        message,
        timestamp: new Date(),
      });

      totalNotified += approvedMembers.length;
    }

    req.apiResponse = {
      success: true,
      message: `Socket notification sent to ${totalNotified} approved users.`,
    };
    next();
  } catch (error) {
    next(error);
  }
};

// Send notification to a specific group
export const notifySpecificGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminId = getUserId(req);
    const groupId = req.params.groupId;
    const { message } = req.body;

    if (!groupId || !message || typeof message !== 'string') {
      req.apiResponse = {
        success: false,
        message: 'Both groupId (from route) and message (in body) are required.',
      };
      return next();
    }

    const group = await Group.findOne({ _id: groupId, createdBy: adminId });
    if (!group) {
      req.apiResponse = {
        success: false,
        message: 'Group not found or not created by you.',
      };
      return next();
    }

    const approvedMembers = await User.find({ _id: { $in: group.members } });

    approvedMembers.forEach((user) => {
      sendNotification(
        user._id.toString(),
        message,
        { groupId: group._id, groupName: group.groupName },
        'user'
      );
    });

    sendNotification(
      group._id.toString(),
      message,
      { groupId: group._id, groupName: group.groupName },
      'group'
    );

    await GroupMessage.create({
      messageType: 'admin',
      senderId: adminId,
      senderModel: 'Admin',
      groupId: group._id,
      groupName: group.groupName,
      message,
      timestamp: new Date(),
    });

    req.apiResponse = {
      success: true,
      message: `Notification sent to ${approvedMembers.length} members in group ${group.groupName}.`,
    };
    next();
  } catch (error) {
    next(error);
  }
};

// Retrieve all group notifications sent by the admin
export const getGroupNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminId = getUserId(req);
    const messages = await GroupMessage.find({ senderId: adminId, messageType: 'admin' });

    const grouped = messages.reduce((acc: any, msg) => {
      const id = msg.groupId?.toString();
      if (!id) return acc;

      if (!acc[id]) {
        acc[id] = {
          groupId: msg.groupId,
          groupName: msg.groupName,
          totalMessages: 0,
          notifications: [],
        };
      }
      acc[id].totalMessages++;
      acc[id].notifications.push({
        message: msg.message,
        timestamp: msg.timestamp,
      });
      return acc;
    }, {});

    const result = Object.values(grouped);

    req.apiResponse = {
      success: true,
      message: result.length > 0 ? 'Group notifications fetched.' : 'No notifications found.',
      totalMessagesSentByAdmin: messages.length,
      data: result,
    };

    next();
  } catch (err) {
    next(err);
  }
};
