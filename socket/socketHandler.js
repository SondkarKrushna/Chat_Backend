const jwt = require("jsonwebtoken");
const Message = require("../models/Message");

const socketHandler = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) return next(new Error("Authentication error"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.user);

    // ✅ FIXED HERE
    const userId = socket.user.id;

    if (!userId) {
      console.log("❌ User ID missing in token");
      return;
    }

    socket.join(userId.toString()); // safer

    socket.on("sendMessage", async ({ receiverId, message }) => {
      const newMessage = await Message.create({
        sender: userId,
        receiver: receiverId,
        message,
      });

      // Send to receiver
      io.to(receiverId.toString()).emit("receiveMessage", newMessage);

      // Send back to sender
      io.to(userId.toString()).emit("receiveMessage", newMessage);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", userId);
    });
  });
};

module.exports = socketHandler;