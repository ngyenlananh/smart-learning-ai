import { FormEvent, useCallback, useEffect, useState } from "react";
import { Analytics } from "./components/analytics/Analytics";
import { Dashboard } from "./components/dashboard/Dashboard";
import { Exams } from "./components/exam/Exams";
import { Flashcards } from "./components/flashcard/Flashcards";
import { QuizCard, QuizFlashcards } from "./components/flashcard/QuizFlashcards";
import { AITutor } from "./components/ai-tutor/AITutor";
import { FlashcardDeck, FlashcardLayout } from "./components/flashcard/Flashcards";
import { Flashcard, languageOptions } from "./components/flashcard/flashcardData";
import { Courses } from "./components/learning/Courses";
import { AppShell } from "./components/layout/AppShell";
import { PageTitle } from "./components/common/PageTitle";
import { SettingsPage } from "./pages/SettingsPage";
import { AuthPage } from "./pages/AuthPage";
import { LandingPage } from "./pages/LandingPage";
import { isAuthenticated, refresh } from "./services/auth";
import "./styles/app.css";

export type View = "dashboard" | "courses" | "exams" | "flashcards" | "analytics" | "ai" | "settings";
type ChatMessage = { from: "ai" | "user"; text: string };
type Conversation = { id: string; title: string; updatedAt: string };
const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const [search, setSearch] = useState("");
  const [path, setPath] = useState(() => window.location.pathname);
  const [authReady, setAuthReady] = useState(path === "/");

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (path === "/") { setAuthReady(true); return; }
    setAuthReady(false);
    void refresh().finally(() => setAuthReady(true));
  }, [path]);

  function navigatePath(nextPath: string) {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }

  if (path === "/") {
    return <LandingPage />;
  }

  if (!authReady) return <main className="auth-page"><p>Đang khôi phục phiên đăng nhập...</p></main>;

  if (!isAuthenticated()) {
    if (path !== "/login" && path !== "/register") {
      window.history.replaceState({}, "", "/login");
      setPath("/login");
    }
    return <AuthPage mode={path === "/register" ? "register" : "login"} onSuccess={() => { window.history.replaceState({}, "", "/dashboard"); setPath("/dashboard"); }} onModeChange={(mode) => navigatePath(`/${mode}`)} />;
  }

  if (path === "/login" || path === "/register") {
    window.history.replaceState({}, "", "/dashboard");
    setPath("/dashboard");
  }

  function renderView() {
    if (view === "dashboard") return <Dashboard onNavigate={setView} />;
    if (view === "courses") return <Courses search={search} />;
    if (view === "exams") return <Exams />;
    if (view === "analytics") return <Analytics />;
    if (view === "flashcards") return <FlashcardsPage />;
    if (view === "ai") return <AITutorPage />;
    if (view === "settings") return <SettingsPage />;
    return <PageTitle title="Thẻ Flashcard" description="Học và ôn tập theo từng bộ thẻ của bạn." />;
  }

  return <AppShell view={view} search={search} onNavigate={setView} onSearchChange={setSearch}>{renderView()}</AppShell>;
}

