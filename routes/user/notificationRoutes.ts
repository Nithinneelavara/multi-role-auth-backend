import express from 'express';
import { notifyUser, getUserNotifications } from '../../controllers/user/notificationController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: User Notifications
 *   description: Endpoints for sending and fetching user notifications
 */

/**
 * @swagger
 * /api/notification:
 *   post:
 *     summary: Send a notification to a specific user
 *     tags: [User Notifications]
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
 *               - message
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "64c4fc5d9d8948a0e888e123"
 *               message:
 *                 type: string
 *                 example: "You have a new message!"
 *               data:
 *                 type: object
 *                 example: { "type": "reminder", "due": "tomorrow" }
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Notification sent successfully
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: userId and message are required
 *       500:
 *         description: Server error while sending notification
 */
router.post('/', notifyUser);

/**
 * @swagger
 * /api/notification/{userId}:
 *   get:
 *     summary: Get all notifications for a specific user
 *     tags: [User Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "64c4fc5d9d8948a0e888e123"
 *         description: The ID of the user whose notifications are to be retrieved
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   message:
 *                     type: string
 *                   data:
 *                     type: object
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Failed to fetch notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to fetch notifications
 */
router.get('/:userId', getUserNotifications);

export default router;
