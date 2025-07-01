import express from 'express';
import {
  getAvailableGroups,
  sendJoinRequest,
  getApprovedGroupsForUser,
  getMyGroupMessages,
  sendUserMessage,
  getUserChatHistory,
  getMyContacts
} from '../../controllers/user/userGroup';
import passport from '../../middleware/passport';
import { entryLogger } from '../../middleware/entrypoint';
import { exitLogger } from '../../middleware/exitpoint';

const router = express.Router();

// All routes protected using passport JWT
const authenticateEither = passport.authenticate(['admin','user-bearer'] as const, { session: false });

/**
 * @swagger
 * tags:
 *   name: User - Groups
 *   description: APIs for users to view and join groups
 */

/**
 * @swagger
 * /api/member/groups:
 *   post:
 *     summary: Get all available groups with optional groupId, search, filter, pagination, and projection
 *     tags: [User - Groups]
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
 *               pagination:
 *                 type: object
 *                 properties:
 *                   page:
 *                     type: integer
 *                     default: 1
 *                   limit:
 *                     type: integer
 *                     default: 10
 *               search:
 *                 type: object
 *                 properties:
 *                   term:
 *                     type: string
 *                   fields:
 *                     type: array
 *                     items:
 *                       type: string
 *               filter:
 *                 type: object
 *                 additionalProperties: true
 *               projection:
 *                 type: object
 *                 additionalProperties:
 *                   type: integer
 *                   enum: [0, 1]
 *             example:
 *               groupId: "685b889620c14bb2d38967ef"
 *               pagination:
 *                 page: 1
 *                 limit: 10
 *               search:
 *                 term: "Warriors"
 *                 fields: ["groupName"]
 *               filter: {"groupName": "PowerHouse"}
 *               projection:
 *                 groupName: 1
 *                 maxUsers: 1
 *     responses:
 *       200:
 *         description: List of available groups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 success: true
 *                 message: "Available groups retrieved successfully"
 *                 data:
 *                   totalCount: 1
 *                   page: 1
 *                   limit: 10
 *                   groups:
 *                     - _id: "685b889620c14bb2d38967ef"
 *                       groupName: "Warriors"
 *                       maxUsers: 10
 */


router.post('/groups', entryLogger, authenticateEither, getAvailableGroups, exitLogger);

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
router.post('/groups/join', entryLogger, authenticateEither, sendJoinRequest, exitLogger);

/**
 * @swagger
 * /api/member/groups/approved:
 *   post:
 *     summary: Get approved groups for the logged-in user with optional groupId, search, filter, pagination, and projection
 *     tags: [User - Groups]
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
 *                 description: Optional specific approved group ID to fetch
 *               pagination:
 *                 type: object
 *                 properties:
 *                   page:
 *                     type: integer
 *                     default: 1
 *                   limit:
 *                     type: integer
 *                     default: 10
 *               search:
 *                 type: object
 *                 properties:
 *                   term:
 *                     type: string
 *                   fields:
 *                     type: array
 *                     items:
 *                       type: string
 *               filter:
 *                 type: object
 *                 additionalProperties: true
 *               projection:
 *                 type: object
 *                 additionalProperties:
 *                   type: integer
 *                   enum: [0, 1]
 *             example:
 *               groupId: "665d0fe4f5311236168a109c"
 *               pagination:
 *                 page: 1
 *                 limit: 10
 *               search:
 *                 term: "Champions"
 *                 fields: ["groupName"]
 *               filter:
 *                 maxUsers:
 *                   $gte: 5
 *               projection:
 *                 groupName: 1
 *                 maxUsers: 1
 *     responses:
 *       200:
 *         description: List of approved groups for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 success: true
 *                 message: "Approved groups retrieved successfully"
 *                 data:
 *                   totalCount: 1
 *                   page: 1
 *                   limit: 10
 *                   groups:
 *                     - _id: "685b889620c14bb2d38967ef"
 *                       groupName: "Champions"
 *                       maxUsers: 10
 */

router.post('/groups/approved', entryLogger, authenticateEither, getApprovedGroupsForUser, exitLogger);

/**
 * @swagger
 * /api/member/groups/messages:
 *   post:
 *     summary: Get admin messages from groups the user is approved in (with optional filters)
 *     tags: [User - Groups]
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
 *                 description: Optional specific group ID to fetch messages for
 *               pagination:
 *                 type: object
 *                 properties:
 *                   page:
 *                     type: integer
 *                     default: 1
 *                   limit:
 *                     type: integer
 *                     default: 10
 *               search:
 *                 type: object
 *                 properties:
 *                   term:
 *                     type: string
 *                   fields:
 *                     type: array
 *                     items:
 *                       type: string
 *               filter:
 *                 type: object
 *                 additionalProperties: true
 *               projection:
 *                 type: object
 *                 additionalProperties:
 *                   type: integer
 *                   enum: [0, 1]
 *             example:
 *               groupId: "665d0fe4f5311236168a109c"
 *               pagination:
 *                 page: 1
 *                 limit: 5
 *               search:
 *                 term: "important"
 *                 fields: ["message"]
 *               filter:
 *                 groupName: "PowerHouse"
 *               projection:
 *                 message: 1
 *                 timestamp: 1
 *     responses:
 *       200:
 *         description: List of admin messages from approved groups
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
 *                   example: Messages for your groups fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCount:
 *                       type: integer
 *                       example: 4
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 5
 *                     groups:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           groupName:
 *                             type: string
 *                             example: PowerHouse
 *                           notifications:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 message:
 *                                   type: string
 *                                   example: Welcome to the group!
 *                                 timestamp:
 *                                   type: string
 *                                   format: date-time
 *                                   example: "2025-06-21T10:15:30.000Z"
 */


