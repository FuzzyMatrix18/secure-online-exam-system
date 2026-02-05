import mongoose from "mongoose";

const resultSchema = new mongoose.Schema({
  exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  answers: [
    {
      questionIndex: { type: Number, required: true },
  answer: { type: String },
  correctAnswer: { type: String },
  weight: { type: Number, default: 1 },
  awarded: { type: Number, default: 0 },
  needsManual: { type: Boolean, default: false }
    }
  ],
  score: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Result", resultSchema);
