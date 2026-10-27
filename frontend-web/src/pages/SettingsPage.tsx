import { useEffect, useState } from "react";
import { Bot, CalendarDays, Cloud, Link2, LockKeyhole, Palette, Plug, UserRound, Shield, type LucideIcon } from "lucide-react";
import { HeroBanner } from "../components/common/HeroBanner";
import { getMe } from "../services/auth";
import { apiFetch } from "../services/api";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
type Tab = "account" | "ai" | "appearance" | "security" | "integrations";
type Settings = {
  profile: { name: string; birthDate: string; phone: string; education: string; level: string };
  ai: { voice: string; address: string; tone: string; explanation: string; suggestions: boolean; history: boolean };
  appearance: { language: string; theme: string; fontSize: string };
  security: { twoFactor: boolean };
  integrations: Record<string, boolean>;
};
const defaultSettings: Settings = { profile: { name: "Minh Anh", birthDate: "2005-08-12", phone: "0987654321", education: "Đại học", level: "Trung cấp" }, ai: { voice: "Nữ miền Nam", address: "Thầy/cô – em", tone: "Thân thiện", explanation: "Cân bằng", suggestions: true, history: true }, appearance: { language: "Tiếng Việt", theme: "Sáng", fontSize: "Vừa 16px" }, security: { twoFactor: false }, integrations: { Google: true, "Google Calendar": false, "Google Drive": false, Notion: false } };
const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "account", label: "Tài khoản & Hồ sơ", icon: UserRound },
  { id: "ai", label: "Cài đặt Gia sư AI", icon: Bot },
  { id: "appearance", label: "Giao diện & Ngôn ngữ", icon: Palette },
  { id: "security", label: "Bảo mật", icon: LockKeyhole },
  { id: "integrations", label: "Tích hợp", icon: Plug },
];
const integrationDetails: Record<string, { description: string; icon: LucideIcon }> = { Google: { description: "Đăng nhập và đồng bộ tài khoản", icon: Link2 }, "Google Calendar": { description: "Đồng bộ lịch học và lịch nhắc", icon: CalendarDays }, "Google Drive": { description: "Lưu và mở tài liệu học tập", icon: Cloud }, Notion: { description: "Lưu ghi chú và kế hoạch học tập", icon: LockKeyhole } };
function cloneSettings(settings: Settings): Settings { return JSON.parse(JSON.stringify(settings)) as Settings; }

