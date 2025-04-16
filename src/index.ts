// src/index.ts
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import Answer from "./models/Answer";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const currentQuestions = new Map<string, { question: string, correctAnswer?: string }>();
const scoreboard = new Map<string, Record<string, number>>();
let examStatus = new Map<string, boolean>(); // roomId -> isExamActive?

app.use(cors());
app.use(express.json());

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
      await Answer.create({
        roomId,
        userName,
        answer,
        question: qObj.question
      });
    }
    // Check correctness (if a correct answer was provided)
    if (qObj && qObj.correctAnswer) {
      const normalizedStudentAns = answer.trim().toLowerCase();
      const normalizedCorrectAns = qObj.correctAnswer.trim().toLowerCase();
      if (normalizedStudentAns === normalizedCorrectAns) {
        // Update student’s score
        const roomScoreboard = scoreboard.get(roomId) || {};
        roomScoreboard[userName] = (roomScoreboard[userName] || 0) + 1;
        scoreboard.set(roomId, roomScoreboard);
        // Emit updated scoreboard to teacher and students
        io.to(roomId).emit("update-scoreboard", roomScoreboard);
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
