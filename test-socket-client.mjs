import mongoose from "mongoose";
import { io } from "socket.io-client";
import { connectDB } from './models/connection.mjs';

await connectDB();

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model("User", userSchema,"users");

async function main() {
  await connectDB();

  const user = await User.findOne();
  if (!user) {
    console.log("No user found in database.");
    process.exit(1);
  }

  const userId = user._id.toString();
  console.log("Using userId:", userId);

  const socket = io("http://localhost:3000", {
  auth: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NWEyNTIwZjk0OTEyMTY0ZDJjNzE2MCIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzUxMzUxMzM1LCJleHAiOjE3NTE0Mzc3MzV9.RqYmdfuF2xn_DS6e8lKkUksBrwxfMH0hDN61b_7YENw"
  }
});
    socket.on("connect", () => {
    console.log(`Joined notification room for userId: ${userId}`);
  });

  socket.on(`notification-${userId}`, (payload) => {
  console.log("Received notification:", payload);
});
}
main().catch(err => {
  console.error("Error in main():", err);
  process.exit(1);
});
