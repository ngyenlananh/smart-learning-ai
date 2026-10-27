import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { getAiConfig, redactAiUrl } from "../../config/ai.js";

type Difficulty = "Dễ" | "Trung bình" | "Khó";
type Question = { id: string; text: string; options: string[]; correctAnswer: number };
export type ExamSummary = { id: string; title: string; meta: string; subject: string; topic: string; difficulty: Difficulty; ai: boolean; userCreated: boolean; hidden?: boolean; questionCount: number; durationMinutes: number; attempts: number; bestScore?: number; latestScore?: number; createdAt?: string };
export type ExamDetail = ExamSummary & { questions: Question[] };
export type ExamResult = { id: string; examId: string; score: number; correctCount: number; totalQuestions: number; durationSeconds: number; submittedAt: string };
export type GenerateExamInput = { subject: string; topic: string; difficulty: string; questionCount: number; durationMinutes: number; format: string; prompt?: string };
type UploadedExamFile = { path: string; originalname: string; mimetype: string };
export type ExamStats = { practicedExams: number; averageScore: number; streakDays: number };
export type ExamAnalytics = {
	weeks: Array<{ label: string; averageScore: number | null; attempts: number }>;
	subjects: Array<{ subject: string; averageScore: number; masteryPercent: number; attempts: number; level: "Thành thạo" | "Trung bình" | "Cần cải thiện" }>;
	recommendation: string | null;
};
export class ExamGenerationError extends Error {
	code: string;
	status: number;
	constructor(code: string, message: string, status = 503) {
		super(message);
		this.name = "ExamGenerationError";
		this.code = code;
		this.status = status;
	}
}

const demoExams: (ExamSummary & { questions: Question[] })[] = [
	createDemoExam("exam-thought", "Đề ôn tập Tư tưởng Hồ Chí Minh", "Tư tưởng Hồ Chí Minh", "Cơ sở hình thành tư tưởng", "Trung bình", 30, 35, "gold"),
	createDemoExam("exam-party-history", "Đề ôn tập Lịch sử Đảng Cộng sản Việt Nam", "Lịch sử Đảng Cộng sản Việt Nam", "Các thời kỳ kháng chiến", "Khó", 40, 50, "rose"),
	createDemoExam("exam-networks", "Đề luyện tập Mạng máy tính", "Mạng máy tính", "Mô hình OSI và TCP/IP", "Trung bình", 30, 35, "gold"),
	createDemoExam("exam-database", "Đề luyện tập Cơ sở dữ liệu", "Cơ sở dữ liệu", "SQL và truy vấn", "Dễ", 30, 30, "mint"),
	createDemoExam("exam-english", "Đề luyện tập Tiếng Anh TOEIC", "Tiếng Anh TOEIC", "TOEIC tổng hợp", "Dễ", 100, 60, "mint"),
	createDemoExam("exam-ai-calculus", "Đề do AI tạo - Cơ sở dữ liệu", "Cơ sở dữ liệu", "Chuẩn hóa cơ sở dữ liệu", "Trung bình", 30, 30, "blue", true),
];
const generatedExams = new Map<string, ExamSummary & { questions: Question[] }>();
const generatedOwners = new Map<string, string>();
const localPreferences = new Map<string, { title?: string; hidden?: boolean }>();
const demoResults = new Map<string, ExamResult[]>();
const defaultAnalyticsUserId = "000000000000000000000001";

export async function listExams(userId: string, filters: { search?: string; subject?: string; difficulty?: string; aiOnly?: boolean; showHidden?: boolean }): Promise<ExamSummary[]> {
	await hydratePreferences(userId);
	if (isDatabaseReady()) {
		const records = await mongoose.connection.collection("exams").find({}).sort({ createdAt: -1 }).toArray();
		if (records.length) {
			const databaseExams = records.map((record) => applyPreference(toSummary(record, userId), userId));
			const knownIds = new Set(databaseExams.map((exam) => exam.id));
			const standardExams = demoExams.filter((exam) => !knownIds.has(exam.id)).map(({ questions: _questions, ...summary }) => applyPreference(summary, userId));
			const generated = [...generatedExams.values()]
				.filter((exam) => generatedOwners.get(exam.id) === userId)
				.map(({ questions: _questions, ...summary }) => summary);
			return enrichSummaries(userId, [...generated, ...databaseExams, ...standardExams].filter((exam) => matchesFilters(exam, filters) && (filters.showHidden || !exam.hidden)));
		}
	}
	return enrichSummaries(userId, [...generatedExams.values(), ...demoExams].map(({ questions: _questions, ...summary }) => applyPreference(summary, userId)).filter((exam) => matchesFilters(exam, filters) && (filters.showHidden || !exam.hidden)));
}

