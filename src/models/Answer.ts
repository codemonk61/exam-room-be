// src/models/Answer.ts
import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  userName: { type: String, required: true },
  answer: { type: String, required: true },
  question: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("Answer", answerSchema);
