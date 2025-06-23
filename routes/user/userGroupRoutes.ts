import express from 'express';
import {
  getAvailableGroups,
  sendJoinRequest,
  getApprovedGroupsForUser,
  getMyGroupMessages,
  sendUserMessage,
  getUserChatHistory
} from '../../controllers/user/userGroup';
import passport from '../../middleware/passport';
import { entryLogger } from '../../middleware/entrypoint';
import { exitLogger } from '../../middleware/exitpoint';

const router = express.Router();

// All routes protected using passport JWT
const protectUser = passport.authenticate('user-bearer', { session: false });

/**
 * @swagger
 * tags:
 *   name: User - Groups
 *   description: APIs for users to view and join groups
 */

/**
 * @swagger
 * /api/member/groups:
 *   get:
 *     summary: Get all available groups
 *     tags: [User - Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available groups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       groupName:
 *                         type: string
 *                       maxUsers:
 *                         type: integer
 *                       members:
 *                         type: array
 *                         items:
 *                           type: string
 */
router.get('/groups', entryLogger, protectUser, getAvailableGroups, exitLogger);

/**
 * @swagger
 * /api/member/groups/join:
 *   post:
 *     summary: Send a join request to a group
 *     tags: [User - Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *             properties:
 *               groupId:
 *                 type: string
 *                 example: 64f12345a1b2c3d4e5f67890
 *     responses:
 *       201:
 *         description: Join request sent successfully
 *       400:
 *         description: Join request already sent
 *       404:
 *         description: Group not found
 */
router.post('/groups/join', entryLogger, protectUser, sendJoinRequest, exitLogger);

/**
 * @swagger
 * /api/member/groups/approved:
 *   get:
 *     summary: Get approved groups for the logged-in user
 *     tags: [User - Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of approved groups for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       groupId:
 *                         type: string
 *                       groupName:
 *                         type: string
 */
router.get('/groups/approved', entryLogger,  protectUser, getApprovedGroupsForUser, exitLogger);

/**
 * @swagger
 * /api/member/groups/messages:
 *   get:
 *     summary: Get messages from groups the user is approved in (optional group filter)
 *     tags: [User - Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional group ID to filter messages for a specific group
 *     responses:
 *       200:
 *         description: List of group messages
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
 *                   example: Group messages fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       groupName:
 *                         type: string
 *                         example: PowerHouse
 *                       notifications:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             message:
 *                               type: string
 *                               example: Welcome to the group!
 *                             timestamp:
 *                               type: string
 *                               format: date-time
 *                               example: "2025-06-21T10:15:30.000Z"
 */

router.get('/groups/messages', entryLogger, protectUser, getMyGroupMessages, exitLogger);

/**
 * @swagger
 * /api/member/messages:
 *   post:
 *     summary: Send a message to another user
 *     tags: [User - Groups]
 *     security:
 *       - bearerAuth: []         
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [receiverId, message]
 *             properties:
 *               receiverId:
 *                 type: string
 *                 example: 684d4169fda2f7406c7c4969
 *               message:
 *                 type: string
 *                 example: Hello!
 *     responses:
 *       200:
 *         description: Message sent successfully
 */

router.post('/messages', entryLogger, protectUser, sendUserMessage, exitLogger);

/**
 * @swagger
 * /api/member/messages:
 *   get:
 *     summary: Get user-to-user chat history grouped by user or with a specific user
 *     tags: [User - Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter chat history with a specific user
 *     responses:
 *       200:
 *         description: Chat history grouped by user or with the specified user
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
 *                   example: Chat history with user 123 or grouped by user
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Hello there!
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-06-21T10:15:30.000Z"
 *                         direction:
 *                           type: string
 *                           enum: [sent, received]
 *                           example: sent
 */


router.get('/messages', entryLogger, protectUser, getUserChatHistory, exitLogger);

export default router;
