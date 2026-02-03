import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import RevokedToken from "../models/RevokedToken.js";
import RefreshToken from "../models/RefreshToken.js";
import AuditLog from "../models/AuditLog.js";

export const register = async (req, res) => {
  const { name, email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ message: 'User already exists' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed });
  res.json(user);
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
  // create refresh token (random string signed)
  const refreshTokenValue = jwt.sign({ id: user._id }, process.env.REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });
  const decoded = jwt.decode(refreshTokenValue);
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 3600 * 1000);
  await RefreshToken.create({ token: refreshTokenValue, user: user._id, expiresAt, ip: req.ip, userAgent: req.get('User-Agent') });
  // set refresh token as httpOnly cookie
  res.cookie('refreshToken', refreshTokenValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt
  });
  // audit
  await AuditLog.create({ user: user._id, action: 'login', ip: req.ip, userAgent: req.get('User-Agent'), meta: { expiresAt } });
  res.json({ token });
};

export const refresh = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) return res.status(400).json({ message: 'No refresh token' });
  const stored = await RefreshToken.findOne({ token: refreshToken, revoked: false });
  if (!stored) return res.status(401).json({ message: 'Invalid refresh token' });

  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Invalid token user' });

    // rotate: revoke old refresh token and issue a new one
    stored.revoked = true;
    const newRefresh = jwt.sign({ id: user._id }, process.env.REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '7d' });
    const decoded = jwt.decode(newRefresh);
    stored.replacedByToken = newRefresh;
    await stored.save();
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 3600 * 1000);
  await RefreshToken.create({ token: newRefresh, user: user._id, expiresAt, ip: req.ip, userAgent: req.get('User-Agent') });

    const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.cookie('refreshToken', newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt
    });
  await AuditLog.create({ user: user._id, action: 'refresh', ip: req.ip, userAgent: req.get('User-Agent'), meta: { replaced: stored._id } });
    res.json({ token: accessToken });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const me = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'No user' });
  const user = await User.findById(userId).select('name email role');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
};

export const listSessions = async (req, res) => {
  const userId = req.user?.id;
  const currentToken = req.cookies?.refreshToken;
  const tokens = await RefreshToken.find({ user: userId }).select('-__v').sort({ createdAt: -1 }).lean();
  res.json(tokens.map(t => ({ id: t._id, ip: t.ip, userAgent: t.userAgent, createdAt: t.createdAt, expiresAt: t.expiresAt, revoked: t.revoked, isCurrent: !!(currentToken && t.token === currentToken) })));
};

export const revokeSession = async (req, res) => {
  const userId = req.user?.id;
  const { id } = req.params;
  const tok = await RefreshToken.findOne({ _id: id, user: userId });
  if (!tok) return res.status(404).json({ message: 'Session not found' });
  tok.revoked = true;
  await tok.save();
  await AuditLog.create({ user: userId, action: 'revoke_session', ip: req.ip, userAgent: req.get('User-Agent'), meta: { sessionId: id } });
  res.json({ message: 'Session revoked' });
};

export const revokeAllSessions = async (req, res) => {
  const userId = req.user?.id;
  await RefreshToken.updateMany({ user: userId, revoked: false }, { revoked: true });
  await AuditLog.create({ user: userId, action: 'revoke_all_sessions', ip: req.ip, userAgent: req.get('User-Agent') });
  res.json({ message: 'All sessions revoked' });
};

export const logout = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(400).json({ message: 'No token provided' });
  try {
    const decoded = jwt.decode(token);
    // determine expiry from token (exp is in seconds)
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 3600 * 1000);
    await RevokedToken.create({ token, expiresAt });
  // also revoke any refresh tokens for this user (simple approach)
    const uid = decoded?.id;
    if (uid) {
      await RefreshToken.updateMany({ user: uid, revoked: false }, { revoked: true });
    }
  // clear cookie
  await AuditLog.create({ user: uid, action: 'logout', ip: req.ip, userAgent: req.get('User-Agent') });
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ message: 'Unable to logout' });
  }
};
