import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { HeroBanner } from "../common/HeroBanner";
import { speak, stopSpeaking, useSpeechRecognition } from "../../hooks/useSpeech";
import { useTranslation } from "react-i18next";
import { Bot, MessageSquare, Plus, Mic, Send, Volume2, Square, BookOpen } from "lucide-react";

type ChatMessage = { from: "ai" | "user"; text: string };
type Conversation = { id: string; title: string; updatedAt: string };

function cleanForSpeech(text: string) {
	return text.replace(/!\[.*?\]\(.*?\)/g, "").replace(/\[([^\]]+)\]\(.*?\)/g, "$1").replace(/```[\s\S]*?```/g, " ").replace(/[*#`_>-]/g, " ").replace(/\s+/g, " ").trim();
}

export function AITutor({ messages, input, setInput, sendMessage, isLoading, conversations, activeConversationId, conversationLoading, conversationError, onNewConversation, onSelectConversation }: { messages: ChatMessage[]; input: string; setInput: (value: string) => void; sendMessage: (event: FormEvent) => void; isLoading: boolean; conversations: Conversation[]; activeConversationId: string | null; conversationLoading: boolean; conversationError: string; onNewConversation: () => void; onSelectConversation: (conversationId: string) => void }) {
	const { t } = useTranslation();
	const [speechError, setSpeechError] = useState("");
	const [autoSpeak, setAutoSpeak] = useState(false);
	const lastSpokenMessage = useRef("");
	const messagesRef = useRef<HTMLDivElement>(null);
	const handleSpeechResult = useCallback((text: string) => setInput(text), [setInput]);
	const handleSpeechError = useCallback((message: string) => setSpeechError(message), []);
	const recognition = useSpeechRecognition("vi-VN", handleSpeechResult, handleSpeechError);
	useEffect(() => {
		const lastMessage = messages[messages.length - 1];
		if (autoSpeak && lastMessage?.from === "ai" && lastMessage.text !== lastSpokenMessage.current) {
			lastSpokenMessage.current = lastMessage.text;
			speak(cleanForSpeech(lastMessage.text), "vi-VN");
		}
	}, [autoSpeak, messages]);
	useEffect(() => {
		const container = messagesRef.current;
		if (container) container.scrollTop = container.scrollHeight;
	}, [messages, isLoading]);
	return (
		<div className="ai-tutor-page-wrapper">
			{/* HERO BANNER TRUYỀN CẢM HỨNG */}
			<HeroBanner
				tag={t("ai.heroTag")}
				title={t("ai.title")}
				subtitle={t("ai.description")}
				metrics={[
					{
						icon: MessageSquare,
						label: t("ai.conversations"),
						value: `${conversations.length} ${t("ai.conversationUnit")}`,
						sub: t("ai.historyStored"),
						badgeClass: "target-badge",
					},
					{
						icon: Bot,
						label: t("ai.accuracy"),
						value: "99.2%",
						sub: t("ai.optimizedModel"),
						badgeClass: "star-badge",
					},
					{
						icon: Bot,
						label: t("ai.status"),
						value: t("ai.online"),
						sub: t("ai.ready"),
						badgeClass: "flame-badge",
					},
				]}
				headerAction={{
					sectionTitle: t("ai.workspaceTitle"),
					sectionSubtitle: t("ai.workspaceDescription"),
					buttonText: t("ai.newConversation"),
					buttonIcon: Plus,
					onAction: onNewConversation,
				}}
			/>

			<div className="chat-workspace modern-chat-workspace">
				<aside className="conversation-sidebar modern-conversation-sidebar">
					<button
						type="button"
						className="new-conversation-button modern-new-conv-btn btn-float"
						onClick={onNewConversation}
						disabled={isLoading}
					>
						<Plus size={16} strokeWidth={2.5} />
						<span>{t("ai.newConversation")}</span>
					</button>

					<div className="conversation-heading">{t("ai.history")}</div>

					{conversationLoading && <p className="conversation-loading">{t("ai.loading")}</p>}
					{conversationError && <p className="conversation-error" role="alert">{conversationError}</p>}

					<div className="conversation-list">
						{conversations.length ? (
							conversations.map((conversation) => (
								<button
									className={`conversation-item modern-conv-item ${
										activeConversationId === conversation.id ? "active" : ""
									}`}
									key={conversation.id}
									onClick={() => onSelectConversation(conversation.id)}
									disabled={isLoading}
								>
									<MessageSquare size={16} className="conv-icon" />
									<strong>{conversation.title || t("ai.newConversation")}</strong>
								</button>
							))
						) : (
							<p className="conversation-empty">{t("ai.empty")}</p>
						)}
					</div>
				</aside>

				<section className="chat-panel modern-chat-panel">
					<div className="chat-context modern-chat-context">
						<span className="ai-avatar modern-ai-avatar">
							<Bot size={22} />
						</span>
						<div className="chat-context-info">
							<strong>{t("ai.tutor")}</strong>
							<span className="online-status">
								<i /> {t("ai.online")}
							</span>
						</div>
						<button type="button" className="outline-button btn-float change-lesson-btn">
							<BookOpen size={15} />
							<span>{t("ai.changeLesson")}</span>
						</button>
					</div>

					<div className="messages modern-messages" ref={messagesRef} aria-live="polite">
						{messages.map((message, index) => (
							<div className={`message-row ${message.from}`} key={`${message.text}-${index}`}>
								<div className="message modern-message-bubble">
									{message.from === "ai" ? (
										<div className="message-markdown modern-message-markdown">
											<ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
												{message.text}
											</ReactMarkdown>
										</div>
									) : (
										<p>{message.text}</p>
									)}

									{message.from === "ai" && (
										<div className="speech-actions">
											<button
												type="button"
												aria-label="Đọc câu trả lời"
												onClick={() => speak(cleanForSpeech(message.text), "vi-VN")}
												title="Đọc to câu trả lời"
											>
												<Volume2 size={16} />
											</button>
											<button
												type="button"
												aria-label="Dừng đọc"
												onClick={stopSpeaking}
												title="Dừng đọc"
											>
												<Square size={14} />
											</button>
										</div>
									)}

									{message.from === "ai" && index === 2 && (
										<div className="message-actions">
											<button type="button" className="filter-pill pill-float" onClick={() => setInput("Cho mình ví dụ khác")}>
												Cho ví dụ khác
											</button>
											<button type="button" className="filter-pill pill-float" onClick={() => setInput("Tạo bài tập tương tự")}>
												Tạo bài tập tương tự
											</button>
											<button type="button" className="filter-pill pill-float" onClick={() => alert("Đã thêm vào bộ thẻ ôn luyện!")}>
												Thêm vào Flashcard
											</button>
										</div>
									)}
								</div>
							</div>
						))}
						{isLoading && (
							<div className="message-row ai">
								<div className="message modern-message-bubble">
									<p>{t("ai.thinking")}</p>
								</div>
							</div>
						)}
					</div>

					{/* Gợi ý nhanh dạng pill chip */}
					<div className="suggestions modern-suggestions">
						<button
							type="button"
							className="filter-pill pill-float"
							onClick={() => setInput("Giải thích công thức đổi cơ số")}
							disabled={isLoading}
						>
							<span>Giải thích công thức đổi cơ số</span>
						</button>
						<button
							type="button"
							className="filter-pill pill-float"
							onClick={() => setInput("Cho mình một bài tập tương tự")}
							disabled={isLoading}
						>
							<span>Cho mình một bài tập tương tự</span>
						</button>
					</div>

					<div className="speech-setting modern-speech-setting">
						<label>
							<input
								type="checkbox"
								checked={autoSpeak}
								onChange={(event) => setAutoSpeak(event.target.checked)}
							/>
							<span>Tự động đọc câu trả lời của AI</span>
						</label>
					</div>

					{speechError && <p className="speech-error" role="alert">{speechError}</p>}

					{/* Ô nhập chat cao 52px, nút tròn 44px */}
					<form className="chat-input modern-chat-input-bar" onSubmit={sendMessage}>
						<input
							className="modern-chat-text-input"
							value={input}
							onChange={(event) => setInput(event.target.value)}
							placeholder="Hỏi bất cứ điều gì về bài học..."
							disabled={isLoading}
						/>
						<div className="chat-input-actions modern-input-actions">
							{recognition.supported && (
								<button
									type="button"
									className={`circle-action-btn ${recognition.listening ? "listening" : ""}`}
									aria-label={recognition.listening ? "Dừng ghi âm" : "Nói câu hỏi"}
									onClick={() => {
										setSpeechError("");
										recognition.listening ? recognition.stop() : recognition.start();
									}}
								>
									<Mic size={20} />
								</button>
							)}
							<button
								type="submit"
								className="circle-action-btn btn-send-gradient btn-float"
								aria-label="Gửi câu hỏi"
								disabled={isLoading || !input.trim()}
							>
								<Send size={18} />
							</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	);
}