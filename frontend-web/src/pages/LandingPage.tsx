import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Bot, BarChart3, BookOpenCheck, Brain, Menu, X } from "lucide-react";
import { isAuthenticated } from "../services/authService";

const features = [
  { icon: Bot, title: "AI Tutor Chat", text: "Hỏi đáp và giải thích kiến thức mọi lúc." },
  { icon: BookOpenCheck, title: "Luyện thi và đề", text: "Làm đề, chấm điểm và xem lời giải." },
  { icon: Brain, title: "Thẻ flashcard", text: "Ghi nhớ lâu hơn với ôn tập ngắt quãng." },
  { icon: BarChart3, title: "Biểu đồ năng lực", text: "Thấy rõ điểm mạnh và phần cần ôn thêm." },
];

const questions = [
  ["SmartEdu AI có miễn phí không?", "Bạn có thể bắt đầu với các tính năng học tập cơ bản miễn phí. Các gói mở rộng có thể được bổ sung sau."],
  ["Tôi cần chuẩn bị gì để bắt đầu?", "Chỉ cần tạo tài khoản và chọn một khóa học phù hợp với mục tiêu của bạn."],
  ["AI Tutor trả lời dựa trên nguồn nào?", "AI Tutor dùng nội dung khóa học, câu hỏi luyện tập và ngữ cảnh cuộc trò chuyện để đưa ra giải thích phù hợp."],
  ["Dữ liệu của tôi có được bảo mật không?", "Dữ liệu học tập được dùng để cá nhân hóa trải nghiệm và không được hiển thị công khai."],
  ["Tôi học được trên điện thoại không?", "Có. Giao diện được thiết kế đáp ứng để bạn học trên máy tính, máy tính bảng và điện thoại."],
];

