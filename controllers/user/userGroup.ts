import { Request, Response, NextFunction } from "express";
import Group from "../../models/db/group";
import Message from "../../models/db/message";
import JoinRequest from "../../models/db/joinRequest";
import { sendNotification, getSocketInstance } from "../../socket";
import User from '../../models/db/user';
import mongoose from "mongoose";
import {  parseStandardQueryParams, buildSearchFilterQuery, getPagination, buildProjection, } from "../generic/utils";
import UnreadCount from '../../models/db/unreadCount';
import { encrypt } from "../../utils/encryption";
import { decrypt } from '../../utils/encryption';

// ----------- Helper Function for Safe User ID Extraction -----------
function getUserId(req: Request): string {
  if (req.user && typeof req.user === "object" && "_id" in req.user) {
    return (req.user as any)._id;
  }
  throw new Error("Invalid or missing user");
}

// -------------------- GET AVAILABLE GROUPS --------------------

export const getAvailableGroups = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)._id;
    const { groupId } = req.body;

    const {
      page,
      limit,
      searchTerm,
      searchFields,
      filter,
      projection,
    } = parseStandardQueryParams(req.body);

    const approvedRequests = await JoinRequest.find({
      userId,
      status: 'approved',
    }).select('groupId');

    const joinedGroupIds = approvedRequests.map((r) => r.groupId.toString());
    const { skip, limit: safeLimit } = getPagination(page, limit);
    const { projection: mongoProjection } = buildProjection(projection);

    // ✅ CASE 1: groupId provided → return only that group (if not joined)
    if (groupId) {
      if (joinedGroupIds.includes(groupId)) {
        req.apiResponse = {
          success: true,
          message: 'Group already joined, not available.',
          data: {
            totalCount: 0,
            page,
            limit: safeLimit,
            groups: [],
          },
        };
        return next();
      }

      const group = await Group.findById(groupId).select(mongoProjection);
      if (!group) {
        req.apiResponse = {
          success: false,
          message: 'Group not found',
          data: null,
        };
        return next();
      }

      req.apiResponse = {
        success: true,
        message: 'Group retrieved successfully',
        data: {
          totalCount: 1,
          page,
          limit: safeLimit,
          groups: [group],
        },
      };
      return next();
    }

    // ✅ CASE 2: No groupId → return all available groups
    const baseQuery: any = {
      _id: { $nin: joinedGroupIds },
      ...filter,
      ...buildSearchFilterQuery(searchFields, searchTerm),
    };

    const totalCount = await Group.countDocuments(baseQuery);
    const availableGroups = await Group.find(baseQuery)
      .select(mongoProjection)
      .skip(skip)
      .limit(safeLimit);

    req.apiResponse = {
      success: true,
      message: 'Available groups retrieved successfully',
      data: {
        totalCount,
        page,
        limit: safeLimit,
        groups: availableGroups,
      },
    };

    next();
  } catch (err) {
    next(err);
  }
};


// -------------------- SEND JOIN REQUEST --------------------
export const sendJoinRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = getUserId(req);
    const { groupId } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      req.apiResponse = {
        success: false,
        message: "Group not found",
      };
      return next();
    }

    const existingRequest = await JoinRequest.findOne({ groupId, userId });
    if (existingRequest) {
      req.apiResponse = {
        success: false,
        message: "Join request already sent",
      };
      return next();
    }

    const newRequest = new JoinRequest({
      groupId,
      userId,
      status: "pending",
    });
    await newRequest.save();

    req.apiResponse = {
      success: true,
      message: "Join request sent successfully",
    };
    next();
  } catch (err) {
    next(err);
  }
};

