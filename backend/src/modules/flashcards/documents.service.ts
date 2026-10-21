import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { createFlashcard, getFlashcards } from "./flashcards.service.js";
import { getQuizSet } from "./quiz-data.js";

export type FlashcardSetDocument = {
	id: string;
	flashcardSetId: string;
	fileName: string;
	fileUrl: string;
	fileType: string;
	uploadedAt: Date;
	status: "processing" | "done" | "error";
	cardCount: number;
	error?: string;
};

type UploadedFile = { path: string; originalname: string; mimetype: string };
type GeneratedCard = { question: string; options: [string, string, string, string]; correctIndex: number; explanation: string };
type ImportCard = { type: "quiz" | "flip"; question?: string; options?: [string, string, string, string]; correctIndex?: number; explanation?: string; front?: string; back?: string; example?: string; source?: string };

const storageRoot = path.resolve(process.env.UPLOAD_DIR ?? "uploads");

export async function createFlashcardSetDocument(setId: string, file: UploadedFile, userId: string): Promise<FlashcardSetDocument | undefined> {
	const storedDeck = mongoose.connection.readyState === 1 ? await mongoose.connection.collection("flashcard_decks").findOne({ id: setId, userId, cardType: "quiz" }) : null;
	if (!getQuizSet(setId) && !storedDeck) return undefined;
	const documentId = new mongoose.Types.ObjectId().toString();
	const document: FlashcardSetDocument = { id: documentId, flashcardSetId: setId, fileName: file.originalname, fileUrl: `/uploads/flashcard-sets/${setId}/${documentId}-${safeFileName(file.originalname)}`, fileType: file.mimetype || extensionType(file.originalname), uploadedAt: new Date(), status: "processing", cardCount: 0 };
	await saveDocument({ ...document, userId });
	void processDocument(document, file.path, userId).catch((error) => console.error("Failed to process flashcard document", error));
	return document;
}

export async function deleteFlashcardSetDocuments(setId: string, userId: string): Promise<void> {
	if (mongoose.connection.readyState !== 1) return;
	const collection = mongoose.connection.collection("flashcard_set_documents");
	const documents = await collection.find({ flashcardSetId: setId, userId }).toArray() as unknown as FlashcardSetDocument[];
	await Promise.all(documents.map((document) => removeStoredFile(document.fileUrl)));
	await collection.deleteMany({ flashcardSetId: setId, userId });
}

export async function listFlashcardSetDocuments(setId: string, userId: string): Promise<FlashcardSetDocument[]> {
	if (mongoose.connection.readyState !== 1) return [];
	return await mongoose.connection.collection("flashcard_set_documents").find({ flashcardSetId: setId, userId }).sort({ uploadedAt: -1 }).toArray() as unknown as FlashcardSetDocument[];
}

export async function generateImportPreview(deckId: string, file: UploadedFile, userId: string, options: Record<string, unknown>) {
	const deck = await getDeckForImport(deckId, userId);
	if (!deck) return undefined;
	const extension = path.extname(file.originalname).toLowerCase();
	if (![".pdf", ".docx", ".pptx", ".txt", ".md", ".xlsx"].includes(extension)) throw new Error("Chỉ hỗ trợ XLSX, PDF, DOCX, PPTX, TXT hoặc MD");
	try {
		if (extension === ".xlsx") {
			const cards = parseQuizWorkbook(await fs.readFile(file.path), file.originalname);
			return { fileName: file.originalname, cards: cards.map((card) => ({ ...card, type: "quiz" as const, source: file.originalname })), discarded: 0 };
		}
		const text = await extractContent(file.path, file.originalname);
		if (typeof text !== "string" || !text.trim()) throw new Error("Không đọc được chữ trong tài liệu này");
		const requested = options.count === "auto" ? 30 : Math.min(Math.max(Number(options.count) || 10, 10), 50);
		const cards = await generateImportCards(text, deck.title, options.type === "flip" ? "flip" : options.type === "both" ? "both" : deck.kind === "quiz" ? "quiz" : "flip", requested, file.originalname);
		if (!cards.length) throw new Error("Không tìm thấy nội dung phù hợp để tạo thẻ");
		return { fileName: file.originalname, cards, discarded: 0 };
	} finally {
		await removeTempFile(file.path);
	}
}

