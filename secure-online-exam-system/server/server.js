import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import examRoutes from "./routes/examRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();

/* ===== MIDDLEWARE ===== */
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

/* ===== ROUTES ===== */
app.use("/api/auth", authRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/admin", adminRoutes);

/* ===== DB ===== */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(console.error);

/* ===== START ===== */
const PORT = 5050;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