// -------------------- GET APPROVED GROUPS FOR USER --------------------
export const getApprovedGroupsForUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = getUserId(req);
    const { groupId } = req.body;

    const {
      page,
      limit,
      searchTerm,
      searchFields,
      filter,
      projection,
    } = parseStandardQueryParams(req.body);

    // Step 1: Get approved group IDs for the user
    const approvedRequests = await JoinRequest.find({
      userId,
      status: 'approved',
    }).select('groupId');

    const approvedGroupIds = approvedRequests.map((req) =>
      req.groupId.toString()
    );

    const { skip, limit: safeLimit } = getPagination(page, limit);
    const { projection: mongoProjection } = buildProjection(projection);

    // CASE 1: specific groupId given — only return that group if approved
    if (groupId) {
      if (!approvedGroupIds.includes(groupId)) {
        req.apiResponse = {
          success: false,
          message: 'Group not approved or not found',
          data: null,
        };
        return next();
      }

      const specificGroup = await Group.findById(groupId).select(mongoProjection);
      if (!specificGroup) {
        req.apiResponse = {
          success: false,
          message: 'Group not found',
          data: null,
        };
        return next();
      }

      req.apiResponse = {
        success: true,
        message: 'Group retrieved successfully',
        data: {
          totalCount: 1,
          page,
          limit: safeLimit,
          groups: [specificGroup],
        },
      };
      return next();
    }

    // CASE 2: return all approved groups with filters
    const baseQuery: any = {
      _id: { $in: approvedGroupIds },
      ...filter,
      ...buildSearchFilterQuery(searchFields, searchTerm),
    };

    const totalCount = await Group.countDocuments(baseQuery);

    const approvedGroups = await Group.find(baseQuery)
      .select(mongoProjection)
      .skip(skip)
      .limit(safeLimit);

    req.apiResponse = {
      success: true,
      message:
        approvedGroups.length > 0
          ? 'Approved groups retrieved successfully'
          : 'Your group approval is pending',
      data: {
        totalCount,
        page,
        limit: safeLimit,
        groups: approvedGroups,
      },
    };

    next();
  } catch (err) {
    next(err);
  }
};

// -------------------- GET MY GROUP MESSAGES (NEW) --------------------

export const getMyGroupMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = getUserId(req);
    const { groupId } = req.body;

    const {
      page,
      limit,
      searchTerm,
      searchFields,
      filter,
      projection,
    } = parseStandardQueryParams(req.body);

    const approvedRequests = await JoinRequest.find({
      userId,
      status: "approved",
    }).select("groupId");

    const approvedGroupIds = approvedRequests.map((r) => r.groupId.toString());

    if (groupId && !approvedGroupIds.includes(groupId)) {
      req.apiResponse = {
        success: false,
        message: "You are not a member of this group or group not approved.",
        data: [],
      };
      return next();
    }

    const targetGroupIds = groupId ? [groupId] : approvedGroupIds;

    const baseQuery: any = {
      groupId: { $in: targetGroupIds },
      messageType: "admin",
      ...filter,
      ...buildSearchFilterQuery(searchFields, searchTerm),
    };

    const { skip, limit: safeLimit } = getPagination(page, limit);
    const { projection: mongoProjection, mode } = buildProjection(projection);

    // ✅ Always include message & iv for decryption if not explicitly excluded
    if (mode !== 'exclude') {
      mongoProjection.message = 1;
      mongoProjection.iv = 1;
      mongoProjection.timestamp = 1;
      mongoProjection.groupId = 1;
      mongoProjection.groupName = 1;
    }

    const totalCount = await Message.countDocuments(baseQuery);

    const messages = await Message.find(baseQuery)
      .select(mongoProjection)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean();

    const groupedMessages: Record<string, { groupId: string; groupName: string; notifications: any[] }> = {};

    messages.forEach((msg) => {
      const groupKey = msg.groupId?.toString() || "unknown";
      if (!groupedMessages[groupKey]) {
        groupedMessages[groupKey] = {
          groupId: groupKey,
          groupName: msg.groupName || "Unknown Group",
          notifications: [],
        };
      }

      let decryptedMessage = '🔐 Unable to decrypt';
      try {
        if (msg.message && msg.iv) {
          decryptedMessage = decrypt(msg.message, msg.iv);
        }
      } catch (_) {
        // ignore decryption failure
      }

      groupedMessages[groupKey].notifications.push({
        message: decryptedMessage,
        timestamp: msg.timestamp,
      });
    });

    const result = groupId
      ? groupedMessages[groupId]
        ? [groupedMessages[groupId]]
        : []
      : Object.values(groupedMessages);

    req.apiResponse = {
      success: true,
      message:
        result.length > 0
          ? `Messages ${groupId ? "for group " + groupId : "for your groups"} fetched successfully`
          : "No messages found",
      data: {
        totalCount,
        page,
        limit: safeLimit,
        groups: result,
      },
    };

    next();
  } catch (err) {
    next(err);
  }
};

