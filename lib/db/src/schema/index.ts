import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleEnum = pgEnum("role", ["Founder", "Manager", "Team member"]);
export const presenceEnum = pgEnum("presence", ["Online", "Break", "Lunch", "Idle", "Offline"]);
export const workStageEnum = pgEnum("work_stage", [
  "Planning",
  "Assigned",
  "In Progress",
  "Review",
  "Revision",
  "Approved",
  "Completed",
  "Blocked",
]);
export const priorityEnum = pgEnum("priority", ["Low", "Medium", "High", "Urgent"]);
export const workTypeEnum = pgEnum("work_type", [
  "Website",
  "SEO",
  "Graphic Design",
  "Internal",
  "Other",
]);
export const taskStageEnum = pgEnum("task_stage", [
  "Assigned",
  "In Progress",
  "Review",
  "Revision",
  "Approved",
  "Completed",
  "Blocked",
]);
export const leaveStatusEnum = pgEnum("leave_status", [
  "Pending",
  "Approved",
  "Rejected",
  "Cancelled",
]);
export const leaveTypeEnum = pgEnum("leave_type", [
  "Casual",
  "Sick",
  "Personal",
  "Other",
]);
export const reportStatusEnum = pgEnum("report_status", [
  "Draft",
  "Submitted",
  "Reviewed",
  "Needs revision",
]);

export const peopleTable = pgTable("people", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull().default("1234"),
  role: roleEnum("role").notNull(),
  title: text("title").notNull(),
  managerId: text("manager_id"),
  presence: presenceEnum("presence").notNull(),
  loginAt: text("login_at"),
  logoutAt: text("logout_at"),
  lastActiveAt: text("last_active_at").notNull(),
  sessionMinutes: integer("session_minutes").default(0),
  taskMinutes: integer("task_minutes").default(0),
  activeSessionId: text("active_session_id"),
});

export const workTable = pgTable("work", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  client: text("client"),
  workType: workTypeEnum("work_type").notNull(),
  priority: priorityEnum("priority").notNull(),
  dueDate: text("due_date").notNull(),
  founderId: text("founder_id").notNull(),
  managerId: text("manager_id"),
  directAssigneeId: text("direct_assignee_id"),
  stage: workStageEnum("stage").notNull(),
  progress: integer("progress").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const tasksTable = pgTable("tasks", {
  id: text("id").primaryKey(),
  workId: text("work_id").notNull(),
  title: text("title").notNull(),
  instructions: text("instructions").notNull(),
  assigneeId: text("assignee_id").notNull(),
  dueDate: text("due_date").notNull(),
  priority: priorityEnum("priority").notNull(),
  stage: taskStageEnum("stage").notNull(),
  progress: integer("progress").notNull().default(0),
  timeMinutes: integer("time_minutes").notNull().default(0),
  estimatedMinutes: integer("estimated_minutes").notNull().default(0),
  submittedAt: text("submitted_at"),
  revisionNote: text("revision_note"),
});

export const activitiesTable = pgTable("activities", {
  id: text("id").primaryKey(),
  workId: text("work_id").notNull(),
  actorId: text("actor_id").notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
  tone: text("tone").default("normal"),
});

export const commentsTable = pgTable("comments", {
  id: text("id").primaryKey(),
  workId: text("work_id").notNull(),
  authorId: text("author_id").notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
});

export const reportsTable = pgTable("reports", {
  id: text("id").primaryKey(),
  managerId: text("manager_id").notNull(),
  period: text("period").notNull(),
  completed: text("completed").notNull(),
  inProgress: text("in_progress").notNull(),
  blockers: text("blockers").notNull(),
  decisions: text("decisions").notNull(),
  status: reportStatusEnum("status").notNull(),
  createdAt: text("created_at").notNull(),
});

export const messagesTable = pgTable("messages", {
  id: text("id").primaryKey(),
  senderId: text("sender_id").notNull(),
  recipientId: text("recipient_id"),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

export const documentsTable = pgTable("documents", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  taskId: text("task_id"),
  createdAt: text("created_at").notNull(),
});

export const leavesTable = pgTable("leaves", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  reason: text("reason").notNull(),
  note: text("note"),
  status: leaveStatusEnum("status").notNull(),
  approvedBy: text("approved_by"),
  createdAt: text("created_at").notNull(),
});

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  loginAt: text("login_at").notNull(),
  logoutAt: text("logout_at"),
  durationMinutes: integer("duration_minutes").notNull().default(0),
});

export const insertPeopleSchema = createInsertSchema(peopleTable).omit({ id: true });
export const insertWorkSchema = createInsertSchema(workTable).omit({ id: true });
export const insertTasksSchema = createInsertSchema(tasksTable).omit({ id: true });
export const insertActivitiesSchema = createInsertSchema(activitiesTable).omit({ id: true });
export const insertCommentsSchema = createInsertSchema(commentsTable).omit({ id: true });
export const insertReportsSchema = createInsertSchema(reportsTable).omit({ id: true });
export const insertLeavesSchema = createInsertSchema(leavesTable).omit({ id: true });
export const insertSessionsSchema = createInsertSchema(sessionsTable).omit({ id: true });
export const insertMessagesSchema = createInsertSchema(messagesTable).omit({ id: true });
export const insertDocumentsSchema = createInsertSchema(documentsTable).omit({ id: true });

export type PersonInsert = z.infer<typeof insertPeopleSchema>;
export type WorkInsert = z.infer<typeof insertWorkSchema>;
export type TaskInsert = z.infer<typeof insertTasksSchema>;
export type ActivityInsert = z.infer<typeof insertActivitiesSchema>;
export type CommentInsert = z.infer<typeof insertCommentsSchema>;
export type ReportInsert = z.infer<typeof insertReportsSchema>;
export type LeaveInsert = z.infer<typeof insertLeavesSchema>;
export type SessionInsert = z.infer<typeof insertSessionsSchema>;

export type Person = typeof peopleTable.$inferSelect;
export type WorkItem = typeof workTable.$inferSelect;
export type WorkTask = typeof tasksTable.$inferSelect;
export type Activity = typeof activitiesTable.$inferSelect;
export type Comment = typeof commentsTable.$inferSelect;
export type ManagerReport = typeof reportsTable.$inferSelect;
export type LeaveRequest = typeof leavesTable.$inferSelect;
export type SessionRecord = typeof sessionsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
export type Document = typeof documentsTable.$inferSelect;