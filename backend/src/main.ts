import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { connectDatabase } from "./database/connection.js";
import { getDashboardSummary } from "./modules/dashboard/dashboard.service.js";
import { chatRouter } from "./modules/ai/chat.router.js";
import { coursesRouter } from "./modules/courses/courses.router.js";
import { examsRouter } from "./modules/exams/exams.router.js";
import { flashcardSetsRouter, flashcardsRouter } from "./modules/flashcards/flashcards.router.js";
import { settingsRouter } from "./modules/settings/settings.router.js";
import { validateAiConfiguration } from "./config/ai.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve(process.env.UPLOAD_DIR ?? "uploads")));
app.use("/courses", coursesRouter);
app.use("/exams", examsRouter);
app.use("/flashcards", flashcardsRouter);
app.use("/flashcard-sets", flashcardSetsRouter);
app.use("/ai", chatRouter);
app.use("/settings", settingsRouter);

app.get("/", (_request, response) => {
	response.json({ service: "smart-learning-ai-backend", status: "ok", message: "Backend đang hoạt động" });
});

app.get("/health", (_request, response) => {
	response.json({ status: "ok", service: "smart-learning-ai-backend" });
});

app.get("/dashboard/summary", async (request, response) => {
	try {
		const userId = request.header("X-User-Id") ?? "demo-user";
		response.json({ data: await getDashboardSummary(userId) });
	} catch (error) {
		console.error("Failed to build dashboard summary", error);
		response.status(500).json({ error: "Không thể tải tổng quan học tập" });
	}
});

await connectDatabase();
await validateAiConfiguration();
app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
