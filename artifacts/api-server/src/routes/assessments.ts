import { Router, type IRouter } from "express";

const router: IRouter = Router();

const assessments = [
  {
    id: "assessment-1",
    title: "Brand Launch Readiness",
    type: "Readiness",
    owner: "maya",
    status: "In Progress",
    score: 78,
    dueDate: "2026-09-20",
  },
  {
    id: "assessment-2",
    title: "SEO Technical Gap Assessment",
    type: "SEO",
    owner: "priya",
    status: "Review",
    score: 91,
    dueDate: "2026-09-16",
  },
  {
    id: "assessment-3",
    title: "Creative Production Assessment",
    type: "Design",
    owner: "rahul",
    status: "Planning",
    score: 64,
    dueDate: "2026-09-24",
  },
];

router.get("/", (_req, res) => {
  res.json({ items: assessments });
});

router.get("/:id", (req, res) => {
  const item = assessments.find((assessment) => assessment.id === req.params.id);

  if (!item) {
    res.status(404).json({ message: "Assessment not found" });
    return;
  }

  res.json({ item });
});

export default router;
