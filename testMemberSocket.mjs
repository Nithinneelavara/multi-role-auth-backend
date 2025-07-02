import mongoose from "mongoose";
import { io } from "socket.io-client";
import { connectDB } from "./models/connection.js"; // 👈 include .js extension
import dotenv from 'dotenv';

dotenv.config();
// Define a flexible schema for Member collection
const memberSchema = new mongoose.Schema({}, { strict: false });
const Member = mongoose.model("Member", memberSchema, "members"); // 👈 collection: members

async function main() {
  await connectDB();

  // Find any member from the DB
  const member = await Member.findOne();
  if (!member) {
    console.log("No member found in database.");
    process.exit(1);
  }

  const memberId = member._id.toString(); // use _id as memberId
  console.log("Using memberId:", memberId);

 // ✅ NEW version with token
 const token = jwt.sign({ id: memberId }, process.env.JWT_SECRET);


const socket = io("http://localhost:3000", {
  auth: {
    token  // send JWT in `auth.token`
  },
  query: {
    memberId  // also send for room naming
  }
});

  socket.on("connect", () => {
    console.log(`Joined notification room for memberId: ${memberId}`);
  });

  socket.on(`notification-${memberId}`, (payload) => {
    console.log("✅ Received member notification:", payload);
  });
}

main().catch(err => {
  console.error("Error in main():", err);
  process.exit(1);
});
