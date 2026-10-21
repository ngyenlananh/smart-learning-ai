import mongoose from "mongoose";

export type ChatRole = "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

type ChatInput = {
	message: string;
	history?: ChatMessage[];
	context?: string;
	conversationId?: string;
};

export type ConversationSummary = { id: string; title: string; updatedAt: Date };
export type ConversationMessage = { role: ChatRole; content: string; createdAt: Date };

const systemPrompt = `Bạn là SmartEdu AI Tutor, một trợ lý gia sư AI thân thiện và kiên nhẫn.
Trả lời bằng tiếng Việt nếu người học dùng tiếng Việt; nếu họ dùng ngôn ngữ khác, trả lời bằng ngôn ngữ đó.
Trả lời ngắn gọn, dễ hiểu, đi thẳng vào câu hỏi. Khi phù hợp, trình bày từng bước và luôn thêm một ví dụ minh họa ngắn.
Ưu tiên giúp người học tự hiểu thay vì chỉ đưa đáp án. Nếu thiếu dữ kiện, hỏi lại rõ ràng. Không bịa thông tin; hãy nói thẳng khi không chắc chắn.`;

export async function answerChat(userId: string, input: ChatInput): Promise<{ answer: string; provider: string; conversationId?: string }> {
	const message = input.message.trim();
	if (!message) throw new Error("Câu hỏi không được để trống");

	console.log(`[AI chat] start user=${userId} conversation=${input.conversationId ?? "new"}`);
	const conversationId = await resolveConversation(userId, input.conversationId, message);
	console.log(`[AI chat] conversation ready id=${conversationId ?? "none"}`);
	const history = (input.history ?? []).filter((item) => (item.role === "user" || item.role === "assistant") && item.content.trim()).slice(-12);
	console.log(`[AI chat] requesting model conversation=${conversationId ?? "none"} history=${history.length}`);
	const result = await requestModel(message, history, input.context?.trim());
	console.log(`[AI chat] model complete conversation=${conversationId ?? "none"} provider=${result.provider}`);
	await saveChatLog(userId, conversationId, message, result.text);
	console.log(`[AI chat] log saved conversation=${conversationId ?? "none"}`);
	return { answer: result.text, provider: result.provider, ...(conversationId ? { conversationId } : {}) };
}

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
	if (mongoose.connection.readyState !== 1) return [];
	const conversations = await mongoose.connection.collection("conversations").find({ userId }).sort({ updatedAt: -1 }).toArray();
	const logs = mongoose.connection.collection("ai_logs");
	const uniqueTitles = new Set<string>();
	const summaries: ConversationSummary[] = [];
	for (const conversation of conversations) {
		const conversationId = conversation._id.toString();
		const firstLog = await logs.findOne({ userId, conversationId }, { sort: { createdAt: 1 } });
		const firstMessage = typeof firstLog?.message === "string" ? firstLog.message.trim() : "";
		const title = repairLegacyTitle(Array.from(firstMessage || String(conversation.title ?? "Cuộc trò chuyện mới")).slice(0, 40).join(""));
		if (uniqueTitles.has(title)) continue;
		uniqueTitles.add(title);
		if (conversation.title !== title) {
			await mongoose.connection.collection("conversations").updateOne({ _id: conversation._id, userId }, { $set: { title } });
		}
		summaries.push({
			id: conversationId,
			title,
			updatedAt: conversation.updatedAt instanceof Date ? conversation.updatedAt : new Date(conversation.updatedAt),
		});
	}
	return summaries;
}

function repairLegacyTitle(title: string): string {
	return title.replaceAll("Xin ch�o", "Xin chào");
}

export async function getConversationMessages(userId: string, conversationId: string): Promise<ConversationMessage[]> {
	if (mongoose.connection.readyState !== 1 || !mongoose.Types.ObjectId.isValid(conversationId)) return [];
	const id = new mongoose.Types.ObjectId(conversationId);
	const conversation = await mongoose.connection.collection("conversations").findOne({ _id: id, userId });
	if (!conversation) throw new Error("Không tìm thấy cuộc trò chuyện");
	const logs = await mongoose.connection.collection("ai_logs").find({ userId, conversationId }).sort({ createdAt: 1 }).toArray();
	return logs.flatMap((log) => [
		{ role: "user" as const, content: String(log.message ?? ""), createdAt: log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt) },
		{ role: "assistant" as const, content: String(log.aiResponse ?? ""), createdAt: log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt) },
	]);
}

async function resolveConversation(userId: string, conversationId: string | undefined, message: string): Promise<string | undefined> {
	if (mongoose.connection.readyState !== 1) {
		console.warn(`[AI chat] MongoDB unavailable; using conversation=${conversationId ?? "none"}`);
		return conversationId;
	}
	const collection = mongoose.connection.collection("conversations");
	if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
		const existing = await collection.findOne({ _id: new mongoose.Types.ObjectId(conversationId), userId });
		if (existing) {
			console.log(`[AI chat] reusing conversation=${conversationId}`);
			return conversationId;
		}
		throw new Error("Không tìm thấy cuộc trò chuyện");
	}
	if (conversationId) throw new Error("conversationId không hợp lệ");
	const now = new Date();
	const title = Array.from(message).slice(0, 40).join("");
	console.log(`[AI chat] creating conversation user=${userId}`);
	const created = await collection.insertOne({ userId, title, createdAt: now, updatedAt: now });
	return created.insertedId.toString();
}

