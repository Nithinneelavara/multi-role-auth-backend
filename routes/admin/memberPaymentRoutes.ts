//project\routes\admin\memberPaymentRoutes.ts
import express from 'express';
import { createOrderMember, verifyOrderMember } from '../../controllers/admin/memberPayment';
import passport from '../../middleware/passport';
import { handleRazorpayWebhook } from '../../controllers/admin/webhookController'

const protectMember = passport.authenticate('member-bearer', { session: false });

const router = express.Router();

/**
 * @swagger
 * /api/member/order:
 *   post:
 *     summary: Create a Razorpay order for a member
 *     tags:
 *       - Member Payments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order created successfully
 *       500:
 *         description: Failed to create order
 */
router.post('/member/order', protectMember, createOrderMember);

/**
 * @swagger
 * /api/member/verify:
 *   post:
 *     summary: Verify Razorpay payment for a member
 *     tags:
 *       - Member Payments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *       400:
 *         description: Invalid signature
 *       404:
 *         description: Order not found
 *       500:
 *         description: Failed to verify payment
 */
router.post('/member/verify', protectMember, verifyOrderMember);

/**
 * @swagger
 * /api/webhook:
 *   post:
 *     summary: Handle Razorpay webhook events
 *     tags:
 *       - Member Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Webhook received and processed
 *       400:
 *         description: Invalid webhook signature
 *       500:
 *         description: Internal server error
 */
router.post('/webhook', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

export default router;
