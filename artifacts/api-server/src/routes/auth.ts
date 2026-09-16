import { Router, type IRouter } from "express";
import { db, peopleTable, sessionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import jwt from "jsonwebtoken";

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret-key-do-not-use-in-prod";

router.post("/login", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!email || !password) {
    res.status(400).json({ message: "email and password are required" });
    return;
  }

  try {
    const user = await db.select().from(peopleTable).where(eq(peopleTable.email, email)).limit(1).then(res => res[0]);
    
    if (!user || user.password !== password) {
      res.status(401).json({ message: "invalid credentials" });
      return;
    }

    const sessionId = `ses-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.slice(0, 10);

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, sessionId },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Invalidate/close previous open sessions for this user
    try {
      const openSessions = await db.select().from(sessionsTable)
        .where(eq(sessionsTable.userId, user.id))
        .orderBy(desc(sessionsTable.loginAt));

      for (const ses of openSessions) {
        if (!ses.logoutAt) {
          const duration = Math.max(1, Math.round((Date.now() - new Date(ses.loginAt).getTime()) / 60000));
          await db.update(sessionsTable)
            .set({ logoutAt: nowIso, durationMinutes: duration })
            .where(eq(sessionsTable.id, ses.id));
        }
      }
    } catch (e) {
      console.warn("Could not close previous open sessions", e);
    }

    // Set new activeSessionId on user record
    await db.update(peopleTable)
      .set({ 
        loginAt: nowIso, 
        lastActiveAt: nowIso,
        presence: "Online",
        activeSessionId: sessionId
      })
      .where(eq(peopleTable.id, user.id));

    // Record session in sessionsTable
    await db.insert(sessionsTable).values({
      id: sessionId,
      userId: user.id,
      date: todayDate,
      loginAt: nowIso,
      logoutAt: null,
      durationMinutes: 0
    });

    res.json({
      item: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        loginAt: nowIso,
        presence: "Online",
        sessionId,
        token
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Route for JWT verification/refresh
router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
     res.status(401).json({ message: "Unauthorized" });
     return;
  }
  
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const user = await db.select().from(peopleTable).where(eq(peopleTable.id, payload.id)).limit(1).then(res => res[0]);
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    // Check if session was superseded by another login
    if (user.activeSessionId && payload.sessionId && payload.sessionId !== user.activeSessionId) {
      res.status(401).json({ 
        message: "You have been logged out because your account was logged in from another device or window.",
        code: "SESSION_SUPERSEDED"
      });
      return;
    }

    // Update lastActiveAt on me call
    await db.update(peopleTable)
      .set({ lastActiveAt: new Date().toISOString() })
      .where(eq(peopleTable.id, user.id));

    res.json({ item: user });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

router.post("/logout", async (req, res) => {
  let token: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.body?.token) {
    token = req.body.token;
  } else if (typeof req.body === "string") {
    try {
      token = JSON.parse(req.body)?.token || null;
    } catch {}
  }

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      const nowIso = new Date().toISOString();

      // Only clear if activeSessionId matches or not specified
      const user = await db.select().from(peopleTable).where(eq(peopleTable.id, payload.id)).limit(1).then(res => res[0]);
      if (user && (!payload.sessionId || !user.activeSessionId || payload.sessionId === user.activeSessionId)) {
        await db.update(peopleTable)
          .set({ 
            logoutAt: nowIso, 
            presence: "Offline",
            activeSessionId: null
          })
          .where(eq(peopleTable.id, payload.id));
      }

      // Close open session in sessionsTable
      const openSessions = await db.select().from(sessionsTable)
        .where(eq(sessionsTable.userId, payload.id))
        .orderBy(desc(sessionsTable.loginAt));

      for (const ses of openSessions) {
        if (!ses.logoutAt && (!payload.sessionId || ses.id === payload.sessionId)) {
          const duration = Math.max(1, Math.round((Date.now() - new Date(ses.loginAt).getTime()) / 60000));
          await db.update(sessionsTable)
            .set({ logoutAt: nowIso, durationMinutes: duration })
            .where(eq(sessionsTable.id, ses.id));
        }
      }
    } catch (err) {
      // ignore invalid tokens
    }
  }
  res.json({ message: "Logged out" });
});

router.post("/heartbeat", async (req, res) => {
  let token: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.body?.token) {
    token = req.body.token;
  }

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      const user = await db.select().from(peopleTable).where(eq(peopleTable.id, payload.id)).limit(1).then(res => res[0]);
      if (!user) {
        res.status(401).json({ message: "User not found" });
        return;
      }

      // Single active session check
      if (user.activeSessionId && payload.sessionId && payload.sessionId !== user.activeSessionId) {
        res.status(401).json({ 
          message: "You have been logged out because your account was logged in from another device or window.",
          code: "SESSION_SUPERSEDED" 
        });
        return;
      }

      await db.update(peopleTable)
        .set({ lastActiveAt: new Date().toISOString() })
        .where(eq(peopleTable.id, payload.id));
      res.json({ success: true });
      return;
    } catch (err) {
      // ignore
    }
  }
  res.status(401).json({ message: "Unauthorized" });
});

export default router;
