import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Check,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { login, register } from "../services/auth";

export type AuthMode = "login" | "register";
type FormErrors = Record<string, string>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// 4 Icon Mạng xã hội chuẩn theo thiết kế [ G ] [ f ] [ GitHub ] [ in ]
function SocialIcons({ prefix = "login" }: { prefix?: string }) {
  return (
    <div className="auth-social-row" aria-label={`Đăng nhập nhanh với mạng xã hội`}>
      {/* Google */}
      <button
        type="button"
        className="social-btn"
        title="Tiếp tục với Google"
        onClick={() => alert("Đang kết nối tài khoản Google...")}
      >
        <span className="social-char-g">G</span>
      </button>

      {/* Facebook */}
      <button
        type="button"
        className="social-btn"
        title="Tiếp tục với Facebook"
        onClick={() => alert("Đang kết nối tài khoản Facebook...")}
      >
        <span className="social-char-f">f</span>
      </button>

      {/* GitHub */}
      <button
        type="button"
        className="social-btn"
        title="Tiếp tục với GitHub"
        onClick={() => alert("Đang kết nối tài khoản GitHub...")}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
      </button>

      {/* LinkedIn */}
      <button
        type="button"
        className="social-btn"
        title="Tiếp tục với LinkedIn"
        onClick={() => alert("Đang kết nối tài khoản LinkedIn...")}
      >
        <span className="social-char-in">in</span>
      </button>
    </div>
  );
}