export function SettingsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("account"); const [settings, setSettings] = useState(cloneSettings(defaultSettings)); const [savedSettings, setSavedSettings] = useState(cloneSettings(defaultSettings)); const [toast, setToast] = useState(""); const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);
  useEffect(() => {
    let active = true;
    void fetch(`${API}/settings`, { headers: { "X-User-Id": "demo-user" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("load");
        const payload = await response.json() as { data?: Settings | null };
        if (active && payload.data) {
          const savedLanguage = localStorage.getItem("smartedu-language");
          const nextSettings = savedLanguage ? { ...payload.data, appearance: { ...payload.data.appearance, language: savedLanguage === "en" ? "English" : "Tiếng Việt" } } : payload.data;
          setSettings(nextSettings);
          setSavedSettings(cloneSettings(nextSettings));
        }
      })
      .then(() => { if (active) void i18n.changeLanguage(localStorage.getItem("smartedu-language") === "en" ? "en" : "vi"); })
      .catch(() => { if (active) setErrors({ general: t("settings.loadError") }); });
    return () => { active = false; };
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = settings.appearance.theme === "Tối" ? "dark" : "light"; document.documentElement.style.fontSize = settings.appearance.fontSize.startsWith("Nhỏ") ? "14px" : settings.appearance.fontSize.startsWith("Lớn") ? "18px" : "16px"; return () => { document.documentElement.dataset.theme = "light"; document.documentElement.style.fontSize = "16px"; }; }, [settings.appearance]);
  function updateSection<K extends keyof Settings>(section: K, value: Settings[K]) { setSettings((current) => ({ ...current, [section]: value })); }
  function updateProfile(field: keyof Settings["profile"], value: string) { updateSection("profile", { ...settings.profile, [field]: value }); }
  function validate() { const next: Record<string, string> = {}; if (!settings.profile.name.trim()) next.name = "Nhập họ và tên để tiếp tục."; if (!/^\d{9,15}$/.test(settings.profile.phone)) next.phone = "Số điện thoại phải gồm 9–15 chữ số."; setErrors(next); return Object.keys(next).length === 0; }
  async function saveSettings() { if (!validate()) { setTab("account"); return; } try { const response = await fetch(`${API}/settings`, { method: "PUT", headers: { "Content-Type": "application/json", "X-User-Id": "demo-user" }, body: JSON.stringify(settings) }); if (!response.ok) { const payload = await response.json().catch(() => null) as { error?: string } | null; throw new Error(payload?.error ?? "Không thể lưu cài đặt."); } setSavedSettings(cloneSettings(settings)); localStorage.setItem("smartedu-language", settings.appearance.language === "English" ? "en" : "vi"); setErrors({}); window.dispatchEvent(new CustomEvent("smartedu:settings-saved", { detail: settings })); setToast(t("settings.saved")); window.setTimeout(() => setToast(""), 2600); } catch (error) { setErrors({ general: error instanceof Error ? error.message : "Không thể lưu cài đặt." }); } }
  function cancelChanges() { setSettings(cloneSettings(savedSettings)); void i18n.changeLanguage(savedSettings.appearance.language === "English" ? "en" : "vi"); setErrors({}); }
  return (
    <div className="settings-page">
      {/* HERO BANNER TRUYỀN CẢM HỨNG */}
      <HeroBanner
        tag={t("settings.heroTag")}
        title={t("settings.title")}
        subtitle={t("settings.description")}
        metrics={[
          {
            icon: UserRound,
            label: t("settings.metrics.account"),
            value: t("settings.metrics.verified"),
            sub: t("settings.metrics.secure"),
            badgeClass: "target-badge",
          },
          {
            icon: Bot,
            label: t("settings.metrics.tutor"),
            value: t("settings.metrics.active"),
            sub: t("settings.metrics.voice"),
            badgeClass: "star-badge",
          },
          {
            icon: Palette,
            label: t("settings.metrics.appearance"),
            value: settings.appearance.language,
            sub: t("settings.metrics.font"),
            badgeClass: "flame-badge",
          },
        ]}
        headerAction={{
          sectionTitle: t("settings.centerTitle"),
          sectionSubtitle: t("settings.centerDescription"),
          buttonText: t("settings.save"),
          onAction: () => void saveSettings(),
        }}
      />

      <div className="settings-layout">
        <SettingsNav active={tab} onChange={setTab} />
        <main className="settings-content" aria-live="polite">
          <div className="settings-panel-shell">
            {errors.general && <p className="save-error" role="alert">{errors.general}</p>}
            {tab === "account" && <AccountPanel settings={settings} errors={errors} updateProfile={updateProfile} onSecurity={() => setTab("security")} />}
            {tab === "ai" && <AiTutorPanel settings={settings} updateSection={updateSection} />}
            {tab === "appearance" && <AppearancePanel settings={settings} updateSection={updateSection} />}
            {tab === "security" && <SecurityPanel settings={settings} updateSection={updateSection} />}
            {tab === "integrations" && <IntegrationsPanel settings={settings} updateSection={updateSection} />}
            {tab !== "integrations" && dirty && <SettingsActions onCancel={cancelChanges} onSave={() => void saveSettings()} />}
          </div>
        </main>
      </div>
      {toast && <div className="settings-toast" role="status">✓ {toast}</div>}
    </div>
  );
}
function SettingsNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const { t } = useTranslation();
  return (
    <nav className="settings-nav modern-settings-nav" aria-label={t("settings.title")} role="tablist">
      {tabs.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active === item.id}
            className={`settings-nav-item ${active === item.id ? "active" : ""}`}
            onClick={() => onChange(item.id)}
          >
            <Icon size={20} strokeWidth={2} aria-hidden="true" />
            <span>{t(`settings.tabs.${item.id}`, { defaultValue: item.label })}</span>
          </button>
        );
      })}
    </nav>
  );
}
function SettingsActions({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="settings-actions">
      <span>{t("settings.unsaved")}</span>
      <div>
        <button className="outline-button btn-float" onClick={onCancel}>{t("settings.cancel")}</button>
        <button className="enroll-new-course-btn btn-float" onClick={onSave}>{t("settings.save")}</button>
      </div>
    </div>
  );
}
function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <section className="settings-panel"><div className="settings-panel-heading"><div><h2>{title}</h2><p>{description}</p></div></div>{children}</section>; }
function Group({ title, children }: { title: string; children: React.ReactNode }) { return <div className="settings-group"><h3>{title}</h3>{children}</div>; }
function FormRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <div className="form-row"><div><label>{label}</label>{hint && <small>{hint}</small>}</div><div className="form-control">{children}</div></div>; }
function Select({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) { return <select className="ui-select" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select>; }
function SegmentedControl({ label, value, options, optionLabels, onChange }: { label: string; value: string; options: string[]; optionLabels?: Record<string, string>; onChange: (value: string) => void }) { return <FormRow label={label}><div className="segmented-control" role="group" aria-label={label}>{options.map((option) => <button key={option} type="button" aria-pressed={value === option} className={value === option ? "active" : ""} onClick={() => onChange(option)}>{optionLabels?.[option] ?? option}</button>)}</div></FormRow>; }
function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <div className="switch-row"><span>{label}</span><button type="button" role="switch" aria-label={label} aria-checked={checked} className={checked ? "switch on" : "switch"} onClick={() => onChange(!checked)}><i /></button></div>; }
function AccountPanel({ settings, errors, updateProfile, onSecurity }: { settings: Settings; errors: Record<string, string>; updateProfile: (field: keyof Settings["profile"], value: string) => void; onSecurity: () => void }) {
  const [email, setEmail] = useState("");
  const [nextEmail, setNextEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  useEffect(() => { void getMe().then((user) => setEmail(user.email)).catch(() => undefined); }, []);
  async function saveEmail() {
    setEmailError("");
    if (!nextEmail.trim() || nextEmail.trim().toLowerCase() === email.toLowerCase()) return;
    setEmailSaving(true);
    try {
      const result = await apiFetch<{ email: string }>("/api/auth/email", { method: "PUT", body: JSON.stringify({ email: nextEmail }) });
      setEmail(result.email);
      window.dispatchEvent(new CustomEvent("smartedu:email-saved", { detail: result.email }));
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : "Không thể cập nhật email.");
    } finally {
      setEmailSaving(false);
    }
  }
  return <><Panel title="Tài khoản & Hồ sơ" description="Quản lý thông tin dùng để cá nhân hóa trải nghiệm học tập."><Group title="Hồ sơ"><div className="profile-photo"><div className="photo-placeholder">MA</div><button type="button" aria-label="Đổi ảnh đại diện">⌑</button><div><strong>Ảnh đại diện</strong><small>JPG hoặc PNG, tối đa 5MB</small></div></div><FormRow label="Họ và tên"><input value={settings.profile.name} onChange={(event) => updateProfile("name", event.target.value)} />{errors.name && <small className="field-error">{errors.name}</small>}</FormRow><FormRow label="Ngày sinh"><input type="date" value={settings.profile.birthDate} onChange={(event) => updateProfile("birthDate", event.target.value)} /></FormRow><FormRow label="Số điện thoại" hint="Chỉ nhập chữ số, từ 9 đến 15 số"><input inputMode="numeric" value={settings.profile.phone} onChange={(event) => updateProfile("phone", event.target.value.replace(/\D/g, ""))} />{errors.phone && <small className="field-error">{errors.phone}</small>}</FormRow></Group><Group title="Đăng nhập"><FormRow label="Email" hint="Nhập email mới rồi nhấn Enter hoặc bấm ra ngoài để lưu"><div className="inline-control"><input type="email" value={email || "Đang tải..."} disabled={emailSaving} onChange={(event) => { setEmail(event.target.value); setNextEmail(event.target.value); setEmailError(""); }} onBlur={() => void saveEmail()} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} />{emailSaving && <small>Đang lưu...</small>}</div>{emailError && <small className="field-error">{emailError}</small>}</FormRow><FormRow label="Mật khẩu"><button className="outline-button" type="button" onClick={onSecurity}>Đổi mật khẩu</button></FormRow></Group><Group title="Học tập"><FormRow label="Trình độ học vấn"><Select value={settings.profile.education} options={["THPT", "Cao đẳng", "Đại học", "Thạc sĩ", "Tiến sĩ"]} onChange={(value) => updateProfile("education", value)} /></FormRow><FormRow label="Cấp độ học tập"><Select value={settings.profile.level} options={["Cơ bản", "Trung cấp", "Nâng cao"]} onChange={(value) => updateProfile("level", value)} /></FormRow></Group></Panel></>;
}
function AiTutorPanel({ settings, updateSection }: { settings: Settings; updateSection: <K extends keyof Settings>(section: K, value: Settings[K]) => void }) { const update = (key: keyof Settings["ai"], value: string | boolean) => updateSection("ai", { ...settings.ai, [key]: value }); return <Panel title="Cài đặt Gia sư AI" description="Điều chỉnh cách SmartEdu AI đồng hành cùng bạn."><Group title="Cách AI trò chuyện"><FormRow label="Giọng nói AI"><Select value={settings.ai.voice} options={["Nữ miền Nam", "Nam miền Bắc", "Nữ miền Bắc", "Nam miền Nam"]} onChange={(value) => update("voice", value)} /></FormRow><SegmentedControl label="Cách xưng hô" value={settings.ai.address} options={["Thầy/cô – em", "Mình – bạn", "Tôi – bạn"]} onChange={(value) => update("address", value)} /><SegmentedControl label="Giọng điệu" value={settings.ai.tone} options={["Thân thiện", "Nghiêm túc", "Khích lệ"]} onChange={(value) => update("tone", value)} /><SegmentedControl label="Mức độ giải thích" value={settings.ai.explanation} options={["Ngắn gọn", "Cân bằng", "Chuyên sâu"]} onChange={(value) => update("explanation", value)} /></Group><Group title="Tự động hóa"><Switch label="Gợi ý bài tập sau mỗi bài học" checked={settings.ai.suggestions} onChange={(value) => update("suggestions", value)} /><Switch label="Lưu lịch sử trò chuyện" checked={settings.ai.history} onChange={(value) => update("history", value)} /></Group></Panel>; }
function AppearancePanel({ settings, updateSection }: { settings: Settings; updateSection: <K extends keyof Settings>(section: K, value: Settings[K]) => void }) { const { t } = useTranslation(); const update = (key: keyof Settings["appearance"], value: string) => updateSection("appearance", { ...settings.appearance, [key]: value }); return <Panel title={t("settings.appearanceTitle")} description={t("settings.appearanceDescription")}><Group title={t("settings.displayOptions")}><SegmentedControl label={t("settings.language")} value={settings.appearance.language} options={["Tiếng Việt", "English"]} optionLabels={{ "Tiếng Việt": t("settings.vietnamese"), English: t("settings.english") }} onChange={(value) => { update("language", value); void i18n.changeLanguage(value === "English" ? "en" : "vi"); }} /><SegmentedControl label={t("settings.theme")} value={settings.appearance.theme} options={["Sáng", "Tối", "Theo hệ thống"]} optionLabels={{ "Sáng": t("settings.light"), "Tối": t("settings.dark"), "Theo hệ thống": t("settings.system") }} onChange={(value) => update("theme", value)} /><SegmentedControl label={t("settings.fontSize")} value={settings.appearance.fontSize} options={["Nhỏ 14px", "Vừa 16px", "Lớn 18px"]} optionLabels={{ "Nhỏ 14px": t("settings.fontSmall"), "Vừa 16px": t("settings.fontMedium"), "Lớn 18px": t("settings.fontLarge") }} onChange={(value) => update("fontSize", value)} /></Group></Panel>; }
function SecurityPanel({ settings, updateSection }: { settings: Settings; updateSection: <K extends keyof Settings>(section: K, value: Settings[K]) => void }) { const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" }); const [error, setError] = useState(""); function validatePassword() { if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(passwords.next)) return setError("Mật khẩu mới phải có ít nhất 8 ký tự, gồm cả chữ và số."); if (passwords.next !== passwords.confirm) return setError("Mật khẩu nhập lại chưa khớp với mật khẩu mới."); setError("Mật khẩu hợp lệ."); } return <Panel title="Bảo mật" description="Bảo vệ tài khoản và kiểm soát các phiên đăng nhập của bạn."><Group title="Đổi mật khẩu"><FormRow label="Mật khẩu hiện tại"><input type="password" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} /></FormRow><FormRow label="Mật khẩu mới" hint="Tối thiểu 8 ký tự, gồm chữ và số"><input type="password" value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} /></FormRow><FormRow label="Nhập lại mật khẩu mới"><input type="password" value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} />{error && <small className={error === "Mật khẩu hợp lệ." ? "field-success" : "field-error"}>{error}</small>}</FormRow><button className="primary-button" type="button" onClick={validatePassword}>Cập nhật mật khẩu</button></Group><Group title="Xác thực hai yếu tố"><Switch label="Bật xác thực hai yếu tố (2FA)" checked={settings.security.twoFactor} onChange={(value) => updateSection("security", { twoFactor: value })} /></Group><Group title="Lịch sử đăng nhập"><div className="login-list"><LoginItem device="MacBook Pro" browser="Chrome · Hà Nội" time="Đang hoạt động" current /><LoginItem device="iPhone 15" browser="Safari · Hồ Chí Minh" time="2 giờ trước" /><LoginItem device="Windows PC" browser="Edge · Đà Nẵng" time="3 ngày trước" /></div></Group></Panel>; }
function LoginItem({ device, browser, time, current }: { device: string; browser: string; time: string; current?: boolean }) { return <div className="login-item"><span className="device-icon">▣</span><div><strong>{device}</strong><small>{browser}</small></div><span className="login-time">{time}</span>{current ? <b>Thiết bị này</b> : <button className="text-button" type="button">Đăng xuất</button>}</div>; }
function IntegrationsPanel({ settings, updateSection }: { settings: Settings; updateSection: <K extends keyof Settings>(section: K, value: Settings[K]) => void }) {
  const entries = Object.entries(settings.integrations);
  function toggle(name: string, connected: boolean) {
    if (connected && !window.confirm(`Bạn có chắc muốn ngắt kết nối ${name}?`)) return;
    updateSection("integrations", { ...settings.integrations, [name]: !connected });
  }
  function renderIntegration([name, connected]: [string, boolean]) { const details = integrationDetails[name]; const Icon = details.icon; return <div className="integration-item" key={name}><span className="integration-logo"><Icon size={20} strokeWidth={2} aria-hidden="true" /></span><div><strong>{name}</strong><small>{details.description}</small>{connected && <small className="connected-label">Đã kết nối</small>}</div><button className={connected ? "outline-button" : "primary-button"} type="button" onClick={() => toggle(name, connected)}>{connected ? "Ngắt kết nối" : "Kết nối"}</button></div>; }
  return <Panel title="Tích hợp" description="Kết nối SmartEdu AI với những công cụ bạn sử dụng mỗi ngày.">{entries.some(([, connected]) => connected) && <Group title="Đã kết nối"><div className="integration-list">{entries.filter(([, connected]) => connected).map(renderIntegration)}</div></Group>}{entries.some(([, connected]) => !connected) && <Group title="Có thể kết nối"><div className="integration-list">{entries.filter(([, connected]) => !connected).map(renderIntegration)}</div></Group>}</Panel>;
}