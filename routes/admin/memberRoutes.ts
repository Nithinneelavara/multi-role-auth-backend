import express, { Request, Response, NextFunction } from 'express';
import passport from '../../middleware/passport';
import { refreshMemberToken } from '../../controllers/admin/refreshMemberToken';
import { entryLogger } from '../../middleware/entrypoint';
import { exitLogger } from '../../middleware/exitpoint';
import { memberValidationRules } from '../../validators/memberValidator';
import { validateRequest } from '../../middleware/validateRequest';
import {
  createMember,
  getMembers,    
  updateMember,
  deleteMember
} from '../../controllers/admin/memberController';

const router = express.Router();


/**
 * @swagger
 * tags:
 *   name: Members
 *   description: Member management endpoints
 */

const protectAdmin = passport.authenticate('admin', { session: false });

/**
 * @swagger
 * /api/members:
 *   post:
 *     summary: Create a new member
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               address:
 *                 type: string
 *               date_joined:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Member created successfully
 *       400:
 *         description: Validation error or email already exists
 */
router.post(
  '/',
  entryLogger,
  protectAdmin,
  memberValidationRules,
  validateRequest,
  createMember,
  exitLogger
);

/**
 * @swagger
 * /api/members/get:
 *   post:
 *     summary: Get members with optional filters, search, pagination, and projection
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: (Optional) Fetch a specific member by ID
 *                 example: "665f2e41c3ab2d4a4d75b73f"
 *               pagination:
 *                 type: object
 *                 description: (Optional) Pagination options
 *                 properties:
 *                   page:
 *                     type: integer
 *                     example: 1
 *                   limit:
 *                     type: integer
 *                     example: 10
 *               search:
 *                 type: object
 *                 description: (Optional) Search members by keyword in specific fields
 *                 properties:
 *                   term:
 *                     type: string
 *                     description: Single term or comma-separated terms for searching (e.g. "ravi", "ravi,john")
 *                     example: "ravi"
 *                   fields:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Fields to search in. Defaults to ["userName", "email"] if omitted
 *                     example: ["userName", "email"]
 *               filter:
 *                 type: object
 *                 description: (Optional) MongoDB-style filters
 *                 example: { "status": "active" }
 *               projection:
 *                 type: object
 *                 description: (Optional) Fields to include or exclude (cannot mix 1 and 0)
 *                 example: { "userName": 1, "email": 1 }
 *     responses:
 *       200:
 *         description: List of members (filtered)
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
 *                   example: Members retrieved successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCount:
 *                       type: integer
 *                       example: 42
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "665f2e41c3ab2d4a4d75b73f"
 *                           userName:
 *                             type: string
 *                             example: "ravi_123"
 *                           email:
 *                             type: string
 *                             example: "ravi@example.com"
 *                           status:
 *                             type: string
 *                             example: "active"
 *       400:
 *         description: Bad request (invalid filters or projection)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */


router.post('/get', entryLogger, protectAdmin, getMembers, exitLogger);


/**
 * @swagger
 * /api/members/{id}:
 *   put:
 *     summary: Update a member by ID
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The member ID
 *         schema:
 *           type: string
 *     requestBody:
 *       description: Member object to update
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               address:
 *                 type: string
 *               date_joined:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Member updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Member not found
 */
router.put('/:id', entryLogger, protectAdmin, updateMember, exitLogger);

/**
 * @swagger
 * /api/members/{id}:
 *   delete:
 *     summary: Delete a member by ID
 *     tags: [Members]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The member ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Member not found
 */
router.delete('/:id', entryLogger, protectAdmin, deleteMember, exitLogger);


export default router;