router.post('/groups/messages', entryLogger, authenticateEither, getMyGroupMessages, exitLogger);

/**
 * @swagger
 * /api/member/messages/send:
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

router.post('/messages/send', entryLogger, authenticateEither, sendUserMessage, exitLogger);

/**
 * @swagger
 * /api/member/messages/history:
 *   post:
 *     summary: Get chat history with a specific user (with optional filters, search, pagination, projection)
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
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ObjectId of the user to get chat history with
 *                 example: "64f9c182b5e74a001f77cabc"
 *               search:
 *                 type: object
 *                 description: Optional case-insensitive search settings
 *                 properties:
 *                   term:
 *                     type: string
 *                     description: Search term (e.g., part of a message)
 *                     example: "hello"
 *                   fields:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Fields to search in (e.g., ["message"])
 *                     example: ["message"]
 *               filter:
 *                 type: object
 *                 description: Optional filters to apply (e.g., by isRead status)
 *                 example:
 *                   isRead: false
 *               pagination:
 *                 type: object
 *                 description: Optional pagination settings
 *                 properties:
 *                   page:
 *                     type: integer
 *                     example: 1
 *                   limit:
 *                     type: integer
 *                     example: 10
 *               projection:
 *                 type: object
 *                 description: Optional projection for specific fields (senderId always included internally)
 *                 additionalProperties:
 *                   type: integer
 *                   enum: [1]
 *                 example:
 *                   message: 1
 *                   isRead: 1
 *     responses:
 *       200:
 *         description: Chat history response
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
 *                   example: Chat history with user 64f9c182b5e74a001f77cabc
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCount:
 *                       type: integer
 *                       example: 32
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           message:
 *                             type: string
 *                             example: "Hey, how are you?"
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-06-24T10:15:30.000Z"
 *                           direction:
 *                             type: string
 *                             enum: [sent, received]
 *                             example: "sent"
 *                           isRead:
 *                             type: boolean
 *                             example: true
 *       400:
 *         description: Missing or invalid userId
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       500:
 *         description: Internal server error
 */


router.post('/messages/history', entryLogger, authenticateEither, getUserChatHistory, exitLogger);



/**
 * @swagger
 * /api/member/messages/contacts:
 *   post:
 *     summary: Get list of users the current user has chatted with or chat history with a specific user
 *     tags: [User - Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Optional user ID to fetch chat history with a specific user
 *               pagination:
 *                 type: object
 *                 properties:
 *                   page:
 *                     type: integer
 *                     default: 1
 *                   limit:
 *                     type: integer
 *                     default: 10
 *               search:
 *                 type: object
 *                 properties:
 *                   term:
 *                     type: string
 *                   fields:
 *                     type: array
 *                     items:
 *                       type: string
 *               filter:
 *                 type: object
 *               projection:
 *                 type: object
 *                 additionalProperties:
 *                   type: integer
 *                   enum: [0, 1]
 *           example:
 *             userId: "685cdefa123abc7890fgh123"
 *             pagination:
 *               page: 1
 *               limit: 10
 *             search:
 *               term: "rocking"
 *               fields: ["message"]
 *             filter: {"direction": "received"}
 *             projection:
 *               message: 1         
 *               direction: 1
 *     responses:
 *       200:
 *         description: List of user contacts or chat history with a specific user
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
 *                   example: Chat history with user 685cdefa123abc7890fgh123
 *                 data:
 *                   oneOf:
 *                     - type: object
 *                       properties:
 *                         totalCount:
 *                           type: integer
 *                           example: 4
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         userId:
 *                           type: string
 *                           example: "685cdefa123abc7890fgh123"
 *                         messages:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               message:
 *                                 type: string
 *                               timestamp:
 *                                 type: string
 *                                 format: date-time
 *                               direction:
 *                                 type: string
 *                                 enum: [sent, received]
 *                               isRead:
 *                                 type: boolean
 *                       example:
 *                         totalCount: 4
 *                         page: 1
 *                         limit: 10
 *                         userId: "685cdefa123abc7890fgh123"
 *                         messages:
 *                           - message: "U r Rocking it!!!"
 *                             timestamp: "2025-06-24T07:12:38.105Z"
 *                             direction: "received"
 *                             isRead: true
 *                           - message: "I am gonna Break it..!!"
 *                             timestamp: "2025-06-24T07:14:29.856Z"
 *                             direction: "received"
 *                             isRead: true
 *                           - message: "Booom..!!"
 *                             timestamp: "2025-06-24T07:20:36.363Z"
 *                             direction: "received"
 *                             isRead: true
 *                           - message: "U Wonn..!!"
 *                             timestamp: "2025-06-24T07:31:21.724Z"
 *                             direction: "received"
 *                             isRead: true
 *                     - type: object
 *                       properties:
 *                         totalCount:
 *                           type: integer
 *                           example: 2
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         contacts:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               userId:
 *                                 type: string
 *                                 example: "64f12345a1b2c3d4e5f67890"
 *                               name:
 *                                 type: string
 *                                 example: "John Doe"
 */

router.post('/messages/contacts', entryLogger, authenticateEither, getMyContacts, exitLogger);


export default router;
