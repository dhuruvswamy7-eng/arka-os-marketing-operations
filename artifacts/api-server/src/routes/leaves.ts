import { Router, type IRouter } from "express";
import { db, leavesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const items = await db.select().from(leavesTable).orderBy(desc(leavesTable.id));
    res.json({ items });
  } catch (err) {
    res.status(503).json({ message: "Database unavailable" });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = req.body ?? {};
    const id = payload.id ?? `leave-${Date.now()}`;
    
    const validLeaveTypes = ["Casual", "Sick", "Personal", "Work From Home", "Other"] as const;
    const rawType = payload.leaveType ?? payload.type ?? "Casual";
    const leaveType = validLeaveTypes.includes(rawType) ? rawType : "Casual";

    const validStatuses = ["Pending", "Approved", "Rejected", "Cancelled"] as const;
    const rawStatus = payload.status ?? "Pending";
    const status = validStatuses.includes(rawStatus) ? rawStatus : "Pending";

    const startDate = (payload.startDate ?? new Date().toISOString()).slice(0, 10);
    const endDate = (payload.endDate ?? startDate).slice(0, 10);

    await db.insert(leavesTable).values({
      id,
      userId: payload.userId,
      leaveType,
      startDate,
      endDate,
      reason: payload.reason ?? "Leave request",
      note: payload.note ?? null,
      status,
      approvedBy: payload.approvedBy ?? null,
      createdAt: payload.createdAt ?? new Date().toISOString()
    });

    const item = await db.select().from(leavesTable).where(eq(leavesTable.id, id)).limit(1).then(r => r[0]);
    res.status(201).json({ item });
  } catch (err) {
    console.error("Create leave error:", err);
    res.status(503).json({ message: "Database unavailable or invalid payload" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const payload = req.body ?? {};
    const { id, ...updates } = payload;
    
    if (updates.leaveType || updates.type) {
      const validLeaveTypes = ["Casual", "Sick", "Personal", "Work From Home", "Other"] as const;
      const t = updates.leaveType ?? updates.type;
      updates.leaveType = validLeaveTypes.includes(t) ? t : "Casual";
      delete updates.type;
    }

    if (updates.status) {
      const validStatuses = ["Pending", "Approved", "Rejected", "Cancelled"] as const;
      if (!validStatuses.includes(updates.status)) {
        delete updates.status;
      }
    }

    // Convert undefined to delete so drizzle only updates provided fields
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    if (Object.keys(updates).length > 0) {
      await db.update(leavesTable).set(updates).where(eq(leavesTable.id, req.params.id));
    }
    
    const item = await db.select().from(leavesTable).where(eq(leavesTable.id, req.params.id)).limit(1).then(r => r[0]);
    if (!item) {
      res.status(404).json({ message: "Leave not found" });
      return;
    }
    res.json({ item });
  } catch (err) {
    console.error("Update leave error:", err);
    res.status(503).json({ message: "Database unavailable or invalid payload" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(leavesTable).where(eq(leavesTable.id, req.params.id));
    res.status(204).end();
  } catch (err) {
    res.status(503).json({ message: "Database unavailable" });
  }
});

export default router;
