// project\models\db\order.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  memberId: mongoose.Types.ObjectId;
  orderId: string;
  isPaid: boolean;
  status?: string; // ✅ add this
}

const orderSchema = new Schema<IOrder>({
  memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  orderId: { type: String, required: true },
  isPaid: { type: Boolean, default: false },
  status: { type: String }, // ✅ add this
}, { timestamps: true });

export default mongoose.model<IOrder>('Order', orderSchema);