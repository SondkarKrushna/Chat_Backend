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
    console.log("User connected:", socket.user.name);

    socket.join(socket.user.id);

    socket.on("sendMessage", async ({ receiverId, message }) => {
      const newMessage = await Message.create({
        sender: socket.user.id,
        receiver: receiverId,
        message,
      });

      io.to(receiverId).emit("receiveMessage", newMessage);
      io.to(socket.user.id).emit("receiveMessage", newMessage);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};

module.exports = socketHandler;