export async function saveImportCards(deckId: string, userId: string, input: unknown) {
	const deck = await getDeckForImport(deckId, userId);
	if (!deck || !Array.isArray(input)) return undefined;
	const cards = input.filter(isImportCard).slice(0, 50);
	if (!cards.length) throw new Error("Không có thẻ hợp lệ để lưu");
	const saved: unknown[] = [];
	const existingTerms = new Set((await getFlashcards("en", userId, 500, deckId)).map((card) => card.term.toLowerCase()));
	for (const card of cards) {
		if (card.type === "flip") {
			if (!card.front || !card.back || existingTerms.has(card.front.toLowerCase())) continue;
			const created = await createFlashcard(userId, { language: "en", deckId, term: card.front, pronunciation: "-", meaning: card.back, example: card.example ?? "" });
			if (created) { saved.push(created); existingTerms.add(card.front.toLowerCase()); }
		} else if (mongoose.connection.readyState === 1 && card.question && card.options && Number.isInteger(card.correctIndex)) {
			const collection = mongoose.connection.collection("flashcard_quiz_cards");
			const duplicate = await collection.findOne({ setId: deckId, question: card.question });
			if (duplicate) continue;
			const position = await collection.countDocuments({ setId: deckId }) + 1;
			const created = { id: `${deckId}-import-${Date.now()}-${position}`, setId: deckId, type: "quiz", question: card.question, options: card.options, correctIndex: card.correctIndex, explanation: card.explanation ?? "", position, total: position, sourceFile: card.source, createdAt: new Date() };
			await collection.insertOne(created);
			await collection.updateMany({ setId: deckId }, { $set: { total: position } });
			saved.push(created);
		}
	}
	if (mongoose.connection.readyState === 1 && saved.some((card) => (card as { type?: string }).type === "quiz")) {
		const quizTotal = await mongoose.connection.collection("flashcard_quiz_cards").countDocuments({ setId: deckId });
		await mongoose.connection.collection("flashcard_decks").updateOne({ id: deckId, userId }, { $set: { kind: "quiz", cardType: "quiz", total: quizTotal } });
	}
	if (mongoose.connection.readyState === 1 && deck.kind === "language" && !saved.some((card) => (card as { type?: string }).type === "quiz")) {
		const total = await mongoose.connection.collection("flashcards").countDocuments({ userId, deckId });
		await mongoose.connection.collection("flashcard_decks").updateOne({ id: deckId, userId }, { $set: { total } });
	}
	return { saved, skipped: cards.length - saved.length };
}

export async function deleteFlashcardSetDocument(setId: string, documentId: string, userId: string): Promise<boolean> {
	if (mongoose.connection.readyState !== 1) return false;
	const collection = mongoose.connection.collection("flashcard_set_documents");
	const document = await collection.findOne({ id: documentId, flashcardSetId: setId, userId }) as unknown as FlashcardSetDocument | null;
	if (!document) return false;
	await collection.deleteOne({ id: documentId, flashcardSetId: setId, userId });
	await mongoose.connection.collection("flashcard_quiz_cards").deleteMany({ setId, sourceDocumentId: documentId });
	await removeStoredFile(document.fileUrl);
	await refreshQuizTotals(setId);
	return true;
}

