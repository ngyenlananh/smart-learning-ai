import { ChangeEvent, DragEvent, ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Flashcard, flashcards, languageGroups, languageOptions } from "./flashcardData";
import { HeroBanner } from "../common/HeroBanner";
import { BookOpen, Star, Flame, Plus } from "lucide-react";

export { flashcards } from "./flashcardData";

export type FlashcardDeck = {
  id: string;
  title: string;
  kind?: "language" | "quiz";
  learned: number;
  total: number;
  due: number;
  status: "learning" | "mastered";
};

export function DeckSidebar({ decks, activeDeckId, onSelectDeck, onCreateDeck }: { decks: FlashcardDeck[]; activeDeckId: string; onSelectDeck: (deck: FlashcardDeck) => void; onCreateDeck: (title: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [createError, setCreateError] = useState("");
  const [menu, setMenu] = useState<{ deck: FlashcardDeck; top: number; left: number } | null>(null);
  const [editing, setEditing] = useState<FlashcardDeck | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editError, setEditError] = useState("");
  const [deleting, setDeleting] = useState<FlashcardDeck | null>(null);
  const [actionError, setActionError] = useState("");
  const api = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  useEffect(() => {
    const close = () => setMenu(null);
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setMenu(null); };
    window.addEventListener("click", close); window.addEventListener("keydown", key); window.addEventListener("scroll", close, true);
    return () => { window.removeEventListener("click", close); window.removeEventListener("keydown", key); window.removeEventListener("scroll", close, true); };
  }, []);
  const emitDecksChanged = () => window.dispatchEvent(new CustomEvent("smartedu:decks-reload"));
  const saveEdit = async () => {
    const nextTitle = editTitle.trim();
    if (!nextTitle || nextTitle.length > 100) { setEditError("Tên bộ thẻ phải dài từ 1 đến 100 ký tự"); return; }
    const response = await fetch(`${api}/flashcard-sets/${encodeURIComponent(editing?.id ?? "")}`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-User-Id": "demo-user" }, body: JSON.stringify({ title: nextTitle }) });
    const payload = await response.json();
    if (!response.ok) { setEditError(payload.error ?? "Không thể cập nhật bộ thẻ"); return; }
    setEditing(null); emitDecksChanged();
  };
  const deleteDeck = async () => {
    if (!deleting) return;
    const response = await fetch(`${api}/flashcard-sets/${encodeURIComponent(deleting.id)}`, { method: "DELETE", headers: { "X-User-Id": "demo-user" } });
    const payload = await response.json();
    if (!response.ok) { setActionError(payload.error ?? "Không thể xóa bộ thẻ"); return; }
    setDeleting(null); setActionError(""); emitDecksChanged();
  };
  const menuView = menu && createPortal(<div className="deck-actions-menu" style={{ top: menu.top, left: menu.left }} role="menu" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return; event.preventDefault(); const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=menuitem]")); const current = items.indexOf(document.activeElement as HTMLButtonElement); items[(current + (event.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus(); }}>
    <button type="button" role="menuitem" onClick={() => { setEditing(menu.deck); setEditTitle(menu.deck.title); setEditError(""); setMenu(null); }}>✎ <span>Chỉnh sửa</span></button>
    <button type="button" role="menuitem" className="danger" onClick={() => { setDeleting(menu.deck); setActionError(""); setMenu(null); }}>🗑 <span>Xóa</span></button>
  </div>, document.body);
  return <>
    <aside className="my-decks-panel"><h2>Bộ thẻ của tôi</h2><div className="my-decks-list">{decks.map((deck) => <div className={deck.id && deck.id === activeDeckId ? "my-deck-item active" : "my-deck-item"} key={deck.id}><button type="button" className="my-deck-select" onClick={() => onSelectDeck(deck)}><strong>{deck.title}</strong><span>{deck.learned}/{deck.total || 0} thẻ · {deck.due ? `${deck.due} cần ôn` : deck.learned ? "đã thuộc" : "chưa học"}</span></button><button type="button" className="deck-actions-button" aria-label="Tùy chọn bộ thẻ" aria-haspopup="menu" aria-expanded={menu?.deck.id === deck.id} onClick={(event) => { event.stopPropagation(); const rect = event.currentTarget.getBoundingClientRect(); setMenu(menu?.deck.id === deck.id ? null : { deck, top: rect.bottom + 6, left: rect.right - 150 }); }}>•••</button></div>)}</div><button type="button" className="create-deck-button" onClick={() => setOpen(true)}>＋&nbsp; Tạo bộ thẻ mới</button></aside>
    {open && <div className="flash-detail-backdrop" onClick={() => setOpen(false)}><section className="flash-detail-panel create-card-panel" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setOpen(false)} aria-label="Đóng">×</button><span className="flash-kicker">BỘ THẺ CỦA TÔI</span><h2>Tạo bộ thẻ mới</h2><label className="detail-field">Tên bộ thẻ<input autoFocus maxLength={100} value={title} onChange={(event) => { setTitle(event.target.value); setCreateError(""); }} placeholder="Ví dụ: Mạng máy tính - Chương 1" /></label>{createError && <p className="save-error">{createError}</p>}<div className="detail-panel-actions"><button className="outline-button" onClick={() => setOpen(false)}>Hủy</button><button className="primary-button" disabled={!title.trim()} onClick={() => void (async () => { try { await onCreateDeck(title.trim()); setTitle(""); setCreateError(""); setOpen(false); } catch (reason) { setCreateError(reason instanceof Error ? reason.message : "Không thể tạo bộ thẻ"); } })()}>Lưu bộ thẻ</button></div></section></div>}
    {editing && <div className="flash-detail-backdrop" onClick={() => setEditing(null)}><section className="flash-detail-panel create-card-panel" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setEditing(null)} aria-label="Đóng">×</button><span className="flash-kicker">CHỈNH SỬA BỘ THẺ</span><h2>Đổi tên bộ thẻ</h2><label className="detail-field">Tên bộ thẻ<input autoFocus maxLength={100} value={editTitle} onChange={(event) => { setEditTitle(event.target.value); setEditError(""); }} /></label>{editError && <p className="save-error">{editError}</p>}<div className="detail-panel-actions"><button className="outline-button" onClick={() => setEditing(null)}>Hủy</button><button className="primary-button" onClick={() => void saveEdit()}>Lưu</button></div></section></div>}
    {deleting && <div className="flash-detail-backdrop" onClick={() => setDeleting(null)}><section className="flash-detail-panel create-card-panel" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setDeleting(null)} aria-label="Đóng">×</button><span className="flash-kicker">XÓA BỘ THẺ</span><h2>Xóa “{deleting.title}”?</h2><p>Toàn bộ {deleting.total} thẻ và tiến độ học trong bộ này sẽ bị xóa vĩnh viễn.</p>{actionError && <p className="save-error">{actionError}</p>}<div className="detail-panel-actions"><button className="outline-button" onClick={() => setDeleting(null)}>Hủy</button><button className="danger-button" onClick={() => void deleteDeck()}>Xóa</button></div></section></div>}
    {menuView}
  </>;
}

