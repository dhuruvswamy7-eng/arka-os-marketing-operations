import { Router, type IRouter } from "express";
import { db, peopleTable, workTable, tasksTable, sessionsTable, leavesTable, reportsTable, messagesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { getIO } from "../socket";

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret-key-do-not-use-in-prod";

function getUserFromAuthHeader(authHeader?: string) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (err) {
    return null;
  }
}

router.get("/", async (_req, res) => {
  try {
    const items = await db.select().from(peopleTable).orderBy(asc(peopleTable.name));
    const sanitized = items.map(({ password: _, ...rest }) => rest);
    res.json({ items: sanitized });
  } catch (err) {
    res.status(503).json({ message: "Database unavailable" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await db.select().from(peopleTable).where(eq(peopleTable.id, req.params.id)).limit(1).then(r => r[0]);

    if (!item) {
      res.status(404).json({ message: "Person not found" });
      return;
    }

    const { password: _, ...rest } = item;
    res.json({ item: rest });
  } catch (err) {
    res.status(503).json({ message: "Database unavailable" });
  }
});

router.post("/", async (req, res) => {
  const user = getUserFromAuthHeader(req.headers.authorization);
  if (!user || user.role !== "Founder") {
    res.status(403).json({ message: "Only Founder can create accounts" });
    return;
  }

  try {
    const payload = req.body ?? {};
    const id = payload.id ?? `person-${Date.now()}`;
    const email = payload.email ?? `${id}@arkos.local`;
    
    await db.insert(peopleTable).values({
      id,
      name: payload.name ?? "New Person",
      email: email,
      password: payload.password ?? "1234",
      role: payload.role ?? "Team member",
      title: payload.title ?? (payload.role === "HR Manager" ? "Head of People & HR Operations" : payload.role === "Manager" ? "Manager" : "Team Member"),
      managerId: payload.managerId || null,
      presence: payload.presence ?? "Offline",
      lastActiveAt: "Never",
      loginAt: null,
      logoutAt: null,
      sessionMinutes: 0,
      taskMinutes: 0
    });

    const item = await db.select().from(peopleTable).where(eq(peopleTable.id, id)).limit(1).then(r => r[0]);
    res.status(201).json({ item });
  } catch (err) {
    console.error("Create person error:", err);
    res.status(503).json({ message: "Database unavailable or invalid payload" });
  }
});

router.patch("/:id/presence", async (req, res) => {
  try {
    const payload = req.body ?? {};
    if (!payload.presence) {
      res.status(400).json({ message: "Missing presence field" });
      return;
    }
    const lastActiveAt = new Date().toISOString();
    await db
      .update(peopleTable)
      .set({ presence: payload.presence, lastActiveAt })
      .where(eq(peopleTable.id, req.params.id));
    const item = await db.select().from(peopleTable).where(eq(peopleTable.id, req.params.id)).limit(1).then(r => r[0]);

    try {
      const io = getIO();
      io.emit("presence:update", { userId: req.params.id, status: payload.presence });
    } catch {}

    res.json({ item });
  } catch (err) {
    console.error("Update presence error:", err);
    res.status(503).json({ message: "Database unavailable" });
  }
});

router.patch("/:id/password", async (req, res) => {
  const user = getUserFromAuthHeader(req.headers.authorization);
  if (!user || user.role !== "Founder") {
    res.status(403).json({ message: "Only Founder can update employee passwords" });
    return;
  }
  const newPassword = String(req.body?.password ?? "").trim();
  if (!newPassword) {
    res.status(400).json({ message: "Password is required" });
    return;
  }
  try {
    await db.update(peopleTable).set({ password: newPassword }).where(eq(peopleTable.id, req.params.id));
    const item = await db.select().from(peopleTable).where(eq(peopleTable.id, req.params.id)).limit(1).then(r => r[0]);
    res.json({ success: true, item });
  } catch (err) {
    console.error("Update password error:", err);
    res.status(503).json({ message: "Database unavailable" });
  }
});

router.patch("/:id/role", async (req, res) => {
  const user = getUserFromAuthHeader(req.headers.authorization);
  if (!user || user.role !== "Founder") {
    res.status(403).json({ message: "Only Founder can update employee roles" });
    return;
  }
  const newRole = req.body?.role;
  const newTitle = req.body?.title;
  if (!newRole) {
    res.status(400).json({ message: "Role is required" });
    return;
  }
  try {
    const updateData: any = { role: newRole };
    if (newTitle) updateData.title = newTitle;
    else if (newRole === "HR Manager") updateData.title = "Head of People & HR Operations";
    await db.update(peopleTable).set(updateData).where(eq(peopleTable.id, req.params.id));
    const item = await db.select().from(peopleTable).where(eq(peopleTable.id, req.params.id)).limit(1).then(r => r[0]);
    res.json({ success: true, item });
  } catch (err) {
    console.error("Update role error:", err);
    res.status(503).json({ message: "Database unavailable" });
  }
});

router.delete("/:id", async (req, res) => {
  const user = getUserFromAuthHeader(req.headers.authorization);
  if (!user || user.role !== "Founder") {
    res.status(403).json({ message: "Only Founder can delete employees" });
    return;
  }

  const targetId = req.params.id;

  try {
    const targetPerson = await db.select().from(peopleTable).where(eq(peopleTable.id, targetId)).limit(1).then(r => r[0]);
    if (!targetPerson) {
      res.status(404).json({ message: "Employee not found" });
      return;
    }

    if (targetPerson.role === "Founder" || targetPerson.id === "usr_founder") {
      res.status(400).json({ message: "Cannot delete the Founder account" });
      return;
    }

    // Dissociate or clean up dependent records
    await db.update(peopleTable).set({ managerId: null }).where(eq(peopleTable.managerId, targetId));
    await db.update(workTable).set({ managerId: null }).where(eq(workTable.managerId, targetId));
    await db.update(workTable).set({ directAssigneeId: null }).where(eq(workTable.directAssigneeId, targetId));
    await db.delete(tasksTable).where(eq(tasksTable.assigneeId, targetId));
    await db.delete(sessionsTable).where(eq(sessionsTable.userId, targetId));
    await db.delete(leavesTable).where(eq(leavesTable.userId, targetId));
    await db.delete(reportsTable).where(eq(reportsTable.managerId, targetId));
    await db.delete(messagesTable).where(eq(messagesTable.senderId, targetId));

    // Delete the employee record from the database
    await db.delete(peopleTable).where(eq(peopleTable.id, targetId));

    res.json({ success: true, message: `Employee ${targetPerson.name} deleted successfully`, id: targetId });
  } catch (err) {
    console.error("Delete employee error:", err);
    res.status(500).json({ message: "Failed to delete employee from database" });
  }
});

export default router;
