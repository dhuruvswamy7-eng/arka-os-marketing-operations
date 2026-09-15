import { Router, type IRouter } from "express";
import { db, workTable, tasksTable } from "@workspace/db";
import { count, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard", async (req, res) => {
  try {
    const totalWorkQuery = await db.select({ value: count() }).from(workTable);
    const completedWorkQuery = await db.select({ value: count() }).from(workTable).where(eq(workTable.stage, "Completed"));
    
    const totalTasksQuery = await db.select({ value: count() }).from(tasksTable);
    const completedTasksQuery = await db.select({ value: count() }).from(tasksTable).where(eq(tasksTable.stage, "Completed"));
    
    const totalWork = totalWorkQuery[0].value;
    const completedWork = completedWorkQuery[0].value;
    const totalTasks = totalTasksQuery[0].value;
    const completedTasks = completedTasksQuery[0].value;

    res.json({
      workStats: {
        total: totalWork,
        completed: completedWork,
        completionRate: totalWork === 0 ? 0 : Math.round((completedWork / totalWork) * 100),
      },
      taskStats: {
        total: totalTasks,
        completed: completedTasks,
        completionRate: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
      },
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ message: "Analytics failed" });
  }
});

export default router;
