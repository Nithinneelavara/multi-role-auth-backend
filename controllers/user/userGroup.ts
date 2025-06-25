import { Request, Response, NextFunction } from "express";
import Group from "../../models/db/group";
import Message from "../../models/db/message";
import JoinRequest from "../../models/db/joinRequest";
import { sendNotification } from "../../socket";
import User from '../../models/db/user';
import mongoose from "mongoose";

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

    // Step 1: Find approved group IDs for this user
    const approvedRequests = await JoinRequest.find({
      userId,
      status: "approved",
    }).select("groupId");

    const joinedGroupIds = approvedRequests.map((request) => request.groupId);

    // Step 2: Find groups excluding those already approved
    const groups = await Group.find({
      _id: { $nin: joinedGroupIds },
    }).select("groupName maxUsers members");

    req.apiResponse = {
      success: true,
      message: "Available groups retrieved successfully",
      data: groups,
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

    const approvedRequests = await JoinRequest.find({
      userId,
      status: "approved",
    })
      .populate("groupId", "groupName")
      .lean();

    const approvedGroups = approvedRequests.map((request) => {
      const group = request.groupId as unknown as {
        _id: string;
        groupName: string;
      };
      return {
        groupId: group._id,
        groupName: group.groupName,
      };
    });

    req.apiResponse = {
      success: true,
      message:
        approvedGroups.length > 0
          ? "Approved groups retrieved successfully"
          : "Your group approval is pending",
      data: approvedGroups,
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
    const { groupId } = req.query;

    // Step 1: Get approved group IDs for this user
    const approvedRequests = await JoinRequest.find({
      userId,
      status: "approved",
    });

    const approvedGroupIds = approvedRequests.map((req) => req.groupId.toString());

    // Optional groupId filter
    if (groupId && !approvedGroupIds.includes(groupId.toString())) {
      req.apiResponse = {
        success: false,
        message: "You are not a member of this group or group not approved.",
        data: [],
      };
      return next();
    }

    const targetGroupIds = groupId ? [groupId] : approvedGroupIds;

    // Step 2: Fetch messages from Message collection
    const messages = await Message.find({
      groupId: { $in: targetGroupIds },
      messageType: "admin",
    })
      .sort({ createdAt: -1 })
      .lean();

    // Step 3: Group messages by groupId
    const groupedMessages: Record<string, { groupName: string; notifications: any[] }> = {};

    messages.forEach((msg) => {
      const groupKey = msg.groupId?.toString() || "unknown";
      if (!groupedMessages[groupKey]) {
        groupedMessages[groupKey] = {
          groupName: msg.groupName || "Unknown Group",
          notifications: [],
        };
      }

      groupedMessages[groupKey].notifications.push({
        message: msg.message,
        timestamp: msg.timestamp,
      });
    });

    const result = groupId
      ? groupedMessages[groupId.toString()]
        ? [groupedMessages[groupId.toString()]]
        : []
      : Object.values(groupedMessages);

    req.apiResponse = {
      success: true,
      message: result.length > 0
        ? `Messages ${groupId ? 'for group ' + groupId : 'for your groups'} fetched successfully`
        : "No messages found",
      data: result,
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
        message:
          "receiverId and message (in request body) are required and must be valid",
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

    const savedMessage = await Message.create({
      messageType: "user",
      senderId,
      senderModel: "User",
      receiverId,
      message,
      timestamp: new Date(),
    });

    // Optional: Real-time notification
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
    const filterUserId = req.query.userId?.toString();

    if (!filterUserId) {
      return res.status(400).json({
        success: false,
        message: "Missing userId in query. Please specify a userId to view chat history.",
      });
    }

    // ✅ Mark messages from them to me as read
    await Message.updateMany(
      {
        messageType: 'user',
        senderId: new mongoose.Types.ObjectId(filterUserId),
        receiverId: new mongoose.Types.ObjectId(currentUserId),
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    // ✅ Get all messages between current user and target user
    const messages = await Message.find({
      messageType: 'user',
      $or: [
        { senderId: currentUserId, receiverId: filterUserId },
        { senderId: filterUserId, receiverId: currentUserId },
      ],
    }).sort({ timestamp: 1 });

    const chatHistory = messages.map((msg) => ({
      message: msg.message,
      timestamp: msg.timestamp,
      direction: msg.senderId.toString() === currentUserId ? 'sent' : 'received',
      isRead: msg.isRead ?? false,
    }));

    req.apiResponse = {
      success: true,
      message: `Chat history with user ${filterUserId}`,
      data: chatHistory,
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
    const currentUserId = (req.user as any)._id.toString();
    const filterUserId = req.query.userId?.toString(); // clicked user ID

    // 🚀 Case 1: Show chat history with specific user
    if (filterUserId) {
  
      // 📨 Fetch full conversation
      const messages = await Message.find({
        messageType: 'user',
        $or: [
          { senderId: currentUserId, receiverId: filterUserId },
          { senderId: filterUserId, receiverId: currentUserId },
        ],
      })
        .sort({ timestamp: 1 })
        .lean();

      const formattedMessages = messages.map((msg) => ({
        message: msg.message,
        timestamp: msg.timestamp,
        direction: msg.senderId.toString() === currentUserId ? 'sent' : 'received',
        isRead: msg.isRead ?? false,
      }));

      req.apiResponse = {
        success: true,
        message: `Chat history with user ${filterUserId}`,
        data: {
          [filterUserId]: formattedMessages,
        },
      };
      return next();
    }

    // 🧭 Case 2: Return contact list
    const messages = await Message.find({
      messageType: 'user',
      $or: [
        { senderId: currentUserId },
        { receiverId: currentUserId },
      ],
    }).lean();

    const contactIdSet = new Set<string>();
    messages.forEach((msg) => {
      const sender = msg.senderId?.toString();
      const receiver = msg.receiverId?.toString();
      if (sender && sender !== currentUserId) contactIdSet.add(sender);
      if (receiver && receiver !== currentUserId) contactIdSet.add(receiver);
    });

    const contactIds = Array.from(contactIdSet);

    const users = await User.find({ _id: { $in: contactIds } }).select(
      '_id first_name last_name'
    );

    const contacts = contactIds.map((id) => {
      const user = users.find((u) => u._id.toString() === id);
      return {
        userId: id,
        name: user ? `${user.first_name} ${user.last_name}` : 'Unknown User',
      };
    });

    req.apiResponse = {
      success: true,
      message: 'User contacts retrieved successfully',
      data: contacts,
    };
    next();
  } catch (err) {
    next(err);
  }
};
