import express from "express";
import { createExam, getExam } from "../controllers/examController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.post("/", protect, createExam);
router.get("/:id", protect, getExam);

export default router;
