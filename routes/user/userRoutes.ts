import express, { Request, Response, NextFunction } from 'express';
import passport from '../../middleware/passport';
import { entryLogger } from '../../middleware/entrypoint';
import { exitLogger } from '../../middleware/exitpoint';
import { userValidationRules } from '../../validators/userValidator';
import { validateRequest } from '../../middleware/validateRequest';
import {
  createUser,
  getAllUsers,
  updateUser,
  deleteUser
} from '../../controllers/user/userController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

const authenticateEither = passport.authenticate(['admin','member-bearer'] as const, { session: false });

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - userName
 *               - email
 *               - password
 *               - first_name
 *               - last_name
 *               - profile_picture
 *               - phone_number
 *               - role
 *               - bio
 *               - address
 *               - social_links
 *             properties:
 *               id:
 *                 type: string
 *               userName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               profile_picture:
 *                 type: string
 *                 format: uri
 *               phone_number:
 *                 type: string
 *                 pattern: '^\d{10}$'
 *               role:
 *                 type: string
 *                 enum: [user, admin, moderator]
 *               date_joined:
 *                 type: string
 *                 format: date-time
 *               bio:
 *                 type: string
 *               address:
 *                 type: string
 *               social_links:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error or email already exists
 */
router.post(
  '/',
  entryLogger,
  authenticateEither,
  userValidationRules,
  validateRequest,
  createUser,
  exitLogger 
);

/**
 * @swagger
 * /api/users/get:
 *   post:
 *     summary: Get all users or a specific user with optional search, filter, projection, and pagination
 *     tags: [Users]
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
 *                 description: Optional user ID to fetch a specific user
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
 *                     example: jayaprakash
 *                   fields:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["userName", "email"]
 *               filter:
 *                 type: object
 *                 description: MongoDB filter object
 *                 example:
 *                   name: ramesh
 *               projection:
 *                 type: object
 *                 description: Fields to include (1) or exclude (0)
 *                 additionalProperties:
 *                   type: integer
 *                   enum: [0, 1]
 *                 example:
 *                   name: 1
 *                   email: 1
 *     responses:
 *       200:
 *         description: User data successfully retrieved
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
 *                   example: Users retrieved successfully
 *                 data:
 *                   oneOf:
 *                     - type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         first_name:
 *                           type: string
 *                         last_name:
 *                           type: string
 *                         email:
 *                           type: string
 *                     - type: object
 *                       properties:
 *                         totalCount:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         users:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               first_name:
 *                                 type: string
 *                               last_name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *       401:
 *         description: Unauthorized - bearer token missing or invalid
 */
router.post('/get', entryLogger, authenticateEither, getAllUsers, exitLogger);


/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update a user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The user ID
 *         schema:
 *           type: string
 *     requestBody:
 *       description: User object to update
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               profile_picture:
 *                 type: string
 *                 format: uri
 *               phone_number:
 *                 type: string
 *                 pattern: '^\d{10}$'
 *               role:
 *                 type: string
 *                 enum: [user, admin, moderator]
 *               bio:
 *                 type: string
 *               address:
 *                 type: string
 *               social_links:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.put('/:id', entryLogger, authenticateEither, updateUser, exitLogger);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The user ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.delete('/:id', entryLogger, authenticateEither, deleteUser, exitLogger);

export default router;