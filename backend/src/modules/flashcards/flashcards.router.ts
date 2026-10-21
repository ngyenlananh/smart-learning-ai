import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { createFlashcardSetDocument, deleteFlashcardSetDocument, generateImportPreview, listFlashcardSetDocuments, saveImportCards } from "./documents.service.js";
import { createFlashcard, createFlashcardDeck, deleteFlashcard, deleteFlashcardSet, getDueSummary, getFlashcard, getFlashcards, getFlashcardSet, getLanguages, getMyFlashcardDecks, getQuizFlashcards, getQuizProgress, getReviewQueue, getReviewSummary, reviewFlashcard, reviewQuizFlashcard, startReviewSession, updateFlashcard, updateFlashcardDeck } from "./flashcards.service.js";

export const flashcardsRouter = Router();
export const flashcardSetsRouter = Router();
const defaultUserId = "demo-user";
const upload = multer({ dest: path.resolve(process.env.UPLOAD_DIR ?? "uploads", "tmp"), limits: { fileSize: 25 * 1024 * 1024 }, fileFilter: (_request, file, callback) => callback(null, [".pdf", ".docx", ".xlsx", ".xls", ".csv"].includes(path.extname(file.originalname).toLowerCase())) });
const importUpload = multer({ dest: path.resolve(process.env.UPLOAD_DIR ?? "uploads", "tmp"), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_request, file, callback) => callback(null, [".pdf", ".docx", ".pptx", ".txt", ".md", ".xlsx"].includes(path.extname(file.originalname).toLowerCase())) });

flashcardSetsRouter.post("/", async (request, response) => {
	try {
		const deck = await createFlashcardDeck(request.header("X-User-Id") ?? defaultUserId, request.body ?? {});
		if (!deck) { response.status(400).json({ error: "Tên bộ thẻ không được để trống" }); return; }
		response.status(201).json({ data: deck });
	} catch (error) {
		console.error("Failed to create flashcard set", error);
		response.status(500).json({ error: "Không thể tạo bộ thẻ" });
	}
});

flashcardSetsRouter.get("/:setId", async (request, response) => {
	const deck = await getFlashcardSet(String(request.params.setId), request.header("X-User-Id") ?? defaultUserId);
	if (!deck) { response.status(404).json({ error: "Không tìm thấy bộ thẻ" }); return; }
	response.json({ data: deck });
});

flashcardSetsRouter.patch("/:setId", async (request, response) => {
	try {
		const result = await updateFlashcardDeck(String(request.params.setId), request.header("X-User-Id") ?? defaultUserId, request.body ?? {});
		if (result.status === "not-found") { response.status(404).json({ error: "Không tìm thấy bộ thẻ" }); return; }
		if (result.status === "forbidden") { response.status(403).json({ error: "Bạn không có quyền sửa bộ thẻ này" }); return; }
		if (result.status !== "updated") {
			response.status(400).json({ error: result.error ?? "Không thể cập nhật bộ thẻ" });
			return;
		}
		response.json({ data: result.deck });
	} catch (error) {
		console.error("Failed to update flashcard set", error);
		response.status(500).json({ error: "Không thể cập nhật bộ thẻ" });
	}
});

flashcardSetsRouter.delete("/:setId", async (request, response) => {
	const userId = request.header("X-User-Id") ?? defaultUserId;
	const result = await deleteFlashcardSet(String(request.params.setId), userId);
	if (result === "not-found") { response.status(404).json({ error: "Không tìm thấy bộ thẻ" }); return; }
	if (result === "forbidden") { response.status(403).json({ error: "Bạn không có quyền xóa bộ thẻ này" }); return; }
	response.json({ message: "Đã xóa bộ thẻ và toàn bộ dữ liệu liên quan" });
});

flashcardSetsRouter.post("/:setId/documents", upload.single("file"), async (request, response) => {
	try {
		if (!request.file) { response.status(400).json({ error: "Vui lòng chọn file PDF, DOCX, XLSX hoặc CSV" }); return; }
		const document = await createFlashcardSetDocument(String(request.params.setId), request.file, request.header("X-User-Id") ?? defaultUserId);
		if (!document) { response.status(404).json({ error: "Không tìm thấy bộ thẻ" }); return; }
		response.status(202).json({ data: document });
	} catch (error) {
		console.error("Failed to upload flashcard document", error);
		response.status(500).json({ error: "Không thể tải tài liệu lên" });
	}
});

flashcardSetsRouter.get("/:setId/documents", async (request, response) => {
	response.json({ data: await listFlashcardSetDocuments(request.params.setId, request.header("X-User-Id") ?? defaultUserId) });
});