export async function getExam(userId: string, examId: string): Promise<ExamDetail | null> {
	if (isDatabaseReady() && mongoose.isValidObjectId(examId)) {
		const record = await mongoose.connection.collection("exams").findOne({ _id: toObjectId(examId) });
		if (record) return toDetail(record, userId);
	}
	const exam = [...generatedExams.values(), ...demoExams].find((item) => item.id === examId);
	if (!exam) return null;
	return { ...exam, questions: exam.questions };
}

export async function getExamStats(userId: string): Promise<ExamStats> {
	const results = isDatabaseReady() && mongoose.isValidObjectId(userId) ? await mongoose.connection.collection("results").find({ userId: toObjectId(userId), type: "exam" }).toArray() : demoResults.get(userId) ?? [];
	const scores = results.map((result) => Number(result.score)).filter(Number.isFinite);
	return { practicedExams: results.length, averageScore: scores.length ? round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0, streakDays: Number(results.length ? 1 : 0) };
}

export async function getExamAnalytics(userId: string): Promise<ExamAnalytics> {
	const databaseUserId = userId === "demo-user" ? defaultAnalyticsUserId : userId;
	const [results, subjectByExamId] = await Promise.all([
		isDatabaseReady() && mongoose.isValidObjectId(databaseUserId) ? mongoose.connection.collection("results").find({ userId: toObjectId(databaseUserId), type: "exam" }).toArray() : Promise.resolve(demoResults.get(userId) ?? demoResults.get(databaseUserId) ?? []),
		getExamSubjects(),
	]);
	const now = new Date();
	const currentWeekStart = startOfWeek(now);
	const weeks = Array.from({ length: 8 }, (_, index) => {
		const weekStart = new Date(currentWeekStart);
		weekStart.setDate(currentWeekStart.getDate() - (7 - index) * 7);
		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekStart.getDate() + 7);
		const attempts = results.filter((result) => {
			const submittedAt = resultDate(result);
			return submittedAt !== null && submittedAt >= weekStart && submittedAt < weekEnd;
		});
		const scores = attempts.map((result) => Number(result.score)).filter(Number.isFinite);
		return { label: `T${index + 1}`, averageScore: scores.length ? round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null, attempts: attempts.length };
	});
	const subjectResults = new Map<string, number[]>();
	for (const result of results) {
		const subject = subjectByExamId.get(String(result.examId));
		const score = Number(result.score);
		if (!subject || !Number.isFinite(score)) continue;
		const scores = subjectResults.get(subject) ?? [];
		scores.push(score);
		subjectResults.set(subject, scores);
	}
	const subjects = [...subjectResults.entries()].map(([subject, scores]) => {
		const averageScore = round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
		const masteryPercent = round(averageScore * 10);
		return { subject, averageScore, masteryPercent, attempts: scores.length, level: masteryPercent >= 80 ? "Thành thạo" as const : masteryPercent >= 60 ? "Trung bình" as const : "Cần cải thiện" as const };
	}).sort((left, right) => right.masteryPercent - left.masteryPercent);
	const weakest = [...subjects].sort((left, right) => left.masteryPercent - right.masteryPercent)[0];
	return { weeks, subjects, recommendation: weakest && weakest.masteryPercent < 80 ? `Tập trung 60% thời gian vào ${weakest.subject} để cân bằng năng lực.` : null };
}

export async function submitExam(userId: string, examId: string, answers: Record<string, number>, durationSeconds: number): Promise<ExamResult | null> {
	let exam: (ExamSummary & { questions: Question[] }) | null = null;
	if (isDatabaseReady() && mongoose.isValidObjectId(examId)) {
		const record = await mongoose.connection.collection("exams").findOne({ _id: toObjectId(examId) });
		if (record) {
			const detail = toDetail(record, userId);
			exam = { ...detail, questions: detail.questions };
		}
	}
	exam ??= [...generatedExams.values(), ...demoExams].find((item) => item.id === examId) ?? null;
	if (!exam) return null;
	const correctCount = exam.questions.reduce((count, question) => count + (answers[question.id] === question.correctAnswer ? 1 : 0), 0);
	const result: ExamResult = { id: new mongoose.Types.ObjectId().toString(), examId, score: round(correctCount / exam.questions.length * 10), correctCount, totalQuestions: exam.questions.length, durationSeconds: Math.max(0, Number(durationSeconds) || 0), submittedAt: new Date().toISOString() };
	if (isDatabaseReady() && mongoose.isValidObjectId(userId)) {
		await mongoose.connection.collection("results").insertOne({ ...result, _id: toObjectId(result.id), userId: toObjectId(userId), type: "exam" });
	} else {
		const results = demoResults.get(userId) ?? [];
		results.push(result);
		demoResults.set(userId, results);
	}
	return result;
}

