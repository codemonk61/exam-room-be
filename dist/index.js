"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
const Answer_1 = __importDefault(require("./models/Answer"));
dotenv_1.default.config();
(0, db_1.default)();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: { origin: "*" }
});
const currentQuestions = new Map();
const scoreboard = new Map();
let examStatus = new Map(); // roomId -> isExamActive?
app.use((0, cors_1.default)());
app.use(express_1.default.json());
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    // When a user joins a room, make sure a scoreboard exists for that room.
    socket.on("join-room", ({ roomId, userName }) => {
        socket.join(roomId);
        if (!scoreboard.has(roomId)) {
            scoreboard.set(roomId, {});
        }
        socket.to(roomId).emit("user-joined", { userName });
    });
    // Start exam event
    socket.on("start-exam", ({ roomId }) => {
        examStatus.set(roomId, true);
        io.to(roomId).emit("exam-started");
        console.log(`Exam started for room ${roomId}`);
    });
    // End exam event
    socket.on("end-exam", ({ roomId }) => {
        examStatus.set(roomId, false);
        io.to(roomId).emit("exam-ended");
        console.log(`Exam ended for room ${roomId}`);
    });
    // Teacher sends a new question with an optional correctAnswer
    socket.on("send-question", ({ roomId, question, correctAnswer }) => {
        // Set the current question for the room
        currentQuestions.set(roomId, { question, correctAnswer });
        // Broadcast the question (do not expose the answer to students)
        io.to(roomId).emit("receive-question", question);
    });
    // Teacher starts a timer for the current question
    socket.on("start-timer", ({ roomId, duration }) => {
        // duration in seconds
        io.to(roomId).emit("timer-start", duration);
        setTimeout(() => {
            io.to(roomId).emit("question-ended");
        }, duration * 1000);
    });
    // Student submits an answer
    socket.on("submit-answer", async ({ roomId, userName, answer }) => {
        // Check that exam is active before processing
        if (examStatus.get(roomId) !== true) {
            socket.emit("exam-not-active");
            return;
        }
        // Record the answer in the database
        const qObj = currentQuestions.get(roomId);
        if (qObj) {
            await Answer_1.default.create({
                roomId,
                userName,
                answer,
                question: qObj.question
            });
        }
        // Check correctness (if a correct answer was provided)
        if (qObj && qObj.correctAnswer) {
            console.log("givenAnswer and correct answer", answer, qObj.correctAnswer);
            const normalizedStudentAns = answer.trim().toLowerCase();
            const normalizedCorrectAns = qObj.correctAnswer.trim().toLowerCase();
            if (normalizedStudentAns === normalizedCorrectAns) {
                // Update student’s score
                const roomScoreboard = scoreboard.get(roomId) || {};
                roomScoreboard[userName] = (roomScoreboard[userName] || 0) + 1;
                scoreboard.set(roomId, roomScoreboard);
                // Emit updated scoreboard to teacher and students
                io.emit("update-scoreboard", roomScoreboard);
            }
        }
        // Also broadcast the answer as a submission (without revealing if it's right)
        io.to(roomId).emit("receive-answer", { userName, answer });
    });
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});
const PORT = process.env.PORT || 5050;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