flashcardSetsRouter.delete("/:setId/documents/:documentId", async (request, response) => {
	const deleted = await deleteFlashcardSetDocument(request.params.setId, request.params.documentId, request.header("X-User-Id") ?? defaultUserId);
	if (!deleted) { response.status(404).json({ error: "Không tìm thấy tài liệu" }); return; }
	response.json({ message: "Đã xóa tài liệu và các thẻ được sinh từ tài liệu" });
});

flashcardSetsRouter.get("/:setId/cards", async (request, response) => {
	try {
		const cards = await getQuizFlashcards(request.params.setId, request.header("X-User-Id") ?? defaultUserId);
		if (!cards) { response.status(404).json({ error: "Không tìm thấy bộ thẻ trắc nghiệm" }); return; }
		response.json({ data: cards });
	} catch (error) {
		console.error("Failed to load quiz flashcards", error);
		response.status(500).json({ error: "Không thể tải thẻ trắc nghiệm" });
	}
});

flashcardSetsRouter.get("/:setId/progress", async (request, response) => {
	const progress = await getQuizProgress(request.params.setId, request.header("X-User-Id") ?? defaultUserId);
	if (!progress) { response.status(404).json({ error: "Không tìm thấy bộ thẻ" }); return; }
	response.json({ data: progress });
});

flashcardSetsRouter.post("/:setId/cards/:position/review", async (request, response) => {
	const review = await reviewQuizFlashcard(request.params.setId, request.header("X-User-Id") ?? defaultUserId, Number(request.params.position));
	if (!review) { response.status(400).json({ error: "Vị trí thẻ không hợp lệ" }); return; }
	response.status(201).json({ data: review });
});

flashcardsRouter.get("/languages", (_request, response) => {
	response.json({ data: getLanguages() });
});

flashcardsRouter.get("/decks", async (request, response) => {
	try {
		response.json({ data: await getMyFlashcardDecks(request.header("X-User-Id") ?? defaultUserId) });
	} catch (error) {
		console.error("Failed to load flashcard decks", error);
		response.status(500).json({ error: "Không thể tải các bộ thẻ của bạn" });
	}
});

flashcardsRouter.post("/decks/:deckId/import", importUpload.single("file"), async (request, response) => {
	try {
		if (!request.file) { response.status(400).json({ error: "Vui lòng chọn file XLSX, PDF, DOCX, PPTX, TXT hoặc MD" }); return; }
		const result = await generateImportPreview(String(request.params.deckId), request.file, request.header("X-User-Id") ?? defaultUserId, request.body ?? {});
		if (!result) { response.status(404).json({ error: "Không tìm thấy bộ thẻ" }); return; }
		response.json({ data: result });
	} catch (error) {
		console.error("Failed to generate flashcard import preview", error);
		response.status(400).json({ error: error instanceof Error ? error.message : "Không thể tạo bản xem trước thẻ" });
	}
});

flashcardsRouter.post("/decks/:deckId/import/save", async (request, response) => {
	try {
		const result = await saveImportCards(String(request.params.deckId), request.header("X-User-Id") ?? defaultUserId, request.body?.cards);
		if (!result) { response.status(404).json({ error: "Không tìm thấy bộ thẻ" }); return; }
		response.status(201).json({ data: result });
	} catch (error) {
		console.error("Failed to save imported flashcards", error);
		response.status(400).json({ error: error instanceof Error ? error.message : "Không thể lưu thẻ vào bộ" });
	}
});

flashcardsRouter.post("/decks", async (request, response) => {
	try {
		const deck = await createFlashcardDeck(request.header("X-User-Id") ?? defaultUserId, request.body ?? {});
		if (!deck) {
			response.status(400).json({ error: "Tên bộ thẻ không được để trống" });
			return;
		}
		response.status(201).json({ data: deck, message: "Đã tạo bộ thẻ" });
	} catch (error) {
		console.error("Failed to create flashcard deck", error);
		response.status(500).json({ error: "Không thể tạo bộ thẻ" });
	}
});

flashcardsRouter.get("/due-summary", async (request, response) => {
	try {
		const language = typeof request.query.language === "string" ? request.query.language : undefined;
		response.json({ data: await getDueSummary(request.header("X-User-Id") ?? defaultUserId, language) });
	} catch (error) {
		console.error("Failed to load due flashcard summary", error);
		response.status(500).json({ error: "Không thể tải số từ cần ôn hôm nay" });
	}
});

flashcardsRouter.post("/review-session/start", async (request, response) => {
	try {
		const session = await startReviewSession(request.header("X-User-Id") ?? defaultUserId, typeof request.body?.language === "string" ? request.body.language : "en");
		response.status(201).json({ data: session });
	} catch (error) {
		console.error("Failed to start flashcard review session", error);
		response.status(500).json({ error: "Không thể bắt đầu phiên ôn tập" });
	}
});