export async function generateExam(userId: string, input: GenerateExamInput, file?: UploadedExamFile): Promise<ExamDetail> {
	const questionCount = clampInt(input.questionCount, 10, 100);
	const durationMinutes = clampInt(input.durationMinutes, 10, 180);
	const difficulty = normalizeDifficulty(input.difficulty);
	const subject = repairExamText(input.subject);
	const topic = repairExamText(input.topic || input.subject);
	const examId = isDatabaseReady() ? new mongoose.Types.ObjectId().toString() : `generated-${Date.now()}`;
	const questions = file
		? await generateQuestionsFromDocument(file, examId, subject, topic, questionCount, input.prompt)
		: await generateQuestionsFromPrompt(examId, subject, topic, questionCount, difficulty, input.format, input.prompt);
	const createdAt = new Date();
	const summary: ExamSummary = { id: examId, title: `Đề do AI tạo - ${topic}`, meta: `${subject} · ${questionCount} câu · ${durationMinutes} phút`, subject, topic, difficulty, ai: true, userCreated: true, questionCount, durationMinutes, attempts: 0, createdAt: createdAt.toISOString() };
	const exam = { ...summary, questions };
	if (isDatabaseReady() && mongoose.isValidObjectId(userId)) await mongoose.connection.collection("exams").insertOne({ ...summary, _id: toObjectId(examId), questions, createdBy: toObjectId(userId), prompt: input.prompt, format: input.format, sourceFileName: file?.originalname, createdAt });
	else {
		generatedExams.set(examId, exam);
		generatedOwners.set(examId, userId);
	}
	return { ...summary, questions };
}

export async function renameExam(userId: string, examId: string, title: string): Promise<boolean> {
	const nextTitle = title.trim();
	if (!nextTitle) return false;
	if (isDatabaseReady() && mongoose.isValidObjectId(examId) && mongoose.isValidObjectId(userId)) {
		const record = await mongoose.connection.collection("exams").findOne({ _id: toObjectId(examId) });
		if (!record) return false;
		if (record.createdBy && String(record.createdBy) === userId) {
			const result = await mongoose.connection.collection("exams").updateOne({ _id: toObjectId(examId), createdBy: toObjectId(userId) }, { $set: { title: nextTitle } });
			return result.matchedCount > 0;
		}
		await savePreference(userId, examId, { title: nextTitle });
		return true;
	}
	const exam = generatedExams.get(examId);
	if (exam) {
		if (generatedOwners.get(examId) !== userId) return false;
		exam.title = nextTitle;
		return true;
	}
	if (demoExams.some((item) => item.id === examId)) {
		await savePreference(userId, examId, { title: nextTitle });
		return true;
	}
	return false;
}

export async function deleteExam(userId: string, examId: string): Promise<boolean> {
	if (isDatabaseReady() && mongoose.isValidObjectId(examId) && mongoose.isValidObjectId(userId)) {
		const record = await mongoose.connection.collection("exams").findOne({ _id: toObjectId(examId) });
		if (record && !record.createdBy && record.ai) {
			await savePreference(userId, examId, { hidden: true });
			return true;
		}
		const result = await mongoose.connection.collection("exams").deleteOne({ _id: toObjectId(examId), createdBy: toObjectId(userId) });
		if (result.deletedCount > 0) {
			await mongoose.connection.collection("results").deleteMany({ examId, userId: toObjectId(userId), type: "exam" });
			return true;
		}
		if (demoExams.some((item) => item.id === examId && item.ai)) {
			await savePreference(userId, examId, { hidden: true });
			return true;
		}
		return false;
	}
	if (demoExams.some((item) => item.id === examId && item.ai)) {
		await savePreference(userId, examId, { hidden: true });
		return true;
	}
	if (generatedOwners.get(examId) !== userId) return false;
	generatedOwners.delete(examId);
	return generatedExams.delete(examId);
}

