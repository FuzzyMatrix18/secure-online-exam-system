import mongoose from "mongoose";

const examSchema = new mongoose.Schema({
  title: String,
  duration: Number,
  questions: [String], // encrypted questions
  createdBy: String
});

export default mongoose.model("Exam", examSchema);
