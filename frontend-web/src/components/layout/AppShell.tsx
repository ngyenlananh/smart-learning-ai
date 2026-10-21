import { ReactNode, useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { View } from "../../App";
import { getMe, logout } from "../../services/auth";
import { useTranslation } from "react-i18next";

type StoredSettings = { profile?: { name?: string } };

function initials(name: string) {
  return name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "MA";
}

const navItems: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "Tổng quan", icon: "⌂" }, { id: "courses", label: "Khóa học của tôi", icon: "▣" },
  { id: "exams", label: "Luyện thi & Đề", icon: "▤" }, { id: "flashcards", label: "Thẻ Flashcard", icon: "◇" },
  { id: "analytics", label: "Biểu đồ năng lực", icon: "▥" }, { id: "ai", label: "AI Tutor Chat", icon: "◯" },
];

export function AppShell({ view, search, onNavigate, onSearchChange, children }: { view: View; search: string; onNavigate: (view: View) => void; onSearchChange: (value: string) => void; children: ReactNode }) {
  const { t } = useTranslation();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [displayName, setDisplayName] = useState("Minh Anh");
  const [email, setEmail] = useState("minhanh@example.com");
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
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
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
    fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/settings`, { headers: { "X-User-Id": "demo-user" } })
      .then((response) => response.ok ? response.json() as Promise<{ data?: StoredSettings | null }> : Promise.reject(new Error("load")))
      .then((payload) => {
        const name = payload.data?.profile?.name?.trim();
        if (active && name) setDisplayName(name);
      })
      .catch(() => undefined);
    window.addEventListener("smartedu:settings-saved", applySettings);
    window.addEventListener("smartedu:email-saved", applyEmail);
    void getMe().then((user) => { if (active) { setDisplayName(user.fullName); setEmail(user.email); } }).catch(() => undefined);
    return () => { active = false; window.removeEventListener("smartedu:settings-saved", applySettings); window.removeEventListener("smartedu:email-saved", applyEmail); };
  }, []);

  function openLogout() { setLogoutOpen(true); }
  function closeLogout() { if (!logoutLoading) setLogoutOpen(false); }
  async function confirmLogout() {
    setLogoutLoading(true);
    await logout();
    window.location.href = "/login";
  }

  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">◈</span><span><strong>SmartEdu AI</strong><small>Learning & Exam</small></span></div><nav className="main-nav" aria-label={t("nav.dashboard")}>{navItems.map((item) => <button className={view === item.id ? "nav-item active" : "nav-item"} key={item.id} onClick={() => onNavigate(item.id)}><span className="nav-icon">{item.icon}</span>{t(`nav.${item.id}`)}</button>)}</nav><div className="sidebar-bottom"><button className={view === "settings" ? "nav-item active" : "nav-item"} onClick={() => onNavigate("settings")}><span className="nav-icon">⚙</span>{t("nav.settings")}</button><div className="sidebar-divider" /><div className="sidebar-account"><span className="sidebar-account-avatar">{initials(displayName)}</span><span><strong>{displayName}</strong><small title={email}>{email}</small></span></div><button className="nav-item sidebar-logout" aria-label={t("nav.logout")} title={t("nav.logout")} onClick={openLogout}><LogOut size={18} aria-hidden="true" /><span>{t("nav.logout")}</span></button></div></aside><main className="main-content"><header className="topbar"><div className="search-box"><span>⌕</span><input value={search} onChange={(event) => onSearchChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onNavigate("courses"); }} placeholder={t("header.search")} /></div><div className="top-actions"><button className="icon-button" aria-label={t("header.notifications")}>♧<i /></button><button className="avatar" aria-label={t("header.account", { name: displayName })}>{initials(displayName)}</button></div></header><div className="page-wrap">{children}</div></main>{logoutOpen && <div className="logout-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeLogout(); }}><div className="logout-dialog" role="dialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-description"><div className="logout-dialog-icon"><LogOut size={20} aria-hidden="true" /></div><h2 id="logout-title">{t("nav.logout")} SmartEdu AI?</h2><p id="logout-description">{t("dashboard.description")}</p>{hasUnsavedChanges && <p className="logout-unsaved">{t("settings.unsaved")}.</p>}<div className="logout-dialog-actions"><button className="outline-button" ref={stayButtonRef} type="button" onClick={closeLogout}>Ở lại</button><button className="logout-confirm-button" type="button" disabled={logoutLoading} onClick={() => void confirmLogout()}>{logoutLoading && <span className="logout-spinner" aria-hidden="true" />}{t("nav.logout")}</button></div></div></div>}</div>;
}
