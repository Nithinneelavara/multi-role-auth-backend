// test-socket-client.js
const { io } = require("socket.io-client");

const groupId = '68523d6fc928ebf5484940a1';

const socket = io("http://localhost:3000", {
  query: { groupId }, //  Important!
});

socket.on(`notification-${groupId}`, (data) => {
  console.log(' Group Notification received:', data);
});

socket.on("connect", () => {
  console.log(` Connected to socket server as Group ID: ${groupId}`);
});

socket.on("disconnect", () => {
  console.log(" Disconnected from socket server");
});