// ---------------------------
// 📤 SEND USER-TO-USER MESSAGE
// ---------------------------
export const sendUserMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const senderId = getUserId(req)?.toString();
    const { receiverId, message } = req.body;

    if (!receiverId || !message || typeof message !== "string") {
      req.apiResponse = {
        success: false,
        message: "receiverId and message are required and must be valid",
      };
      return next();
    }

    if (receiverId === senderId) {
      req.apiResponse = {
        success: false,
        message: "You cannot send a message to yourself.",
      };
      return next();
    }

    // 🔐 Encrypt message before saving
    const { encryptedData, iv } = encrypt(message);

    const savedMessage = await Message.create({
      messageType: "user",
      senderId,
      senderModel: "User",
      receiverId,
      message: encryptedData, // encrypted message
      iv,                     // store IV with the message
      isRead: false,
      timestamp: new Date(),
    });

    await UnreadCount.findOneAndUpdate(
      { userId: receiverId, contactId: senderId },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );

    const io = getSocketInstance();
    io.to(`notification-${receiverId}`).emit(`direct-message-${receiverId}`, {
      fromUserId: senderId,
      toUserId: receiverId,
      message, // original plain text for real-time use
      timestamp: savedMessage.timestamp,
      messageId: savedMessage._id,
    });

    sendNotification(
      receiverId,
      message,
      {
        fromUserId: senderId,
        messageId: savedMessage._id,
        timestamp: savedMessage.timestamp,
      },
      "user"
    );

    req.apiResponse = {
      success: true,
      message: "Message sent successfully",
      data: savedMessage,
    };
    next();
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------
// 📥 GET USER-TO-USER CHAT HISTORY
// ------------------------------------------
export const getUserChatHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const currentUserId = getUserId(req)?.toString();

    const {
      page,
      limit,
      searchTerm,
      searchFields,
      filter,
      projection,
    } = parseStandardQueryParams(req.body);

    const filterUserId = req.body.userId;
    if (!filterUserId || !mongoose.Types.ObjectId.isValid(filterUserId)) {
      req.apiResponse = {
        success: false,
        message: 'Invalid or missing userId. Please provide a valid userId to fetch chat history.',
      };
      return next();
    }

    if (filterUserId === currentUserId) {
      req.apiResponse = {
        success: false,
        message: 'You cannot view chat history with yourself.',
      };
      return next();
    }

    const currentUserObjectId = new mongoose.Types.ObjectId(currentUserId);
    const filterUserObjectId = new mongoose.Types.ObjectId(filterUserId);

    await Message.updateMany(
      {
        messageType: 'user',
        senderId: filterUserObjectId,
        receiverId: currentUserObjectId,
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    const baseQuery: any = {
      messageType: 'user',
      $or: [
        { senderId: currentUserObjectId, receiverId: filterUserObjectId },
        { senderId: filterUserObjectId, receiverId: currentUserObjectId },
      ],
    };

    if (searchTerm) {
      const searchQuery = buildSearchFilterQuery(searchFields || ['message'], searchTerm);
      Object.assign(baseQuery, searchQuery);
    }

    if (filter && typeof filter === 'object') {
      Object.assign(baseQuery, filter);
    }

    const totalCount = await Message.countDocuments(baseQuery);
    const { skip } = getPagination(page, limit);

    const { projection: projectFields, mode } = buildProjection(projection);
    if (mode === 'invalid') {
      req.apiResponse = {
        success: false,
        message: 'Invalid projection object. Cannot mix include and exclude fields.',
      };
      return next();
    }

    const messages = await Message.find(baseQuery, projectFields)
      .sort({ timestamp: 1 })
      .skip(skip)
      .limit(limit);

    const formattedMessages = messages.map((msg) => {
      let decryptedMessage = '🔐 Unable to decrypt';
      try {
        decryptedMessage = decrypt(msg.message, msg.iv);
      } catch (err) {
        console.warn(` Failed to decrypt message with ID: ${msg._id}`, err);
      }

      return {
        message: decryptedMessage,
        timestamp: msg.timestamp,
        isRead: msg.isRead,
        direction: msg.senderId?.toString() === currentUserId ? 'sent' : 'received',
      };
    });

    req.apiResponse = {
      success: true,
      message: `Chat history with user ${filterUserId}`,
      data: {
        totalCount,
        page,
        limit,
        messages: formattedMessages,
      },
    };

    next();
  } catch (err) {
    next(err);
  }
};
// ---------------------------
// 📇 GET MY CONTACTS
// ---------------------------