function FlashcardsPage() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [card, setCard] = useState<Flashcard | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeLanguage, setActiveLanguage] = useState("en");
  const [reviewMode, setReviewMode] = useState(false);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [activeDeckId, setActiveDeckId] = useState("");
  const [quizCards, setQuizCards] = useState<QuizCard[]>([]);
  const [quizCard, setQuizCard] = useState<QuizCard | null>(null);

  useEffect(() => {
    fetch(`${API}/flashcards/decks`, { headers: { "X-User-Id": "demo-user" } })
      .then((response) => response.json())
      .then((payload) => {
        if (Array.isArray(payload.data)) {
          setDecks(payload.data);
          const firstValidDeck = payload.data.find((deck: FlashcardDeck) => typeof deck.id === "string" && deck.id.trim());
          setActiveDeckId(firstValidDeck?.id ?? "");
        }

      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const reloadDecks = () => {
      fetch(`${API}/flashcards/decks`, { headers: { "X-User-Id": "demo-user" } })
        .then((response) => response.json())
        .then((payload) => {
          if (!Array.isArray(payload.data)) return;
          setDecks(payload.data);
          if (!payload.data.some((deck: FlashcardDeck) => deck.id === activeDeckId)) setActiveDeckId(payload.data[0]?.id ?? "");
        })
        .catch(() => undefined);
    };
    window.addEventListener("smartedu:decks-reload", reloadDecks);
    return () => window.removeEventListener("smartedu:decks-reload", reloadDecks);
  }, [activeDeckId]);

  const activeDeck = decks.find((deck) => deck.id === activeDeckId);

  useEffect(() => {
    if (!activeDeck?.kind || activeDeck.kind !== "quiz") { setQuizCards([]); setQuizCard(null); return; }
    fetch(`${API}/flashcard-sets/${activeDeck.id}/cards`, { headers: { "X-User-Id": "demo-user" } })
      .then((response) => response.json())
      .then((payload) => { if (Array.isArray(payload.data)) { setQuizCards(payload.data); setQuizCard(payload.data[0] ?? null); } })
      .catch(() => undefined);
  }, [activeDeck?.id, activeDeck?.kind]);

  useEffect(() => {
    if (!activeDeck || activeDeck.kind !== "language") return;
    fetch(`${API}/flashcards?language=${activeLanguage}&deckId=${encodeURIComponent(activeDeck.id)}&limit=50`, { headers: { "X-User-Id": "demo-user" } })
      .then((response) => response.json())
      .then((payload) => {
        const loaded = Array.isArray(payload.data) ? payload.data.map((item: Record<string, unknown>) => ({
          deck: activeDeck.title,
          language: String(item.languageName ?? "ENGLISH").toUpperCase(),
          code: String(item.locale ?? "en-US"),
          flag: "🇬🇧",
          flagUrl: String(item.flagUrl ?? ""),
          term: String(item.term ?? ""),
          ipa: String(item.pronunciation ?? ""),
          meaning: String(item.meaning ?? ""),
          type: "Từ vựng",
          example: String(item.example ?? ""),
          exampleMeaning: String(item.translation ?? item.exampleMeaning ?? ""),
          translation: String(item.translation ?? ""),
          progress: Number(item.position ?? 1),
          total: Number(item.total ?? 0),
          visual: String(item.visual ?? "📚"),
        })) : [];
        setCards(loaded);
        setCard(loaded[0] ?? null);
        setFlipped(false);
      })
      .catch(() => {
        setCards([]);
        setCard(null);
      });
  }, [activeDeck?.id, activeDeck?.kind, activeLanguage]);

  useEffect(() => {
    setActiveLanguage("en");
    setActiveIndex(0);
  }, [activeDeck?.id]);

  useEffect(() => {
    const reloadQuiz = () => {
      if (!activeDeckId) return;
      fetch(`${API}/flashcards/decks`, { headers: { "X-User-Id": "demo-user" } }).then((response) => response.json()).then((payload) => { if (Array.isArray(payload.data)) setDecks(payload.data); }).catch(() => undefined);
      fetch(`${API}/flashcard-sets/${activeDeckId}/cards`, { headers: { "X-User-Id": "demo-user" } }).then((response) => response.json()).then((payload) => { if (Array.isArray(payload.data)) { setQuizCards(payload.data); setQuizCard(payload.data[0] ?? null); } }).catch(() => undefined);
    };
    window.addEventListener("smartedu:quiz-reload", reloadQuiz);
    return () => window.removeEventListener("smartedu:quiz-reload", reloadQuiz);
  }, [activeDeckId]);

  useEffect(() => {
    (window as Window & { __smartEduQuizCards?: QuizCard[] }).__smartEduQuizCards = quizCards;
    const handleQuizCard = (event: Event) => setQuizCard((event as CustomEvent<QuizCard>).detail);
    window.addEventListener("smartedu:quiz-card", handleQuizCard);
    return () => window.removeEventListener("smartedu:quiz-card", handleQuizCard);
  }, [quizCards]);

  const cardsForLanguage = card ? cards.filter((item) => item.language === card.language) : [];
  const selectCard = (nextCard: Flashcard | null) => { setCard(nextCard); setFlipped(false); };
  const nextCard = () => { if (card) selectCard(cardsForLanguage[(cardsForLanguage.indexOf(card) + 1) % cardsForLanguage.length] ?? card); };
  const previousCard = () => { if (card) selectCard(cardsForLanguage[(cardsForLanguage.indexOf(card) - 1 + cardsForLanguage.length) % cardsForLanguage.length] ?? card); };

  async function createDeck(title: string) {
    const response = await fetch(`${API}/flashcards/decks`, { method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": "demo-user" }, body: JSON.stringify({ title }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Không thể tạo bộ thẻ");
    if (payload.data) {
      setDecks((current) => [...current, payload.data]);
      setActiveDeckId(payload.data.id);
    }
  }

  async function refreshAfterImport() {
      const decksResponse = await fetch(`${API}/flashcards/decks`, { headers: { "X-User-Id": "demo-user" } });
      const decksPayload = await decksResponse.json();
      if (Array.isArray(decksPayload.data)) setDecks(decksPayload.data);
      if (activeDeck?.kind === "language") {
        const response = await fetch(`${API}/flashcards?language=en&deckId=${encodeURIComponent(activeDeck.id)}&limit=500`, { headers: { "X-User-Id": "demo-user" } });
        const payload = await response.json();
        const loaded = Array.isArray(payload.data) ? payload.data.map((item: Record<string, unknown>) => ({ deck: activeDeck.title, language: String(item.languageName ?? "ENGLISH").toUpperCase(), code: String(item.locale ?? "en-US"), flag: "🇬🇧", flagUrl: String(item.flagUrl ?? ""), term: String(item.term ?? ""), ipa: String(item.pronunciation ?? ""), meaning: String(item.meaning ?? ""), type: "Từ vựng", example: String(item.example ?? ""), exampleMeaning: String(item.translation ?? item.exampleMeaning ?? ""), translation: String(item.translation ?? ""), progress: Number(item.position ?? 1), total: Number(item.total ?? 0), visual: String(item.visual ?? "📚") })) : [];
        setCards(loaded); setCard(loaded[0] ?? null);
      } else if (activeDeck?.kind === "quiz") {
        const response = await fetch(`${API}/flashcard-sets/${activeDeck.id}/cards`, { headers: { "X-User-Id": "demo-user" } });
        const payload = await response.json();
        if (Array.isArray(payload.data)) { setQuizCards(payload.data); setQuizCard(payload.data[0] ?? null); }
    }
  }

  if (activeDeck?.kind === "quiz" && quizCard) return <QuizFlashcards card={quizCard} decks={decks} activeDeckId={activeDeckId} onCreateDeck={createDeck} onImportSaved={() => void refreshAfterImport()} onSelectDeck={(deck) => { setActiveDeckId(deck.id); setQuizCard(null); setFlipped(false); }} onProgress={(position) => {
    const reviewKey = `smartedu-quiz-review-${activeDeckId}-${position}`;
    if (localStorage.getItem(reviewKey)) return;
    setDecks((current) => current.map((deck) => deck.id === activeDeckId && deck.learned < deck.total ? { ...deck, learned: deck.learned + 1 } : deck));
    localStorage.setItem(reviewKey, "1");
    void fetch(`${API}/flashcard-sets/${activeDeckId}/cards/${position}/review`, { method: "POST", headers: { "X-User-Id": "demo-user" } });
  }} />;

  if (!card) return <FlashcardEmptyState decks={decks} activeDeckId={activeDeckId} onSelectDeck={(deck) => { setActiveDeckId(deck.id); setQuizCard(null); setCard(null); setFlipped(false); }} onCreateDeck={createDeck} onImportSaved={() => void refreshAfterImport()} onCreateCard={(newCard) => { setCards((current) => [...current, newCard]); setCard(newCard); setFlipped(false); }} />;

  return <Flashcards
    card={card}
    activeIndex={activeIndex}
    reviewDueCount={0}
    flipped={flipped}
    setFlipped={setFlipped}
    reviewCard={nextCard}
    previousCard={previousCard}
    selectLanguage={(index) => { const option = languageOptions[index]; setActiveIndex(index); setActiveLanguage(option.code.split("-")[0]); }}
    reviewMode={reviewMode}
    reviewPosition={1}
    reviewTotal={0}
    startReviewSession={() => setReviewMode(true)}
    onReviewRating={() => setReviewMode(false)}
    nextReviewCard={nextCard}
    previousReviewCard={previousCard}
    onCreateCard={(newCard) => { setCards((current) => [...current, newCard]); selectCard(newCard); }}
    onDeleteCard={async (deletedCard) => { const remaining = cards.filter((item) => item !== deletedCard); setCards(remaining); selectCard(remaining[0] ?? null); }}
    decks={decks}
    activeDeckId={activeDeck?.id ?? ""}
    deckTitle={activeDeck?.title ?? "Bộ thẻ của tôi"}
    deckKind={activeDeck?.kind}
    deckProgress={{ learned: activeDeck?.learned ?? 0, total: activeDeck?.total ?? cards.length }}
    onSelectDeck={(deck) => { setActiveDeckId(deck.id); setQuizCard(null); setCard(null); setFlipped(false); }}
    onCreateDeck={createDeck}
    onImportSaved={() => void refreshAfterImport()}
  />;
}

function FlashcardEmptyState({ decks, activeDeckId, onSelectDeck, onCreateDeck, onCreateCard, onImportSaved }: { decks: FlashcardDeck[]; activeDeckId: string; onSelectDeck: (deck: FlashcardDeck) => void; onCreateDeck: (title: string) => Promise<void>; onCreateCard: (card: Flashcard) => void; onImportSaved?: () => void }) {
  const [panel, setPanel] = useState<"manual" | "ai" | null>(null);
  const [term, setTerm] = useState("");
  const [meaning, setMeaning] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [error, setError] = useState("");
  const title = decks.find((deck) => deck.id === activeDeckId)?.title ?? "Bộ thẻ của tôi";
  async function saveCard() {
    if (!term.trim() || !meaning.trim()) { setError("Vui lòng nhập từ và nghĩa."); return; }
    try {
      const response = await fetch(`${API}/flashcards`, { method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": "demo-user" }, body: JSON.stringify({ language: "en", deckId: activeDeckId, term: term.trim(), pronunciation: pronunciation.trim(), meaning: meaning.trim(), example: "" }) });
      const payload = await response.json();
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "Không thể lưu thẻ");
      onCreateCard({ deck: title, language: "ENGLISH", code: "en-US", flag: "🇬🇧", flagUrl: "", term: payload.data.term, ipa: payload.data.pronunciation ?? "", meaning: payload.data.meaning, type: "Từ vựng", example: payload.data.example ?? "", exampleMeaning: "", progress: 1, total: 1, visual: "📚" });
      setPanel(null); setTerm(""); setMeaning(""); setPronunciation(""); setError("");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Không thể lưu thẻ"); }
  }
  return <FlashcardLayout decks={decks} activeDeckId={activeDeckId} onSelectDeck={onSelectDeck} onCreateDeck={onCreateDeck} onImportSaved={onImportSaved}><div className="flash-language-bar"><span className="selected-language-note">Đang học: <b>{title}</b></span><div className="flash-top-actions"><button type="button" className="add-card-button" onClick={() => { setError(""); setPanel("manual"); }}>＋ Thêm thẻ</button><button type="button" className="outline-button" onClick={() => setPanel("ai")}>Tạo thẻ bằng AI</button></div></div><div className="flash-deck-heading"><span className="flash-kicker">BỘ THẺ · {title}</span><h2>{title}</h2></div><div className="flash-progress"><span><b>Tiến độ: 0/0 thẻ</b></span><strong>Mục tiêu ngày: 0 thẻ</strong><i><em style={{ width: "0%" }} /></i></div><div className="flash-empty-state"><strong>Bộ thẻ này chưa có thẻ nào</strong><span>Hãy thêm thẻ thủ công hoặc tạo thẻ bằng AI để bắt đầu học.</span></div>
    {panel && <div className="flash-detail-backdrop" onClick={() => setPanel(null)}><section className="flash-detail-panel create-card-panel" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setPanel(null)} aria-label="Đóng">×</button><span className="flash-kicker">{panel === "ai" ? "TẠO THẺ BẰNG AI" : "THÊM THẺ MỚI"} · {title}</span><h2>{panel === "ai" ? "Tạo thẻ bằng AI" : "Thêm flashcard"}</h2>{panel === "ai" ? <><p>Nhập chủ đề hoặc nội dung để AI tạo thẻ cho bộ này.</p><textarea className="detail-textarea" placeholder="Ví dụ: Từ vựng tiếng Anh giao tiếp..." /><div className="detail-panel-actions"><button className="outline-button" onClick={() => setPanel(null)}>Đóng</button><button className="primary-button" onClick={() => setError("Tính năng AI đang được kết nối, vui lòng thử lại sau.")}>Tạo thẻ</button></div></> : <><div className="create-card-fields"><label>Từ / mặt trước<input autoFocus value={term} onChange={(event) => setTerm(event.target.value)} /></label><label>Nghĩa / mặt sau<input value={meaning} onChange={(event) => setMeaning(event.target.value)} /></label><label>Phiên âm (tùy chọn)<input value={pronunciation} onChange={(event) => setPronunciation(event.target.value)} /></label></div>{error && <p className="save-error">{error}</p>}<div className="detail-panel-actions"><button className="outline-button" onClick={() => setPanel(null)}>Đóng</button><button className="primary-button" onClick={() => void saveCard()}>Lưu thẻ</button></div></>}</section></div>}
  </FlashcardLayout>;
}

function AITutorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ from: "ai", text: "Chào bạn! Mình là SmartEdu AI Tutor. Bạn muốn hỏi về môn học nào hôm nay?" }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationError, setConversationError] = useState("");

  const loadConversations = useCallback(async () => {
    const response = await fetch(`${API}/ai/conversations`, { headers: { "X-User-Id": "demo-user" } });
    const payload = await response.json();
    if (!response.ok || !Array.isArray(payload.data)) throw new Error(payload.error || "Không thể tải lịch sử hội thoại");
    setConversations(payload.data);
  }, []);

  useEffect(() => {
    void loadConversations().catch(() => setConversationError("Không thể tải lịch sử hội thoại."));
  }, [loadConversations]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isLoading) return;
    const history = messages.map((item) => ({ role: item.from === "ai" ? "assistant" : "user", content: item.text }));
    setMessages((current) => [...current, { from: "user", text: message }]);
    setInput(""); setIsLoading(true);
    try {
      const response = await fetch(`${API}/ai/chat`, { method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": "demo-user" }, body: JSON.stringify({ message, history, conversationId: activeConversationId }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setMessages((current) => [...current, { from: "ai", text: payload.data.answer }]);
      if (payload.data.conversationId) setActiveConversationId(payload.data.conversationId);
      await loadConversations();
    } catch {
      setMessages((current) => [...current, { from: "ai", text: "Mình chưa thể kết nối lúc này. Bạn thử lại sau nhé." }]);
    } finally { setIsLoading(false); }
  }

  function newConversation() {
    setConversationError("");
    setActiveConversationId(null);
    setMessages([{ from: "ai", text: "Mình sẵn sàng. Bạn muốn hỏi về môn học nào?" }]);
  }

  async function selectConversation(conversationId: string) {
    if (conversationLoading) return;
    setConversationLoading(true);
    setConversationError("");
    try {
      const response = await fetch(`${API}/ai/conversations/${encodeURIComponent(conversationId)}/messages`, { headers: { "X-User-Id": "demo-user" } });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.data)) throw new Error(payload.error || "Không thể tải cuộc trò chuyện");
      setActiveConversationId(conversationId);
      setMessages(payload.data.map((item: { role: "user" | "assistant"; content: string }) => ({ from: item.role === "assistant" ? "ai" : "user", text: item.content })));
    } catch (error) {
      setConversationError(error instanceof Error ? error.message : "Không thể tải cuộc trò chuyện.");
    } finally {
      setConversationLoading(false);
    }
  }

  return <AITutor messages={messages} input={input} setInput={setInput} sendMessage={sendMessage} isLoading={isLoading || conversationLoading} conversations={conversations} activeConversationId={activeConversationId} conversationLoading={conversationLoading} conversationError={conversationError} onNewConversation={newConversation} onSelectConversation={(conversationId) => void selectConversation(conversationId)} />;
}
