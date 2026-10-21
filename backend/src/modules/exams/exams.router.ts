import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { deleteExam, generateExam, getExam, getExamAnalytics, getExamStats, listExams, renameExam, setExamHidden, submitExam } from "./exams.service.js";

export const examsRouter = Router();
const defaultUserId = "000000000000000000000001";
const upload = multer({
	dest: path.resolve(process.env.UPLOAD_DIR ?? "uploads", "tmp"),
	limits: { fileSize: 25 * 1024 * 1024 },
	fileFilter: (_request, file, callback) => {
		const extension = path.extname(file.originalname).toLowerCase();
		const validMime = extension === ".pdf"
			? file.mimetype === "application/pdf"
			: extension === ".docx" && file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
		callback(null, validMime);
	},
});

examsRouter.get("/", async (request, response) => {
	try {
		const userId = request.header("X-User-Id") ?? defaultUserId;
		const exams = await listExams(userId, { search: stringQuery(request.query.search), subject: stringQuery(request.query.subject), difficulty: stringQuery(request.query.difficulty), aiOnly: request.query.aiOnly === "true", showHidden: request.query.showHidden === "true" });
		response.json({ data: exams });
	} catch (error) {
		console.error("Failed to list exams", error);
		response.status(500).json({ error: "Không thể tải danh sách đề thi" });
	}
});

examsRouter.post("/generate", upload.single("document"), async (request, response) => {
	try {
		const userId = request.header("X-User-Id") ?? defaultUserId;
		const exam = await generateExam(userId, request.body ?? {}, request.file);
		response.status(201).json({ data: exam });
	} catch (error) {
		console.error("Failed to generate exam", error);
		const message = error instanceof Error ? error.message : "Không thể tạo đề thi";
		response.status(400).json({ error: message });
	}
});

examsRouter.patch("/:examId", async (request, response) => {
	try {
		const userId = request.header("X-User-Id") ?? defaultUserId;
		if (!await renameExam(userId, request.params.examId, String(request.body?.title ?? ""))) {
			response.status(404).json({ error: "Không tìm thấy đề thi hoặc tên đề không hợp lệ" });
			return;
		}
		response.json({ message: "Đã đổi tên đề thi" });
	} catch (error) {
		console.error("Failed to rename exam", error);
		response.status(500).json({ error: "Không thể đổi tên đề thi" });
	}
});

examsRouter.delete("/:examId", async (request, response) => {
	try {
		const userId = request.header("X-User-Id") ?? defaultUserId;
		if (!await deleteExam(userId, request.params.examId)) {
			response.status(404).json({ error: "Không tìm thấy đề thi" });
			return;
		}
		response.status(204).send();
	} catch (error) {
		console.error("Failed to delete exam", error);
		response.status(500).json({ error: "Không thể xóa đề thi" });
	}
});

examsRouter.post("/:examId/hide", async (request, response) => {
	try {
		const userId = request.header("X-User-Id") ?? defaultUserId;
		if (!await setExamHidden(userId, request.params.examId, true)) {
			response.status(403).json({ error: "Không thể ẩn đề thi này" });
			return;
		}
		response.json({ message: "Đã ẩn đề" });
	} catch (error) {
		console.error("Failed to hide exam", error);
		response.status(500).json({ error: "Không thể ẩn đề thi" });
	}
});

examsRouter.post("/:examId/unhide", async (request, response) => {
	try {
		const userId = request.header("X-User-Id") ?? defaultUserId;
		if (!await setExamHidden(userId, request.params.examId, false)) {
			response.status(403).json({ error: "Không thể hiện đề thi này" });
			return;
		}
		response.json({ message: "Đã hiện đề" });
	} catch (error) {
		console.error("Failed to unhide exam", error);
		response.status(500).json({ error: "Không thể hiện đề thi" });
	}
});

examsRouter.get("/stats", async (request, response) => {
	try {
		const userId = request.header("X-User-Id") ?? defaultUserId;
		response.json({ data: await getExamStats(userId) });
	} catch (error) {
		console.error("Failed to load exam stats", error);
		response.status(500).json({ error: "Không thể tải thống kê luyện thi" });
	}
});

examsRouter.get("/analytics", async (request, response) => {
	try {
		const userId = request.header("X-User-Id") ?? defaultUserId;
		response.json({ data: await getExamAnalytics(userId) });
	} catch (error) {
		console.error("Failed to load exam analytics", error);
		response.status(500).json({ error: "Không thể tải biểu đồ năng lực" });
	}
});

examsRouter.get("/:examId", async (request, response) => {
	try {
		const userId = request.header("X-User-Id") ?? defaultUserId;
		const exam = await getExam(userId, request.params.examId);
		if (!exam) {
			response.status(404).json({ error: "Không tìm thấy đề thi" });
			return;
		}
		response.json({ data: exam });
	} catch (error) {
		console.error("Failed to load exam", error);
		response.status(500).json({ error: "Không thể tải đề thi" });
	}
});

examsRouter.post("/:examId/submit", async (request, response) => {
	try {
		const userId = request.header("X-User-Id") ?? defaultUserId;
		const result = await submitExam(userId, request.params.examId, request.body?.answers ?? {}, request.body?.durationSeconds);
		if (!result) {
			response.status(404).json({ error: "Không tìm thấy đề thi" });
			return;
		}
		response.status(201).json({ data: result });
	} catch (error) {
		console.error("Failed to submit exam", error);
		response.status(400).json({ error: "Không thể nộp bài thi" });
	}
});

function stringQuery(value: unknown): string | undefined { return typeof value === "string" ? value : undefined; }
