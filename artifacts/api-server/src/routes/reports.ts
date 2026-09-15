import { Router, type IRouter } from "express";
import PDFDocument from "pdfkit";
import { db, reportsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const items = await db.select().from(reportsTable).orderBy(desc(reportsTable.createdAt));
    res.json({ items });
  } catch (err) {
    res.status(503).json({ message: "Database unavailable" });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = req.body ?? {};
    const id = payload.id ?? `report-${Date.now()}`;
    
    await db.insert(reportsTable).values({
      id,
      managerId: payload.managerId,
      period: payload.period ?? "Weekly",
      completed: payload.completed ?? "",
      inProgress: payload.inProgress ?? "",
      blockers: payload.blockers ?? "",
      decisions: payload.decisions ?? "",
      status: payload.status ?? "Submitted",
      createdAt: payload.createdAt ?? new Date().toISOString()
    });

    const item = await db.select().from(reportsTable).where(eq(reportsTable.id, id)).limit(1).then(r => r[0]);
    res.status(201).json({ item });
  } catch (err) {
    console.error("Create report error:", err);
    res.status(503).json({ message: "Database unavailable or invalid payload" });
  }
});

router.post("/:id/pdf", async (req, res) => {
  try {
    const reportId = req.params.id;
    const reportResult = await db.select().from(reportsTable).where(eq(reportsTable.id, reportId)).limit(1);
    const report = reportResult[0];

    if (!report) {
       res.status(404).json({ message: "Report not found" });
       return;
    }

    const doc = new PDFDocument();
    
    res.setHeader("Content-disposition", `attachment; filename=report-${reportId}.pdf`);
    res.setHeader("Content-type", "application/pdf");

    doc.pipe(res);

    doc.fontSize(20).text("Manager Status Report", { align: "center" });
    doc.moveDown();
    
    doc.fontSize(14).text(`Period: ${report.period}`);
    doc.text(`Status: ${report.status}`);
    doc.text(`Created At: ${report.createdAt}`);
    doc.moveDown();

    doc.fontSize(16).text("Completed Work");
    doc.fontSize(12).text(report.completed);
    doc.moveDown();

    doc.fontSize(16).text("In Progress");
    doc.fontSize(12).text(report.inProgress);
    doc.moveDown();

    doc.fontSize(16).text("Blockers");
    doc.fontSize(12).text(report.blockers);
    doc.moveDown();

    doc.fontSize(16).text("Decisions");
    doc.fontSize(12).text(report.decisions);

    doc.end();
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({ message: "PDF generation failed" });
  }
});

export default router;
