"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/Answer.ts
const mongoose_1 = __importDefault(require("mongoose"));
const answerSchema = new mongoose_1.default.Schema({
    roomId: { type: String, required: true },
    userName: { type: String, required: true },
    answer: { type: String, required: true },
    question: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
exports.default = mongoose_1.default.model("Answer", answerSchema);