export function FlashcardLayout({ decks, activeDeckId, onSelectDeck, onCreateDeck, children, reviewDueCount = 0, onReview, onImportSaved, showReviewBanner = false }: { decks: FlashcardDeck[]; activeDeckId: string; onSelectDeck: (deck: FlashcardDeck) => void; onCreateDeck: (title: string) => Promise<void>; children: ReactNode; reviewDueCount?: number; onReview?: () => void; onImportSaved?: () => void; showReviewBanner?: boolean }) {
  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "preview">("idle");
  const [error, setError] = useState("");
  const [cards, setCards] = useState<Array<Record<string, unknown>>>([]);
  const [cardType, setCardType] = useState("auto");
  const [count, setCount] = useState("auto");
  const [level, setLevel] = useState("medium");
  const api = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const chooseFile = (next: File | null) => {
    if (!next) return;
    if (!["application/pdf", "text/plain", "text/markdown", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(next.type) && !/\.(pdf|docx|pptx|txt|md|xlsx)$/i.test(next.name)) { setError("Chỉ hỗ trợ XLSX, PDF, DOCX, PPTX, TXT hoặc MD."); return; }
    if (next.size > 10 * 1024 * 1024) { setError("File không được vượt quá 10MB."); return; }
    setError(""); setFile(next);
  };
  const createPreview = async () => {
    if (!file || status === "loading") { if (!file) setError("Vui lòng chọn tài liệu."); return; }
    setStatus("loading"); setError("");
    try {
      const body = new FormData(); body.append("file", file); body.append("type", cardType); body.append("count", count); body.append("level", level);
      const response = await fetch(`${api}/flashcards/decks/${encodeURIComponent(activeDeckId)}/import`, { method: "POST", headers: { "X-User-Id": "demo-user" }, body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Không thể tạo thẻ từ tài liệu");
      setCards(Array.isArray(payload.data?.cards) ? payload.data.cards : []); setStatus("preview");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể kết nối máy chủ"); setStatus("idle"); }
  };
  const saveImport = async () => {
    setStatus("loading"); setError("");
    try {
      const response = await fetch(`${api}/flashcards/decks/${encodeURIComponent(activeDeckId)}/import/save`, { method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": "demo-user" }, body: JSON.stringify({ cards: cards.filter((card) => card.selected !== false) }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Không thể lưu thẻ");
      setImportOpen(false); setStatus("idle"); setFile(null); setCards([]); onImportSaved?.();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể lưu thẻ"); setStatus("preview"); }
  };
  const closeImport = () => { if (status === "loading") { if (!window.confirm("Tác vụ đang xử lý. Bạn có chắc muốn đóng?")) return; } setImportOpen(false); setStatus("idle"); setError(""); };
  const importModal = importOpen && <div className="flash-detail-backdrop" onClick={closeImport}><section className="flash-detail-panel import-panel" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={closeImport} aria-label="Đóng">×</button><span className="flash-kicker">TẢI TÀI LIỆU · TẠO THẺ</span><h2>{status === "preview" ? "Xem trước thẻ" : "Tải tài liệu lên"}</h2>{status === "preview" ? <><p>{file?.name} · {cards.length} thẻ hợp lệ</p><div className="import-preview-list">{cards.map((card, index) => <label key={index} className="import-preview-item"><input type="checkbox" checked={card.selected !== false} onChange={() => setCards((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, selected: item.selected === false } : item))} />  <span><input className="import-inline-edit" value={String(card.front ?? card.question ?? "")} onChange={(event) => setCards((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...(item.front !== undefined ? { front: event.target.value } : { question: event.target.value }) } : item))} /><input className="import-inline-edit" value={String(card.back ?? card.explanation ?? "")} onChange={(event) => setCards((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...(item.back !== undefined ? { back: event.target.value } : { explanation: event.target.value }) } : item))} /><small>{String(card.source ?? file?.name ?? "")}</small></span><button type="button" onClick={() => setCards((current) => current.filter((_item, itemIndex) => itemIndex !== index))}>Xóa</button></label>)}</div><div className="detail-panel-actions"><button className="outline-button" onClick={closeImport}>Đóng</button><button className="primary-button" disabled={!cards.some((card) => card.selected !== false)} onClick={() => void saveImport()}>Lưu vào bộ</button></div></> : <><label className={dragging ? "import-dropzone dragging" : "import-dropzone"} onDragOver={(event: DragEvent<HTMLLabelElement>) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0] ?? null); }}><input type="file" accept=".xlsx,.pdf,.docx,.pptx,.txt,.md" onChange={(event: ChangeEvent<HTMLInputElement>) => chooseFile(event.target.files?.[0] ?? null)} /><strong>{file ? file.name : "Kéo thả file Excel vào đây hoặc bấm để chọn file"}</strong><small>XLSX hoặc PDF, DOCX, PPTX, TXT, MD · tối đa 10MB</small></label><div className="import-options"><label>Loại thẻ<select value={cardType} onChange={(event) => setCardType(event.target.value)}><option value="auto">Theo bộ thẻ</option><option value="quiz">Trắc nghiệm</option><option value="flip">Lật mặt</option><option value="both">Cả hai</option></select></label><label>Số lượng<select value={count} onChange={(event) => setCount(event.target.value)}><option value="auto">Tự động</option><option value="10">10</option><option value="20">20</option><option value="30">30</option></select></label><label>Mức độ<select value={level} onChange={(event) => setLevel(event.target.value)}><option value="basic">Cơ bản</option><option value="medium">Trung bình</option><option value="advanced">Nâng cao</option></select></label>  </div>{error && <div className="import-error"><p className="save-error">{error}</p><button type="button" className="outline-button" onClick={() => void createPreview()} disabled={!file || status === "loading"}>Thử lại</button></div>}<div className="detail-panel-actions"><button className="outline-button" onClick={closeImport}>Đóng</button><button className="primary-button" disabled={!file || status === "loading"} onClick={() => void createPreview()}>{status === "loading" ? "Đang đọc file..." : "Tạo thẻ"}</button></div></>}</section></div>;
  const totalLearnedCount = decks.reduce((acc, d) => acc + (d.learned || 0), 0);
  return (
    <div className="flashcards-page-wrapper">
      <HeroBanner
        tag="📚 Không gian ghi nhớ thông minh Flashcard"
        title="Thẻ Flashcard"
        subtitle="Ghi nhớ từ vựng và kiến thức cốt lõi theo phương pháp lặp lại ngắt quãng (Spaced Repetition) thông minh."
        metrics={[
          {
            icon: BookOpen,
            label: "Bộ thẻ hiện có",
            value: `${decks.length} bộ`,
            sub: "Sẵn sàng ôn luyện",
            badgeClass: "target-badge",
          },
          {
            icon: Star,
            label: "Từ vựng đã thuộc",
            value: `${totalLearnedCount} từ`,
            sub: "🔥 Đang tiến bộ nhanh",
            badgeClass: "star-badge",
          },
          {
            icon: Flame,
            label: "Chuỗi học liên tục",
            value: "5 ngày",
            sub: "Duy trì mỗi ngày",
            badgeClass: "flame-badge",
          },
        ]}
        headerAction={{
          sectionTitle: "Không gian rèn luyện Flashcard",
          sectionSubtitle: "Chọn bộ thẻ bên trái để bắt đầu luyện tập hoặc tải thêm tài liệu",
          buttonText: "Tải tài liệu lên",
          buttonIcon: Plus,
          onAction: () => setImportOpen(true),
        }}
      />
      <div className="flash-layout">
        <DeckSidebar decks={decks} activeDeckId={activeDeckId} onSelectDeck={onSelectDeck} onCreateDeck={onCreateDeck} />
        <section className="flash-study">
          {showReviewBanner && (
            <div className="review-due-banner flash-review-banner">
              <span className="review-due-icon">♧</span>
              <div className="review-due-copy">
                <strong>{reviewDueCount} từ đang chờ bạn ôn tập hôm nay</strong>
                <span>Ôn ngay để duy trì chuỗi 5 ngày liên tục</span>
              </div>
              <button className="enroll-new-course-btn btn-float" onClick={onReview} disabled={!onReview}>
                Ôn tập ngay
              </button>
            </div>
          )}
          {children}
        </section>
      </div>
      {importModal}
    </div>
  );
}

