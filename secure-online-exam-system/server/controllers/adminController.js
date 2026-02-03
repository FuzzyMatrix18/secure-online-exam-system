import mongoose from 'mongoose';
import Result from "../models/Result.js";
import Exam from "../models/Exam.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";

export const listResults = async (req, res) => {
  // Query params: page, limit, exam, user, minScore, maxScore, from, to, sort
  // Validation
  const errors = [];
  const pageRaw = req.query.page;
  const limitRaw = req.query.limit;
  if (pageRaw !== undefined) {
    const p = Number(pageRaw);
    if (!Number.isInteger(p) || p < 1) errors.push('page must be an integer >= 1');
  }
  if (limitRaw !== undefined) {
    const l = Number(limitRaw);
    if (!Number.isInteger(l) || l < 1 || l > 100) errors.push('limit must be an integer between 1 and 100');
  }

  const exam = req.query.exam;
  const user = req.query.user;
  if (exam !== undefined && !mongoose.isValidObjectId(exam)) errors.push('exam must be a valid ObjectId');
  if (user !== undefined && !mongoose.isValidObjectId(user)) errors.push('user must be a valid ObjectId');

  const minScore = req.query.minScore;
  const maxScore = req.query.maxScore;
  if (minScore !== undefined && Number.isNaN(Number(minScore))) errors.push('minScore must be a number');
  if (maxScore !== undefined && Number.isNaN(Number(maxScore))) errors.push('maxScore must be a number');

  const from = req.query.from;
  const to = req.query.to;
  if (from !== undefined && Number.isNaN(Date.parse(from))) errors.push('from must be a valid date');
  if (to !== undefined && Number.isNaN(Date.parse(to))) errors.push('to must be a valid date');

  if (req.query.sort) {
    const sortParts = String(req.query.sort).split(',').map(s => s.trim()).filter(Boolean);
    const invalidSort = sortParts.find(p => !/^\-?[a-zA-Z0-9_]+$/.test(p));
    if (invalidSort) errors.push('sort contains invalid field: ' + invalidSort);
  }

  if (errors.length) return res.status(400).json({ errors });

  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '20', 10)));
  const skip = (page - 1) * limit;

  const filter = {};
  if (exam) filter.exam = exam;
  if (user) filter.user = user;
  if (minScore !== undefined) filter.score = { ...(filter.score || {}), $gte: Number(minScore) };
  if (maxScore !== undefined) filter.score = { ...(filter.score || {}), $lte: Number(maxScore) };
  if (from) filter.createdAt = { ...(filter.createdAt || {}), $gte: new Date(from) };
  if (to) filter.createdAt = { ...(filter.createdAt || {}), $lte: new Date(to) };

  // sort param example: createdAt,-score
  let sort = { createdAt: -1 };
  if (req.query.sort) {
    sort = {};
    const parts = String(req.query.sort).split(',');
    for (const p of parts) {
      const key = p.trim();
      if (!key) continue;
      if (key.startsWith('-')) sort[key.slice(1)] = -1;
      else sort[key] = 1;
    }
  }

  const [total, results] = await Promise.all([
    Result.countDocuments(filter),
    Result.find(filter).populate('exam user').sort(sort).skip(skip).limit(limit)
  ]);

  const pages = Math.ceil(total / limit) || 1;
  res.json({ results, meta: { total, page, limit, pages } });
};

export const listAuditLogs = async (req, res) => {
  const errors = [];
  const pageRaw = req.query.page;
  const limitRaw = req.query.limit;
  if (pageRaw !== undefined) {
    const p = Number(pageRaw);
    if (!Number.isInteger(p) || p < 1) errors.push('page must be an integer >= 1');
  }
  if (limitRaw !== undefined) {
    const l = Number(limitRaw);
    if (!Number.isInteger(l) || l < 1 || l > 500) errors.push('limit must be an integer between 1 and 500');
  }

  const user = req.query.user;
  if (user !== undefined && !mongoose.isValidObjectId(user)) errors.push('user must be a valid ObjectId');

  const from = req.query.from;
  const to = req.query.to;
  if (from !== undefined && Number.isNaN(Date.parse(from))) errors.push('from must be a valid date');
  if (to !== undefined && Number.isNaN(Date.parse(to))) errors.push('to must be a valid date');

  if (errors.length) return res.status(400).json({ errors });

  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.max(1, Math.min(500, parseInt(req.query.limit || '50', 10)));
  const skip = (page - 1) * limit;

  const filter = {};
  if (user) filter.user = user;
  if (req.query.action) filter.action = req.query.action;
  if (from) filter.createdAt = { ...(filter.createdAt || {}), $gte: new Date(from) };
  if (to) filter.createdAt = { ...(filter.createdAt || {}), $lte: new Date(to) };

  const total = await AuditLog.countDocuments(filter);
  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  res.json({ logs, meta: { total, page, limit, pages: Math.ceil(total / limit) || 1 } });
};

// cleanup test data created by integration script
export const cleanupTestData = async (req, res) => {
  // remove results and exams created by the test user email
  const testEmail = req.query.email || 'inttester@example.com';
  const user = await User.findOne({ email: testEmail });
  if (!user) return res.json({ message: 'No test user found' });

  await Result.deleteMany({ user: user._id });
  await Exam.deleteMany({ createdBy: user._id });
  await User.deleteOne({ _id: user._id });

  res.json({ message: 'cleaned', email: testEmail });
};
