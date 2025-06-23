import express from 'express';
import { adminLogin, adminLogout, getAdminStats } from '../../controllers/admin/adminAuth';
import { refreshAdminToken } from '../../controllers/admin/refreshAdminTocken';
import adminGroupRoutes from './adminGroupRoutes';


const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: AdminAuth
 *   description: Admin authentication endpoints
 */

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Admin login
 *     tags: [AdminAuth]
 *     description: Log in as an admin and receive a JWT token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@gmail.com
 *               password:
 *                 type: string
 *                 example: admin@123
 *     responses:
 *       200:
 *         description: Successful login
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
 *                   example: Admin login successful
 *                 accessToken:
 *                   type: string
 *                   example: <JWT_ACCESS_TOKEN>
 *                 refreshToken:
 *                   type: string
 *                   example: <JWT_REFRESH_TOKEN>
 *                 adminId:
 *                   type: string
 *       401:
 *         description: Invalid email or password
 */
router.post('/login', adminLogin);

/**
 * @swagger
 * /api/admin/logout:
 *   post:
 *     summary: Admin logout
 *     tags: [AdminAuth]
 *     description: Logs out an admin by clearing JWT tokens and removing them from DB.
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Tokens missing
 */
router.post('/logout', adminLogout);

/**
 * @swagger
 * /api/admin/refresh-token:
 *   post:
 *     summary: Refresh admin access token
 *     tags: [AdminAuth]
 *     description: Generate a new access token using a valid refresh token stored in cookies.
 *     responses:
 *       200:
 *         description: New access token issued
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
 *                   example: New admin access token issued successfully
 *                 accessToken:
 *                   type: string
 *                   example: <NEW_ACCESS_TOKEN>
 *       401:
 *         description: Refresh token missing
 *       403:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh-token', refreshAdminToken);

/**
 * @swagger
 * /api/admin/dashboard/stats:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [AdminAuth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: Indicates if the request was successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       description: Total number of registered users
 *                     totalMembers:
 *                       type: integer
 *                       description: Total number of members in the system
 *                     totalGroups:
 *                       type: integer
 *                       description: Total number of created groups
 *                     activeUsers:
 *                       type: integer
 *                       description: Number of users who sent a message in the last 30 days
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Server error
 */

router.get('/dashboard/stats', getAdminStats);

router.use('/', adminGroupRoutes); 

export default router;
