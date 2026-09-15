import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { initSocket } from "./socket";
import { initCronJobs } from "./lib/cron";

const rawPort = process.env["PORT"] || "5000";
const port = Number(rawPort);

const server = createServer(app);

// Initialize Socket.io
initSocket(server);

// Initialize Cron Jobs
initCronJobs();

process.on("uncaughtException", (err) => {
  logger.warn({ err: err?.message || err }, "Uncaught Exception caught (prevented crash)");
});

process.on("unhandledRejection", (reason: any) => {
  logger.warn({ reason: reason?.message || reason }, "Unhandled Rejection caught (prevented crash)");
});

if (Number.isNaN(port)) {
  server.listen(rawPort, () => {
    logger.info({ socket: rawPort }, "Server listening on socket");
  });
} else {
  server.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "Server listening on 0.0.0.0");
  });
}
