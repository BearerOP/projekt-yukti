import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { createServer } from "http";

// Import routes
import authRoutes from "./src/routes/auth";
import userRoutes from "./src/routes/users";
import pollsRoutes from "./src/routes/polls";
import bidsRoutes from "./src/routes/bids";
import paymentsRoutes from "./src/routes/payments";
import notificationsRoutes from "./src/routes/notifications";
import walletRoutes from "./src/routes/wallet";

// Import middleware
import { errorHandler } from "./src/middleware/errorHandler";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production"
      ? (process.env.CLIENT_URL || "http://localhost:3000")
      : true,
    methods: ["GET", "POST"],
    credentials: true,
  }
});

const PORT = process.env.PORT || 8000;

// Trust proxy - required when behind Nginx/Cloudflare
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? (process.env.CLIENT_URL || "http://localhost:3000")
    : true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/polls", pollsRoutes);
app.use("/api/v1/bids", bidsRoutes);
app.use("/api/v1/payments", paymentsRoutes);
app.use("/api/v1/notifications", notificationsRoutes);
app.use("/api/v1/wallet", walletRoutes);

// Socket.io
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_poll", (pollId) => {
    socket.join(`poll_${pollId}`);
  });

  socket.on("leave_poll", (pollId) => {
    socket.leave(`poll_${pollId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Error handling
app.use(errorHandler);

// Start server
server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready`);
  console.log(`🔗 Solana Network: ${process.env.SOLANA_NETWORK}`);
});

export { io };