async function processDocument(document: FlashcardSetDocument, tempPath: string, userId: string): Promise<void> {
	const destination = path.join(storageRoot, "flashcard-sets", document.flashcardSetId, `${document.id}-${safeFileName(document.fileName)}`);
	try {
		await fs.mkdir(path.dirname(destination), { recursive: true });
		await fs.rename(tempPath, destination);
		const content = await extractContent(destination, document.fileName);
		const cards = parseStructuredCards(content, document.fileName) ?? await generateCardsWithAI(content, document.flashcardSetId);
		if (!cards.length) throw new Error("Không tìm thấy câu hỏi hợp lệ trong tài liệu");
		await ensureQuizSetSeeded(document.flashcardSetId);
		const collection = mongoose.connection.collection("flashcard_quiz_cards");
		const currentCount = await collection.countDocuments({ setId: document.flashcardSetId });
		await collection.insertMany(cards.map((card, index) => ({ ...card, id: `${document.id}-${index + 1}`, setId: document.flashcardSetId, type: "quiz", sourceDocumentId: document.id, position: currentCount + index + 1, total: currentCount + cards.length, createdAt: new Date() })));
		await refreshQuizTotals(document.flashcardSetId);
		await updateDocument(document.id, userId, { status: "done", cardCount: cards.length });
	} catch (error) {
		console.error(`Failed to process document ${document.id}`, error);
		await updateDocument(document.id, userId, { status: "error", error: error instanceof Error ? error.message : "Không thể xử lý tài liệu" });
	}
}

