import { ReactNode, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Layers,
  BarChart3,
  MessageSquare,
  Settings,
  LogOut,
  Search,
  Bell,
  Sparkles,
  Bot,
  ArrowRight,
} from "lucide-react";
import { View } from "../../App";
import { getMe, logout } from "../../services/auth";
import { useTranslation } from "react-i18next";

type StoredSettings = { profile?: { name?: string } };

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "É";
}

function getGreeting(name: string) {
  const hour = new Date().getHours();
  if (hour < 12) return `Chào buổi sáng, ${name} 👋`;
  if (hour < 18) return `Chào buổi chiều, ${name} 👋`;
  return `Chào buổi tối, ${name} 👋`;
}

const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { id: "courses", label: "Khóa học của tôi", icon: BookOpen },
  { id: "exams", label: "Luyện tập & Thi", icon: GraduationCap },
  { id: "flashcards", label: "Thẻ Flashcard", icon: Layers },
  { id: "analytics", label: "Hiệu suất", icon: BarChart3 },
  { id: "ai", label: "Gia sư AI", icon: MessageSquare },
];

export function AppShell({
  view,
  search,
  onNavigate,
  onSearchChange,
  children,
}: {
  view: View;
  search: string;
  onNavigate: (view: View) => void;
  onSearchChange: (value: string) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [displayName, setDisplayName] = useState("Énn");
  const [email, setEmail] = useState("enn@smartedu.vn");
  const stayButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!logoutOpen) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    setHasUnsavedChanges(Boolean(document.querySelector(".settings-actions")));
    stayButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLogoutOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = document.querySelector<HTMLDivElement>(".logout-dialog");
      const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>("button:not(:disabled)")) : [];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      lastFocusedRef.current?.focus();
    };
  }, [logoutOpen]);

  useEffect(() => {
    let active = true;
    const applySettings = (event: Event) => {
      const settings = (event as CustomEvent<StoredSettings>).detail;
      const name = settings.profile?.name?.trim();
      if (name) setDisplayName(name);
    };
    const applyEmail = (event: Event) => {
      const nextEmail = (event as CustomEvent<string>).detail;
      if (typeof nextEmail === "string" && nextEmail) setEmail(nextEmail);
    };
    fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/settings`, {
      headers: { "X-User-Id": "demo-user" },
    })
      .then((response) => (response.ok ? (response.json() as Promise<{ data?: StoredSettings | null }>) : Promise.reject(new Error("load"))))
      .then((payload) => {
        const name = payload.data?.profile?.name?.trim();
        if (active && name) setDisplayName(name);
      })
      .catch(() => undefined);
    window.addEventListener("smartedu:settings-saved", applySettings);
    window.addEventListener("smartedu:email-saved", applyEmail);
    void getMe()
      .then((user) => {
        if (active) {
          setDisplayName(user.fullName || "Énn");
          setEmail(user.email);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
      window.removeEventListener("smartedu:settings-saved", applySettings);
      window.removeEventListener("smartedu:email-saved", applyEmail);
    };
  }, []);

  function openLogout() {
    setLogoutOpen(true);
  }
  function closeLogout() {
    if (!logoutLoading) setLogoutOpen(false);
  }
  async function confirmLogout() {
    setLogoutLoading(true);
    await logout();
    window.location.href = "/login";
  }

  return (
    <div className="app-shell">
      {/* 2. SIDEBAR DARK GRADIENT ĐẲNG CẤP (#0b1330 -> #0e2a5c) */}
      <aside className="sidebar dark-sidebar">
        {/* Brand Logo có Glow nhẹ */}
        <div className="brand brand-glow" onClick={() => onNavigate("dashboard")} role="button" tabIndex={0}>
          <div className="brand-mark-glow">
            <span className="brand-mark">◈</span>
          </div>
          <div className="brand-text">
            <strong>SmartEdu AI</strong>
            <small>Learning & Exam</small>
          </div>
        </div>

        {/* Menu Navigation tiếng Việt chuẩn mực */}
        <nav className="main-nav" aria-label="Điều hướng chính">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = view === item.id;
            return (
              <button
                className={`nav-item dark-nav-item ${isActive ? "active" : ""}`}
                key={item.id}
                onClick={() => onNavigate(item.id)}
              >
                <span className="nav-icon">
                  <IconComponent size={22} />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Thẻ mẹo học tập / Gia sư AI ở cuối Sidebar */}
        <div className="sidebar-tutor-tip-card" onClick={() => onNavigate("ai")} role="button" tabIndex={0}>
          <div className="tip-card-header">
            <span className="tip-bot-icon">
              <Bot size={18} />
            </span>
            <span className="tip-badge">Trợ lý AI</span>
          </div>
          <p className="tip-text">
            Bạn cần giải thích bài học hay làm đề ôn luyện riêng?
          </p>
          <button type="button" className="tip-action-btn">
            <span>Hỏi Gia sư AI</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Chân Sidebar: Cài đặt, Tài khoản, Đăng xuất */}
        <div className="sidebar-bottom dark-sidebar-bottom">
          <button
            className={`nav-item dark-nav-item ${view === "settings" ? "active" : ""}`}
            onClick={() => onNavigate("settings")}
          >
            <span className="nav-icon">
              <Settings size={22} />
            </span>
            <span>Cài đặt hệ thống</span>
          </button>

          <div className="sidebar-divider dark-divider" />

          <div className="sidebar-account dark-account">
            <span className="sidebar-account-avatar gradient-avatar">{initials(displayName)}</span>
            <div className="account-text-wrap">
              <strong>{displayName}</strong>
              <small title={email}>{email}</small>
            </div>
          </div>

          <button
            className="nav-item dark-nav-item sidebar-logout"
            aria-label="Đăng xuất"
            title="Đăng xuất khỏi hệ thống"
            onClick={openLogout}
          >
            <span className="nav-icon">
              <LogOut size={22} aria-hidden="true" />
            </span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* 3. TOPBAR RỘNG RÃI, Ô TÌM KIẾM TO, CHUÔNG NHẤP NHÁY & LỜI CHÀO */}
        <header className="topbar modern-topbar">
          <div className="search-box modern-search-box">
            <Search size={18} className="search-icon" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onNavigate("courses");
              }}
              placeholder="Tìm kiếm khóa học, đề thi, chủ đề..."
            />
            <kbd className="search-shortcut-kbd">Ctrl K</kbd>
          </div>

          <div className="top-actions">
            {/* Lời chào buổi tối / buổi sáng thân thiện */}
            <div className="topbar-user-greeting">
              <span>{getGreeting(displayName)}</span>
            </div>

            {/* Chuông thông báo có chấm đỏ nhấp nháy nhẹ */}
            <button
              className="icon-button notification-btn btn-float"
              aria-label="Thông báo hệ thống"
              title="Thông báo mới"
              onClick={() => alert("Bạn có 2 bài tập cần hoàn thành trước Chủ nhật!")}
            >
              <Bell size={19} />
              <i className="notification-pulse-dot" />
            </button>

            {/* Avatar tròn viền gradient nổi khối */}
            <button
              className="avatar gradient-avatar-btn btn-float"
              aria-label={`Tài khoản ${displayName}`}
              onClick={() => onNavigate("settings")}
            >
              {initials(displayName)}
            </button>
          </div>
        </header>

        {/* Khổ rộng thoáng đãng (max-w 1400px), lề rộng rãi */}
        <div className="page-wrap wide-page-wrap">{children}</div>
      </main>

      {/* Modal đăng xuất */}
      {logoutOpen && (
        <div
          className="logout-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeLogout();
          }}
        >
          <div
            className="logout-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            aria-describedby="logout-description"
          >
            <div className="logout-dialog-icon">
              <LogOut size={20} aria-hidden="true" />
            </div>
            <h2 id="logout-title">Đăng xuất khỏi SmartEdu AI?</h2>
            <p id="logout-description">
              Bạn có chắc chắn muốn kết thúc phiên học tập hiện tại không?
            </p>
            {hasUnsavedChanges && <p className="logout-unsaved">Bạn có thay đổi chưa lưu trong cài đặt.</p>}
            <div className="logout-dialog-actions">
              <button className="outline-button btn-float" ref={stayButtonRef} type="button" onClick={closeLogout}>
                Ở lại học tiếp
              </button>
              <button
                className="logout-confirm-button btn-float"
                type="button"
                disabled={logoutLoading}
                onClick={() => void confirmLogout()}
              >
                {logoutLoading && <span className="logout-spinner" aria-hidden="true" />}
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
