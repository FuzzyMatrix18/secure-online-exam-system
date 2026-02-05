import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

const normalizeEmail = (email) => (email || "").trim().toLowerCase();

const getRoleFromEmail = (email) => {
  if (email.endsWith("@student.com")) return "student";
  if (email.endsWith("@admin.com")) return "admin";
  return null;
};

const setAuthCookie = (res, token, remember) => {
  const tokenTtlMs = 30 * 24 * 60 * 60 * 1000; // 30 days
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
};

/* REGISTER */
router.post("/register", async (req, res) => {
  const { email, password, remember = true } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const role = getRoleFromEmail(normalizedEmail);
  if (!role) {
    return res
      .status(400)
      .json({ message: "Email must end with @student.com or @admin.com" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: normalizedEmail,
    password: hashed,
    role,
  });

  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: remember ? "30d" : "1d" }
  );

  setAuthCookie(res, token, remember);

  res.status(201).json({
    email: user.email,
    role: user.role,
  });
});

/* LOGIN */
router.post("/login", async (req, res) => {
  const { email, password, remember } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: remember ? "30d" : "1d" }
  );
  setAuthCookie(res, token, remember);

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
