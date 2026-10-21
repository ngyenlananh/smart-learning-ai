import { FormEvent, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login, register } from "../services/auth";

type AuthMode = "login" | "register";
type FormErrors = Record<string, string>;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function AuthPage({ mode, onSuccess, onModeChange }: { mode: AuthMode; onSuccess: () => void; onModeChange: (mode: AuthMode) => void }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [remember, setRemember] = useState(true); const [accepted, setAccepted] = useState(false); const [showPassword, setShowPassword] = useState(false); const [showConfirmation, setShowConfirmation] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({}); const [submitted, setSubmitted] = useState(false); const [loading, setLoading] = useState(false); const firstInputRef = useRef<HTMLInputElement>(null);
  const isLogin = mode === "login";

  useEffect(() => { firstInputRef.current?.focus(); }, [mode]);

  function validate(field?: string): FormErrors {
    const next: FormErrors = {};
    if (!isLogin && (!field || field === "name") && !name.trim()) next.name = "Vui lòng nhập họ và tên.";
    if ((!field || field === "email") && !emailPattern.test(email)) next.email = "Email chưa đúng định dạng.";
    if ((!field || field === "password") && !passwordPattern.test(password)) next.password = "Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số.";
    if (!isLogin && (!field || field === "confirmation") && password !== confirmation) next.confirmation = "Mật khẩu nhập lại chưa khớp.";
    if (!isLogin && (!field || field === "accepted") && !accepted) next.accepted = "Bạn cần đồng ý với điều khoản để tiếp tục.";
    return next;
  }

  function handleBlur(field: string) {
    if (!submitted) {
      const next = validate(field);
      setErrors((current) => ({ ...current, [field]: next[field] ?? "" }));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setSubmitted(true);
    const next = validate(); setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password, remember);
      } else await register(name, email, password);
      onSuccess();
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "Không thể kết nối máy chủ." });
    } finally {
      setLoading(false);
    }
  }

  const strength = password.length === 0 ? 0 : [password.length >= 8, /[A-Za-z]/.test(password), /\d/.test(password), /[^A-Za-z\d]/.test(password)].filter(Boolean).length;

  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span className="brand-mark">◈</span><strong>SmartEdu AI</strong></div><h1>{isLogin ? "Đăng nhập" : "Tạo tài khoản"}</h1><p className="auth-description">{isLogin ? "Chào mừng bạn quay lại. Tiếp tục hành trình học tập nhé." : "Chỉ mất một phút. Bạn có thể bổ sung hồ sơ sau."}</p><form onSubmit={handleSubmit} noValidate>
    {!isLogin && <AuthField label="Họ và tên" error={errors.name}><input ref={firstInputRef} value={name} onChange={(event) => setName(event.target.value)} onBlur={() => handleBlur("name")} autoComplete="name" /></AuthField>}
    <AuthField label="Email" error={errors.email}><input ref={isLogin ? firstInputRef : undefined} type="email" value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => handleBlur("email")} autoComplete="email" /></AuthField>
    <AuthField label={isLogin ? <><span>Mật khẩu</span><button className="auth-forgot" type="button">Quên mật khẩu?</button></> : "Mật khẩu"} error={errors.password}><div className="auth-password"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} onBlur={() => handleBlur("password")} autoComplete={isLogin ? "current-password" : "new-password"} /><button type="button" className="auth-eye" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{!isLogin && <div className="password-strength" aria-label={`Độ mạnh mật khẩu: ${strength} trên 4`}>{[0, 1, 2, 3].map((item) => <i className={item < strength ? "filled" : ""} key={item} />)}</div>}</AuthField>
    {!isLogin && <AuthField label="Nhập lại mật khẩu" error={errors.confirmation}><div className="auth-password"><input type={showConfirmation ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} onBlur={() => handleBlur("confirmation")} autoComplete="new-password" /><button type="button" className="auth-eye" aria-label={showConfirmation ? "Ẩn mật khẩu nhập lại" : "Hiện mật khẩu nhập lại"} onClick={() => setShowConfirmation((value) => !value)}>{showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></AuthField>}
    {isLogin ? <label className="auth-checkbox"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />Ghi nhớ đăng nhập</label> : <label className="auth-checkbox"><input type="checkbox" checked={accepted} onChange={(event) => { setAccepted(event.target.checked); handleBlur("accepted"); }} />Tôi đồng ý với <a href="/terms">Điều khoản sử dụng</a> và <a href="/privacy">Chính sách bảo mật</a></label>}
    {errors.accepted && <small className="auth-error">{errors.accepted}</small>}{errors.form && <p className="auth-form-error">{errors.form}</p>}
    <button className="primary-button auth-submit" type="submit" disabled={loading}>{loading && <span className="auth-spinner" aria-hidden="true" />}{isLogin ? "Đăng nhập" : "Tạo tài khoản"}</button>
  </form><div className="auth-divider"><span>hoặc</span></div><button className="outline-button auth-google" type="button">{isLogin ? "Tiếp tục với Google" : "Đăng ký với Google"}</button><p className="auth-switch">{isLogin ? "Chưa có tài khoản? " : "Đã có tài khoản? "}<button type="button" onClick={() => onModeChange(isLogin ? "register" : "login")}>{isLogin ? "Đăng ký" : "Đăng nhập"}</button></p></section></main>;
}

function AuthField({ label, error, children }: { label: React.ReactNode; error?: string; children: React.ReactNode }) {
  return <label className="auth-field"><span className="auth-label">{label}</span>{children}{error && <small className="auth-error">{error}</small>}</label>;
}
