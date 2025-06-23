import { Request, Response, NextFunction } from "express";
import Group from "../../models/db/group";
import Message from "../../models/db/message";
import JoinRequest from "../../models/db/joinRequest";
import { sendNotification } from "../../socket";

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
    const senderId = getUserId(req);
    const { receiverId, message } = req.body;

    if (!receiverId || !message || typeof message !== "string") {
      req.apiResponse = {
        success: false,
        message:
          "receiverId and message (in request body) are required and must be valid",
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
    const filterUserId = req.query.userId?.toString(); // optional filter

    const baseQuery: any = {
      messageType: 'user',
      receiverId: { $exists: true },
      $or: [
        { senderId: currentUserId },
        { receiverId: currentUserId }
      ]
    };

    // ✅ If specific userId is provided, filter for messages only with that user
    if (filterUserId) {
      baseQuery.$or = [
        { senderId: currentUserId, receiverId: filterUserId },
        { senderId: filterUserId, receiverId: currentUserId }
      ];
    }

    const messages = await Message.find(baseQuery).sort({ timestamp: 1 });

    const conversations: Record<string, any[]> = {};

    messages.forEach((msg) => {
      const senderId = msg.senderId?.toString();
      const receiverId = msg.receiverId?.toString();

      const isSentByMe = senderId === currentUserId;
      const otherUserId = isSentByMe ? receiverId : senderId;
      if (!otherUserId) return;

      if (!conversations[otherUserId]) {
        conversations[otherUserId] = [];
      }

      conversations[otherUserId].push({
        message: msg.message,
        timestamp: msg.timestamp,
        direction: isSentByMe ? 'sent' : 'received',
      });
    });

    req.apiResponse = {
      success: true,
      message: filterUserId
        ? `Chat history with user ${filterUserId}`
        : 'Chat history grouped by user',
      data: conversations,
    };

    next();
  } catch (err) {
    next(err);
  }
};