async function requestModel(message: string, history: ChatMessage[], context?: string): Promise<{ text: string; provider: string }> {
	const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY;
	const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
	const configuredModel = process.env.AI_MODEL ?? "gpt-4o-mini";
	const model = configuredModel === "gemini-2.5-flash" ? "gemini-3.6-flash" : configuredModel;
	if (!apiKey) return { text: fallbackAnswer(message), provider: "fallback" };

	const response = await fetch(`${baseUrl}/chat/completions`, {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
		signal: AbortSignal.timeout(120_000),
		body: JSON.stringify({
			model,
			temperature: 0.4,
			messages: [
				{ role: "system", content: context ? `${systemPrompt}\n\nNgữ cảnh bài học hiện tại:\n${context}` : systemPrompt },
				...history.map((item) => ({ role: item.role, content: item.content })),
				{ role: "user", content: message },
			],
		}),
	});
	if (!response.ok) {
		const details = await response.text();
		console.error(`[AI chat] provider error status=${response.status} model=${model}: ${details.slice(0, 500)}`);
		if (response.status === 429) {
			return { text: fallbackAnswer(message, "Gemini đã hết quota hiện tại"), provider: "fallback-quota" };
		}
		throw new Error(`AI provider returned ${response.status}: ${details.slice(0, 300)}`);
	}
	const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
	const text = payload.choices?.[0]?.message?.content?.trim();
	if (!text) throw new Error("AI provider returned an empty answer");
	return { text, provider: model };
}

function fallbackAnswer(message: string, reason = "backend chưa có AI_API_KEY"): string {
	const normalized = message.toLocaleLowerCase("vi-VN");
	const searchText = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
	if (normalized.includes("đổi cơ số") || normalized.includes("logarit")) {
		return "Công thức đổi cơ số là log_a(b) = log_c(b) / log_c(a), với c > 0, c khác 1. Ví dụ: log_2(8) = log_10(8) / log_10(2) = 3. Bạn có thể gửi bài cụ thể, mình sẽ giải từng bước.";
	}
	if (searchText.includes("hang dang thuc")) {
		return "7 hằng đẳng thức đáng nhớ:\n1. (a + b)^2 = a^2 + 2ab + b^2\n2. (a - b)^2 = a^2 - 2ab + b^2\n3. a^2 - b^2 = (a - b)(a + b)\n4. (a + b)^3 = a^3 + 3a^2b + 3ab^2 + b^3\n5. (a - b)^3 = a^3 - 3a^2b + 3ab^2 - b^3\n6. a^3 + b^3 = (a + b)(a^2 - ab + b^2)\n7. a^3 - b^3 = (a - b)(a^2 + ab + b^2).\nMẹo nhớ: bình phương có 3 hạng tử; lập phương có 4 hạng tử; tổng/lập phương dùng dấu xen kẽ trong ngoặc còn lại.";
	}
	if (normalized.includes("định luật newton") || normalized.includes("newton")) {
		return "Định luật II Newton: F = m.a, trong đó F là hợp lực tác dụng lên vật (N), m là khối lượng (kg), a là gia tốc (m/s^2). Vì vậy a = F/m. Ví dụ vật 2 kg chịu lực 10 N thì a = 10/2 = 5 m/s^2.";
	}
	if (searchText.includes("dien tich tam giac") || searchText.includes("cong thuc tinh tam giac")) {
		return "Diện tích tam giác được tính bằng S = (a.h)/2, trong đó a là độ dài đáy và h là chiều cao tương ứng. Ví dụ đáy a = 8 cm, chiều cao h = 5 cm thì S = (8 x 5)/2 = 20 cm^2. Với tam giác vuông, S = (a.b)/2 với a và b là hai cạnh góc vuông.";
	}
	if (normalized.includes("xin chào") || normalized === "chào" || normalized.startsWith("chào ")) {
		return "Chào bạn! Bạn muốn hỏi về môn học, bài tập hay một khái niệm cụ thể nào?";
	}
	return `Mình chưa thể trả lời câu này bằng model AI vì ${reason}. Các câu hỏi học tập cơ bản vẫn được xử lý dự phòng. Hãy kiểm tra quota/billing của Gemini hoặc cấu hình provider khác trong backend/.env.`;
}

async function saveChatLog(userId: string, conversationId: string | undefined, message: string, answer: string): Promise<void> {
	if (mongoose.connection.readyState !== 1) return;
	const now = new Date();
	console.log(`[AI chat] saving log conversation=${conversationId ?? "none"}`);
	await mongoose.connection.collection("ai_logs").insertOne({ userId, conversationId, message, aiResponse: answer, context: "ai-tutor", createdAt: now });
	if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
		console.log(`[AI chat] updating conversation=${conversationId}`);
		await mongoose.connection.collection("conversations").updateOne({ _id: new mongoose.Types.ObjectId(conversationId), userId }, { $set: { updatedAt: now } });
	}
}