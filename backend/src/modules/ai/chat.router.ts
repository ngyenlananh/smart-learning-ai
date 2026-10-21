import { Router } from "express";
import { answerChat, ChatMessage, getConversationMessages, listConversations } from "./chat.service.js";

export const chatRouter = Router();

chatRouter.post("/chat", async (request, response) => {
	try {
		const body = request.body as { message?: unknown; messages?: unknown; history?: unknown; context?: unknown; conversationId?: unknown };
		if (typeof body.message !== "string" || !body.message.trim()) {
			response.status(400).json({ error: "Câu hỏi không được để trống" });
			return;
		}
		const rawMessages = Array.isArray(body.messages) ? body.messages : body.history;
		const history = Array.isArray(rawMessages) ? rawMessages.filter(isChatMessage).slice(-12) : [];
		const result = await answerChat(request.header("X-User-Id") ?? "demo-user", {
			message: body.message,
			history,
			context: typeof body.context === "string" ? body.context : undefined,
			conversationId: typeof body.conversationId === "string" ? body.conversationId : undefined,
		});
		response.json({ data: result });
	} catch (error) {
		console.error("Failed to answer AI tutor chat", error);
		response.status(502).json({ error: "AI Tutor chưa thể trả lời lúc này. Vui lòng thử lại sau." });
	}
});

chatRouter.get("/conversations", async (request, response) => {
	try {
		const conversations = await listConversations(request.header("X-User-Id") ?? "demo-user");
		response.json({ data: conversations });
	} catch (error) {
		console.error("Failed to list AI conversations", error);
		response.status(500).json({ error: "Không thể tải lịch sử hội thoại" });
	}
});

chatRouter.get("/conversations/:id/messages", async (request, response) => {
	try {
		const messages = await getConversationMessages(request.header("X-User-Id") ?? "demo-user", request.params.id);
		response.json({ data: messages });
	} catch (error) {
		console.error("Failed to load AI conversation", error);
		response.status(404).json({ error: "Không thể tải cuộc trò chuyện" });
	}
});

function isChatMessage(value: unknown): value is ChatMessage {
	if (!value || typeof value !== "object") return false;
	const item = value as Record<string, unknown>;
	return (item.role === "user" || item.role === "assistant") && typeof item.content === "string" && item.content.trim().length > 0;
}