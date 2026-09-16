import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { db, messagesTable } from "@workspace/db";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret-key-do-not-use-in-prod";

let io: SocketIOServer;

export function initSocket(server: HttpServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*", // Adjust for production
      methods: ["GET", "POST"]
    }
  });

  // Authentication middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      // In dev environment, allow connections without token for testing UI
      if (process.env.NODE_ENV !== "production") {
         (socket as any).user = { id: "maya", role: "Founder", email: "arka@founder" };
         return next();
      }
      return next(new Error("Authentication error"));
    }
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) return next(new Error("Authentication error"));
      (socket as any).user = decoded;
      next();
    });
  });

  io.on("connection", (socket) => {
    const user = (socket as any).user;
    console.log(`User connected: ${user.email} (${socket.id})`);

    socket.join(user.id);
    socket.broadcast.emit("presence:update", { userId: user.id, status: "Online" });

    socket.on("chat:message", async (msg) => {
      const recipientId = msg.recipientId && msg.recipientId !== "general" ? msg.recipientId : "general";
      const payload = {
        id: msg.id || crypto.randomUUID(),
        senderId: user.id,
        recipientId,
        content: msg.content,
        timestamp: new Date().toISOString()
      };

      if (recipientId !== "general") {
        // Direct message: deliver to recipient room and echo to sender room
        io.to(recipientId).emit("chat:message", payload);
        io.to(user.id).emit("chat:message", payload);
      } else {
        // General company channel: broadcast to all
        io.emit("chat:message", payload);
      }
      
      // Save to database
      try {
        await db.insert(messagesTable).values({
          id: payload.id,
          senderId: user.id,
          recipientId: payload.recipientId,
          content: payload.content,
          createdAt: payload.timestamp
        });
      } catch (err) {
        console.error("Failed to save message", err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${user.email}`);
      socket.broadcast.emit("presence:update", { userId: user.id, status: "Offline" });
    });
  });
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}
