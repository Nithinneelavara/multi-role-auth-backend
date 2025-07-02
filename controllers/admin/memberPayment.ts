//project\controllers\admin\memberPayment.ts

import { Request, Response } from 'express';
import { createRazorpayOrder, verifySignature } from '../../services/payment/razorpay';
import Order from '../../models/db/order';
import { MemberDocument } from '../../models/db/member';


export const createOrderMember = async (req: Request, res: Response) => {
  try {
    const member = req.user as MemberDocument;
    const memberId = member._id;

    const amount = 200;
    const order = await createRazorpayOrder(amount);

    await Order.create({
      memberId,
      orderId: order.id,
      isPaid: false,
    });

    res.status(200).json({ success: true, order });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
};

export const verifyOrderMember = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const isValid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const order = await Order.findOne({ orderId: razorpay_order_id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.isPaid = true;
    await order.save();

    res.status(200).json({ success: true, message: 'Payment verified successfully' });
  } catch (err) {
    console.error('Error verifying payment:', err);
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  }
};
