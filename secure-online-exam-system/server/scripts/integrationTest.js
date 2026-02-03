const SERVER = process.env.SERVER_URL || 'http://localhost:5001';

const headers = { 'Content-Type': 'application/json' };

async function post(path, body, token) {
  const h = { ...headers };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const res = await fetch(SERVER + path, { method: 'POST', headers: h, body: JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { json = { raw: text }; }
  return { status: res.status, body: json };
}

async function get(path, token) {
  const h = {};
  if (token) h['Authorization'] = `Bearer ${token}`;
  const res = await fetch(SERVER + path, { headers: h });
  const json = await res.json();
  return { status: res.status, body: json };
}

(async () => {
  try {
    console.log('Server:', SERVER);

    const user = { name: 'Int Tester', email: 'inttester@example.com', password: 'password' };
    console.log('Logging in...');
    let login = await post('/api/auth/login', { email: user.email, password: user.password });
    if (login.status !== 200) {
      console.log('Not logged in, registering user...');
      const reg = await post('/api/auth/register', user);
      console.log('register status', reg.status);
      login = await post('/api/auth/login', { email: user.email, password: user.password });
    }
    console.log('login status', login.status);
    if (login.status !== 200) {
      console.error('Login failed', login.body);
      process.exit(2);
    }
    const token = login.body.token;
    console.log('Got token');

  // Prepare plaintext questions; server will encrypt them
  const q0 = 'A';
  const meta1 = JSON.stringify({ correctAnswer: 'Photosynthesis', weight: 2, partials: [ { match: 'photo', score: 0.5 }, { match: 'synthesis', score: 0.5 } ] });
  const q1 = meta1;
  const meta2 = JSON.stringify({ correctAnswer: '42', weight: 3 });
  const q2 = meta2;

  const examBody = { title: 'Integration Exam', duration: 60, questions: [q0, q1, q2] };
    console.log('Creating exam...');
    const createExam = await post('/api/exams', examBody, token);
    console.log('createExam status', createExam.status);
    if (createExam.status !== 200) {
      console.error('Create exam failed', createExam.body);
      process.exit(3);
    }

    const examId = createExam.body._id;
    console.log('ExamId', examId);

    // Submit verify
    const answers = [ { questionIndex: 0, answer: 'A' }, { questionIndex: 1, answer: 'photo process' }, { questionIndex: 2, answer: '41' } ];
    console.log('Submitting verify...');
    const verify = await post('/api/results/verify', { examId, answers }, token);
    console.log('verify status', verify.status);
    console.log('verify body', JSON.stringify(verify.body, null, 2));

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
