import { useEffect, useRef, useState } from "react";
import { PageTitle } from "../common/PageTitle";
import { HeroBanner } from "../common/HeroBanner";
import { timeAgo } from "../../utils/timeAgo";
import { useTranslation } from "react-i18next";
import { BookOpen, Flame, Star, Sparkles, GraduationCap, Search, CheckCircle2 } from "lucide-react";

type Difficulty = "Dễ" | "Trung bình" | "Khó";
type Exam = {
  id: string;
  title: string;
  meta: string;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  ai: boolean;
  userCreated?: boolean;
  hidden?: boolean;
  attempts: number;
  bestScore?: number;
  latestScore?: number;
  questionCount: number;
  durationMinutes: number;
  createdAt?: string;
};
type Stats = {
  practicedExams: number;
  averageScore: number;
  streakDays: number;
};
type ExamQuestion = {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
};
type ExamDetail = Exam & { questions: ExamQuestion[] };
const API = "http://localhost:4000";
const USER_ID = "000000000000000000000001";

export function Exams() {
  const { t } = useTranslation();
  const [exams, setExams] = useState<Exam[]>([]);
  const [stats, setStats] = useState<Stats>({
    practicedExams: 0,
    averageScore: 0,
    streakDays: 0,
  });
  const [subject, setSubject] = useState("Tất cả môn");
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openExamMenuId, setOpenExamMenuId] = useState<string | null>(null);
  const [renameExamId, setRenameExamId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  async function loadData() {
    try {
      const params = new URLSearchParams({ search: query, subject, showHidden: String(showHidden) });
      const [examResponse, statsResponse] = await Promise.all([
        fetch(`${API}/exams?${params}`, { headers: { "X-User-Id": USER_ID } }),
        fetch(`${API}/exams/stats`, { headers: { "X-User-Id": USER_ID } }),
      ]);
      const examPayload = await examResponse.json();
      const statsPayload = await statsResponse.json();
      if (!examResponse.ok) throw new Error(examPayload.error);
      setExams(examPayload.data);
      if (statsResponse.ok) setStats(statsPayload.data);
      setError("");
    } catch {
      setError(
        "Không thể tải danh sách đề thi. Hãy kiểm tra backend đang chạy ở cổng 4000.",
      );
    }
  }
  useEffect(() => {
    void loadData();
  }, [query, subject, showHidden]);
  useEffect(() => {
    function handleExamClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.matches(".exam-item .course-button.compact")) return;
      const item = target.closest(".exam-item");
      const index = item
        ? [...document.querySelectorAll(".exam-item")].indexOf(item)
        : -1;
      if (index >= 0 && exams[index]) setActiveExamId(exams[index].id);
    }
    document.addEventListener("click", handleExamClick);
    return () => document.removeEventListener("click", handleExamClick);
  }, [exams]);
  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!(event.target as HTMLElement).closest(".exam-actions")) setOpenExamMenuId(null);
    }
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenExamMenuId(null);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);
  async function saveRename() {
    if (!renameExamId || !renameValue.trim()) return;
    const response = await fetch(`${API}/exams/${renameExamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: renameValue }),
    });
    if (!response.ok) {
      setError("Không thể đổi tên đề thi.");
      return;
    }
    setRenameExamId(null);
    setExams((current) => current.map((exam) => exam.id === renameExamId ? { ...exam, title: renameValue.trim() } : exam));
    setNotice("Đã đổi tên");
  }
  async function removeExam(exam: Exam) {
    const isSystemExam = !exam.userCreated && !exam.ai;
    const message = isSystemExam ? "Ẩn đề này khỏi danh sách của bạn?" : "Bạn có chắc muốn xóa đề thi này không?";
    if (!window.confirm(message)) return;
    const response = await fetch(`${API}/exams/${exam.id}${isSystemExam ? "/hide" : ""}`, { method: isSystemExam ? "POST" : "DELETE" });
    if (!response.ok) {
      setError(isSystemExam ? "Không thể ẩn đề thi." : "Không thể xóa đề thi.");
      return;
    }
    setOpenExamMenuId(null);
    setExams((current) => current.filter((item) => item.id !== exam.id));
    setNotice(isSystemExam ? "Đã ẩn đề" : "Đã xóa đề thi");
  }
  async function restoreExam(exam: Exam) {
    const response = await fetch(`${API}/exams/${exam.id}/unhide`, { method: "POST" });
    if (!response.ok) {
      setError("Không thể hiện đề thi.");
      return;
    }
    setExams((current) => current.filter((item) => item.id !== exam.id));
    setNotice("Đã hiện đề");
  }
  if (activeExamId)
    return (
      <ExamRunner
        examId={activeExamId}
        onBack={() => setActiveExamId(null)}
        onSubmitted={() => {
          setActiveExamId(null);
          void loadData();
        }}
      />
    );
  return (
    <>
      {/* HERO BANNER TRUYỀN CẢM HỨNG CHO TRANG LUYỆN TẬP & THI */}
      <HeroBanner
        tag="🎯 Trung tâm Luyện tập & Thi"
        title="Luyện tập & Thi"
        subtitle="Rèn luyện kỹ năng và nâng cao kiến thức với ngân hàng đề thi chuẩn hóa, tích hợp chấm điểm tức thì và giải thích chi tiết bởi AI."
        metrics={[
          {
            icon: BookOpen,
            label: "Đề đã luyện",
            value: stats.practicedExams,
            sub: "Theo dữ liệu của bạn",
            badgeClass: "target-badge",
          },
          {
            icon: Star,
            label: "Điểm trung bình",
            value: stats.averageScore ? `${stats.averageScore} / 10` : "-- / 10",
            sub: "Từ các lần nộp bài",
            badgeClass: "star-badge",
          },
          {
            icon: Flame,
            label: "Chuỗi luyện tập",
            value: `${stats.streakDays} ngày`,
            sub: "Tiếp tục duy trì",
            badgeClass: "flame-badge",
          },
        ]}
        headerAction={{
          sectionTitle: "Ngân hàng đề thi",
          sectionSubtitle: `${stats.practicedExams} đề đã hoàn thành · Điểm TB ${stats.averageScore || "--"}`,
          buttonText: "Luyện tập ngay",
          buttonIcon: Sparkles,
          onAction: () => setShowGenerator(true),
        }}
      />

      {/* 3 Thẻ thống kê độc lập kích thước lớn (số 32px+) */}
      <section className="exam-stats-modern">
        <div className="exam-stat-card-modern">
          <span className="exam-stat-icon-modern icon-blue">
            <BookOpen size={24} />
          </span>
          <div className="exam-stat-info">
            <small>Đề đã luyện</small>
            <strong className="stat-number-lg">{stats.practicedExams}</strong>
            <span className="stat-note-positive">Theo dữ liệu của bạn</span>
          </div>
        </div>

        <div className="exam-stat-card-modern">
          <span className="exam-stat-icon-modern icon-gold">
            <Star size={24} />
          </span>
          <div className="exam-stat-info">
            <small>Điểm trung bình</small>
            <strong className="stat-number-lg">
              {stats.averageScore || "--"}
              <em>/10</em>
            </strong>
            <span className="stat-note-muted">Từ các lần nộp bài</span>
          </div>
        </div>

        <div className="exam-stat-card-modern">
          <span className="exam-stat-icon-modern icon-cyan">
            <Flame size={24} />
          </span>
          <div className="exam-stat-info">
            <small>Chuỗi luyện tập</small>
            <strong className="stat-number-lg">
              {stats.streakDays}
              <em> ngày</em>
            </strong>
            <span className="stat-note-muted">Tiếp tục duy trì</span>
          </div>
        </div>
      </section>

      {/* Toolbar tìm kiếm & lọc đề thi (cao 44-48px) */}
      <section className="exam-toolbar-modern">
        <div className="exam-search-box-modern">
          <Search size={18} className="search-icon-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm đề, môn học, chủ đề..."
            aria-label="Tìm đề thi"
          />
        </div>
        <select
          className="subject-select-modern"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          aria-label="Lọc theo môn học"
        >
          <option>Tất cả môn</option>
          <option>Tư tưởng Hồ Chí Minh</option>
          <option>Lịch sử Đảng Cộng sản Việt Nam</option>
          <option>Mạng máy tính</option>
          <option>Cơ sở dữ liệu</option>
          <option>Tiếng Anh TOEIC</option>
        </select>
        <button
          className={`filter-pill hidden-exams-toggle pill-float ${showHidden ? "selected" : ""}`}
          onClick={() => setShowHidden((current) => !current)}
        >
          <span>{showHidden ? "Ẩn đề đã ẩn" : "Hiện đề đã ẩn"}</span>
        </button>
      </section>

      {error && <div className="error-note">{error}</div>}
      {notice && <div className="success-note">{notice}</div>}
      <div className="exam-result-count-modern">
        Tìm thấy <strong>{exams.length}</strong> đề thi phù hợp
      </div>

      {/* Danh sách đề thi dạng card bo tròn hiện đại */}
      <section className="exam-cards-list-modern">
        {exams.map((exam) => (
          <div className="modern-exam-card card-float" key={exam.id}>
            <span className={`modern-exam-icon ${exam.ai ? "blue" : subjectTone(exam.subject)}`}>
              {exam.ai ? "AI" : "ƒx"}
            </span>

            <div className="modern-exam-info">
              <h3 className="modern-exam-title">{exam.title}</h3>
              <p className="modern-exam-meta">
                {exam.meta.replace(/\s*·\s*vừa tạo\s*$/, "")} · {exam.createdAt ? timeAgo(exam.createdAt) : "đã tạo"}
              </p>
              <div className="modern-exam-status">
                {exam.attempts ? (
                  <>
                    <span className="status-check-modern">
                      <CheckCircle2 size={13} strokeWidth={2.5} />
                    </span>
                    <span>Đã làm {exam.attempts} lần · <b>Điểm gần nhất {exam.latestScore ?? exam.bestScore}/10</b></span>
                  </>
                ) : (
                  <>
                    <span className="status-dot-modern" />
                    <span>Chưa làm</span>
                  </>
                )}
              </div>
            </div>

            <div className="modern-exam-right">
              <span className={`modern-difficulty-badge ${exam.ai ? "blue" : subjectTone(exam.subject)}`}>
                {exam.difficulty}
              </span>

              <button
                type="button"
                className="modern-exam-action-btn btn-float"
                onClick={() => setActiveExamId(exam.id)}
              >
                <span>Làm bài</span>
              </button>

              <div
                className="exam-actions"
                onKeyDown={(event) => {
                  if (event.key === "Escape") setOpenExamMenuId(null);
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    const items = event.currentTarget.querySelectorAll<HTMLButtonElement>(".exam-menu-item");
                    const next = event.key === "ArrowDown" ? 0 : items.length - 1;
                    items[next]?.focus();
                  }
                }}
              >
                <button
                  className="exam-menu-toggle-modern"
                  aria-label={`Tùy chọn ${exam.title}`}
                  aria-expanded={openExamMenuId === exam.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenExamMenuId(openExamMenuId === exam.id ? null : exam.id);
                  }}
                >
                  ⋯
                </button>
                {openExamMenuId === exam.id && (
                  <div className="exam-menu" role="menu">
                    <button
                      className="exam-menu-item"
                      role="menuitem"
                      onClick={() => {
                        setRenameExamId(exam.id);
                        setRenameValue(exam.title);
                        setOpenExamMenuId(null);
                      }}
                    >
                      Đổi tên đề
                    </button>
                    <div className="exam-menu-separator" />
                    <button
                      className="exam-menu-item danger"
                      role="menuitem"
                      onClick={() => void (exam.hidden && !exam.userCreated ? restoreExam(exam) : removeExam(exam))}
                    >
                      {exam.userCreated ? "Xóa đề" : exam.hidden ? "Hiện đề" : "Ẩn đề"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>
      {!exams.length && !error && (
        <div className="empty-note exam-empty">
          Không tìm thấy đề phù hợp với bộ lọc hiện tại.
        </div>
      )}
      {showGenerator && (
        <ExamGenerator
          onClose={() => setShowGenerator(false)}
          onCreated={(createdExam) => {
            setShowGenerator(false);
            setExams((current) => [createdExam, ...current.filter((exam) => exam.id !== createdExam.id)]);
             setNotice("Đã tạo đề thi mới");
             void loadData();
          }}
        />
      )}
      {renameExamId && (
        <div className="rename-exam-backdrop" onMouseDown={() => setRenameExamId(null)}>
          <div className="rename-exam-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <h2>Đổi tên đề</h2>
            <input
              autoFocus
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void saveRename();
                if (event.key === "Escape") setRenameExamId(null);
              }}
              aria-label="Tên đề mới"
            />
            <div className="rename-exam-actions">
              <button className="outline-button" onClick={() => setRenameExamId(null)}>Hủy</button>
              <button className="primary-button terracotta" onClick={() => void saveRename()}>Lưu</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function subjectTone(subject: string): string {
  return subject.includes("Vật lý")
    ? "rose"
    : subject.includes("Ngôn ngữ")
      ? "mint"
      : subject.includes("Cơ sở dữ liệu")
        ? "blue"
        : "gold";
}

function normalizeVietnamese(value: string): string {
  return value
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function highlightSubject(subject: string, query: string) {
  const normalizedQuery = normalizeVietnamese(query).trim();
  if (!normalizedQuery) return subject;
  const characters = Array.from(subject);
  const normalizedCharacters = characters.map(normalizeVietnamese);
  const normalizedSubject = normalizedCharacters.join("");
  const start = normalizedSubject.indexOf(normalizedQuery);
  if (start < 0) return subject;
  let originalStart = 0;
  let originalEnd = subject.length;
  let normalizedPosition = 0;
  for (let index = 0; index < normalizedCharacters.length; index += 1) {
    if (normalizedPosition <= start && start < normalizedPosition + normalizedCharacters[index].length) originalStart = characters.slice(0, index).join("").length;
    if (normalizedPosition < start + normalizedQuery.length && start + normalizedQuery.length <= normalizedPosition + normalizedCharacters[index].length) {
        originalEnd = characters.slice(0, index + 1).join("").length;
        break;
    }
    normalizedPosition += normalizedCharacters[index].length;
  }
  return (
    <>
        {subject.slice(0, originalStart)}
        <strong>{subject.slice(originalStart, originalEnd)}</strong>
        {subject.slice(originalEnd)}
    </>
  );
}

function ExamRunner({
  examId,
  onBack,
  onSubmitted,
}: {
  examId: string;
  onBack: () => void;
  onSubmitted: () => void;
}) {
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    correctCount: number;
    totalQuestions: number;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`${API}/exams/${examId}`)
      .then((response) => response.json())
      .then((payload) => {
        if (!payload.data) throw new Error();
        setExam(payload.data);
      })
      .catch(() => setError("Không thể tải đề thi."))
      .finally(() => setLoading(false));
  }, [examId]);
  useEffect(() => {
    if (loading || result) return;
    const timer = window.setInterval(
      () => setSeconds((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [loading, result]);
  async function submit() {
    setSubmitting(true);
    try {
      const response = await fetch(`${API}/exams/${examId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, durationSeconds: seconds }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error();
      setResult(payload.data);
    } catch {
      setError("Không thể nộp bài. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }
  if (loading)
    return (
      <div className="exam-runner">
        <div className="loading-note">Đang tải đề thi...</div>
      </div>
    );
  if (error && !exam)
    return (
      <div className="exam-runner">
        <div className="error-note">{error}</div>
        <button className="outline-button" onClick={onBack}>
          ← Quay lại
        </button>
      </div>
    );
  if (!exam) return null;
  if (result)
    return (
      <div className="exam-runner">
        <div className="exam-result-panel">
          <span className="section-kicker">KẾT QUẢ BÀI THI</span>
          <h1>{exam.title}</h1>
          <strong className="exam-score">{result.score}/10</strong>
          <p>
            Đúng {result.correctCount}/{result.totalQuestions} câu · Thời gian{" "}
            {formatTime(seconds)}
          </p>
          <button className="primary-button" onClick={onSubmitted}>
            Về danh sách đề
          </button>
        </div>
      </div>
    );
  const question = exam.questions[current];
  return (
    <div className="exam-runner">
      <div className="exam-runner-header">
        <button className="outline-button" onClick={onBack}>
          ← Thoát
        </button>
        <div>
          <span className="section-kicker">{exam.subject}</span>
          <h1>{exam.title}</h1>
        </div>
        <strong className="exam-timer">{formatTime(seconds)}</strong>
      </div>
      <div className="exam-runner-layout">
        <aside className="question-nav">
          <small>CÂU HỎI</small>
          <div>
            {exam.questions.map((item, index) => (
              <button
                className={[current === index ? "current" : "", answers[item.id] !== undefined && answers[item.id] !== item.correctAnswer ? "wrong" : answers[item.id] !== undefined ? "answered" : ""].filter(Boolean).join(" ")}
                key={item.id}
                onClick={() => setCurrent(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </aside>
        <main className="question-panel">
          <div className="question-progress">
            <span>
              Câu {current + 1}/{exam.questions.length}
            </span>
            <div className="progress-track">
              <i
                style={{
                  width: `${((current + 1) / exam.questions.length) * 100}%`,
                }}
              />
            </div>
          </div>
          <h2>{question.text}</h2>
          <div className="answer-list">
            {question.options.map((option, index) => (
              <button
                className={
                  answers[question.id] === index
                    ? question.correctAnswer === index
                      ? "answer selected correct"
                      : "answer selected wrong"
                    : answers[question.id] !== undefined &&
                        question.correctAnswer === index
                      ? "answer correct"
                      : "answer"
                }
                key={option}
                onClick={() =>
                  setAnswers((items) => ({ ...items, [question.id]: index }))
                }
              >
                <b>{String.fromCharCode(65 + index)}</b>
                <span>{option}</span>
              </button>
            ))}
          </div>
          <div className="question-actions">
            <button
              className="outline-button"
              disabled={current === 0}
              onClick={() => setCurrent((value) => value - 1)}
            >
              ← Câu trước
            </button>
            {current < exam.questions.length - 1 ? (
              <button
                className="primary-button"
                onClick={() => setCurrent((value) => value + 1)}
              >
                Câu tiếp theo →
              </button>
            ) : (
              <button
                className="primary-button terracotta"
                disabled={submitting}
                onClick={() => void submit()}
              >
                {submitting ? "Đang nộp..." : "Nộp bài"}
              </button>
            )}
          </div>
          {error && <div className="error-note">{error}</div>}
        </main>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function ExamGenerator({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (exam: Exam) => void;
}) {
  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState("Tư tưởng Hồ Chí Minh");
  const [topic, setTopic] = useState("Cơ sở hình thành tư tưởng");
  const [level, setLevel] = useState("Trung bình");
  const [questionCount, setQuestionCount] = useState("30");
  const [minutes, setMinutes] = useState("45");
  const [format, setFormat] = useState("Trắc nghiệm");
  const [customPrompt, setCustomPrompt] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploadedDocument, setUploadedDocument] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [subjectQuery, setSubjectQuery] = useState(subject);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [highlightedSubject, setHighlightedSubject] = useState(0);
  const subjectRef = useRef<HTMLLabelElement>(null);
  const subjects = [
    "Tư tưởng Hồ Chí Minh",
    "Lịch sử Đảng Cộng sản Việt Nam",
    "Mạng máy tính",
    "Cơ sở dữ liệu",
    "Tiếng Anh TOEIC",
  ];
  const normalizedQuery = normalizeVietnamese(subjectQuery);
  const filteredSubjects = subjects.filter((item) =>
    normalizeVietnamese(item).includes(normalizedQuery),
  );
  useEffect(() => {
    function closeSubjectList(event: MouseEvent) {
      if (!subjectRef.current?.contains(event.target as Node)) {
        setSubjectOpen(false);
        const customSubject = subjectQuery.trim();
        if (customSubject) {
          setSubject(customSubject);
          setSubjectQuery(customSubject);
        } else {
          setSubjectQuery(subject);
        }
      }
    }
    document.addEventListener("mousedown", closeSubjectList);
    return () => document.removeEventListener("mousedown", closeSubjectList);
  }, [subject]);
  useEffect(() => {
    setHighlightedSubject(0);
  }, [subjectQuery]);
  function chooseSubject(value: string) {
    setSubject(value);
    setSubjectQuery(value);
    setSubjectOpen(false);
  }
  const summary = `${subject} · ${level} · ${questionCount} câu · ${minutes} phút`;
  async function createExam() {
    setLoading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("subject", subject);
      body.append("topic", topic);
      body.append("difficulty", level);
      body.append("questionCount", questionCount);
      body.append("durationMinutes", minutes);
      body.append("format", format);
      body.append("prompt", customPrompt);
      if (uploadedDocument) body.append("document", uploadedDocument);
      const response = await fetch(`${API}/exams/generate`, {
        method: "POST",
        headers: { "X-User-Id": USER_ID },
        body,
      });
      const payload = await response.json().catch(() => null) as { error?: string; data?: Exam } | null;
      console.log("[ExamGenerator] create exam response", {
        status: response.status,
        ok: response.ok,
        payload,
      });
      if (!response.ok) {
        if (response.status === 429 || response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504) {
          throw new Error("AI đang quá tải, vui lòng thử lại sau ít phút.");
        }
        throw new Error(payload?.error || "Không thể tạo đề thi.");
      }
      if (!payload?.data) throw new Error("Backend không trả về đề thi vừa tạo.");
      onCreated(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tạo đề lúc này. Hãy kiểm tra backend hoặc thử lại.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="modal-backdrop" onClick={(event) => {
      if (!loading && event.target === event.currentTarget) onClose();
    }}>
      <section
        className="generator-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <span className="section-kicker">TRỢ LÝ TẠO ĐỀ</span>
            <h2>{loading ? "Đang tạo đề thi" : "Tạo đề thi bằng AI"}</h2>
          </div>
          <button className="modal-close" onClick={onClose} disabled={loading} aria-label="Đóng">
            ×
          </button>
        </div>
        {loading ? (
          <div className="generator-loading">
            <h3>
              Đang khởi tạo {questionCount} câu hỏi {format.toLowerCase()}...
            </h3>
            <p>
              Hệ thống đang phân tích kiến thức và điều chỉnh độ khó theo yêu
              cầu của bạn.
            </p>
            <div className="loading-progress">
              <i />
            </div>
            <small>Đang chuẩn bị nội dung học tập</small>
          </div>
        ) : (
          <>
            <div className="generator-steps">
              <span className={step >= 1 ? "active" : ""}>
                01 <b>Môn học & chủ đề</b>
              </span>
              <i />
              <span className={step >= 2 ? "active" : ""}>
                02 <b>Cấu hình đề</b>
              </span>
              <i />
              <span className={step >= 3 ? "active" : ""}>
                03 <b>Tùy chọn</b>
              </span>
            </div>
            {step === 1 && (
              <div className="generator-fields">
                <label ref={subjectRef}>
                  Môn học
                  <div className="subject-combobox">
                    <input
                      role="combobox"
                      aria-expanded={subjectOpen}
                      aria-controls="exam-subject-options"
                      aria-autocomplete="list"
                      value={subjectQuery}
                      onFocus={() => setSubjectOpen(true)}
                      onChange={(event) => {
                        setSubjectQuery(event.target.value);
                        setSubjectOpen(true);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          setSubjectOpen(true);
                          setHighlightedSubject((current) => filteredSubjects.length ? (current + 1) % filteredSubjects.length : 0);
                        } else if (event.key === "ArrowUp") {
                          event.preventDefault();
                          setSubjectOpen(true);
                          setHighlightedSubject((current) => filteredSubjects.length ? (current - 1 + filteredSubjects.length) % filteredSubjects.length : 0);
                        } else if (event.key === "Enter" && subjectOpen && filteredSubjects[highlightedSubject]) {
                          event.preventDefault();
                          chooseSubject(filteredSubjects[highlightedSubject]);
                        } else if (event.key === "Enter" && subjectOpen && subjectQuery.trim()) {
                          event.preventDefault();
                          chooseSubject(subjectQuery.trim());
                        } else if (event.key === "Escape") {
                          setSubjectOpen(false);
                          setSubjectQuery(subject);
                        }
                      }}
                      placeholder="Tìm môn học..."
                    />
                    <span className="subject-combobox-arrow" aria-hidden="true">▾</span>
                    {subjectOpen && <div className="subject-options" id="exam-subject-options" role="listbox">
                      {filteredSubjects.length ? filteredSubjects.map((item, index) => (
                        <button
                          type="button"
                          role="option"
                          aria-selected={subject === item}
                          className={index === highlightedSubject ? "subject-option highlighted" : "subject-option"}
                          key={item}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => chooseSubject(item)}
                        >
                          {highlightSubject(item, subjectQuery)}
                        </button>
                      )) : <div className="subject-empty"><span>Không tìm thấy môn học</span>{subjectQuery.trim() && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSubject(subjectQuery.trim())}>Dùng “{subjectQuery.trim()}”</button>}</div>}
                    </div>}
                  </div>
                </label>
                <label>
                  Chủ đề / dạng bài
                  <input
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="Nhập chủ đề muốn luyện..."
                  />
                </label>
              </div>
            )}
            {step === 2 && (
              <div className="generator-fields">
                <fieldset>
                  <legend>Độ khó</legend>
                  <div className="segmented">
                    {["Dễ", "Trung bình", "Khó", "Theo năng lực"].map(
                      (item) => (
                        <button
                          className={level === item ? "selected" : ""}
                          key={item}
                          onClick={() => setLevel(item)}
                        >
                          {item}
                        </button>
                      ),
                    )}
                  </div>
                </fieldset>
                <div className="field-grid">
                  <label>
                    Số câu hỏi
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={questionCount}
                      onChange={(event) => setQuestionCount(event.target.value)}
                    />
                  </label>
                  <label>
                    Thời gian (phút)
                    <input
                      type="number"
                      min="10"
                      max="180"
                      value={minutes}
                      onChange={(event) => setMinutes(event.target.value)}
                    />
                  </label>
                </div>
                <fieldset>
                  <legend>Hình thức</legend>
                  <div className="segmented">
                    {["Trắc nghiệm", "Tự luận", "Hỗn hợp"].map((item) => (
                      <button
                        className={format === item ? "selected" : ""}
                        key={item}
                        onClick={() => setFormat(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}
            {step === 3 && (
              <div className="generator-fields">
                <label>
                  Tải tài liệu hoặc đề mẫu{" "}
                  <span className="optional">(tùy chọn)</span>
                  <input
                    className="file-input"
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={(event) => {
                      const selected = event.target.files?.[0] ?? null;
                      setUploadedDocument(selected);
                      setFileName(selected?.name ?? "");
                    }}
                  />
                  {fileName && (
                    <small className="file-name">✓ {fileName}</small>
                  )}
                </label>
                <label>
                  Yêu cầu riêng cho AI{" "}
                  <span className="optional">(tùy chọn)</span>
                  <textarea
                    value={customPrompt}
                    onChange={(event) => setCustomPrompt(event.target.value)}
                    placeholder="VD: Tập trung vào phần vận dụng cao..."
                    rows={4}
                  />
                </label>
              </div>
            )}
            {error && <div className="error-note">{error}</div>}
            <div className="generator-summary">
              <small>TÓM TẮT CẤU HÌNH</small>
              <strong>{summary}</strong>
              {customPrompt && <span> · Có yêu cầu riêng</span>}
            </div>
            <div className="generator-actions">
              {step > 1 && (
                <button
                  className="outline-button"
                  onClick={() => setStep((current) => current - 1)}
                  disabled={loading}
                >
                  ← Quay lại
                </button>
              )}
              {step < 3 ? (
                <button
                  className="primary-button terracotta"
                  onClick={() => setStep((current) => current + 1)}
                  disabled={loading}
                >
                  Tiếp tục →
                </button>
              ) : (
                <button
                  className="primary-button terracotta"
                  onClick={() => void createExam()}
                  disabled={loading}
                >
                  {loading ? "Đang tạo đề..." : error ? "Thử lại" : "Tạo đề ngay"}
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
