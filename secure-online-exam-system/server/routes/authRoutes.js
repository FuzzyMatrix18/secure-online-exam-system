import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

/* LOGIN */
router.post("/login", async (req, res) => {
  const { email, password, remember } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const tokenTtlMs = 30 * 24 * 60 * 60 * 1000; // 30 days
  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: remember ? "30d" : "1d" }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };

  if (remember) {
    cookieOptions.maxAge = tokenTtlMs;
  }

  res.cookie("token", token, cookieOptions);

  res.json({
    email: user.email,
    role: user.role,
  });
});

/* CHECK SESSION */
router.get("/me", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    res.json(data);
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
});

/* LOGOUT */
router.post("/logout", (req, res) => {
  const soft = req.query?.soft === "true";
  if (!soft) {
    res.clearCookie("token", { path: "/" });
  }
  res.json({ message: soft ? "Soft logout" : "Logged out" });
});

export default router;
