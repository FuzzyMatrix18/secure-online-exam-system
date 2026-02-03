import mongoose from 'mongoose';
import User from '../models/User.js';
import Exam from '../models/Exam.js';
import Result from '../models/Result.js';

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/soe_test';
const TARGET_EMAIL = 'inttester@example.com';
const TARGET_EXAM_TITLE = 'Integration Exam';

(async () => {
  try {
    await mongoose.connect(MONGO);
    console.log('Connected to', MONGO);

    const users = await User.find({ email: TARGET_EMAIL });
    const userIds = users.map(u => u._id);
    console.log('Found users:', userIds.length);

    const exams = await Exam.find({ title: TARGET_EXAM_TITLE });
    const examIds = exams.map(e => e._id);
    console.log('Found exams:', examIds.length);

    let resDeleted = { deletedCount: 0 };
    if (userIds.length) {
      const r1 = await Result.deleteMany({ user: { $in: userIds } });
      resDeleted.deletedCount += r1.deletedCount || 0;
    }
    if (examIds.length) {
      const r2 = await Result.deleteMany({ exam: { $in: examIds } });
      resDeleted.deletedCount += r2.deletedCount || 0;
    }

    const examsDel = await Exam.deleteMany({ _id: { $in: examIds } });
    const usersDel = await User.deleteMany({ email: TARGET_EMAIL });

    console.log('Deleted results count:', resDeleted.deletedCount);
    console.log('Deleted exams count:', examsDel.deletedCount || 0);
    console.log('Deleted users count:', usersDel.deletedCount || 0);

    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
})();
