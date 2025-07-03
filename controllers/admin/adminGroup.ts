import { Request, Response, NextFunction } from "express";
import Group from "../../models/db/group";
import JoinRequest from "../../models/db/joinRequest";
import { buildSearchFilterQuery, getPagination, buildProjection, ProjectionMode  } from "../../controllers/generic/utils";

// ----------- Helper Function for Safe User ID Extraction -----------
function getUserId(req: Request): string {
  if (req.user && typeof req.user === "object" && "_id" in req.user) {
    return (req.user as any)._id;
  }
  throw new Error("Invalid or missing user");
}

// ------------------ CREATE GROUP ------------------
export const createGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let { groupName, maxUsers } = req.body;
    const adminId = getUserId(req);
    groupName = groupName.trim().toLowerCase();
    const existingGroup = await Group.findOne({ groupName });
    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: "Group with the same name already exists in the database.",
      });
    }
    const group = await Group.create({
      groupName,
      maxUsers,
      members: [],
      createdBy: adminId,
    });
    req.apiResponse = {
      success: true,
      message: "Group created successfully",
      data: group,
    };
    next();
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Group with the same name already exists (duplicate key error).",
      });
    }
    next(error);
  }
};

// ------------------ GET ALL GROUPS (WITH MEMBERS) ------------------
export const getAllGroupsWithUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminId = getUserId(req);
    const { search, filter = {}, pagination = {}, projection = {} } = req.body;
    const baseQuery: any = {
      createdBy: adminId,
      members: { $exists: true, $not: { $size: 0 } },
      ...filter,
      ...(search ? buildSearchFilterQuery(['groupName'], search) : {})
    };
    const { page = 1, limit = 10 } = pagination;
    const { skip } = getPagination(page, limit);
    const { projection: cleanProjection, mode }: {
      projection: Record<string, 1 | 0>,
      mode: ProjectionMode
    } = buildProjection(projection);
    if (mode === 'invalid') {
  const error = new Error('Projection cannot mix inclusion and exclusion.');
  (error as any).statusCode = 500;
  throw error;
}

    const groupProjection: Record<string, 1 | 0> = {};
    const memberProjection: Record<string, 1 | 0> = {};

    for (const key in cleanProjection) {
      if (key.startsWith('members.')) {
        const memberKey = key.replace('members.', '');
        memberProjection[memberKey] = cleanProjection[key];
      } else {
        groupProjection[key] = cleanProjection[key];
      }
    }
    if (mode === 'include') {
      delete groupProjection.notifications;
    } else {
      groupProjection.notifications = 0;
    }
    if (Object.keys(memberProjection).length === 0) {
      memberProjection.userName = 1;
      memberProjection.email = 1;
    }
    const totalCount = await Group.countDocuments(baseQuery);
    const groups = await Group.find(baseQuery, groupProjection)
      .populate('members', memberProjection)
      .skip(skip)
      .limit(limit)
      .lean();
    req.apiResponse = {
      success: true,
      message: groups.length > 0
        ? 'Groups with members fetched successfully'
        : 'No groups with members found',
      data: {
        totalCount,
        page,
        limit,
        groups
      }
    };
    next();
  } catch (error) {
    next(error);
  }
};
// ------------------ GET ALL JOIN REQUESTS ------------------
export const getJoinRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminId = getUserId(req);
    const { search, filter = {}, pagination = {}, projection = {} } = req.body;
    //  Get group IDs created by this admin
    const groups = await Group.find({ createdBy: adminId }, '_id');
    const groupIds = groups.map(group => group._id);
    const baseQuery: any = {
      groupId: { $in: groupIds },
      status: 'pending',
      ...filter,
      ...(search ? buildSearchFilterQuery(['requestMessage'], search) : {}),
    };
    const { page = 1, limit = 10 } = pagination;
    const { skip } = getPagination(page, limit);
    const { projection: cleanProjection, mode } = buildProjection(projection);
    if (mode === 'invalid') {
      throw new Error('Projection cannot mix inclusion and exclusion.');
    }
    const userProjectionFields: string[] = [];
    const groupProjectionFields: string[] = [];
    const rootProjection: Record<string, 1 | 0> = {};

    Object.keys(cleanProjection).forEach((field) => {
      const value = cleanProjection[field];
      if (field === 'userName') userProjectionFields.push('userName');
      else if (field === 'groupName') groupProjectionFields.push('groupName');
      else rootProjection[field] = value;
    });

    const userProjection = userProjectionFields.join(' ') || 'userName';
    const groupProjection = groupProjectionFields.join(' ') || 'groupName';
    const totalCount = await JoinRequest.countDocuments(baseQuery);
    const requests = await JoinRequest.find(baseQuery, rootProjection)
      .populate('userId', userProjection)
      .populate('groupId', groupProjection)
      .skip(skip)
      .limit(limit)
      .lean();

    req.apiResponse = {
      success: true,
      message:
        requests.length > 0
          ? 'Join requests fetched successfully'
          : 'No pending join requests found',
      data: {
        totalCount,
        page,
        limit,
        requests,
      },
    };
    next();
  } catch (error) {
    next(error);
  }
};

// ------------------ APPROVE OR REJECT JOIN REQUEST ------------------
export const handleJoinRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    if (!["approve", "reject"].includes(action)) {
      req.apiResponse = {
        success: false,
        message: 'Invalid action. Must be "approve" or "reject".',
      };
      return next();
    }
    const request = await JoinRequest.findById(requestId);
    if (!request || request.status !== "pending") {
      req.apiResponse = {
        success: false,
        message: "Request not found or already processed",
      };
      return next();
    }

    if (action === "approve") {
      const group = await Group.findById(request.groupId);
      if (!group) {
        req.apiResponse = {
          success: false,
          message: "Group not found",
        };
        return next();
      }
      if (group.members.length >= group.maxUsers) {
        req.apiResponse = {
          success: false,
          message: "Group is full",
        };
        return next();
      }
      group.members.push(request.userId);
      await group.save();
      request.status = "approved";
    }
    if (action === "reject") {
      request.status = "rejected";
    }

    await request.save();
    req.apiResponse = {
      success: true,
      message: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    };
    next();
  } catch (error) {
    next(error);
  }
};

// ------------------ UPDATE GROUP ------------------
export const updateGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { groupId } = req.params;
    const { groupName, maxUsers } = req.body;
    const adminId = getUserId(req);

    const updatedGroup = await Group.findOneAndUpdate(
      { _id: groupId, createdBy: adminId },
      { groupName, maxUsers },
      { new: true }
    );

    if (!updatedGroup) {
      req.apiResponse = {
        success: false,
        message: "Group not found or unauthorized",
      };
      return next();
    }

    req.apiResponse = {
      success: true,
      message: "Group updated successfully",
      data: updatedGroup,
    };
    next();
  } catch (error) {
    next(error);
  }
};

// ------------------ DELETE GROUP ------------------
export const deleteGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { groupId } = req.params;
    const adminId = getUserId(req);

    const deleted = await Group.findOneAndDelete({
      _id: groupId,
      createdBy: adminId,
    });
    if (!deleted) {
      req.apiResponse = {
        success: false,
        message: "Group not found or unauthorized",
      };
      return next();
    }

    await JoinRequest.deleteMany({ groupId });

    req.apiResponse = {
      success: true,
      message: "Group and related requests deleted successfully",
    };
    next();
  } catch (error) {
    next(error);
  }
};
