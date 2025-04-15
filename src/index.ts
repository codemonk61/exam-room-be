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
  cors: {
    origin: "*",
  },
});

const currentQuestions = new Map<string, string>();

app.use(cors());
app.use(express.json());

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ roomId, userName }) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", { userName });
  });

  socket.on("send-question", ({ roomId, question }) => {
    currentQuestions.set(roomId, question);
    io.to(roomId).emit("receive-question", question);
  });

  socket.on("submit-answer", async ({ roomId, userName, answer }) => {
    const question = currentQuestions.get(roomId);
    if (question) {
      await Answer.create({ roomId, userName, answer, question });
      io.to(roomId).emit("receive-answer", { userName, answer });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));