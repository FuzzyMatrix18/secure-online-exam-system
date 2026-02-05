import Exam from "../models/Exam.js";
import { encrypt, decrypt } from "../utils/encryption.js";

export const createExam = async (req, res) => {
  const encryptedQuestions = req.body.questions.map(q => {
    // simple heuristic: CryptoJS AES outputs ciphertexts starting with 'U2FsdGVkX1'
    if (typeof q === 'string' && q.startsWith && q.startsWith('U2FsdGVkX1')) return q;
    if (typeof q === "object") {
      return encrypt(JSON.stringify(q));
    }
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
  exam.questions = exam.questions.map(q => {
    const raw = decrypt(q);
    try {
      const parsed = JSON.parse(raw);
      return {
        prompt: parsed.prompt ?? "",
        type: parsed.type ?? (Array.isArray(parsed.options) && parsed.options.length ? "mcq" : "subjective"),
        options: parsed.options ?? [],
        correctAnswer: parsed.correctAnswer ?? parsed.answer ?? "",
        weight: parsed.weight ?? parsed.points ?? 1,
        autoGrade: parsed.autoGrade ?? parsed.type !== "subjective",
        partials: parsed.partials ?? []
      };
    } catch (e) {
      return {
        prompt: raw,
        type: "subjective",
        options: [],
        correctAnswer: "",
        weight: 1,
        autoGrade: false,
        partials: []
      };
    }
  });
  res.json(exam);
};
