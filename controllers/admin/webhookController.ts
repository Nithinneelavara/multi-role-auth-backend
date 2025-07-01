import { Request, Response } from 'express';
import Order from '../../models/db/order';

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    const rawBody = req.body;  
    const jsonString = rawBody.toString('utf8');
    const data = JSON.parse(jsonString);

    console.log("📦 Event:", data.event);
    const paymentData = data.payload?.payment?.entity || data.payload;
    console.log("💰 Payment Data:", paymentData);

    const orderId = paymentData?.order_id;
    const paymentId = paymentData?.id;
    const paymentStatus = paymentData?.status;  

    if (!orderId || !paymentId) {
      console.error("❌ Missing payment or order_id in webhook payload");
      return res.status(400).json({ message: "Missing data" });
    }

    const order = await Order.findOneAndUpdate(
      { orderId }, 
      {
        isPaid: paymentStatus === 'captured',
        status: paymentStatus,  
        paymentId,
      },
      { new: true }
    );

    if (!order) {
      console.warn('⚠ No matching order found for orderId:', orderId);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    console.log('✅ Order updated from webhook:', order);
    res.status(200).json({ success: true });

  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ success: false });
  }
};
