import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();
await mongoose.connect(process.env.MONGO_URI);

const hash = await bcrypt.hash("Secure@2026", 10);

await User.create({
  email: "admin@example.com",
  password: hash,
  role: "admin"
});

console.log("ADMIN CREATED");
process.exit();
