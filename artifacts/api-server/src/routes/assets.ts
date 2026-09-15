import { Router, type IRouter } from "express";
import { upload } from "../lib/upload";
import { uploadToDrive } from "../lib/gdrive";
import { db, documentsTable, peopleTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import jwt from "jsonwebtoken";

const router: IRouter = Router();

// A simple auth middleware helper for this route since we need user context
function getUserFromAuthHeader(authHeader?: string) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "fallback-dev-secret-key-do-not-use-in-prod") as any;
  } catch (err) {
    return null;
  }
}

router.get("/documents", async (req, res) => {
  const user = getUserFromAuthHeader(req.headers.authorization);
  // For demo if no token is passed we just return all documents
  // But ideally we enforce RLS / access logic here
  try {
    let docs = [];
    if (user?.role === "Founder" || !user) {
      // Founder sees all documents
      docs = await db.select().from(documentsTable).orderBy(desc(documentsTable.createdAt));
    } else if (user?.role === "Manager") {
      // Manager sees their own and team members documents
      const team = await db.select().from(peopleTable).where(eq(peopleTable.managerId, user.id));
      const teamIds = team.map(t => t.id);
      teamIds.push(user.id);
      
      const allDocs = await db.select().from(documentsTable).orderBy(desc(documentsTable.createdAt));
      docs = allDocs.filter(d => teamIds.includes(d.uploadedBy));
    } else {
      // Team Member sees only their own documents
      docs = await db.select().from(documentsTable).where(eq(documentsTable.uploadedBy, user.id)).orderBy(desc(documentsTable.createdAt));
    }
    res.json({ items: docs });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch documents" });
  }
});

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
     res.status(400).json({ message: "No file uploaded" });
     return;
  }

  const user = getUserFromAuthHeader(req.headers.authorization);
  const uploaderId = user?.id || "maya"; // fallback to founder for demo if not logged in

  const fileUrl = (req.file as any).location || `/uploads/${req.file.filename}`;
  const docId = `doc-${Date.now()}`;

  const taskId = req.body.taskId || null;

  // Optionally sync to Google Drive
  let driveData = null;
  if (process.env.SYNC_TO_GDRIVE === "true" && req.file.path) {
    driveData = await uploadToDrive(req.file.path, req.file.originalname, req.file.mimetype);
  }

  try {
    await db.insert(documentsTable).values({
      id: docId,
      filename: req.file.originalname,
      url: fileUrl,
      uploadedBy: uploaderId,
      taskId: taskId,
      createdAt: new Date().toISOString()
    });

    res.json({ 
      message: "File uploaded successfully", 
      file: {
        id: docId,
        filename: req.file.originalname,
        url: fileUrl
      },
      drive: driveData 
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to save document record" });
  }
});

export default router;