export function AuthPage({
  mode,
  onSuccess,
  onModeChange,
}: {
  mode: AuthMode;
  onSuccess: () => void;
  onModeChange: (mode: AuthMode) => void;
}) {
  const isLogin = mode === "login";

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginRemember, setLoginRemember] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regAccepted, setRegAccepted] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  // Status & Validation
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modal Quên mật khẩu
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const loginInputRef = useRef<HTMLInputElement>(null);
  const registerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setErrors({});
    setSubmitted(false);
    if (isLogin) {
      loginInputRef.current?.focus();
    } else {
      registerInputRef.current?.focus();
    }
  }, [mode, isLogin]);

  // Validation
  function validateLogin(): FormErrors {
    const next: FormErrors = {};
    if (!loginEmail.trim()) {
      next.loginEmail = "Vui lòng nhập Email hoặc Username.";
    }
    if (!loginPassword) {
      next.loginPassword = "Vui lòng nhập mật khẩu.";
    }
    return next;
  }

  function validateRegister(): FormErrors {
    const next: FormErrors = {};
    if (!regName.trim()) {
      next.regName = "Vui lòng nhập họ và tên của bạn.";
    }
    if (!regEmail.trim()) {
      next.regEmail = "Vui lòng nhập địa chỉ email.";
    } else if (!emailPattern.test(regEmail)) {
      next.regEmail = "Email chưa đúng định dạng.";
    }
    if (!regPassword) {
      next.regPassword = "Vui lòng tạo mật khẩu.";
    } else if (!passwordPattern.test(regPassword)) {
      next.regPassword = "Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số.";
    }
    if (!regConfirm) {
      next.regConfirm = "Vui lòng nhập lại mật khẩu.";
    } else if (regPassword !== regConfirm) {
      next.regConfirm = "Mật khẩu xác nhận không khớp.";
    }
    if (!regAccepted) {
      next.regAccepted = "Bạn cần đồng ý với Điều khoản sử dụng.";
    }
    return next;
  }

  // Handle Login Submit
  async function handleLoginSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const next = validateLogin();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      await login(loginEmail.trim(), loginPassword, loginRemember);
      onSuccess();
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin." });
    } finally {
      setLoading(false);
    }
  }

  // Handle Register Submit
  async function handleRegisterSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const next = validateRegister();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    try {
      await register(regName.trim(), regEmail.trim(), regPassword);
      onSuccess();
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : "Đăng ký không thành công. Vui lòng thử lại." });
    } finally {
      setLoading(false);
    }
  }

  // Đăng nhập nhanh với tài khoản mẫu (Demo Account)
  function handleFillDemo() {
    setLoginEmail("demo@smartedu.vn");
    setLoginPassword("DemoPassword123");
    setErrors({});
  }

  // Đo độ mạnh mật khẩu (ở Đăng ký)
  const hasMinLength = regPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(regPassword);
  const hasNumber = /\d/.test(regPassword);
  const hasSpecial = /[^A-Za-z\d]/.test(regPassword);
  const strengthScore = regPassword.length === 0 ? 0 : [hasMinLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length;

  function getStrengthLabel(score: number) {
    switch (score) {
      case 1: return { text: "Yếu", color: "#ef4444" };
      case 2: return { text: "Trung bình", color: "#f59e0b" };
      case 3: return { text: "Khá", color: "#0284c7" };
      case 4: return { text: "Rất mạnh", color: "#10b981" };
      default: return { text: "", color: "" };
    }
  }
  const strength = getStrengthLabel(strengthScore);

  // Xử lý gửi yêu cầu khôi phục mật khẩu
  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim() || !emailPattern.test(forgotEmail)) {
      setForgotError("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSent(true);
    }, 800);
  }

  return (
    <main className="auth-slider-page">
      {/* Khung thẻ chính chứa hiệu ứng tấm trượt (Double-Slider Layout) */}
      <div className={`auth-slider-box ${!isLogin ? "is-register-active" : ""}`}>
        
        {/* =========================================================
            NỬA BÊN TRÁI: FORM ĐĂNG KÝ (REGISTRATION)
            (Hiển thị khi tấm panel trượt sang phải)
            ========================================================= */}
        <div className="auth-form-side side-register">
          <div className="form-inner-content">
            <h1 className="slider-form-title">Registration</h1>

            {errors.form && !isLogin && (
              <div className="slider-form-error" role="alert">
                <AlertCircle size={14} />
                <span>{errors.form}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} noValidate className="slider-form">
              {/* Username / Họ và tên */}
              <div className="slider-input-group">
                <div className={`slider-input-wrapper ${errors.regName ? "input-error" : ""}`}>
                  <input
                    ref={registerInputRef}
                    type="text"
                    placeholder="Username"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    autoComplete="name"
                  />
                  <span className="slider-input-icon" aria-hidden="true">
                    <User size={18} />
                  </span>
                </div>
                {errors.regName && <span className="slider-field-error">{errors.regName}</span>}
              </div>

              {/* Email */}
              <div className="slider-input-group">
                <div className={`slider-input-wrapper ${errors.regEmail ? "input-error" : ""}`}>
                  <input
                    type="email"
                    placeholder="Email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <span className="slider-input-icon" aria-hidden="true">
                    <Mail size={18} />
                  </span>
                </div>
                {errors.regEmail && <span className="slider-field-error">{errors.regEmail}</span>}
              </div>

              {/* Password */}
              <div className="slider-input-group">
                <div className={`slider-input-wrapper ${errors.regPassword ? "input-error" : ""}`}>
                  <input
                    type={showRegPassword ? "text" : "password"}
                    placeholder="Password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="slider-input-icon clickable"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    tabIndex={-1}
                    aria-label={showRegPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showRegPassword ? <EyeOff size={18} /> : <Lock size={18} />}
                  </button>
                </div>
                {errors.regPassword && <span className="slider-field-error">{errors.regPassword}</span>}

                {/* Độ mạnh mật khẩu gọn gàng */}
                {regPassword.length > 0 && (
                  <div className="mini-strength-bar">
                    <div className="strength-lines">
                      {[0, 1, 2, 3].map((idx) => (
                        <div
                          key={idx}
                          className="strength-step"
                          style={{
                            backgroundColor: idx < strengthScore ? strength.color : "#e2e8f0",
                          }}
                        />
                      ))}
                    </div>
                    {strength.text && (
                      <span className="strength-text" style={{ color: strength.color }}>
                        {strength.text}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="slider-input-group">
                <div className={`slider-input-wrapper ${errors.regConfirm ? "input-error" : ""}`}>
                  <input
                    type={showRegConfirm ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="slider-input-icon clickable"
                    onClick={() => setShowRegConfirm(!showRegConfirm)}
                    tabIndex={-1}
                    aria-label={showRegConfirm ? "Ẩn xác nhận mật khẩu" : "Hiện xác nhận mật khẩu"}
                  >
                    {showRegConfirm ? <EyeOff size={18} /> : <Lock size={18} />}
                  </button>
                </div>
                {errors.regConfirm && <span className="slider-field-error">{errors.regConfirm}</span>}
              </div>

              {/* Điều khoản sử dụng */}
              <label className="slider-terms-label">
                <input
                  type="checkbox"
                  checked={regAccepted}
                  onChange={(e) => setRegAccepted(e.target.checked)}
                />
                <span className="custom-box">
                  <Check size={11} className="tick" />
                </span>
                <span>
                  Đồng ý <a href="/terms" target="_blank">Điều khoản</a> & <a href="/privacy" target="_blank">Bảo mật</a>
                </span>
              </label>
              {errors.regAccepted && <span className="slider-field-error">{errors.regAccepted}</span>}

              {/* Nút Register bo tròn viên thuốc gradient xanh đen -> cyan */}
              <button
                type="submit"
                className="slider-gradient-btn"
                disabled={loading}
              >
                {loading && !isLogin ? (
                  <span className="slider-spinner" />
                ) : (
                  <span>Register</span>
                )}
              </button>
            </form>

            {/* Dòng chữ mạng xã hội */}
            <p className="social-subtext">or register with social platforms</p>

            {/* 4 Nút mạng xã hội [ G ] [ f ] [ GitHub ] [ in ] */}
            <SocialIcons prefix="register" />

            {/* Nút chuyển đổi phụ cho mobile khi ẩn tấm trượt */}
            <div className="mobile-switch-link">
              Đã có tài khoản?{" "}
              <button type="button" onClick={() => onModeChange("login")}>
                Đăng nhập
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================
            NỬA BÊN PHẢI: FORM ĐĂNG NHẬP (LOGIN)
            (Hiển thị khi tấm panel trượt ở bên trái)
            ========================================================= */}
        <div className="auth-form-side side-login">
          <div className="form-inner-content">
            <h1 className="slider-form-title">Login</h1>

            {errors.form && isLogin && (
              <div className="slider-form-error" role="alert">
                <AlertCircle size={14} />
                <span>{errors.form}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} noValidate className="slider-form">
              {/* Username / Email */}
              <div className="slider-input-group">
                <div className={`slider-input-wrapper ${errors.loginEmail ? "input-error" : ""}`}>
                  <input
                    ref={loginInputRef}
                    type="text"
                    placeholder="Username"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="username"
                  />
                  <span className="slider-input-icon" aria-hidden="true">
                    <User size={18} />
                  </span>
                </div>
                {errors.loginEmail && <span className="slider-field-error">{errors.loginEmail}</span>}
              </div>

              {/* Password */}
              <div className="slider-input-group">
                <div className={`slider-input-wrapper ${errors.loginPassword ? "input-error" : ""}`}>
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="slider-input-icon clickable"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    tabIndex={-1}
                    aria-label={showLoginPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showLoginPassword ? <EyeOff size={18} /> : <Lock size={18} />}
                  </button>
                </div>
                {errors.loginPassword && <span className="slider-field-error">{errors.loginPassword}</span>}
              </div>

              {/* Forgot Password link đúng vị trí như hình 1 */}
              <div className="forgot-password-row">
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => {
                    setForgotEmail(loginEmail);
                    setForgotSent(false);
                    setForgotError("");
                    setShowForgotModal(true);
                  }}
                >
                  Forgot Password
                </button>
              </div>

              {/* Ghi nhớ đăng nhập */}
              <label className="slider-terms-label">
                <input
                  type="checkbox"
                  checked={loginRemember}
                  onChange={(e) => setLoginRemember(e.target.checked)}
                />
                <span className="custom-box">
                  <Check size={11} className="tick" />
                </span>
                <span>Ghi nhớ phiên đăng nhập</span>
              </label>

              {/* Nút Login bo tròn viên thuốc gradient xanh đen -> cyan */}
              <button
                type="submit"
                className="slider-gradient-btn"
                disabled={loading}
              >
                {loading && isLogin ? (
                  <span className="slider-spinner" />
                ) : (
                  <span>Login</span>
                )}
              </button>
            </form>

            {/* Quick Demo Button tiện lợi để trải nghiệm ngay */}
            <div className="demo-quick-bar">
              <button
                type="button"
                className="demo-pill-btn"
                onClick={handleFillDemo}
                title="Tự động điền tài khoản thử nghiệm"
              >
                <Zap size={13} />
                <span>Điền tài khoản mẫu</span>
              </button>
            </div>

            {/* Dòng chữ mạng xã hội */}
            <p className="social-subtext">or login with social platforms</p>

            {/* 4 Nút mạng xã hội [ G ] [ f ] [ GitHub ] [ in ] */}
            <SocialIcons prefix="login" />

            {/* Nút chuyển đổi phụ cho mobile khi ẩn tấm trượt */}
            <div className="mobile-switch-link">
              Chưa có tài khoản?{" "}
              <button type="button" onClick={() => onModeChange("register")}>
                Đăng ký ngay
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================
            TẤM TRƯỢT CHUYỂN ĐỘNG (ANIMATED SLIDING OVERLAY PANEL)
            Trượt từ trái sang phải với đường cong tròn biến hình
            ========================================================= */}
        <div className="auth-sliding-overlay" aria-hidden="false">
          {/* Panel hiển thị khi đang ở màn hình Đăng nhập (nằm bên trái) */}
          <div className="overlay-slide-face face-login-mode">
            <div className="overlay-text-box">
              <h2 className="overlay-heading">Xin chào, mừng bạn trở lại</h2>
              <p className="overlay-desc">Don't have an Account</p>
              <button
                type="button"
                className="overlay-outline-btn"
                onClick={() => onModeChange("register")}
              >
                Register
              </button>
            </div>
          </div>

          {/* Panel hiển thị khi đang ở màn hình Đăng ký (nằm bên phải) */}
          <div className="overlay-slide-face face-register-mode">
            <div className="overlay-text-box">
              <h2 className="overlay-heading">Welcome Back!</h2>
              <p className="overlay-desc">Already have an Account</p>
              <button
                type="button"
                className="overlay-outline-btn"
                onClick={() => onModeChange("login")}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          MODAL KHÔI PHỤC MẬT KHẨU (FORGOT PASSWORD)
          ========================================================= */}
      {showForgotModal && (
        <div className="auth-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-forgot-title">
          <div className="auth-modal-card">
            <div className="modal-header">
              <div className="modal-icon-badge">
                <KeyRound size={22} />
              </div>
              <h2 id="modal-forgot-title" className="modal-title">Khôi phục mật khẩu</h2>
              <p className="modal-desc">
                Nhập địa chỉ email của bạn để nhận liên kết thiết lập lại mật khẩu an toàn.
              </p>
            </div>

            {forgotSent ? (
              <div className="modal-success-state">
                <div className="success-icon-wrap">
                  <CheckCircle2 size={44} color="#10b981" />
                </div>
                <h3>Đã gửi hướng dẫn khôi phục!</h3>
                <p>
                  Vui lòng kiểm tra hộp thư tại <strong>{forgotEmail}</strong> để hoàn tất đặt lại mật khẩu.
                </p>
                <button
                  type="button"
                  className="slider-gradient-btn modal-btn"
                  onClick={() => setShowForgotModal(false)}
                >
                  Quay lại đăng nhập
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="modal-form">
                <div className="slider-input-group">
                  <div className={`slider-input-wrapper ${forgotError ? "input-error" : ""}`}>
                    <input
                      id="modal-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Nhập email của bạn..."
                      autoFocus
                    />
                    <span className="slider-input-icon">
                      <Mail size={18} />
                    </span>
                  </div>
                  {forgotError && <span className="slider-field-error">{forgotError}</span>}
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={() => setShowForgotModal(false)}
                    disabled={forgotLoading}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="slider-gradient-btn modal-submit-btn"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <span className="slider-spinner" />
                    ) : (
                      <span>Gửi liên kết</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
