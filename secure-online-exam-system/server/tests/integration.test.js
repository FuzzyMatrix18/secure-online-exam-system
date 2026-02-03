import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import User from '../models/User.js';
import Exam from '../models/Exam.js';
import Result from '../models/Result.js';

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/soe_test';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await mongoose.connect(MONGO);
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('Integration flow', () => {
  const user = { name: 'Jest Tester', email: 'jesttester@example.com', password: 'password' };
  let token;
  let examId;

  test('register -> login', async () => {
    const reg = await request(app).post('/api/auth/register').send(user);
    expect([200, 409]).toContain(reg.status);

    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password });
    expect(login.status).toBe(200);
    token = login.body.token;
    expect(token).toBeTruthy();
  });

  test('create exam and verify', async () => {
    const q0 = 'A';
    const q1 = JSON.stringify({ correctAnswer: 'Photosynthesis', weight: 2, partials: [ { match: 'photo', score: 0.5 }, { match: 'synthesis', score: 0.5 } ] });
    const q2 = JSON.stringify({ correctAnswer: '42', weight: 3 });

    const create = await request(app).post('/api/exams').set('Authorization', `Bearer ${token}`).send({ title: 'Jest Exam', duration: 30, questions: [q0, q1, q2] });
    expect(create.status).toBe(200);
    examId = create.body._id;
    expect(examId).toBeTruthy();

    const answers = [ { questionIndex: 0, answer: 'A' }, { questionIndex: 1, answer: 'photo process' }, { questionIndex: 2, answer: '41' } ];
    const verify = await request(app).post('/api/results/verify').set('Authorization', `Bearer ${token}`).send({ examId, answers });
    expect(verify.status).toBe(200);
    expect(verify.body.score).toBe(2);
    expect(verify.body.total).toBe(6);
  });

  test('cleanup test data', async () => {
    await Result.deleteMany({});
    await Exam.deleteMany({ title: 'Jest Exam' });
    await User.deleteMany({ email: user.email });
  });
});
