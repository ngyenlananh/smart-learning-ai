import { useEffect, useRef, useState } from "react";
import { FlashcardLayout } from "./Flashcards";

export type QuizCard = {
  id: string; setId: string; type: "quiz"; question: string;
  options: [string, string, string, string]; correctIndex: number;
  explanation: string; position: number; total: number;
};
type Deck = { id: string; title: string; learned: number; total: number; due: number; status: "learning" | "mastered"; kind?: "language" | "quiz" };
type QuizDocument = { id: string; fileName: string; fileUrl: string; status: "processing" | "done" | "error"; cardCount: number; uploadedAt: string; error?: string };
const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export function QuizFlashcards({ card, decks, activeDeckId, onSelectDeck, onProgress, onCreateDeck, onImportSaved }: { card: QuizCard; decks: Deck[]; activeDeckId: string; onSelectDeck: (deck: Deck) => void; onProgress: (position: number) => void; onCreateDeck: (title: string) => Promise<void>; onImportSaved?: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [panel, setPanel] = useState(false);
  const [documents, setDocuments] = useState<QuizDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const notifiedDocuments = useRef(new Set<string>());
  const deck = decks.find((item) => item.id === activeDeckId);
  const labels = ["A", "B", "C", "D"];

  useEffect(() => { setFlipped(false); setSelectedIndex(null); setPanel(false); }, [card.id]);
  async function loadDocuments() {
    const response = await fetch(`${API}/flashcard-sets/${activeDeckId}/documents`, { headers: { "X-User-Id": "demo-user" } });
    const payload = await response.json();
    if (!Array.isArray(payload.data)) return;
    setDocuments(payload.data);
    for (const document of payload.data as QuizDocument[]) if (document.status === "done" && !notifiedDocuments.current.has(document.id)) { notifiedDocuments.current.add(document.id); window.dispatchEvent(new CustomEvent("smartedu:quiz-reload")); }
  }
  useEffect(() => { void loadDocuments(); const timer = window.setInterval(() => void loadDocuments(), 2500); return () => window.clearInterval(timer); }, [activeDeckId]);
  async function uploadDocument(file: File) {
    setUploading(true); setUploadError(""); const formData = new FormData(); formData.append("file", file);
    try { const response = await fetch(`${API}/flashcard-sets/${activeDeckId}/documents`, { method: "POST", headers: { "X-User-Id": "demo-user" }, body: formData }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Không thể tải tài liệu"); await loadDocuments(); }
    catch (error) { setUploadError(error instanceof Error ? error.message : "Không thể tải tài liệu"); } finally { setUploading(false); }
  }
  async function deleteDocument(documentId: string) { await fetch(`${API}/flashcard-sets/${activeDeckId}/documents/${documentId}`, { method: "DELETE", headers: { "X-User-Id": "demo-user" } }); await loadDocuments(); window.dispatchEvent(new CustomEvent("smartedu:quiz-reload")); }
  function choose(index: number) { if (flipped) return; setSelectedIndex(index); setFlipped(true); onProgress(card.position); }
  function move(delta: number) { const cards = (window as Window & { __smartEduQuizCards?: QuizCard[] }).__smartEduQuizCards ?? []; const current = cards.findIndex((item) => item.id === card.id); const next = cards[current + delta]; if (next) window.dispatchEvent(new CustomEvent("smartedu:quiz-card", { detail: next })); }
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [card.id]);

  return <FlashcardLayout decks={decks} activeDeckId={activeDeckId} onSelectDeck={onSelectDeck} onCreateDeck={onCreateDeck} onImportSaved={onImportSaved} showReviewBanner={false}>
    <div className="quiz-study">
      <div className="flash-language-bar"><span className="selected-language-note">Đang học: <b>{deck?.title}</b> <span className="quiz-badge">TRẮC NGHIỆM</span></span><div className="quiz-toolbar"><span className="quiz-badge">TRẮC NGHIỆM</span></div></div>
      <div className="flash-deck-heading"><span className="flash-kicker">BỘ THẺ · {deck?.title}</span><h2>{deck?.title}</h2></div>
      <div className="flash-progress"><span><b>Tiến độ: {card.position}/{card.total} thẻ</b></span><strong>Mục tiêu ngày: 30 thẻ</strong><i><em style={{ width: `${(card.position / card.total) * 100}%` }} /></i></div>
      <div className="flash-card-stage"><button className="card-nav" onClick={() => move(-1)} disabled={card.position <= 1} aria-label="Thẻ trước">‹</button><div className={flipped ? "flash-card-shell flipped" : "flash-card-shell"}><div className="flash-card quiz-card" role="group" aria-label={`Câu hỏi ${card.position}`}>
        <div className="flash-face flash-front quiz-front"><small className="flash-study-count">Câu hỏi {card.position}/{card.total}</small><strong className="quiz-question">{card.question}</strong><div className="quiz-options">{card.options.map((option, index) => <button type="button" key={option} className={selectedIndex === index ? "quiz-option selected" : "quiz-option"} onClick={() => choose(index)}><b>{labels[index]}</b><span>{option}</span></button>)}</div><i>Chọn một đáp án để xem kết quả</i></div>
        <div className="flash-face flash-back quiz-back"><small className="flash-study-count">Kết quả câu {card.position}</small><strong className={selectedIndex === card.correctIndex ? "quiz-result correct" : "quiz-result wrong"}>{selectedIndex === card.correctIndex ? "Chính xác" : "Chưa chính xác"}</strong><div className="quiz-answer-list">{card.options.map((option, index) => <div key={option} className={index === card.correctIndex ? "quiz-answer correct" : selectedIndex === index ? "quiz-answer wrong" : "quiz-answer"}><b>{labels[index]}</b><span>{option}</span></div>)}</div><p className="quiz-explanation"><strong>Giải thích:</strong> {card.explanation}</p><i>Chọn “Xem đáp án” để quay lại câu hỏi</i></div>
      </div></div><button className="card-nav" onClick={() => move(1)} disabled={card.position >= card.total} aria-label="Thẻ sau">›</button></div>
      <div className="flash-actions"><button className="outline-button" onClick={() => setFlipped(!flipped)}>{flipped ? "Xem câu hỏi" : "Xem đáp án"}</button></div><div className="flash-edit-links"><button type="button" onClick={() => setPanel(true)}>Xem thêm thông tin</button></div>
      <section className="document-list"><div className="document-list-heading"><strong>Kho tài liệu môn học</strong><span>{documents.length} file</span></div>{uploadError && <p className="upload-error">{uploadError}</p>}{documents.length === 0 && <p className="document-empty">Chưa có tài liệu. Tải PDF, DOCX, XLSX hoặc CSV để tạo thêm thẻ.</p>}{documents.map((document) => <div className="document-item" key={document.id}><div><strong>{document.fileName}</strong><span>{document.status === "processing" ? "Đang phân tích..." : document.status === "done" ? `${document.cardCount} thẻ đã sinh` : document.error ?? "Xử lý lỗi"}</span></div><button type="button" onClick={() => void deleteDocument(document.id)}>Xóa</button></div>)}</section>
      {panel && <div className="flash-detail-backdrop" onClick={() => setPanel(false)}><section className="flash-detail-panel" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setPanel(false)} aria-label="Đóng">×</button><span className="flash-kicker">THÔNG TIN BỘ THẺ</span><h2>{deck?.title}</h2><p>Đây là bộ thẻ trắc nghiệm gồm {card.total} câu hỏi theo chương trình học.</p></section></div>}
    </div>
  </FlashcardLayout>;
}
