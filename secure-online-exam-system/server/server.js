import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";

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
