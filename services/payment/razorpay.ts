//project\services\payment\razorpay.ts
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const createRazorpayOrder = async (amount: number) => {
  const options = {
    amount: amount * 100, // convert to paise
    currency: 'INR',
    receipt: `receipt_order_${Date.now()}`,
  };
  return await razorpayInstance.orders.create(options);
};

export const verifySignature = (
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
): boolean => {
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  return generatedSignature === razorpay_signature;
};
