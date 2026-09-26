import { Router, type IRouter } from "express";
import healthRouter from "./health";
import assetsRouter from "./assets";
import assessmentsRouter from "./assessments";
import peopleRouter from "./people";
import tasksRouter from "./tasks";
import workRouter from "./work";
import authRouter from "./auth";
import searchRouter from "./search";
import analyticsRouter from "./analytics";
import reportsRouter from "./reports";

import activitiesRouter from "./activities";
import commentsRouter from "./comments";
import leavesRouter from "./leaves";
import sessionsRouter from "./sessions";
import messagesRouter from "./messages";
import contentCalendarRouter from "./content-calendar";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/assets", assetsRouter);
router.use("/assessments", assessmentsRouter);
router.use("/auth", authRouter);
router.use("/people", peopleRouter);
router.use("/tasks", tasksRouter);
router.use("/work", workRouter);
router.use("/search", searchRouter);
router.use("/analytics", analyticsRouter);
router.use("/reports", reportsRouter);
router.use("/activities", activitiesRouter);
router.use("/comments", commentsRouter);
router.use("/leaves", leavesRouter);
router.use("/sessions", sessionsRouter);
router.use("/messages", messagesRouter);
router.use("/content-calendar", contentCalendarRouter);

export default router;
