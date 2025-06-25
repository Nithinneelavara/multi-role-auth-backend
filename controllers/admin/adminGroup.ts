import { Request, Response, NextFunction } from 'express';
import Group from '../../models/db/group';
import JoinRequest from '../../models/db/joinRequest';

// ----------- Helper Function for Safe User ID Extraction -----------
function getUserId(req: Request): string {
  if (req.user && typeof req.user === 'object' && '_id' in req.user) {
    return (req.user as any)._id;
  }
  throw new Error('Invalid or missing user');
}

// ------------------ CREATE GROUP ------------------
export const createGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupName, maxUsers } = req.body;
    const adminId = getUserId(req);

    const group = await Group.create({
      groupName,
      maxUsers,
      members: [],
      createdBy: adminId,
    });

    req.apiResponse = {
      success: true,
      message: 'Group created successfully',
      data: group,
    };
    next();
  } catch (error) {
    next(error);
  }
};

// ------------------ GET ALL GROUPS (WITH MEMBERS) ------------------
export const getAllGroupsWithUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = getUserId(req);

    const groups = await Group.find({
  createdBy: adminId,
  members: { $exists: true, $not: { $size: 0 } },
})
  .select('-notifications') // ✅ Exclude notifications field
  .populate('members', 'userName email')
  .exec();

    req.apiResponse = {
      success: true,
      message: groups.length > 0
        ? 'Groups with members fetched successfully'
        : 'No groups with members found',
      data: groups,
    };
    next();
  } catch (error) {
    next(error);
  }
};


// ------------------ GET ALL JOIN REQUESTS ------------------
export const getJoinRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminId = getUserId(req);

    const groups = await Group.find({ createdBy: adminId }, '_id');
    const groupIds = groups.map(group => group._id);

    const requests = await JoinRequest.find({ groupId: { $in: groupIds }, status: 'pending' })
      .populate('userId', 'userName email')
      .populate('groupId', 'groupName');

    req.apiResponse = {
      success: true,
      message: requests.length > 0
        ? 'Join requests fetched successfully'
        : 'No pending join requests found',
      data: requests,
    };
    next();
  } catch (error) {
    next(error);
  }
};

// ------------------ APPROVE OR REJECT JOIN REQUEST ------------------

export const handleJoinRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      req.apiResponse = {
        success: false,
        message: 'Invalid action. Must be "approve" or "reject".',
      };
      return next();
    }

    const request = await JoinRequest.findById(requestId);
    if (!request || request.status !== 'pending') {
      req.apiResponse = {
        success: false,
        message: 'Request not found or already processed',
      };
      return next();
    }

    if (action === 'approve') {
      const group = await Group.findById(request.groupId);
      if (!group) {
        req.apiResponse = {
          success: false,
          message: 'Group not found',
        };
        return next();
      }

      if (group.members.length >= group.maxUsers) {
        req.apiResponse = {
          success: false,
          message: 'Group is full',
        };
        return next();
      }

      group.members.push(request.userId);
      await group.save();
      request.status = 'approved';
    }

    if (action === 'reject') {
      request.status = 'rejected';
    }

    await request.save();

    req.apiResponse = {
      success: true,
      message: `Request ${action}ed successfully`,
    };
    next();
  } catch (error) {
    next(error);
  }
};


// ------------------ UPDATE GROUP ------------------
export const updateGroup = async (req: Request, res: Response, next: NextFunction) => {
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
        message: 'Group not found or unauthorized',
      };
      return next();
    }

    req.apiResponse = {
    
      success: true,
      message: 'Group updated successfully',
      data: updatedGroup,
    };
    next();
  } catch (error) {
    next(error);
  }
};

// ------------------ DELETE GROUP ------------------
export const deleteGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.params;
    const adminId = getUserId(req);

    const deleted = await Group.findOneAndDelete({ _id: groupId, createdBy: adminId });
    if (!deleted) {
      req.apiResponse = {
        success: false,
        message: 'Group not found or unauthorized',
      };
      return next();
    }

    await JoinRequest.deleteMany({ groupId });

    req.apiResponse = {
      success: true,
      message: 'Group and related requests deleted successfully',
    };
    next();
  } catch (error) {
    next(error);
  }
};
