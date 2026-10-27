import { useEffect, useState } from "react";
import {
  Flame,
  BookOpen,
  Award,
  ArrowRight,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { View } from "../../App";
import { HeroBanner } from "../common/HeroBanner";
import { useTranslation } from "react-i18next";

type DashboardCourse = {
  id: string;
  title: string;
  meta: string;
  progressPercent: number;
  nextLesson?: string;
};

const fallbackCourses: DashboardCourse[] = [
  { id: "course-ho-chi-minh-thought", title: "Tư tưởng Hồ Chí Minh", meta: "7 chương · 28 bài học", progressPercent: 34, nextLesson: "Chương 3: Tư tưởng độc lập dân tộc" },
  { id: "course-party-history", title: "Lịch sử Đảng Cộng sản Việt Nam", meta: "6 chương · 24 bài học", progressPercent: 58, nextLesson: "Chương 4: Đảng lãnh đạo công cuộc đổi mới" },
  { id: "course-computer-networks", title: "Mạng máy tính", meta: "8 chương · 32 bài học", progressPercent: 22, nextLesson: "Chương 2: Mô hình OSI và TCP/IP" },
  { id: "course-database-systems", title: "Cơ sở dữ liệu", meta: "7 chương · 30 bài học", progressPercent: 0, nextLesson: "Bắt đầu học phần" },
  { id: "course-english-toeic", title: "Ngôn ngữ", meta: "4 chương · 4 bài học", progressPercent: 0, nextLesson: "Bắt đầu học phần" },
];

const vietnameseWeekdays = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

function getDateText(language: string, date = new Date()): string {
  const locale = language === "en" ? "en-US" : "vi-VN";
  const localizedText = date.toLocaleDateString(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const normalizedLocalizedText = localizedText.replace(/^[\p{L}]/u, (letter) => letter.toUpperCase());
  const manualText = language === "en"
    ? `${date.toLocaleDateString("en-US", { weekday: "long" })}, ${String(date.getDate()).padStart(2, "0")} ${date.toLocaleDateString("en-US", { month: "long" })}`
    : `${vietnameseWeekdays[date.getDay()]}, ${String(date.getDate()).padStart(2, "0")} tháng ${String(date.getMonth() + 1).padStart(2, "0")}`;
  return language === "vi" && normalizedLocalizedText === manualText ? normalizedLocalizedText : manualText;
}

export function Dashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { t, i18n } = useTranslation();
  const [courses, setCourses] = useState<DashboardCourse[]>(fallbackCourses);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("Minh Anh");
  const [dateText, setDateText] = useState(() => getDateText(i18n.language));

  useEffect(() => {
    const updateDateText = () => setDateText(getDateText(i18n.language));
    const intervalId = window.setInterval(updateDateText, 60_000);
    return () => window.clearInterval(intervalId);
  }, [i18n.language]);

  useEffect(() => {
    let cancelled = false;
    fetch("http://localhost:4000/courses/my")
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled && Array.isArray(payload.data)) setCourses(payload.data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/settings`, {
      headers: { "X-User-Id": "demo-user" },
    })
      .then((response) => response.json())
      .then((payload: { data?: { profile?: { name?: string } } | null }) => {
        const name = payload.data?.profile?.name?.trim();
        if (name) setDisplayName(name);
      })
      .catch(() => undefined);
  }, []);

  const completedCourses = courses.filter((course) => course.progressPercent === 100);
  const activeCourses = courses.filter((course) => course.progressPercent > 0 && course.progressPercent < 100);
  const nextCourse = activeCourses[0] ?? courses[0];

  // 7 ngày trong tuần cho streak khoa học (T2 -> CN)
  const daysOfWeek = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const currentDayIndex = (new Date().getDay() + 6) % 7; // Chuyển Chủ nhật (0) thành cuối tuần (6)

  return (
    <div className="dashboard-page-wrapper">
      {/* HERO BANNER TRUYỀN CẢM HỨNG */}
      <HeroBanner
        tag={dateText}
        title={t("dashboard.greeting", { name: displayName })}
        subtitle={t("dashboard.description")}
        actionCard={{
          kicker: "TIẾP TỤC HỌC GẦN NHẤT",
          title: nextCourse?.nextLesson ?? "Chương 3: Tư tưởng độc lập dân tộc",
          subtitle: nextCourse?.title ?? "Tư tưởng Hồ Chí Minh",
          buttonText: "Học tiếp",
          onClick: () => onNavigate("courses"),
        }}
        metrics={[
          {
            icon: Flame,
            label: "Chuỗi học tập",
            value: "12 ngày liên tiếp",
            sub: "🔥 Đang giữ phong độ tốt",
            badgeClass: "flame-badge",
          },
          {
            icon: BookOpen,
            label: "Khóa học đang học",
            value: `${courses.length} học phần`,
            sub: `${activeCourses.length} môn đang tiến hành`,
            badgeClass: "target-badge",
          },
          {
            icon: Award,
            label: "Điểm trung bình",
            value: "8.4 / 10",
            sub: "⭐ Xếp loại Giỏi",
            badgeClass: "star-badge",
          },
        ]}
        headerAction={{
          sectionTitle: "Tổng quan học tập",
          sectionSubtitle: "Theo dõi tiến trình các học phần và rèn luyện kỹ năng hàng ngày",
          buttonText: "Luyện tập ngay",
          buttonIcon: Sparkles,
          onAction: () => onNavigate("exams"),
        }}
      />

      {/* 3 Thẻ thống kê khoa học nổi bật (số 32px+) */}
      <section className="stats-grid">
        {/* Thẻ 1: Chuỗi học tập */}
        <div className="stat-card scientific-card">
          <div className="stat-card-header">
            <span className="stat-icon streak-icon">
              <Flame size={24} />
            </span>
            <div className="stat-card-titles">
              <small>{t("dashboard.streak")}</small>
              <strong className="stat-number-lg">
                12 <em>{t("dashboard.days")}</em>
              </strong>
            </div>
          </div>
          <div className="stat-card-footer">
            <span className="positive">{t("dashboard.thisWeek")}</span>
            {/* 7 Chấm theo dõi chuỗi ngày trong tuần */}
            <div className="streak-dots" title="Lịch học tập trong tuần">
              {daysOfWeek.map((day, idx) => (
                <span
                  key={day}
                  className={`streak-dot ${idx <= currentDayIndex ? "active" : ""}`}
                  title={`${day}: ${idx <= currentDayIndex ? "Đã học" : "Chưa học"}`}
                >
                  {day}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Thẻ 2: Khóa học */}
        <div className="stat-card scientific-card">
          <div className="stat-card-header">
            <span className="stat-icon blue-icon">
              <BookOpen size={24} />
            </span>
            <div className="stat-card-titles">
              <small>{t("dashboard.courses")}</small>
              <strong className="stat-number-lg">
                {courses.length} <em>{t("dashboard.courseUnit")}</em>
              </strong>
            </div>
          </div>
          <div className="stat-card-footer">
            <span className="muted">{t("dashboard.inProgress", { count: activeCourses.length })}</span>
            <span className="stat-tag-badge">
              {completedCourses.length} hoàn thành
            </span>
          </div>
        </div>

        {/* Thẻ 3: Điểm trung bình */}
        <div className="stat-card scientific-card">
          <div className="stat-card-header">
            <span className="stat-icon gold-icon">
              <Award size={24} />
            </span>
            <div className="stat-card-titles">
              <small>{t("dashboard.average")}</small>
              <strong className="stat-number-lg">
                8.4 <em>/ 10</em>
              </strong>
            </div>
          </div>
          <div className="stat-card-footer">
            <span className="positive">{t("dashboard.sinceLastMonth")}</span>
            <span className="stat-grade-badge">Học lực Giỏi</span>
          </div>
        </div>
      </section>

      {/* Lưới 2 cột chính */}
      <div className="dashboard-grid">
        {/* CỘT TRÁI: TIẾN ĐỘ HỌC TẬP (PROGRESS OVERVIEW) */}
        <section className="panel progress-panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">{t("dashboard.overview")}</span>
              <h2>{t("dashboard.progress")}</h2>
            </div>
            <button className="text-button academic-link-btn" onClick={() => onNavigate("analytics")}>
              {t("dashboard.analytics")}
            </button>
          </div>

          <div className="progress-table-list">
            {courses.map((course) => {
              // Phân cấp màu khoa học theo tiến độ
              let toneClass = "tone-blue";
              if (course.progressPercent === 100) toneClass = "tone-green";
              else if (course.progressPercent >= 50) toneClass = "tone-cyan";
              else if (course.progressPercent > 0) toneClass = "tone-amber";
              else toneClass = "tone-neutral";

              return (
                <div className="progress-row-scientific" key={course.id}>
                  <div className="progress-info-row">
                    <span className="progress-subject-name">{course.title}</span>
                    <span className="progress-percent-label">{course.progressPercent}%</span>
                  </div>
                  <div className="progress-track-scientific">
                    <div
                      className={`progress-fill ${toneClass}`}
                      style={{ width: `${Math.max(course.progressPercent, 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {loading && <p className="muted syncing-text">{t("dashboard.syncing")}</p>}

          {/* Thẻ tiếp tục bài học gần nhất */}
          <div className="academic-continue-card">
            <div className="continue-content">
              <div className="continue-kicker-row">
                <Clock size={13} className="clock-icon" />
                <small>{t("dashboard.nextLesson")}</small>
              </div>
              <strong className="continue-title">
                {nextCourse?.nextLesson ?? t("dashboard.startCourse")}
              </strong>
              <span className="continue-subject">
                {nextCourse?.title ?? t("dashboard.startCourse")}
              </span>
            </div>
            <button
              className="primary-button continue-action-btn"
              onClick={() => onNavigate("courses")}
            >
              <span>{t("dashboard.continue")}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </section>

        {/* CỘT PHẢI: HỌC PHẦN CỦA BẠN (COURSE LIST - SỬA TRIỆT ĐỂ LỖI DÍNH CHỮ) */}
        <section className="panel activity-panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">{t("dashboard.yourCourses")}</span>
              <h2>{t("dashboard.courseList")}</h2>
            </div>
          </div>

          <div className="academic-course-list">
            {courses.map((course) => {
              const isFinished = course.progressPercent === 100;
              const isLearning = course.progressPercent > 0 && course.progressPercent < 100;

              return (
                <div
                  className="academic-course-card"
                  key={course.id}
                  onClick={() => onNavigate("courses")}
                  role="button"
                  tabIndex={0}
                  title={`Xem chi tiết học phần ${course.title}`}
                >
                  <div className="course-card-left">
                    <span className={`course-status-icon ${isFinished ? "finished" : isLearning ? "active" : ""}`}>
                      {isFinished ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <BookOpen size={16} />
                      )}
                    </span>
                    <div className="course-text-details">
                      {/* Tiêu đề môn học riêng biệt */}
                      <span className="course-main-title">{course.title}</span>
                      {/* Dòng phụ chú chương & bài học tách bạch hoàn toàn, không dính chữ */}
                      <span className="course-meta-text">{course.meta}</span>
                    </div>
                  </div>

                  <div className="course-card-right">
                    <span
                      className={`course-progress-badge ${
                        isFinished ? "badge-success" : isLearning ? "badge-progress" : "badge-inactive"
                      }`}
                    >
                      {isFinished ? "100%" : `${course.progressPercent}%`}
                    </span>
                    <ChevronRight size={15} className="course-arrow" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
