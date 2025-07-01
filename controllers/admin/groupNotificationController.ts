import { Request, Response, NextFunction } from 'express';
import Group from '../../models/db/group';
import User from '../../models/db/user';
import GroupMessage from '../../models/db/message';
import { sendNotification } from '../../socket';
import mongoose from 'mongoose';
import { parseStandardQueryParams as parseQueryParams, buildSearchFilterQuery, buildProjection, getPagination,} from '../../controllers/generic/utils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

// Helper to safely extract user ID from request
function getUserId(req: Request): string {
  if (req.user && typeof req.user === 'object' && '_id' in req.user) {
    return (req.user as any)._id;
  }
  throw new Error('Invalid or missing user');
}

function generateS3Url(fileName: string): string {
  const bucket = process.env.S3_BUCKET_NAME!;
  const region = process.env.AWS_REGION!;
  return ` https://${bucket}.s3.${region}.amazonaws.com/${fileName} `;
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
    const { message, fileName ,scheduledTime } = req.body;

    if (!groupId || (!message && !fileName)) {
      req.apiResponse = {
        success: false,
        message: 'Message or fileName is required.',
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

    const notificationPayload = {
      groupId: group._id,
      groupName: group.groupName,
      file: fileName ? generateS3Url(fileName) : '', // ✅ use full URL in notification
    };

    approvedMembers.forEach((user) => {
      sendNotification(
        user._id.toString(),
        message || '',
        notificationPayload,
        'user'
      );
    });

    sendNotification(
      group._id.toString(),
      message || '',
      notificationPayload,
      'group'
    );

    await GroupMessage.create({
      messageType: 'admin',
      senderId: adminId,
      senderModel: 'Admin',
      groupId: group._id,
      groupName: group.groupName,
      message: message || '',
      file: fileName || '',
      timestamp: new Date(),
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
      isSent: scheduledTime ? false : true,
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

    const {
      page,
      limit,
      searchTerm,
      searchFields,
      filter = {},
      projection,
    } = parseQueryParams(req.body);

    const { skip } = getPagination(page, limit);

    const dbFilter: any = {
      senderId: adminId,
      ...filter,
      ...(searchTerm ? buildSearchFilterQuery(searchFields, searchTerm) : {}),
    };

    const groupId = req.body.groupId;
    if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
      dbFilter.groupId = new mongoose.Types.ObjectId(groupId);
    }

    const { projection: cleanProjection, mode } = buildProjection(projection);
    if (mode === 'invalid') {
      throw new Error('Projection cannot mix inclusion and exclusion.');
    }

    if (mode !== 'exclude') {
      cleanProjection.groupId = 1;
      cleanProjection.groupName = 1;
      cleanProjection.message = 1;
      cleanProjection.timestamp = 1;
      cleanProjection.file = 1;
    }

    const totalCount = await GroupMessage.countDocuments(dbFilter);
    const messages = await GroupMessage.find(dbFilter, cleanProjection)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

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
        ...(msg.message && { message: msg.message }),
        ...(msg.timestamp && { timestamp: msg.timestamp }),
        file: msg.file ? generateS3Url(msg.file) : '',
      });

      return acc;
    }, {});

    const result = Object.values(grouped);

    
    req.apiResponse = {
      success: true,
      message:
        result.length > 0
          ? `Group notification${groupId ? '' : 's'} fetched.`
          : 'No notifications found.',
      totalMessagesSentByAdmin: totalCount,
      data: {
        page,
        limit,
        results: result,
      },
    };

    next();
  } catch (err) {
    next(err);
  }
};