export async function listSampleExams(): Promise<ExamSummary[]> {
	const matches: ExamSummary[] = [];
	if (isDatabaseReady()) {
		const records = await mongoose.connection.collection("exams").find({
			$or: [
				{ "questions.text": { $regex: "nội dung nào sau đây là chính xác", $options: "i" } },
				{ "questions.options": { $regex: "Khẳng định [A-D]", $options: "i" } },
				{ "questions.options": { $regex: "Phương án [A-D]", $options: "i" } },
			],
		}).toArray();
		matches.push(...records.map((record) => toSummary(record, String(record.createdBy ?? ""))));
	}
	matches.push(...[...generatedExams.values()].filter((exam) => exam.questions.some((question) => isSampleQuestion(question))).map(({ questions: _questions, ...summary }) => summary));
	return matches;
}

export async function deleteSampleExams(confirmed: boolean): Promise<number> {
	if (!confirmed) throw new ExamGenerationError("CONFIRMATION_REQUIRED", "Phải xác nhận trước khi xóa đề mẫu.", 400);
	let deleted = 0;
	if (isDatabaseReady()) {
		const result = await mongoose.connection.collection("exams").deleteMany({
			$or: [
				{ "questions.text": { $regex: "nội dung nào sau đây là chính xác", $options: "i" } },
				{ "questions.options": { $regex: "Khẳng định [A-D]", $options: "i" } },
				{ "questions.options": { $regex: "Phương án [A-D]", $options: "i" } },
			],
		});
		deleted += result.deletedCount;
	}
	for (const [examId, exam] of generatedExams) {
		if (exam.questions.some((question) => isSampleQuestion(question))) {
			generatedExams.delete(examId);
			generatedOwners.delete(examId);
			deleted += 1;
		}
	}
	return deleted;
}

export async function setExamHidden(userId: string, examId: string, hidden: boolean): Promise<boolean> {
	if (isDatabaseReady() && mongoose.isValidObjectId(examId) && mongoose.isValidObjectId(userId)) {
		const record = await mongoose.connection.collection("exams").findOne({ _id: toObjectId(examId) });
		if (record?.createdBy) return false;
		if (!record) return false;
		await savePreference(userId, examId, { hidden });
		return true;
	}
	if (!demoExams.some((item) => item.id === examId)) return false;
	await savePreference(userId, examId, { hidden });
	return true;
}

async function generateQuestionsFromDocument(file: UploadedExamFile, examId: string, subject: string, topic: string, count: number, prompt?: string): Promise<Question[]> {
	try {
		const text = await extractExamText(file.path, file.originalname);
		if (!text.trim()) throw new ExamGenerationError("EMPTY_DOCUMENT", "Tài liệu không có nội dung để tạo câu hỏi.", 400);
		return await generateQuestionsWithAi(examId, subject, topic, count, `Tài liệu tham khảo:\n${text.slice(0, 40000)}\nYêu cầu thêm: ${prompt ?? "Không có"}`);
	} finally {
		await removeUploadedFile(file.path);
	}
}

async function generateQuestionsFromPrompt(examId: string, subject: string, topic: string, count: number, difficulty: Difficulty, format: string, prompt?: string): Promise<Question[]> {
	return generateQuestionsWithAi(
		examId,
		subject,
		topic,
		count,
		`Độ khó: ${difficulty}\nHình thức: ${format}\nYêu cầu thêm: ${prompt ?? "Không có"}`,
	);
}

async function generateQuestionsWithAi(examId: string, subject: string, topic: string, count: number, context: string): Promise<Question[]> {
	const ai = getAiConfig();
	const systemPrompt = "Bạn là chuyên gia tạo đề trắc nghiệm. Chỉ trả JSON dạng {questions:[{text:string,options:[string,string,string,string],correctAnswer:number}]}. Tạo câu hỏi thật, không dùng nội dung mẫu, không dùng các đáp án như Khẳng định A/B/C/D hoặc Phương án A/B/C/D. Mỗi câu có đúng 4 đáp án khác nhau và correctAnswer từ 0 đến 3.";
	const userPrompt = `Môn: ${subject}\nChủ đề: ${topic}\nSố câu: ${count}\n${context}\nNếu chủ đề là danh sách từ hoặc tài liệu ngắn, hãy tạo câu hỏi chọn nghĩa đúng hoặc điền từ vào ngữ cảnh cụ thể.`;
	const { payload } = await requestExamModelConfigured({ ...ai, systemPrompt, userPrompt });
	const content = ai.isNativeGemini ? payload.candidates?.[0]?.content?.parts?.[0]?.text : payload.choices?.[0]?.message?.content;
	let parsed: { questions?: unknown[] };
	try {
		parsed = JSON.parse(content ?? "{}") as { questions?: unknown[] };
	} catch {
		throw new ExamGenerationError("INVALID_AI_JSON", "AI trả về dữ liệu không đúng định dạng.", 502);
	}
	const questions = Array.isArray(parsed.questions) ? parsed.questions.map((item, index) => {
		const value = item as Record<string, unknown>;
		return {
			id: `${examId}-q-${index + 1}`,
			text: String(value.text ?? "").trim(),
			options: Array.isArray(value.options) ? value.options.map(String).map((option) => option.trim()) : [],
			correctAnswer: Number(value.correctAnswer),
		};
	}).filter(isValidQuestion).slice(0, count) : [];
	if (questions.length < Math.ceil(count / 2)) {
		throw new ExamGenerationError("INVALID_AI_QUESTIONS", `AI chỉ tạo được ${questions.length}/${count} câu hợp lệ, không đủ để lưu đề.`, 502);
	}
	return questions;
}

