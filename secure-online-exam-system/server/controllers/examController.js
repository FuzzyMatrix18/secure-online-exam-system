import Exam from "../models/Exam.js";
import { encrypt, decrypt } from "../utils/encryption.js";

export const createExam = async (req, res) => {
  const encryptedQuestions = req.body.questions.map(q => {
    // simple heuristic: CryptoJS AES outputs ciphertexts starting with 'U2FsdGVkX1'
    if (typeof q === 'string' && q.startsWith && q.startsWith('U2FsdGVkX1')) return q;
    return encrypt(q);
  });
  const exam = await Exam.create({
    title: req.body.title,
    duration: req.body.duration,
    questions: encryptedQuestions,
    createdBy: req.user.id
  });
  res.json(exam);
};

export const getExam = async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  exam.questions = exam.questions.map(q => decrypt(q));
  res.json(exam);
};
