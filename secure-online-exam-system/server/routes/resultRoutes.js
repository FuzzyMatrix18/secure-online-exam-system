import express from "express";
import { verifyAndSave, listMyResults, listLeaderboard } from "../controllers/resultController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import { listResults, cleanupTestData } from "../controllers/adminController.js";
import { validateQuery } from "../middleware/validate.js";
import { listResultsSchema } from "../validation/adminValidation.js";

const router = express.Router();

// POST /api/results/verify
router.post("/verify", protect, verifyAndSave);

// user endpoints
router.get("/mine", protect, listMyResults);
router.get("/leaderboard", protect, listLeaderboard);

// admin endpoints
router.get("/", protect, adminOnly, validateQuery(listResultsSchema), listResults);
router.delete("/cleanup", protect, adminOnly, cleanupTestData);

export default router;