function isValidQuestion(question: Question): boolean {
	const normalized = `${question.text} ${question.options.join(" ")}`.toLocaleLowerCase("vi-VN");
	const samplePattern = /(khẳng định|phương án)\s*[a-d]\b|nội dung nào sau đây là chính xác/i;
	return Boolean(
		question.text &&
		question.options.length === 4 &&
		new Set(question.options.map((option) => option.toLocaleLowerCase("vi-VN"))).size === 4 &&
		question.options.every(Boolean) &&
		Number.isInteger(question.correctAnswer) &&
		question.correctAnswer >= 0 &&
		question.correctAnswer < 4 &&
		!samplePattern.test(normalized),
	);
}

async function extractExamText(filePath: string, fileName: string): Promise<string> {
	const extension = path.extname(fileName).toLowerCase();
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
	throw new Error("Chỉ hỗ trợ PDF hoặc DOCX");
}

async function removeUploadedFile(filePath: string): Promise<void> {
	try { await fs.unlink(filePath); } catch { /* temporary upload may already be removed */ }
}

type ModelPayload = { choices?: Array<{ message?: { content?: string } }>; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
const retryableProviderStatuses = new Set([500, 503]);

async function requestExamModelConfigured(options: { apiKey: string; baseUrl: string; model: string; fallbackModel: string; isNativeGemini: boolean; systemPrompt: string; userPrompt: string }): Promise<{ payload: ModelPayload; model: string }> {
	let requestAttempts = 0;
	for (const model of [options.model, options.fallbackModel]) {
		for (let attempt = 0; attempt < 2; attempt += 1) {
			if (requestAttempts >= 3) break;
			requestAttempts += 1;
			const url = options.isNativeGemini
				? `${options.baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(options.apiKey)}`
				: `${options.baseUrl}/chat/completions`;
			const body = options.isNativeGemini
				? { systemInstruction: { parts: [{ text: options.systemPrompt }] }, contents: [{ role: "user", parts: [{ text: options.userPrompt }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } }
				: { model, temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "system", content: options.systemPrompt }, { role: "user", content: options.userPrompt }] };
			let response: Response;
			try {
				response = await fetch(url, {
					method: "POST",
					headers: { "Content-Type": "application/json", ...(options.isNativeGemini ? {} : { Authorization: "Bearer " + options.apiKey }) },
					signal: AbortSignal.timeout(45_000),
					body: JSON.stringify(body),
				});
			} catch (error) {
				console.error(`[AI exams] provider request failed url=${redactAiUrl(url)} model=${model} attempt=${attempt + 1}`, error);
				if (attempt < 1) await new Promise((resolve) => setTimeout(resolve, 750));
				continue;
			}
			const responseBody = await response.text();
			console.error(`[AI exams] provider response url=${redactAiUrl(url)} model=${model} attempt=${attempt + 1} status=${response.status} body=${responseBody}`);
			if (response.ok) {
				try {
					return { payload: JSON.parse(responseBody) as ModelPayload, model };
				} catch {
					throw new Error("AI trả về JSON không hợp lệ");
				}
			}
			if (response.status === 429) {
				throw new ExamGenerationError("AI_QUOTA_EXCEEDED", "AI đã hết hạn mức hoặc đang bị giới hạn truy cập. Vui lòng kiểm tra quota/billing của API key rồi thử lại.", 429);
			}
			if (!retryableProviderStatuses.has(response.status)) {
				if ([400, 404].includes(response.status) && model !== options.fallbackModel) {
					console.warn(`[AI exams] model ${model} rejected the request (HTTP ${response.status}); trying fallback model ${options.fallbackModel}`);
					break;
				}
				if ([400, 401, 403, 404].includes(response.status)) {
					throw new Error(`Cấu hình AI không hợp lệ (HTTP ${response.status}). Kiểm tra AI_BASE_URL và AI_MODEL trong biến môi trường.`);
				}
				throw new Error(`Nhà cung cấp AI từ chối yêu cầu (HTTP ${response.status})`);
			}
			if (attempt < 1) await new Promise((resolve) => setTimeout(resolve, 750));
		}
	}
	throw new ExamGenerationError("AI_UNAVAILABLE", "AI đang quá tải hoặc hết hạn mức, vui lòng thử lại sau.", 503);
}

/* legacy request implementation removed; configured request above is the only provider path */
/*
			const url = options.isNativeGemini
				? `${options.baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(options.apiKey)}`
				: `${options.baseUrl}/chat/completions`;
			const body = options.isNativeGemini
				? { systemInstruction: { parts: [{ text: options.systemPrompt }] }, contents: [{ role: "user", parts: [{ text: options.userPrompt }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } }
				: { model, temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "system", content: options.systemPrompt }, { role: "user", content: options.userPrompt }] };
			try {
				const response = await fetch(url, {
					method: "POST",
					headers: { "Content-Type": "application/json", ...(options.isNativeGemini ? {} : { Authorization: `Bearer ${options.apiKey}` }) },
					signal: AbortSignal.timeout(120_000),
					body: JSON.stringify(body),
				});
				const responseBody = await response.text();
				console.error(`[AI exams] provider response model=${model} attempt=${attempt + 1} status=${response.status} body=${responseBody}`);
				if (response.ok) {
					try {
						return { payload: JSON.parse(responseBody) as ModelPayload, model };
					} catch {
						throw new Error("AI trả về JSON không hợp lệ");
					}
				}
				lastStatus = response.status;
				if (![429, 500, 502, 503, 504].includes(response.status)) break;
			} catch (error) {
				console.error(`[AI exams] provider request failed model=${model} attempt=${attempt + 1}`, error);
				lastStatus = 503;
			}
			if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
		}
	}
	if (lastStatus === 429 || [500, 502, 503, 504].includes(lastStatus)) throw new Error("AI đang quá tải, vui lòng thử lại sau ít phút");
	throw new Error(`AI không thể xử lý yêu cầu (mã ${lastStatus || "không xác định"})`);
}

*/

async function enrichSummaries(userId: string, summaries: ExamSummary[]): Promise<ExamSummary[]> {
	const results = isDatabaseReady() && mongoose.isValidObjectId(userId) ? await mongoose.connection.collection("results").find({ userId: toObjectId(userId), type: "exam" }).toArray() : demoResults.get(userId) ?? [];
	return summaries.map((exam) => { const attempts = results.filter((result) => String(result.examId) === exam.id); const scores = attempts.map((result) => Number(result.score)).filter(Number.isFinite); const latest = attempts.reduce<(typeof attempts)[number] | null>((current, result) => !current || new Date(result.submittedAt).getTime() > new Date(current.submittedAt).getTime() ? result : current, null); return { ...exam, attempts: attempts.length, bestScore: scores.length ? Math.max(...scores) : undefined, latestScore: latest ? Number(latest.score) : undefined }; });
}

async function getExamSubjects(): Promise<Map<string, string>> {
	const subjects = new Map([...demoExams, ...generatedExams.values()].map((exam) => [exam.id, exam.subject]));
	if (!isDatabaseReady()) return subjects;
	const records = await mongoose.connection.collection("exams").find({}, { projection: { _id: 1, subject: 1 } }).toArray();
	for (const record of records) {
		if (record.subject) subjects.set(String(record._id), repairExamText(String(record.subject)));
	}
	return subjects;
}

function startOfWeek(date: Date): Date {
	const start = new Date(date);
	start.setHours(0, 0, 0, 0);
	start.setDate(start.getDate() - (start.getDay() + 6) % 7);
	return start;
}

function resultDate(result: Record<string, unknown>): Date | null {
	const value = result.submittedAt ?? result.createdAt;
	if (!value) return null;
	const date = new Date(String(value));
	return Number.isNaN(date.getTime()) ? null : date;
}

function matchesFilters(exam: ExamSummary, filters: { search?: string; subject?: string; difficulty?: string; aiOnly?: boolean; showHidden?: boolean }): boolean {
	const query = (filters.search ?? "").trim().toLocaleLowerCase("vi-VN");
	return (!query || `${exam.title} ${exam.subject} ${exam.topic}`.toLocaleLowerCase("vi-VN").includes(query)) && (!filters.subject || filters.subject === "Tất cả môn" || exam.subject === filters.subject) && (!filters.difficulty || filters.difficulty === "Tất cả" || exam.difficulty === filters.difficulty) && (!filters.aiOnly || exam.ai);
}

function toSummary(record: Record<string, unknown>, userId: string): ExamSummary {
	const createdAt = record.createdAt instanceof Date ? record.createdAt.toISOString() : typeof record.createdAt === "string" ? record.createdAt : undefined;
	return { id: String(record._id), title: repairExamText(String(record.title)), meta: repairExamText(String(record.meta)).replace(/\s*·\s*vừa tạo\s*$/, ""), subject: repairExamText(String(record.subject)), topic: repairExamText(String(record.topic)), difficulty: normalizeDifficulty(String(record.difficulty)), ai: Boolean(record.ai), userCreated: Boolean(record.createdBy && String(record.createdBy) === userId), questionCount: Number(record.questionCount ?? 0), durationMinutes: Number(record.durationMinutes ?? 0), attempts: 0, createdAt };
}
function applyPreference(summary: ExamSummary, userId: string): ExamSummary {
	const preference = localPreferences.get(`${userId}:${summary.id}`);
	return preference ? { ...summary, title: preference.title ?? summary.title, hidden: preference.hidden } : summary;
}
async function savePreference(userId: string, examId: string, update: { title?: string; hidden?: boolean }): Promise<void> {
	const key = `${userId}:${examId}`;
	const current = localPreferences.get(key) ?? {};
	localPreferences.set(key, { ...current, ...update });
	if (isDatabaseReady() && mongoose.isValidObjectId(userId)) {
		await mongoose.connection.collection("examPreferences").updateOne({ userId: toObjectId(userId), examId }, { $set: { ...current, ...update, userId: toObjectId(userId), examId, updatedAt: new Date() } }, { upsert: true });
	}
}
async function hydratePreferences(userId: string): Promise<void> {
	if (!isDatabaseReady() || !mongoose.isValidObjectId(userId)) return;
	const records = await mongoose.connection.collection("examPreferences").find({ userId: toObjectId(userId) }).toArray();
	for (const record of records) localPreferences.set(`${userId}:${String(record.examId)}`, { title: typeof record.title === "string" ? record.title : undefined, hidden: record.hidden === true });
}
function toDetail(record: Record<string, unknown>, userId: string): ExamDetail {
	const summary = toSummary(record, userId);
	const storedQuestions = toQuestions(record.questions);
	return { ...summary, questions: storedQuestions };
}
function toQuestions(value: unknown): Question[] { return Array.isArray(value) ? value.map((item) => { const question = item as Record<string, unknown>; return { id: String(question.id), text: String(question.text), options: Array.isArray(question.options) ? question.options.map(String) : [], correctAnswer: Number(question.correctAnswer ?? 0) }; }) : []; }
function createDemoExam(id: string, title: string, subject: string, topic: string, difficulty: Difficulty, questionCount: number, durationMinutes: number, _tone: string, ai = false): ExamSummary & { questions: Question[] } { return { id, title, meta: `${subject} · ${questionCount} câu · ${durationMinutes} phút`, subject, topic, difficulty, ai, userCreated: false, questionCount, durationMinutes, attempts: 0, questions: buildQuestions(id, subject, topic, questionCount) }; }
function buildQuestions(examId: string, subject: string, topic: string, count: number): Question[] {
	const banks: Record<string, Array<[string, string[], number]>> = {
		"Tư tưởng Hồ Chí Minh": [["Nguyễn Ái Quốc đọc bản Sơ thảo lần thứ nhất những luận cương về vấn đề dân tộc và thuộc địa vào năm nào?", ["1911", "1917", "1920", "1930"], 2], ["Tư tưởng Hồ Chí Minh lấy vấn đề nào làm mục tiêu hàng đầu?", ["Độc lập dân tộc", "Phát triển kinh tế", "Cải cách giáo dục", "Mở rộng lãnh thổ"], 0], ["Theo Hồ Chí Minh, cách mạng giải phóng dân tộc muốn thắng lợi phải đi theo con đường nào?", ["Cách mạng vô sản", "Cải lương", "Quân chủ lập hiến", "Trung lập"], 0]],
		"Lịch sử Đảng Cộng sản Việt Nam": [["Đảng Cộng sản Việt Nam ra đời vào thời gian nào?", ["3/2/1930", "19/5/1941", "2/9/1945", "30/4/1975"], 0], ["Cách mạng Tháng Tám năm 1945 đã giành chính quyền từ lực lượng nào?", ["Thực dân Pháp", "Phát xít Nhật và tay sai", "Đế quốc Mỹ", "Quân Anh"], 1], ["Chiến thắng Điện Biên Phủ diễn ra vào năm nào?", ["1945", "1950", "1954", "1975"], 2]],
		"Mạng máy tính": [["Tầng nào trong mô hình OSI chịu trách nhiệm định tuyến gói tin?", ["Tầng Vật lý", "Tầng Liên kết dữ liệu", "Tầng Mạng", "Tầng Ứng dụng"], 2], ["Giao thức nào thường được dùng để cấp phát địa chỉ IP tự động?", ["DNS", "DHCP", "HTTP", "FTP"], 1], ["Địa chỉ IPv4 có độ dài bao nhiêu bit?", ["16 bit", "32 bit", "64 bit", "128 bit"], 1]],
		"Cơ sở dữ liệu": [["Khóa chính trong một bảng dùng để làm gì?", ["Xác định duy nhất mỗi bản ghi", "Lưu tệp đính kèm", "Mã hóa mật khẩu", "Tạo giao diện"], 0], ["Câu lệnh SQL nào dùng để truy vấn dữ liệu?", ["SELECT", "INSERT", "UPDATE", "DELETE"], 0], ["Chuẩn hóa cơ sở dữ liệu giúp giảm vấn đề nào?", ["Dư thừa và bất nhất dữ liệu", "Tốc độ CPU", "Dung lượng màn hình", "Băng thông mạng"], 0]],
		"Tiếng Anh TOEIC": [
    ["Choose the correct synonym for 'implement': The company plans to implement a new policy next month.", ["cancel", "execute", "delay", "reject"], 1],
    ["Choose the word that best fits the blank: She is looking forward to ____ her new colleagues.", ["meet", "meeting", "met", "meets"], 1],
    ["Identify the correct sentence:", ["Neither he nor I am responsible.", "Neither he nor I are responsible.", "Neither he nor I is responsible.", "Neither he nor I be responsible."], 0],
    ["Choose the correct meaning of the idiom 'under the weather':", ["feeling sick", "extremely happy", "very busy", "confused"], 0],
    ["Choose the correct preposition: He has been working for this company ____ 2018.", ["for", "since", "during", "in"], 1],
    ["Choose the correct word: The results of the survey were strictly ____.", ["confidential", "confidence", "confident", "confidentially"], 0],
    ["What is the opposite of 'expand'?", ["increase", "shrink", "extend", "grow"], 1],
    ["Choose the correct conditional form: If I ____ enough money, I would buy that car.", ["have", "had", "will have", "would have"], 1],
    ["Choose the correct response: 'Would you mind turning down the music?' - '____'", ["Yes, I would.", "Not at all. I'll do it right now.", "Thank you very much.", "Yes, please."], 1],
    ["Choose the correct passive voice: 'They are constructing a new bridge.'", ["A new bridge was constructed.", "A new bridge is being constructed.", "A new bridge has been constructed.", "A new bridge is constructed."], 1]
],
	};
	const bankSubject = subject.includes("TOEIC") || subject.includes("Ti?ng Anh") ? "Ngôn ngữ" : subject;
	const bank = banks[bankSubject] ?? [[`${topic}: nội dung nào sau đây là chính xác?`, ["Khẳng định A", "Khẳng định B", "Khẳng định C", "Khẳng định D"], 0]];
	return Array.from({ length: count }, (_, index) => { const [text, options, correctAnswer] = bank[index % bank.length]; return { id: `${examId}-q-${index + 1}`, text, options, correctAnswer }; });
}
function hasPlaceholderQuestions(questions: Question[]): boolean { return questions.some((question) => question.text.includes("câu hỏi luyện tập số") || question.options.some((option) => option.startsWith("Phương án "))); }
function isSampleQuestion(question: Question): boolean {
	return /(khẳng định|phương án)\s*[a-d]\b|nội dung nào sau đây là chính xác/i.test(`${question.text} ${question.options.join(" ")}`);
}
function normalizeDifficulty(value: string): Difficulty { return value === "Dễ" || value === "Khó" ? value : "Trung bình"; }
function repairExamText(value: string): string {
	return value
		.replaceAll("Ti?ng Anh TOEIC", "Ngôn ngữ")
		.replaceAll("TOEIC t?ng h?p", "TOEIC tổng hợp")
		.replaceAll("Đề do AI tạo - TOEIC t?ng h?p", "Đề do AI tạo - TOEIC tổng hợp");
}
function clampInt(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, Math.round(Number(value) || min))); }
function round(value: number): number { return Math.round(value * 10) / 10; }
function isDatabaseReady(): boolean { return mongoose.connection.readyState === 1; }
function toObjectId(value: string): mongoose.Types.ObjectId { return new mongoose.Types.ObjectId(value); }