export const getMyContacts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const currentUserId = getUserId(req)?.toString();
    const { userId: filterUserId } = req.body;

    const {
      page,
      limit,
      searchTerm,
      searchFields,
      filter,
      projection,
    } = parseStandardQueryParams(req.body);

    if (filterUserId && !mongoose.Types.ObjectId.isValid(filterUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userId provided.',
      });
    }

    const { skip, limit: safeLimit } = getPagination(page, limit);
    const { projection: mongoProjection } = buildProjection(projection);

    // ✅ CASE 1: Chat history with a specific user
    if (filterUserId) {
      if (filterUserId === currentUserId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot fetch chat history with yourself.',
        });
      }

      const query = {
        messageType: 'user',
        $or: [
          { senderId: currentUserId, receiverId: filterUserId },
          { senderId: filterUserId, receiverId: currentUserId },
        ],
        ...filter,
        ...buildSearchFilterQuery(searchFields, searchTerm),
      };

      const totalCount = await Message.countDocuments(query);
      const messages = await Message.find(query)
        .select(mongoProjection)
        .sort({ timestamp: 1 })
        .skip(skip)
        .limit(safeLimit)
        .lean();

      const formattedMessages = messages.map((msg: any) => {
        const formatted: any = {
          direction: msg.senderId?.toString() === currentUserId ? 'sent' : 'received',
        };

        // ✅ Decrypt message
        try {
          formatted.message = decrypt(msg.message, msg.iv);
        } catch {
          formatted.message = '🔐 Unable to decrypt';
        }

        // Add other fields except id/meta
        for (const key of Object.keys(msg)) {
          if (!['senderId', 'receiverId', '_id', 'message', 'iv'].includes(key)) {
            formatted[key] = msg[key];
          }
        }

        return formatted;
      });

      req.apiResponse = {
        success: true,
        message: `Chat history with user ${filterUserId}`,
        data: {
          totalCount,
          page,
          limit: safeLimit,
          userId: filterUserId,
          messages: formattedMessages,
        },
      };
      return next();
    }

    // ✅ CASE 2: Get contact list
    const messageQuery = {
      messageType: 'user',
      $or: [
        { senderId: currentUserId },
        { receiverId: currentUserId },
      ],
      ...filter,
      ...buildSearchFilterQuery(searchFields, searchTerm),
    };

    const allMessages = await Message.find(messageQuery).lean();

    const contactIdSet = new Set<string>();
    allMessages.forEach((msg) => {
      const sender = msg.senderId?.toString();
      const receiver = msg.receiverId?.toString();
      if (sender && sender !== currentUserId) contactIdSet.add(sender);
      if (receiver && receiver !== currentUserId) contactIdSet.add(receiver);
    });

    const contactIds = Array.from(contactIdSet);

    const users = await User.find({
      _id: { $in: contactIds, $ne: currentUserId },
    }).select('_id first_name last_name');

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const unreadDocs = await UnreadCount.find({
      userId: currentUserId,
      contactId: { $in: contactIds },
    });

    const unreadMap = new Map<string, number>();
    unreadDocs.forEach((doc) => {
      unreadMap.set(doc.contactId.toString(), doc.count);
    });

    const contacts = contactIds.map((id) => {
      const user = userMap.get(id);
      return {
        userId: id,
        name: user ? `${user.first_name} ${user.last_name}` : 'Unknown User',
        unreadMessageCount: unreadMap.get(id) || 0,
      };
    });

    const paginatedContacts = contacts.slice(skip, skip + safeLimit);

    req.apiResponse = {
      success: true,
      message: 'User contacts retrieved successfully',
      data: {
        totalCount: contacts.length,
        page,
        limit: safeLimit,
        contacts: paginatedContacts,
      },
    };

    next();
  } catch (err) {
    next(err);
  }
};