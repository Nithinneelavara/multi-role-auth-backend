import mongoose, { Schema, Document } from 'mongoose';

export interface IOtpToken extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
}

const otpTokenSchema: Schema = new Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true }, // Hashed OTP
  expiresAt: { type: Date, required: true },
});

export default mongoose.model<IOtpToken>('OtpToken', otpTokenSchema);