export function Flashcards({ card, activeIndex, reviewDueCount, flipped, setFlipped, reviewCard, previousCard, selectLanguage, reviewMode, reviewPosition, reviewTotal, startReviewSession, onReviewRating, nextReviewCard, previousReviewCard, onCreateCard, onDeleteCard, decks, activeDeckId, deckTitle, deckKind, deckProgress, onSelectDeck, onCreateDeck, onImportSaved }: {
  card: Flashcard;
  activeIndex: number;
  reviewDueCount: number;
  flipped: boolean;
  setFlipped: (value: boolean) => void;
  reviewCard: () => void;
  previousCard: () => void;
  selectLanguage: (index: number) => void;
  reviewMode: boolean;
  reviewPosition: number;
  reviewTotal: number;
  startReviewSession: () => void;
  onReviewRating: (rating: number) => void;
  nextReviewCard: () => void;
  previousReviewCard: () => void;
  onCreateCard: (card: Flashcard) => void;
  onDeleteCard: (card: Flashcard) => Promise<void>;
  decks: FlashcardDeck[];
  activeDeckId: string;
  deckTitle: string;
  deckKind?: FlashcardDeck["kind"];
  deckProgress: { learned: number; total: number };
  onSelectDeck: (deck: FlashcardDeck) => void;
  onCreateDeck: (title: string) => Promise<void>;
  onImportSaved?: () => void;
}) {
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [panel, setPanel] = useState<"edit" | "details" | null>(null);
  const meaningKey = `smartedu-flashcard-meaning-${card.language}-${card.progress}`;
  const [editMeaning, setEditMeaning] = useState(() => localStorage.getItem(meaningKey) ?? card.meaning);
  const [savedMeaning, setSavedMeaning] = useState(() => localStorage.getItem(meaningKey) ?? card.meaning);
  const [saveError, setSaveError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [contextVisible, setContextVisible] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<{ mastered: number; uncertain: number; learning: number; reviewed: number } | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewNotice, setReviewNotice] = useState("");
  const [reviewSessionStatus, setReviewSessionStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newTerm, setNewTerm] = useState("");
  const [newPronunciation, setNewPronunciation] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [newExample, setNewExample] = useState("");
  const [newVisual, setNewVisual] = useState("📚");
  const displayedMeaning = savedMeaning || card.meaning;
  const exampleText = card.example?.trim() ?? "";
  const translationText = (card.translation ?? card.exampleMeaning)?.trim() ?? "";
  const hasSupplementalContent = Boolean(exampleText || translationText);

  useEffect(() => {
    const storedMeaning = localStorage.getItem(meaningKey) ?? card.meaning;
    setEditMeaning(storedMeaning);
    setSavedMeaning(storedMeaning);
    setSaveError("");
    setSaveStatus("");
    setContextVisible(false);
  }, [card.language, card.progress, card.meaning, meaningKey]);

  async function saveMeaning() {
    setSaveError("");
    setSaveStatus("");
    const nextMeaning = editMeaning.trim();
    if (!nextMeaning) {
      setSaveError("Vui lòng nhập nghĩa của từ.");
      return;
    }
    setSavedMeaning(nextMeaning);
    localStorage.setItem(meaningKey, nextMeaning);
    try {
      const languageId = languageOptions.find((item) => item.label === card.language)?.code.split("-")[0] ?? "en";
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/flashcards/${languageId}/${card.progress}`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-User-Id": "demo-user" }, body: JSON.stringify({ meaning: nextMeaning }) });
      if (!response.ok) throw new Error("Không thể kết nối backend");
      setSaveStatus("Đã lưu vào backend");
      setPanel(null);
    } catch (error) {
      setSaveStatus("Đã lưu trên thiết bị; backend chưa kết nối");
      setPanel(null);
    }
  }
  async function reviewFlashcard(rating: number) {
    if (reviewing) return;
    setReviewing(true);
    const ratingLabel = rating === 3 ? "Đã thuộc" : rating === 2 ? "Còn nhớ mơ hồ" : "Chưa thuộc";
    setReviewNotice(`Đang ghi nhận: ${ratingLabel}...`);
    const languageId = languageOptions.find((item) => item.label === card.language)?.code.split("-")[0] ?? "en";
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/flashcards/${languageId}/${card.progress}/review`, { method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": "demo-user" }, body: JSON.stringify({ rating }) });
      if (!response.ok) throw new Error("Backend chưa ghi nhận đánh giá");
      localStorage.setItem(`smartedu-review-${card.language}-${card.progress}`, String(rating));
      updateLocalReviewQueue(rating);
      setReviewNotice(`Đã ghi nhận: ${ratingLabel}`);
      if (card.progress === card.total && response.ok) {
        const summaryResponse = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/flashcards/${languageId}/summary?userId=demo-user`);
        if (summaryResponse.ok) {
          const summary = await summaryResponse.json();
          setSessionSummary(summary.data);
        }
      }
    } catch {
      localStorage.setItem(`smartedu-review-${card.language}-${card.progress}`, String(rating));
      updateLocalReviewQueue(rating);
      setReviewNotice(`Đã ghi nhận trên thiết bị: ${ratingLabel}`);
    } finally {
      window.setTimeout(() => {
        if (reviewMode) onReviewRating(rating);
        else reviewCard();
        setReviewing(false);
      }, 450);
    }
  }
  function updateLocalReviewQueue(rating: number) {
    const queue = JSON.parse(localStorage.getItem("smartedu-review-queue") ?? "[]") as { language: string; position: number }[];
    const current = queue.filter((item) => !(item.language === card.language && item.position === card.progress));
    if (rating !== 3) current.push({ language: card.language, position: card.progress });
    localStorage.setItem("smartedu-review-queue", JSON.stringify(current));
  }
  async function createCard() {
    if (!newTerm.trim() || !newPronunciation.trim() || !newMeaning.trim()) {
      setCreateError("Vui lòng nhập từ, phiên âm và nghĩa.");
      return;
    }
    setCreateError("");
    const language = languageOptions[activeIndex];
    const payload = { language: language.code.split("-")[0], deckId: activeDeckId, term: newTerm.trim(), pronunciation: newPronunciation.trim(), meaning: newMeaning.trim(), example: newExample.trim(), visual: newVisual.trim() || "📚" };
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/flashcards`, { method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": "demo-user" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("Không thể lưu backend");
      const result = await response.json();
      onCreateCard({ ...result.data, ipa: result.data.pronunciation, exampleMeaning: `Ngữ cảnh: ${result.data.example}`, type: "Từ vựng" });
    } catch {
      const localCard: Flashcard = { deck: "Hành trình ngôn ngữ thế giới", language: card.language, code: card.code, flag: card.flag, flagUrl: card.flagUrl, term: newTerm.trim(), ipa: newPronunciation.trim(), meaning: newMeaning.trim(), type: "Từ vựng", example: newExample.trim() || `Tôi sử dụng từ “${newMeaning.trim()}” trong một câu.`, exampleMeaning: `Ngữ cảnh: ${newExample.trim()}`, progress: card.total + 1, total: card.total + 1, visual: newVisual.trim() || "📚" };
      onCreateCard(localCard);
    }
    setNewTerm(""); setNewPronunciation(""); setNewMeaning(""); setNewExample(""); setNewVisual("📚"); setCreateOpen(false);
  }
  function speak() {
    if (!("speechSynthesis" in window)) return;
    const speakNow = () => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(card.term);
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find((item) => item.lang.toLowerCase() === card.code.toLowerCase())
        ?? voices.find((item) => item.lang.toLowerCase().startsWith(card.code.split("-")[0].toLowerCase()))
        ?? voices.find((item) => item.default)
        ?? voices[0];
      utterance.lang = voice?.lang ?? card.code;
      if (voice) utterance.voice = voice;
      utterance.rate = 0.82;
      utterance.pitch = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    };
    if (window.speechSynthesis.getVoices().length) speakNow();
    else window.speechSynthesis.addEventListener("voiceschanged", speakNow, { once: true });
  }
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (["1", "2", "3"].includes(event.key)) reviewCard();
      if (event.code === "Space") { event.preventDefault(); setFlipped(!flipped); }
      if (event.key === "ArrowLeft") { event.preventDefault(); (reviewMode ? previousReviewCard : previousCard)(); }
      if (event.key === "ArrowRight") { event.preventDefault(); (reviewMode ? nextReviewCard : reviewCard)(); }
      if (event.key === "Escape") setLanguagePickerOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [flipped, reviewCard, setFlipped]);
  return <>
    <FlashcardLayout decks={decks} activeDeckId={activeDeckId} onSelectDeck={onSelectDeck} onCreateDeck={onCreateDeck} reviewDueCount={reviewDueCount} onReview={startReviewSession} onImportSaved={onImportSaved} showReviewBanner={activeDeckId === "deck-english"}>
      {reviewSessionStatus && <p className="review-session-status" role="status">{reviewSessionStatus}</p>}
      <div className="flash-language-bar"><span className="selected-language-note">Đang học: <b><img className="inline-flag" src={card.flagUrl} alt="" /> {card.language}</b>{reviewMode && <span className="review-mode-badge"> · Đang ôn {reviewTotal} thẻ yếu</span>}</span><div className="flash-top-actions"><button type="button" className="add-card-button" onClick={() => setCreateOpen(true)}>＋ Thêm thẻ</button><button type="button" className="language-picker-trigger" onClick={() => setLanguagePickerOpen(true)} aria-expanded={languagePickerOpen}><span className="globe">◉</span> Ngôn ngữ <b>{languageOptions.length}+</b></button></div></div>
      <div className="flash-deck-heading"><span className="flash-kicker">{reviewMode ? `ÔN TẬP CÁC TỪ CHƯA THUỘC / CÒN MƠ HỒ · ${deckTitle}` : `BỘ THẺ · ${deckTitle}`}</span><h2>{reviewMode ? `Đang ôn tập · ${deckTitle}` : deckTitle}</h2></div>
      <div className="flash-progress"><span><b>{reviewMode ? `Ôn thẻ ${reviewPosition}/${reviewTotal}` : `Tiến độ: ${deckProgress.learned}/${deckProgress.total} thẻ`}</b></span><strong>{reviewMode ? "Chế độ ôn tập" : "Mục tiêu ngày: 30 từ"}</strong><i><em style={{ width: `${reviewMode ? (reviewPosition / Math.max(reviewTotal, 1)) * 100 : (deckProgress.learned / Math.max(deckProgress.total, 1)) * 100}%` }} /></i></div>
      <div className="flash-card-stage"><button className="card-nav" onClick={reviewMode ? previousReviewCard : previousCard} disabled={reviewMode ? reviewPosition <= 1 : activeIndex <= 0} aria-label="Thẻ trước">‹<small>Trước</small></button><div className={flipped ? "flash-card-shell flipped" : "flash-card-shell"}><div className="flash-card" role="button" tabIndex={0} onClick={() => setFlipped(!flipped)} onKeyDown={(event) => { if (event.key === "Enter") setFlipped(!flipped); }} aria-label="Lật flashcard">
        <span className="flash-face flash-front"><small className="flash-study-count">Học Thẻ {card.progress}/50: {card.term} ({card.language})</small><span className="flash-illustration" aria-label={`Hình minh họa cho ${card.term}`}>{card.visual}</span><strong className="flash-term">{card.term}</strong><span className="flash-pronunciation"><b>/{card.ipa}/</b><img className="card-flag" src={card.flagUrl} alt={`${card.language} flag`} /><button type="button" className={isSpeaking ? "card-sound speaking" : "card-sound"} onClick={(event) => { event.stopPropagation(); speak(); }} aria-label={`Nghe cách đọc ${card.term}`} aria-pressed={isSpeaking}>{isSpeaking ? "🔈" : "🔊"}</button></span><span className="flash-card-tools"><button type="button" onClick={(event) => { event.stopPropagation(); setContextVisible(!contextVisible); }}>{contextVisible ? "Ẩn gợi ý" : "Gợi ý"}</button><button type="button" onClick={(event) => { event.stopPropagation(); setContextVisible(true); }}>Xem ngữ cảnh</button></span>{contextVisible && hasSupplementalContent && <span className="flash-context">{exampleText && <span>{exampleText}</span>}{translationText && <small>Dịch nghĩa: {translationText}</small>}</span>}</span>
        <span className={`flash-face flash-back ${hasSupplementalContent ? "" : "flash-back-minimal"}`}><small className="flash-study-count">{hasSupplementalContent ? "Ý nghĩa và ví dụ" : "Ý nghĩa"}</small><strong className="flash-meaning">{displayedMeaning}</strong>{hasSupplementalContent && <span className="flash-example">{exampleText && <>“{exampleText}”</>}{translationText && <small>Dịch nghĩa: {translationText}</small>}</span>}<i>Nhấn để xem mặt trước</i></span>
      </div></div><button className="card-nav" onClick={reviewMode ? nextReviewCard : reviewCard} disabled={reviewMode ? reviewPosition >= reviewTotal : activeIndex >= deckProgress.total - 1} aria-label="Thẻ sau"><small>Sau</small>›</button></div>
      <div className="flash-actions"><button className="outline-button" onClick={() => setFlipped(!flipped)}>{flipped ? "Xem mặt trước" : "Lật thẻ để xem nghĩa"}</button></div><p className="pronunciation-tip">Bấm loa cạnh phiên âm để nghe <kbd>Space</kbd> <b>/{card.ipa}/</b></p>
      {reviewNotice && <p className="review-notice" role="status">{reviewNotice}</p>}
      {flipped && deckKind !== "language" && <div className="flash-review-panel"><span>Đánh giá mức độ nhớ</span><div className="review-actions"><button disabled={reviewing} onClick={() => reviewFlashcard(1)} className="review red"><b>1</b> Chưa thuộc</button><button disabled={reviewing} onClick={() => reviewFlashcard(2)} className="review yellow"><b>2</b> Còn nhớ mơ hồ</button><button disabled={reviewing} onClick={() => reviewFlashcard(3)} className="review green"><b>3</b> Đã thuộc</button></div></div>}
      <div className="flash-edit-links"><button type="button" onClick={(event) => { event.preventDefault(); setEditMeaning(displayedMeaning); setPanel("edit"); }}>✎ Sửa thẻ</button><button type="button" onClick={(event) => { event.preventDefault(); setPanel("details"); }}>Xem thêm thông tin</button>{saveStatus && <span className="save-status">{saveStatus}</span>}</div>
      <div className="flash-session-stats"><div><span>Từ mới đã xem</span><b>10</b></div><div><span>Ôn tập đúng</span><b>12</b></div><div><span>Chuỗi học liên tục</span><b>5 ngày</b></div></div>
      {sessionSummary && <div className="flash-summary"><div className="flash-summary-heading"><div><span className="flash-kicker">ĐÃ HOÀN THÀNH BỘ THẺ</span><h2>Tổng kết buổi học</h2></div><button className="modal-close" onClick={() => setSessionSummary(null)} aria-label="Đóng">×</button></div><div className="flash-summary-grid"><div className="summary-mastered"><b>{sessionSummary.mastered}</b><span>Đã thuộc</span></div><div className="summary-uncertain"><b>{sessionSummary.uncertain}</b><span>Còn mơ hồ</span></div><div className="summary-learning"><b>{sessionSummary.learning}</b><span>Chưa thuộc</span></div></div><p>Bạn đã ôn {sessionSummary.reviewed} thẻ trong ngôn ngữ {card.language}.</p></div>}
      {panel && <div className="flash-detail-backdrop" onClick={() => setPanel(null)}><section className="flash-detail-panel" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setPanel(null)} aria-label="Đóng">×</button>{panel === "details" ? <><span className="flash-kicker">THÔNG TIN THẺ</span><h2>{card.term}</h2><p className="detail-pronunciation">/{card.ipa}/</p><dl><div><dt>Ngôn ngữ</dt><dd>{card.language}</dd></div><div><dt>Nghĩa</dt><dd>{displayedMeaning}</dd></div><div><dt>Ví dụ</dt><dd>{card.example}</dd></div><div><dt>Thẻ trong bộ</dt><dd>{card.progress} / {card.total}</dd></div></dl></> : <><span className="flash-kicker">CHỈNH SỬA THẺ</span><h2>{card.term}</h2><label className="detail-field">Nghĩa tiếng Việt<input value={editMeaning} onChange={(event) => setEditMeaning(event.target.value)} /></label>{saveError && <p className="save-error">{saveError}</p>}<div className="detail-panel-actions"><button className="danger-button" onClick={() => { if (window.confirm(`Xóa thẻ “${card.term}” khỏi bộ ${card.language}?`)) void onDeleteCard(card); }}>Xóa thẻ</button><span className="detail-actions-spacer" /><button className="outline-button" onClick={() => setPanel(null)}>Hủy</button><button className="primary-button" onClick={saveMeaning}>Lưu thay đổi</button></div></>}</section></div>}
      {languagePickerOpen && <div className="language-picker-backdrop" onClick={() => setLanguagePickerOpen(false)}><section className="language-picker" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="language-picker-heading"><div><span className="flash-kicker">HỌC CÙNG SMARTEDU</span><h2>Chọn ngôn ngữ để học</h2></div><button className="modal-close" onClick={() => setLanguagePickerOpen(false)} aria-label="Đóng">×</button></div><div className="language-search"><span>⌕</span><input autoFocus value={languageSearch} onChange={(event) => setLanguageSearch(event.target.value)} placeholder="Tìm kiếm ngôn ngữ..." /></div><div className="language-picker-grid">{languageGroups.map((group) => <div key={group.title}><h3>{group.title}</h3>{group.items.filter((item) => item.label.toLowerCase().includes(languageSearch.toLowerCase())).map((item) => <button key={item.label} className={item.index === activeIndex ? "picker-language selected" : "picker-language"} onClick={() => { selectLanguage(item.index); setLanguagePickerOpen(false); }}><img className="picker-flag" src={item.flagUrl} alt="" />{item.label}<small>{item.total} từ</small></button>)}</div>)}</div></section></div>}
      {createOpen && <div className="flash-detail-backdrop" onClick={() => setCreateOpen(false)}><section className="flash-detail-panel create-card-panel" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setCreateOpen(false)} aria-label="Đóng">×</button><span className="flash-kicker">THÊM THẺ MỚI · {deckTitle}</span><h2>Tạo flashcard</h2><div className="create-card-fields"><label>Từ vựng<input value={newTerm} onChange={(event) => setNewTerm(event.target.value)} placeholder="Ví dụ: negotiate" /></label><label>Phiên âm<input value={newPronunciation} onChange={(event) => setNewPronunciation(event.target.value)} placeholder="Ví dụ: /nɪˈɡəʊʃieɪt/" /></label><label>Nghĩa tiếng Việt<input value={newMeaning} onChange={(event) => setNewMeaning(event.target.value)} placeholder="Ví dụ: đàm phán" /></label><label>Câu ví dụ<input value={newExample} onChange={(event) => setNewExample(event.target.value)} placeholder="Câu sử dụng thực tế" /></label><label>Hình minh họa<input value={newVisual} onChange={(event) => setNewVisual(event.target.value)} placeholder="Emoji hoặc biểu tượng" /></label></div>{createError && <p className="save-error">{createError}</p>}<div className="detail-panel-actions"><button className="outline-button" onClick={() => setCreateOpen(false)}>Hủy</button><button className="primary-button" onClick={createCard}>Lưu thẻ mới</button></div></section></div>}
    </FlashcardLayout>
  </>;
}
