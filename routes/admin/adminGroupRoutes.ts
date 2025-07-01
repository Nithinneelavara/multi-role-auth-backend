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
 * /api/admin/groups/create:
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
router.post('/groups/create',entryLogger, protectAdmin, createGroup, exitLogger);

/**
 * @swagger
 * /api/admin/groups:
 *   post:
 *     summary: Get all groups created by the admin with members (supports filter, search, pagination, projection)
 *     tags: [Admin - Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               search:
 *                 type: string
 *                 example: "Warriors"
 *               filter:
 *                 type: object
 *                 example:
 *                   maxUsers:
 *                     $gte: 5
 *               pagination:
 *                 type: object
 *                 properties:
 *                   page:
 *                     type: integer
 *                     example: 1
 *                   limit:
 *                     type: integer
 *                     example: 10
 *               projection:
 *                 type: object
 *                 example:
 *                   groupName: 1
 *                   maxUsers: 1
 *     responses:
 *       200:
 *         description: List of groups with members
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
 *                   example: Groups with members fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCount:
 *                       type: integer
 *                       example: 25
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     groups:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "685b88cf20c14bb2d38967fa"
 *                           groupName:
 *                             type: string
 *                             example: "Champions"
 *                           maxUsers:
 *                             type: integer
 *                             example: 8
 *                           members:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 _id:
 *                                   type: string
 *                                   example: "68524625e06c4aa1dd8ca419"
 *                                 userName:
 *                                   type: string
 *                                   example: "techExplorer95"
 *                                 email:
 *                                   type: string
 *                                   example: "tech.explorer95@example.com"
 *       500:
 *         description: Server error
 */

router.post('/groups', entryLogger, protectAdmin, getAllGroupsWithUsers, exitLogger);

/**
 * @swagger
 * /api/admin/groups/requests:
 *   post:
 *     summary: Get all pending join requests for admin's groups (with optional filters, search, pagination, and projection)
 *     tags: [Admin - Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               search:
 *                 type: string
 *                 description: Text to search in request messages (case-insensitive, partial match)
 *                 example: "john"
 *               filter:
 *                 type: object
 *                 description: Filter join requests based on fields like status
 *                 example: { "status": "pending" }
 *               pagination:
 *                 type: object
 *                 description: Pagination settings
 *                 properties:
 *                   page:
 *                     type: integer
 *                     example: 1
 *                   limit:
 *                     type: integer
 *                     example: 10
 *               projection:
 *                 type: object
 *                 description: >
 *                   Fields to include or exclude in the response.
 *                   For populated fields, only `groupName` (from groupId) and `userName` (from userId) are supported.
 *                   If projection is not provided, both will be returned by default.
 *                 example: { "groupName": 1, "userName": 1 }
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
 *                   type: object
 *                   properties:
 *                     totalCount:
 *                       type: integer
 *                       example: 3
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     requests:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: >
 *                           The response fields depend on the projection.
 *                           By default, only `groupName` and `userName` are returned.
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "685d2293e053515181298843"
 *                           groupName:
 *                             type: string
 *                             example: "pirates"
 *                           userName:
 *                             type: string
 *                             example: "akash_mehta"
 *       500:
 *         description: Server error
 */

router.post('/groups/requests', entryLogger, protectAdmin, getJoinRequests, exitLogger);


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
 *     summary: Send a message (immediately or scheduled) to a specific group
 *     tags:
 *       - Admin - Groups
 *     parameters:
 *       - name: groupId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the group to send the message to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Reminder: meeting at 5 PM"
 *               fileName:
 *                 type: string
 *                 example: "announcement.png"
 *                 description: Optional. Name of file uploaded to S3 (must be uploaded before calling this API)
 *               scheduledTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-06-25T17:00:00+05:30"
 *                 description: Optional. Scheduled time in ISO format (use your local time with timezone, e.g., IST +05:30)
 *             required:
 *               - message
 *     responses:
 *       '200':
 *         description: Message scheduled or sent successfully
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
 *                   example: Message scheduled to be sent at 2025-06-25T17:00:00.000Z.
 *       '400':
 *         description: Bad request
 *       '401':
 *         description: Unauthorized
 *       '404':
 *         description: Group not found
 */

router.post('/groups/:groupId/notify', entryLogger, protectAdmin, notifySpecificGroup , exitLogger);

/**
 * @swagger
 * /api/admin/groups/notifications:
 *   post:
 *     summary: Get all group notifications sent by the admin (with optional filters, pagination, search, and projection)
 *     tags: [Admin - Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               groupId:
 *                 type: string
 *                 description: (Optional) Filter notifications by a specific group ID
 *                 example: "665d0fe4f5311236168a109c"
 *               pagination:
 *                 type: object
 *                 description: Pagination options
 *                 properties:
 *                   page:
 *                     type: integer
 *                     example: 1
 *                   limit:
 *                     type: integer
 *                     example: 10
 *               search:
 *                 type: object
 *                 description: Search filter configuration
 *                 properties:
 *                   term:
 *                     type: string
 *                     description: Keyword to search in message content
 *                     example: "important"
 *                   fields:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Fields to apply the search on
 *                     example: ["message"]
 *               filter:
 *                 type: object
 *                 description: Additional MongoDB filters
 *                 additionalProperties: true
 *                 example: { "groupName": "pirates" }
 *               projection:
 *                 type: object
 *                 description: Fields to include (1) or exclude (0). Cannot mix inclusion & exclusion.
 *                 additionalProperties:
 *                   type: integer
 *                   enum: [0, 1]
 *                 example: { "message": 1, "timestamp": 1 }
 *     responses:
 *       200:
 *         description: Grouped list of group notifications
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
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     results:
 *                       type: array
 *                       description: List of grouped notifications
 *                       items:
 *                         type: object
 *                         properties:
 *                           groupId:
 *                             type: string
 *                             example: "665d0fe4f5311236168a109c"
 *                           groupName:
 *                             type: string
 *                             example: "Tech Titans"
 *                           totalMessages:
 *                             type: integer
 *                             example: 5
 *                           notifications:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 message:
 *                                   type: string
 *                                   example: "Meeting today at 5 PM"
 *                                 timestamp:
 *                                   type: string
 *                                   format: date-time
 *                                   example: "2025-06-23T10:30:00.000Z"
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.post('/groups/notifications', entryLogger, protectAdmin, getGroupNotifications, exitLogger);


export default router;
