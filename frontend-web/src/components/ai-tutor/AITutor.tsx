import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { PageTitle } from "../common/PageTitle";
import { speak, stopSpeaking, useSpeechRecognition } from "../../hooks/useSpeech";
import { useTranslation } from "react-i18next";

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
	return <>
		<PageTitle title={t("ai.title")} description={t("ai.description")} action={<span className="online-status"><i /> {t("ai.online")}</span>} />
		<div className="chat-workspace">
			<aside className="conversation-sidebar">
				<button className="new-conversation-button" onClick={onNewConversation} disabled={isLoading}>{t("ai.newConversation")}</button>
				<div className="conversation-heading">{t("ai.history")}</div>
				{conversationLoading && <p className="conversation-loading">{t("ai.loading")}</p>}
				{conversationError && <p className="conversation-error" role="alert">{conversationError}</p>}
				<div className="conversation-list">
					{conversations.length ? conversations.map((conversation) => <button className={`conversation-item ${activeConversationId === conversation.id ? "active" : ""}`} key={conversation.id} onClick={() => onSelectConversation(conversation.id)} disabled={isLoading}>
						<strong>{conversation.title || "Cuộc trò chuyện mới"}</strong>
					</button>) : <p className="conversation-empty">{t("ai.empty")}</p>}
				</div>
			</aside>
			<section className="chat-panel">
			<div className="chat-context"><span className="ai-avatar">◈</span><div><strong>{t("ai.tutor")}</strong></div><button className="outline-button">{t("ai.changeLesson")}</button></div>
			<div className="messages" ref={messagesRef} aria-live="polite">
				{messages.map((message, index) => <div className={`message-row ${message.from}`} key={`${message.text}-${index}`}>
					<div className="message">
						{message.from === "ai" ? <div className="message-markdown"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{message.text}</ReactMarkdown></div> : <p>{message.text}</p>}
						{message.from === "ai" && <div className="speech-actions"><button type="button" aria-label="Đọc câu trả lời" onClick={() => speak(cleanForSpeech(message.text), "vi-VN")}>🔊</button><button type="button" aria-label="Dừng đọc" onClick={stopSpeaking}>⏹</button></div>}
						{message.from === "ai" && index === 2 && <div className="message-actions"><button>Cho ví dụ khác</button><button>Tạo bài tập tương tự</button><button>Thêm vào Flashcard</button></div>}
					</div>
				</div>)}
				{isLoading && <div className="message-row ai"><div className="message"><p>{t("ai.thinking")}</p></div></div>}
			</div>
			<div className="suggestions"><button onClick={() => setInput("Giải thích công thức đổi cơ số")} disabled={isLoading}>Giải thích công thức đổi cơ số</button><button onClick={() => setInput("Cho mình một bài tập tương tự")} disabled={isLoading}>Cho mình một bài tập tương tự</button></div>
				<div className="speech-setting"><label><input type="checkbox" checked={autoSpeak} onChange={(event) => setAutoSpeak(event.target.checked)} /> Tự động đọc câu trả lời của AI</label></div>
				{speechError && <p className="speech-error" role="alert">{speechError}</p>}
				<form className="chat-input" onSubmit={sendMessage}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder={t("ai.placeholder")} disabled={isLoading} /><div className="chat-input-actions">{recognition.supported && <button type="button" className={recognition.listening ? "speech-button listening" : "speech-button"} aria-label={recognition.listening ? "Dừng ghi âm" : "Nói câu hỏi"} onClick={() => { setSpeechError(""); recognition.listening ? recognition.stop() : recognition.start(); }}>🎤</button>}<button aria-label="Gửi câu hỏi" disabled={isLoading || !input.trim()}>→</button></div></form>
			</section>
		</div>
	</>;
}