import jwt from "jsonwebtoken";
import RevokedToken from '../models/RevokedToken.js';

export const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  // Check revoked tokens
  const revoked = await RevokedToken.findOne({ token });
  if (revoked) return res.status(401).json({ message: "Token revoked" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
