import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

/* LOGIN */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: false,      // localhost
    sameSite: "lax",
    path: "/",
  });

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
  res.clearCookie("token", { path: "/" });
  res.json({ message: "Logged out" });
});

export default router;
