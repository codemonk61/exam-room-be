"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
    cors: {
        origin: "*",
    },
});
const currentQuestions = new Map();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
            await Answer_1.default.create({ roomId, userName, answer, question });
            io.to(roomId).emit("receive-answer", { userName, answer });
        }
    });
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
