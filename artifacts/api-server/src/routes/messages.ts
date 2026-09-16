import { Router, type IRouter } from "express";
import { db, messagesTable } from "@workspace/db";
import { eq, or, and, isNull, asc } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { getIO } from "../socket";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret-key-do-not-use-in-prod";

const router: IRouter = Router();

function getUserId(req: any): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded?.id) return decoded.id;
    } catch {}
  }
  if (req.query.userId && typeof req.query.userId === "string") {
    return req.query.userId;
  }
  return null;
}

// GET /api/messages
// Query params:
//   peerId: 'general' | employeeId | undefined
//   userId: optional override if auth header not used
router.get("/", async (req, res) => {
  try {
    const currentUserId = getUserId(req);
    const peerId = (req.query.peerId || req.query.recipientId) as string | undefined;

    let items;

    if (peerId === "general") {
      // General channel messages
      items = await db
        .select()
        .from(messagesTable)
        .where(or(isNull(messagesTable.recipientId), eq(messagesTable.recipientId, "general")))
        .orderBy(asc(messagesTable.createdAt));
    } else if (peerId && currentUserId) {
      // 1-on-1 messages between current user and peer
      items = await db
        .select()
        .from(messagesTable)
        .where(
          or(
            and(eq(messagesTable.senderId, currentUserId), eq(messagesTable.recipientId, peerId)),
            and(eq(messagesTable.senderId, peerId), eq(messagesTable.recipientId, currentUserId))
          )
        )
        .orderBy(asc(messagesTable.createdAt));
    } else if (currentUserId) {
      // All messages involving current user or general channel
      items = await db
        .select()
        .from(messagesTable)
        .where(
          or(
            isNull(messagesTable.recipientId),
            eq(messagesTable.recipientId, "general"),
            eq(messagesTable.senderId, currentUserId),
            eq(messagesTable.recipientId, currentUserId)
          )
        )
        .orderBy(asc(messagesTable.createdAt));
    } else {
      // Fallback if no user identified: general messages
      items = await db
        .select()
        .from(messagesTable)
        .where(or(isNull(messagesTable.recipientId), eq(messagesTable.recipientId, "general")))
        .orderBy(asc(messagesTable.createdAt));
    }

    res.json({ items });
  } catch (err) {
    console.error("Fetch messages error:", err);
    res.status(503).json({ message: "Database unavailable" });
  }
});

// POST /api/messages
router.post("/", async (req, res) => {
  try {
    const payload = req.body ?? {};
    const senderId = payload.senderId || getUserId(req);
    if (!senderId) {
      res.status(401).json({ message: "Sender ID required" });
      return;
    }

    const id = payload.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const recipientId = payload.recipientId && payload.recipientId !== "general" ? payload.recipientId : "general";
    const content = String(payload.content || "").trim();
    if (!content) {
      res.status(400).json({ message: "Message content cannot be empty" });
      return;
    }
    const createdAt = payload.createdAt || new Date().toISOString();

    const record = {
      id,
      senderId,
      recipientId,
      content,
      createdAt,
    };

    await db.insert(messagesTable).values(record);

    // Broadcast over WebSocket if available
    try {
      const io = getIO();
      if (recipientId !== "general") {
        io.to(recipientId).emit("chat:message", record);
        io.to(senderId).emit("chat:message", record);
      } else {
        io.emit("chat:message", record);
      }
    } catch {
      // socket io might not be active or client is using polling
    }

    res.status(201).json({ item: record });
  } catch (err) {
    console.error("Create message error:", err);
    res.status(503).json({ message: "Database unavailable or invalid payload" });
  }
});

export default router;