flashcardsRouter.get("/review-queue", async (request, response) => {
	try {
		const language = typeof request.query.language === "string" ? request.query.language : undefined;
		response.json({ data: await getReviewQueue(request.header("X-User-Id") ?? defaultUserId, language) });
	} catch (error) {
		console.error("Failed to load flashcard review queue", error);
		response.status(500).json({ error: "Không thể tải hàng đợi ôn tập" });
	}
});

flashcardsRouter.get("/:language/summary", async (request, response) => {
	try {
		const summary = await getReviewSummary(String(request.query.userId ?? request.header("X-User-Id") ?? defaultUserId), request.params.language);
		if (!summary) {
			response.status(404).json({ error: "Không tìm thấy ngôn ngữ" });
			return;
		}
		response.json({ data: summary });
	} catch (error) {
		console.error("Failed to load flashcard summary", error);
		response.status(500).json({ error: "Không thể tải tổng kết buổi học" });
	}
});

flashcardsRouter.get("/", async (request, response) => {
	try {
		const language = typeof request.query.language === "string" ? request.query.language : "en";
		const deckId = typeof request.query.deckId === "string" ? request.query.deckId : undefined;
		const limit = typeof request.query.limit === "string" ? Number(request.query.limit) : 50;
		const cards = await getFlashcards(language, request.header("X-User-Id") ?? defaultUserId, Number.isFinite(limit) ? limit : 50, deckId);
		response.json({ data: cards });
	} catch (error) {
		console.error("Failed to load flashcards", error);
		response.status(500).json({ error: "Không thể tải bộ flashcard" });
	}
});

flashcardsRouter.post("/", async (request, response) => {
	try {
		const card = await createFlashcard(request.header("X-User-Id") ?? defaultUserId, request.body ?? {});
		if (!card) {
			response.status(400).json({ error: "Cần có ngôn ngữ, từ vựng, phiên âm và nghĩa" });
			return;
		}
		response.status(201).json({ data: card, message: "Đã tạo thẻ mới" });
	} catch (error) {
		console.error("Failed to create flashcard", error);
		response.status(500).json({ error: "Không thể tạo flashcard" });
	}
});

flashcardsRouter.get("/:language/:position", async (request, response) => {
	try {
		const card = await getFlashcard(request.params.language, Number(request.params.position), request.header("X-User-Id") ?? defaultUserId);
		if (!card) {
			response.status(404).json({ error: "Không tìm thấy thẻ flashcard" });
			return;
		}
		response.json({ data: card });
	} catch (error) {
		console.error("Failed to load flashcard", error);
		response.status(500).json({ error: "Không thể tải thẻ flashcard" });
	}
});

flashcardsRouter.patch("/:language/:position", async (request, response) => {
	try {
		const meaning = typeof request.body?.meaning === "string" ? request.body.meaning : "";
		const card = await updateFlashcard(request.header("X-User-Id") ?? defaultUserId, request.params.language, Number(request.params.position), meaning);
		if (!card) {
			response.status(400).json({ error: "Nội dung chỉnh sửa không hợp lệ" });
			return;
		}
		response.json({ data: card, message: "Đã cập nhật flashcard" });
	} catch (error) {
		console.error("Failed to update flashcard", error);
		response.status(500).json({ error: "Không thể cập nhật flashcard" });
	}
});

flashcardsRouter.delete("/:language/:position", async (request, response) => {
	try {
		const deleted = await deleteFlashcard(request.header("X-User-Id") ?? defaultUserId, request.params.language, Number(request.params.position));
		if (!deleted) {
			response.status(400).json({ error: "Thẻ flashcard không hợp lệ" });
			return;
		}
		response.json({ message: "Đã xóa flashcard" });
	} catch (error) {
		console.error("Failed to delete flashcard", error);
		response.status(500).json({ error: "Không thể xóa flashcard" });
	}
});

flashcardsRouter.post("/:language/:position/review", async (request, response) => {
	try {
		const rating = Number(request.body?.rating);
		const review = await reviewFlashcard(request.header("X-User-Id") ?? defaultUserId, request.params.language, Number(request.params.position), rating);
		if (!review) {
			response.status(400).json({ error: "Ngôn ngữ, vị trí hoặc mức đánh giá không hợp lệ" });
			return;
		}
		response.status(201).json({ data: review });
	} catch (error) {
		console.error("Failed to save flashcard review", error);
		response.status(500).json({ error: "Không thể lưu kết quả ôn tập" });
	}
});
