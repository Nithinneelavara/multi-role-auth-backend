import express from 'express';
import { entryLogger } from '../../middleware/entrypoint';
import { exitLogger } from '../../middleware/exitpoint';
import {
  createGroup,
  getAllGroupsWithUsers,
  getJoinRequests,
  handleJoinRequest,
  updateGroup,
  deleteGroup
} from '../../controllers/admin/adminGroup';
import passport from '../../middleware/passport';
import { notifyGroupMembersViaSocket, getGroupNotifications, notifySpecificGroup } from '../../controllers/admin/groupNotificationController';

const router = express.Router();

// Apply JWT protection to all routes
const protectAdmin = passport.authenticate('admin', { session: false });

/**
 * @swagger
 * tags:
 *   name: Admin - Groups
 *   description: Admin group and join request management
 */

/**
 * @swagger
 * /api/admin/groups:
 *   post:
 *     summary: Create a new group
 *     tags: [Admin - Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupName
 *               - maxUsers
 *             properties:
 *               groupName:
 *                 type: string
 *               maxUsers:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Group created successfully
 *       500:
 *         description: Server error
 */
router.post('/groups',entryLogger, protectAdmin, createGroup, exitLogger);

/**
 * @swagger
 * /api/admin/groups:
 *   get:
 *     summary: Get all groups created by the admin with members
 *     tags: [Admin - Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of groups with members
 *       500:
 *         description: Server error
 */
router.get('/groups', entryLogger, protectAdmin, getAllGroupsWithUsers, exitLogger);

/**
 * @swagger
 * /api/admin/groups/requests:
 *   get:
 *     summary: Get all pending join requests for groups created by the admin
 *     tags: [Admin - Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending join requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Join requests fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       groupId:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           groupName:
 *                             type: string
 *                       userId:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           userName:
 *                             type: string
 *                           email:
 *                             type: string
 *       500:
 *         description: Server error
 */
router.get('/groups/requests', entryLogger, protectAdmin, getJoinRequests, exitLogger);


/**
 * @swagger
 * /api/admin/groups/join-request/{requestId}/action:
 *   put:
 *     summary: Approve or reject a join request
 *     tags: [Admin - Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the join request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *                 description: Action to perform on the join request
 *                 example: approve
 *     responses:
 *       200:
 *         description: Request processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Request approved successfully
 *       400:
 *         description: Invalid request or action
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid action. Must be "approve" or "reject".
 *       404:
 *         description: Join request or group not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Request not found or already processed
 */

router.put('/groups/join-request/:requestId/action',entryLogger, protectAdmin, handleJoinRequest, exitLogger);

/**
 * @swagger
 * /api/admin/groups/{groupId}:
 *   put:
 *     summary: Update a group
 *     tags: [Admin - Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               groupName:
 *                 type: string
 *               maxUsers:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Group updated
 *       404:
 *         description: Group not found or unauthorized
 */
router.put('/groups/:groupId', entryLogger, protectAdmin, updateGroup, exitLogger);

/**
 * @swagger
 * /api/admin/groups/{groupId}:
 *   delete:
 *     summary: Delete a group and its join requests
 *     tags: [Admin - Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group deleted
 *       404:
 *         description: Group not found or unauthorized
 */
router.delete('/groups/:groupId', entryLogger, protectAdmin, deleteGroup, exitLogger);

/**
 * @swagger
 * /api/admin/groups/notify:
 *   post:
 *     summary: Notify all approved members in groups via socket
 *     tags: [Admin - Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Notification message to send to group members
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       400:
 *         description: Invalid notification message
 */

router.post('/groups/notify', entryLogger, protectAdmin, notifyGroupMembersViaSocket, exitLogger);

/**
 * @swagger
 * /api/admin/groups/{groupId}/notify:
 *   post:
 *     summary: Send a notification to a specific group (approved members only)
 *     tags: [Admin - Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the group
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Team meeting at 3 PM"
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *       400:
 *         description: Missing parameters or invalid group
 *       500:
 *         description: Server error
 */

router.post('/groups/:groupId/notify', entryLogger, protectAdmin, notifySpecificGroup , exitLogger);

/**
 * @swagger
 * /api/admin/groups/notifications:
 *   get:
 *     summary: Get all group notifications sent by the admin
 *     tags: [Admin - Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *         required: false
 *         description: (Optional) Filter notifications by group ID
 *     responses:
 *       200:
 *         description: List of group notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Group notifications fetched.
 *                 totalMessagesSentByAdmin:
 *                   type: integer
 *                   example: 12
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       groupId:
 *                         type: string
 *                         example: 60d0fe4f5311236168a109ca
 *                       groupName:
 *                         type: string
 *                         example: Alpha Group
 *                       totalMessages:
 *                         type: integer
 *                         example: 5
 *                       notifications:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             message:
 *                               type: string
 *                               example: Important update for all members.
 *                             timestamp:
 *                               type: string
 *                               format: date-time
 *                               example: 2025-06-23T10:30:00.000Z
 *       400:
 *         description: Invalid groupId
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.get('/groups/notifications', entryLogger, protectAdmin, getGroupNotifications, exitLogger);

export default router;
