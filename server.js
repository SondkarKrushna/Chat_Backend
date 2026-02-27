require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const socketHandler = require("./socket/socketHandler");
const userRoutes = require("./routes/userRoutes");

const app = express();
const server = http.createServer(app);

connectDB();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);


console.log("User route mounted");

const io = new Server(server, {
  cors: {
    origin: ["https://chat-frontend-green-tau.vercel.app", "http://localhost:3000"], // adjust
    methods: ["GET", "POST"],
    credentials: true
  },
  // Very important on Render / proxies
  pingTimeout: 60000,          // default 5000 → give more time
  pingInterval: 25000,         // default 25000
  upgradeTimeout: 10000,       // give time for websocket upgrade
  transports: ["websocket", "polling"], // websocket first!
  connectionStateRecovery: {}  // helps with reconnections
});

socketHandler(io);

server.listen(process.env.PORT, () =>
  console.log("Server running on port", process.env.PORT)
);