function go(path: string) { window.location.href = path; }
function scrollToSection(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState("");
  const [navScrolled, setNavScrolled] = useState(false);
  const authenticated = isAuthenticated();
  const landingRef = useRef<HTMLElement>(null);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const root = landingRef.current;
    if (!root) return;
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add("is-visible"); });
    }, { threshold: 0.2 });
    root.querySelectorAll(".landing-reveal").forEach((element) => revealObserver.observe(element));
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActiveSection(entry.target.id); });
    }, { threshold: 0.2, rootMargin: "-20% 0px -55% 0px" });
    root.querySelectorAll<HTMLElement>("[data-nav-section]").forEach((element) => sectionObserver.observe(element));
    const handleScroll = () => setNavScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => { revealObserver.disconnect(); sectionObserver.disconnect(); window.removeEventListener("scroll", handleScroll); };
  }, []);

  return <main ref={landingRef} className="landing-page"><header className={`landing-nav ${navScrolled ? "is-scrolled" : ""}`}><div className="landing-container landing-nav-inner"><a className="landing-brand" href="/" aria-label="SmartEdu AI"><span className="brand-mark">◈</span><strong>SmartEdu AI</strong></a><nav className="landing-links" aria-label="Điều hướng landing page"><button className={activeSection === "tinh-nang" ? "is-active" : ""} type="button" onClick={() => { scrollToSection("tinh-nang"); closeMenu(); }}>Tính năng</button><button className={activeSection === "cach-hoat-dong" ? "is-active" : ""} type="button" onClick={() => { scrollToSection("cach-hoat-dong"); closeMenu(); }}>Cách hoạt động</button><button className={activeSection === "hoi-dap" ? "is-active" : ""} type="button" onClick={() => { scrollToSection("hoi-dap"); closeMenu(); }}>Hỏi đáp</button></nav><div className="landing-actions">{authenticated ? <button className="primary-button" type="button" onClick={() => go("/dashboard")}>Vào học</button> : <><button className="outline-button" type="button" onClick={() => go("/login")}>Đăng nhập</button><button className="primary-button" type="button" onClick={() => go("/register")}>Bắt đầu học</button></>}</div><button className="landing-menu-toggle" type="button" aria-label={menuOpen ? "Đóng menu" : "Mở menu"} onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>{menuOpen && <div className="landing-mobile-menu"><nav className="landing-mobile-links" aria-label="Điều hướng mobile"><button className={activeSection === "tinh-nang" ? "is-active" : ""} type="button" onClick={() => { scrollToSection("tinh-nang"); closeMenu(); }}>Tính năng</button><button className={activeSection === "cach-hoat-dong" ? "is-active" : ""} type="button" onClick={() => { scrollToSection("cach-hoat-dong"); closeMenu(); }}>Cách hoạt động</button><button className={activeSection === "hoi-dap" ? "is-active" : ""} type="button" onClick={() => { scrollToSection("hoi-dap"); closeMenu(); }}>Hỏi đáp</button></nav><div className="landing-mobile-actions">{authenticated ? <button className="primary-button" type="button" onClick={() => go("/dashboard")}>Vào học</button> : <><button className="outline-button" type="button" onClick={() => go("/login")}>Đăng nhập</button><button className="primary-button" type="button" onClick={() => go("/register")}>Bắt đầu học</button></>}</div></div>}</div></header><section className="landing-hero"><div className="landing-hero-orb landing-hero-orb-one" /><div className="landing-hero-orb landing-hero-orb-two" /><div className="landing-container landing-hero-grid"><div className="landing-hero-copy"><span className="landing-badge landing-entrance landing-delay-1">Học và luyện thi cùng AI</span><h1 className="landing-entrance landing-delay-2">Học thông minh hơn với <span>gia sư AI</span> của riêng bạn</h1><p className="landing-entrance landing-delay-3">SmartEdu AI giúp bạn học theo mục tiêu, luyện tập đúng trọng tâm và hiểu bài sâu hơn mỗi ngày.</p><div className="landing-hero-actions landing-entrance landing-delay-4"><button className="primary-button landing-arrow-button" type="button" onClick={() => go(authenticated ? "/dashboard" : "/register")}>Bắt đầu học miễn phí <span aria-hidden="true">→</span></button><button className="outline-button" type="button" onClick={() => scrollToSection("cach-hoat-dong")}>Xem cách hoạt động</button></div></div><div className="landing-product-card landing-product-entrance" aria-label="Minh họa giao diện SmartEdu AI"><div className="landing-product-top"><span>Tiến độ học tập</span><b>Tuần này</b></div><LandingProgress title="Lịch sử Đảng Cộng sản Việt Nam" percent={100} tone="green" /><LandingProgress title="Mạng máy tính" percent={25} /><div className="landing-chat"><span className="landing-chat-icon"><Bot size={18} /></span><div className="landing-chat-message"><span className="landing-typing" aria-label="AI đang nhập"><i /><i /><i /></span><p>Hôm nay mình ôn chương 2 Mạng máy tính nhé. Bắt đầu bằng 5 câu hỏi nhanh?</p></div></div></div></div></section><section id="tinh-nang" data-nav-section className="landing-section landing-container"><SectionTitle title="Mọi thứ bạn cần để học tốt hơn" /><div className="landing-feature-grid">{features.map(({ icon: Icon, title, text }, index) => <article className="landing-feature-card landing-reveal" style={{ "--reveal-delay": `${index * 100}ms` } as CSSProperties} key={title}><span className="landing-feature-icon"><Icon size={22} /></span><h3>{title}</h3><p>{text}</p></article>)}</div></section><section id="cach-hoat-dong" data-nav-section className="landing-section landing-container"><SectionTitle title="Bắt đầu chỉ với 3 bước" /><div className="landing-steps landing-reveal"><span className="landing-steps-line" /><div className="landing-step"><span>1</span><h3>Tạo tài khoản</h3><p>Mất chưa tới một phút</p></div><div className="landing-step"><span>2</span><h3>Chọn khóa học</h3><p>Học cùng AI Tutor và luyện đề</p></div><div className="landing-step"><span>3</span><h3>Theo dõi tiến độ</h3><p>Xem biểu đồ năng lực mỗi tuần</p></div></div></section><section id="hoi-dap" data-nav-section className="landing-section landing-container"><SectionTitle title="Hỏi đáp" /><div className="landing-faq landing-reveal">{questions.map(([question, answer], index) => <div className="landing-faq-item" key={question}><button type="button" aria-expanded={openQuestion === index} onClick={() => setOpenQuestion(openQuestion === index ? null : index)}><span>{question}</span><b className={openQuestion === index ? "is-open" : ""}>+</b></button><div className={openQuestion === index ? "landing-faq-answer is-open" : "landing-faq-answer"}><p>{answer}</p></div></div>)}</div></section><section className="landing-cta landing-container landing-reveal"><h2>Sẵn sàng bắt đầu hành trình học tập?</h2><button className="primary-button landing-arrow-button" type="button" onClick={() => go(authenticated ? "/dashboard" : "/register")}>Bắt đầu học miễn phí <span aria-hidden="true">→</span></button></section><footer className="landing-footer landing-container"><span>2026 SmartEdu AI</span><nav><a href="/terms">Điều khoản sử dụng</a><a href="/privacy">Chính sách bảo mật</a><a href="mailto:hello@smartedu.ai">Liên hệ</a></nav></footer></main>;
}

function LandingProgress({ title, percent, tone }: { title: string; percent: number; tone?: string }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const started = performance.now();
    let frame = 0;
    const update = (now: number) => {
      const progress = Math.min((now - started) / 1200, 1);
      setValue(Math.round(progress * percent));
      if (progress < 1) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [percent]);
  return <div className="landing-progress"><div><span>{title}</span><b>{value}%</b></div><i><em className={tone} style={{ width: `${value}%` }} /></i></div>;
}

function SectionTitle({ title }: { title: string }) { return <div className="landing-section-title landing-reveal"><h2>{title}</h2></div>; }
