#!/usr/bin/env node
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Result from '../models/Result.js';
import Exam from '../models/Exam.js';
import User from '../models/User.js';

// Usage (env or args):
// MONGO_URI, OUT, EXAM, EMAIL, MIN_SCORE, MAX_SCORE, FROM, TO

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/soe_test';
const OUTDIR = process.env.OUT || 'scripts/exports';

const argv = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.split('=');
  return [k.replace(/^--/, ''), v ?? ''];
}));

const filter = {};
const exam = process.env.EXAM || argv.exam;
const email = process.env.EMAIL || argv.email;
if (exam) filter.exam = exam;
if (process.env.MIN_SCORE || argv.minScore) filter.score = { $gte: Number(process.env.MIN_SCORE || argv.minScore) };
if (process.env.MAX_SCORE || argv.maxScore) filter.score = { ...(filter.score || {}), $lte: Number(process.env.MAX_SCORE || argv.maxScore) };
if (process.env.FROM || argv.from) filter.createdAt = { ...(filter.createdAt || {}), $gte: new Date(process.env.FROM || argv.from) };
if (process.env.TO || argv.to) filter.createdAt = { ...(filter.createdAt || {}), $lte: new Date(process.env.TO || argv.to) };

const ensureDir = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };

const run = async () => {
  await mongoose.connect(MONGO, { autoIndex: false });
  console.log('Connected to', MONGO);

  if (email) {
    const users = await User.find({ email });
    const userIds = users.map(u => u._id);
    if (userIds.length) filter.user = { $in: userIds };
  }

  const results = await Result.find(filter).populate('exam user').sort({ createdAt: -1 }).lean();
  console.log('Found', results.length, 'results');

  ensureDir(OUTDIR);
  const out = path.join(OUTDIR, `results-${Date.now()}.csv`);
  const headers = ['resultId','examId','examTitle','userId','userEmail','score','total','createdAt','answersJson'];
  const stream = fs.createWriteStream(out, { encoding: 'utf8' });
  stream.write(headers.join(',') + '\n');

  for (const r of results) {
    const examId = r.exam?._id ?? r.exam;
    const examTitle = r.exam?.title ?? '';
    const userId = r.user?._id ?? r.user;
    const userEmail = r.user?.email ?? '';
    const answersJson = JSON.stringify(r.answers || []);

    // CSV-safe cell: wrap in double-quotes and escape existing double-quotes
    const safe = (val) => {
      if (val === null || val === undefined) return '""';
      const s = String(val);
      return '"' + s.replace(/"/g, '""') + '"';
    };

    const row = [
      String(r._id),
      String(examId),
      examTitle,
      String(userId),
      userEmail,
      String(r.score ?? ''),
      String(r.total ?? ''),
      r.createdAt ? new Date(r.createdAt).toISOString() : '',
      answersJson
    ];
    stream.write(row.map(safe).join(',') + '\n');
  }

  stream.end();
  stream.on('finish', async () => {
    console.log('Wrote CSV to', out);
    await mongoose.disconnect();
    process.exit(0);
  });
  stream.on('error', async (err) => {
    console.error('Write error', err);
    await mongoose.disconnect();
    process.exit(2);
  });
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});