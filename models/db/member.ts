import mongoose, { Document, Schema } from 'mongoose';

export interface MemberDocument extends Document {
  name: string;
  email: string;
  password: string;
  address: string;
  date_joined: Date;
}


const memberSchema: Schema<MemberDocument> = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  address: { type: String, required: true },
  date_joined: { type: Date, default: Date.now },
});

const Member = mongoose.model<MemberDocument>('Member', memberSchema);
export default Member;

export { Member };