async function extractContent(filePath: string, fileName: string): Promise<string | Array<Record<string, unknown>>> {
	const extension = path.extname(fileName).toLowerCase();
	if ([".xlsx", ".xls", ".csv"].includes(extension)) {
		const workbook = XLSX.read(await fs.readFile(filePath), { type: "buffer" });
		const sheet = workbook.Sheets[workbook.SheetNames[0]];
		return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
	}
	if (extension === ".docx") {
		const mammoth = await import("mammoth");
		return (await mammoth.extractRawText({ path: filePath })).value;
	}
	if (extension === ".pdf") {
		const pdfParse = await import("pdf-parse");
		const parser = new pdfParse.PDFParse({ data: await fs.readFile(filePath) });
		const result = await parser.getText();
		await parser.destroy();
		return result.text;
	}
	if ([".txt", ".md"].includes(extension)) return fs.readFile(filePath, "utf8");
	if (extension === ".pptx") {
		const zip = await JSZip.loadAsync(await fs.readFile(filePath));
		const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
		const slides = await Promise.all(slideFiles.map(async (name, index) => {
			const xml = await zip.files[name].async("string");
			const text = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((match) => match[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")).join(" ").trim();
			return text ? `Slide ${index + 1}: ${text}` : "";
		}));
		return slides.filter(Boolean).join("\n");
	}
	throw new Error("Định dạng file không được hỗ trợ");
}

async function generateImportCards(text: string, deckTitle: string, type: "quiz" | "flip" | "both", count: number, fileName: string): Promise<ImportCard[]> {
	const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY;
	if (!apiKey) throw new Error("Chưa cấu hình AI_API_KEY hoặc OPENAI_API_KEY");
	const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
	const model = process.env.AI_MODEL ?? "gpt-4o-mini";
	const body = JSON.stringify({ model, temperature: 0.1, max_tokens: Math.min(8192, Math.max(1200, count * 260)), response_format: { type: "json_object" }, messages: [{ role: "system", content: "Chỉ dùng thông tin trong tài liệu. Trả JSON {cards:[...]}. Với flip dùng type,front,back,example; với quiz dùng type,question,options đúng 4 phần tử,correctIndex,explanation. Không bịa kiến thức ngoài tài liệu." }, { role: "user", content: `Bộ thẻ: ${deckTitle}. Loại: ${type}. Tối đa ${count} thẻ. Nguồn: ${fileName}.\n${text.slice(0, 70000)}` }] });
	let response: Response | undefined;
	let providerError = "";
	for (let attempt = 0; attempt < 3; attempt += 1) {
		try {
			response = await fetch(`${baseUrl}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(120_000), body });
			if (response.ok) break;
			providerError = await response.text();
			if (response.status !== 429 && response.status !== 500 && response.status !== 502 && response.status !== 503 && response.status !== 504) break;
		} catch (error) {
			providerError = error instanceof Error ? error.message : "Không kết nối được nhà cung cấp AI";
		}
		if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
	}
	if (!response?.ok) {
		if (response?.status === 429) throw new Error("AI đang quá tải hoặc đã hết hạn mức, vui lòng thử lại sau");
		if ([500, 502, 503, 504].includes(response?.status ?? 0)) throw new Error("Dịch vụ AI đang tạm thời bận, vui lòng thử lại");
		throw new Error(`Không thể tạo thẻ từ tài liệu${providerError ? `: ${providerError.slice(0, 180)}` : ""}`);
	}
	const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
	let parsed: unknown;
	try { parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? "{}"); } catch { throw new Error("AI trả về dữ liệu không hợp lệ"); }
	return Array.isArray((parsed as { cards?: unknown[] })?.cards) ? ((parsed as { cards: unknown[] }).cards.filter(isImportCard).slice(0, count).map((card) => ({ ...card, source: fileName }))) : [];
}

function isImportCard(value: unknown): value is ImportCard {
	if (!value || typeof value !== "object") return false;
	const card = value as Record<string, unknown>;
	if (card.type === "flip") return typeof card.front === "string" && Boolean(card.front.trim()) && typeof card.back === "string" && Boolean(card.back.trim());
	return card.type === "quiz" && typeof card.question === "string" && Boolean(card.question.trim()) && Array.isArray(card.options) && card.options.length === 4 && new Set(card.options).size === 4 && card.options.every((option) => typeof option === "string" && Boolean(option.trim())) && Number.isInteger(card.correctIndex) && Number(card.correctIndex) >= 0 && Number(card.correctIndex) <= 3;
}

async function getDeckForImport(deckId: string, userId: string) {
	if (mongoose.connection.readyState !== 1) return getQuizSet(deckId) ? { id: deckId, title: deckId, kind: "quiz" as const } : undefined;
	const deck = await mongoose.connection.collection("flashcard_decks").findOne({ id: deckId, userId });
	if (deck) return { id: deckId, title: String(deck.title ?? deckId), kind: deck.kind === "quiz" ? "quiz" as const : "language" as const };
	return getQuizSet(deckId) ? { id: deckId, title: deckId, kind: "quiz" as const } : undefined;
}

async function removeTempFile(filePath: string) {
	try { await fs.unlink(filePath); } catch { /* temporary file may already be gone */ }
}

function parseStructuredCards(content: string | Array<Record<string, unknown>>, fileName: string): GeneratedCard[] | undefined {
	if (!Array.isArray(content)) return undefined;
	const cards = content.map((row) => {
		const values = Object.entries(row).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ""), String(value ?? "").trim()] as const);
		const get = (...names: string[]) => values.find(([key]) => names.includes(key))?.[1] ?? "";
		const options: [string, string, string, string] = [get("a", "optiona", "answera"), get("b", "optionb", "answerb"), get("c", "optionc", "answerc"), get("d", "optiond", "answerd")];
		const answer = get("correctindex", "correctanswer", "answer", "dapandung");
		const correctIndex = /^[0-3]$/.test(answer) ? Number(answer) : Math.max(0, ["a", "b", "c", "d"].indexOf(answer.toLowerCase()));
		return { question: get("question", "cauhoi"), options, correctIndex, explanation: get("explanation", "giaithich") };
	}).filter((card) => card.question && card.options.every(Boolean) && card.explanation);
	return cards.length && cards.length === content.length ? cards : undefined;
}

function parseQuizWorkbook(buffer: Buffer, fileName: string): GeneratedCard[] {
	const workbook = XLSX.read(buffer, { type: "buffer" });
	const sheetName = workbook.SheetNames[0];
	if (!sheetName) throw new Error("File Excel không có sheet dữ liệu");
	const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "", blankrows: false });
	const requiredHeaders = ["STT", "Câu hỏi", "Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D", "Đáp án đúng (A/B/C/D)"];
	const optionalHeaderNames = ["Giải thích", "Giải thích (không bắt buộc)"];
	const expectedHeaders = [...requiredHeaders, optionalHeaderNames[0]];
	const headers = Array.isArray(rows[0]) ? rows[0].map((value) => String(value ?? "")) : [];
	while (headers.length && !normalizeExcelHeader(headers[headers.length - 1])) headers.pop();
	expectedHeaders.forEach((header, index) => logExcelHeader("mong đợi", index, header));
	logExcelHeader("mong đợi", requiredHeaders.length, optionalHeaderNames[1]);
	headers.forEach((header, index) => logExcelHeader("nhận được", index, header));
	const headerErrors: string[] = [];
	for (let index = 0; index < requiredHeaders.length; index += 1) {
		const received = headers[index];
		const expected = requiredHeaders[index];
		if (normalizeExcelHeader(received ?? "") !== normalizeExcelHeader(expected)) {
			headerErrors.push(`Cột ${index + 1}: nhận được "${received ?? "(thiếu)"}", mong đợi "${expected}"`);
		}
	}
	if (headers.length > requiredHeaders.length && !optionalHeaderNames.some((name) => normalizeExcelHeader(headers[requiredHeaders.length]) === normalizeExcelHeader(name))) {
		headerErrors.push(`Cột ${requiredHeaders.length + 1}: nhận được "${headers[requiredHeaders.length]}", mong đợi "${optionalHeaderNames.join('" hoặc "')}"`);
	}
	if (headers.length > requiredHeaders.length + 1) {
		for (let index = requiredHeaders.length + 1; index < headers.length; index += 1) {
			headerErrors.push(`Cột ${index + 1}: nhận được "${headers[index]}", mong đợi không có cột này`);
		}
	}
	if (headerErrors.length) throw new Error(`Tên cột hoặc thứ tự cột không đúng:\n${headerErrors.join("\n")}`);
	const cards: GeneratedCard[] = [];
	const errors: string[] = [];
	for (let index = 1; index < rows.length; index += 1) {
		const row = Array.isArray(rows[index]) ? rows[index] : [];
		const values = expectedHeaders.map((_header, column) => String(row[column] ?? "").trim());
		if (values.every((value) => !value)) continue;
		const rowNumber = index + 1;
		const question = values[1];
		const options = values.slice(2, 6);
		const correct = normalizeExcelCell(values[6]).toUpperCase();
		const explanation = values[7];
		if (!question) errors.push(`Dòng ${rowNumber}: thiếu Câu hỏi`);
		else if (question.length > 500) errors.push(`Dòng ${rowNumber}: Câu hỏi vượt quá 500 ký tự`);
		if (options.some((option) => !option)) errors.push(`Dòng ${rowNumber}: thiếu đáp án`);
		if (new Set(options.map((option) => option.toLocaleLowerCase())).size !== 4) errors.push(`Dòng ${rowNumber}: các đáp án không được trùng nhau`);
		if (!["A", "B", "C", "D"].includes(correct)) errors.push(`Dòng ${rowNumber}: Đáp án đúng phải là A, B, C hoặc D`);
		if (question && options.every(Boolean) && new Set(options.map((option) => option.toLocaleLowerCase())).size === 4 && ["A", "B", "C", "D"].includes(correct)) {
			cards.push({ question, options: options as [string, string, string, string], correctIndex: "ABCD".indexOf(correct), explanation });
		}
		if (cards.length > 1000) errors.push("File không được có quá 1000 thẻ");
	}
	if (errors.length) throw new Error(errors.join("\n"));
	if (!cards.length) throw new Error(`File "${fileName}" không có dòng dữ liệu hợp lệ`);
	return cards;
}

function normalizeExcelCell(value: string): string {
	return value.normalize("NFC").replace(/\u00A0/g, " ").trim().replace(/\s+/gu, " ");
}

function normalizeExcelHeader(value: string): string {
	return normalizeExcelCell(value).toLocaleLowerCase("vi-VN");
}

function logExcelHeader(kind: "nhận được" | "mong đợi", index: number, value: string): void {
	console.log(`[XLSX] Header ${kind} cột ${index + 1}`, {
		value,
		length: value.length,
		charCodes: Array.from(value, (character) => character.codePointAt(0)),
	});
}

async function generateCardsWithAI(content: string | Array<Record<string, unknown>>, setId: string): Promise<GeneratedCard[]> {
	const text = Array.isArray(content) ? JSON.stringify(content) : content;
	const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY;
	if (!apiKey) throw new Error("Chưa cấu hình AI_API_KEY hoặc OPENAI_API_KEY để sinh câu hỏi từ tài liệu");
	const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
	const model = process.env.AI_MODEL ?? "gpt-4o-mini";
	const response = await fetch(`${baseUrl}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(120_000), body: JSON.stringify({ model, temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Bạn là chuyên gia tạo flashcard trắc nghiệm tiếng Việt. Chỉ trả JSON dạng {cards:[{question:string,options:[string,string,string,string],correctIndex:number,explanation:string}]}. Mỗi câu có đúng 4 đáp án, correctIndex từ 0 đến 3, giải thích ngắn và chính xác." }, { role: "user", content: `Bộ môn ${setId}. Hãy tạo tối đa 30 câu hỏi từ tài liệu sau:\n${text.slice(0, 100000)}` }] }) });
	if (!response.ok) throw new Error(`AI trả về lỗi ${response.status}`);
	const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
	const parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? "{}");
	return Array.isArray(parsed.cards) ? parsed.cards.filter(isGeneratedCard).slice(0, 30) : [];
}

function isGeneratedCard(value: unknown): value is GeneratedCard {
	if (!value || typeof value !== "object") return false;
	const card = value as Record<string, unknown>;
	return typeof card.question === "string" && Array.isArray(card.options) && card.options.length === 4 && card.options.every((option) => typeof option === "string" && option.trim()) && Number.isInteger(card.correctIndex) && Number(card.correctIndex) >= 0 && Number(card.correctIndex) <= 3 && typeof card.explanation === "string";
}

async function ensureQuizSetSeeded(setId: string) {
	const set = getQuizSet(setId);
	if (!set || mongoose.connection.readyState !== 1) return;
	const collection = mongoose.connection.collection("flashcard_quiz_cards");
	if (await collection.countDocuments({ setId }) > 0) return;
	await collection.insertMany(set.cards.map((card, index) => ({ ...card, id: `${setId}-${index + 1}`, setId, type: "quiz", position: index + 1, total: set.cards.length, createdAt: new Date() })));
}

async function refreshQuizTotals(setId: string) {
	if (mongoose.connection.readyState !== 1) return;
	const collection = mongoose.connection.collection("flashcard_quiz_cards");
	const total = await collection.countDocuments({ setId });
	await collection.updateMany({ setId }, { $set: { total } });
}

async function saveDocument(document: FlashcardSetDocument & { userId: string }) {
	if (mongoose.connection.readyState === 1) await mongoose.connection.collection("flashcard_set_documents").insertOne(document);
}

async function updateDocument(id: string, userId: string, update: Partial<FlashcardSetDocument>) {
	if (mongoose.connection.readyState === 1) await mongoose.connection.collection("flashcard_set_documents").updateOne({ id, userId }, { $set: update });
}

async function removeStoredFile(fileUrl: string) {
	const relativePath = fileUrl.replace(/^\//, "");
	try { await fs.unlink(path.resolve(relativePath)); } catch { /* file may already be gone */ }
}

function safeFileName(fileName: string) { return path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_"); }
function extensionType(fileName: string) { return path.extname(fileName).toLowerCase(); }
