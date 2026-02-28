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

  // Store online users
  const onlineUsers = new Map();
  // userId -> Set of socketIds

  io.on("connection", (socket) => {
    console.log("User connected:", socket.user);

    // 🔥 FIX: Safely extract correct userId
    const userId = socket.user.id;
    console.log(socket.user.id)

    if (!userId) {
      console.log("❌ User ID missing in token");
      return;
    }

    // console.log("✅ Joining room:", userId);

    socket.join(userId);

    // ✅ Add user to onlineUsers map
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // 🔥 Emit updated online users list to everyone
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));

    socket.on("sendMessage", async ({ receiverId, message }) => {
      console.log("🔥 Server received message:", {
        sender: socket.user,
        receiverId,
        message
      });
      console.log("📨 Message received:", { receiverId, message });

      const newMessage = await Message.create({
        sender: userId,
        receiver: receiverId,
        message,
      });

      console.log("Joining room:", socket.user._id);

      // Send to receiver
      io.to(receiverId).emit("receiveMessage", newMessage);

      // Send back to sender
      io.to(userId).emit("receiveMessage", newMessage);
    });

    socket.on("disconnect", () => {
  console.log("User disconnected:", userId);

  if (onlineUsers.has(userId)) {
    onlineUsers.get(userId).delete(socket.id);

    if (onlineUsers.get(userId).size === 0) {
      onlineUsers.delete(userId);
    }
  }

  // 🔥 Emit updated online users
  io.emit("onlineUsers", Array.from(onlineUsers.keys()));
});

    // ✅ TYPING START
    socket.on("typing", ({ receiverId }) => {
      socket.to(receiverId).emit("typing", {
        senderId: userId,
      });
    });

    // ✅ STOP TYPING
    socket.on("stopTyping", ({ receiverId }) => {
      socket.to(receiverId).emit("stopTyping", {
        senderId: userId,
      });
    });
  });
};

module.exports = socketHandler;