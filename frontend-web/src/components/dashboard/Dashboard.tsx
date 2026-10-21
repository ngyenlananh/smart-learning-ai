import { useEffect, useState } from "react";
import { View } from "../../App";
import { PageTitle } from "../common/PageTitle";
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

const progressTones = ["blue-fill", "green-fill", "yellow-fill", "red-fill"];
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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/settings`, { headers: { "X-User-Id": "demo-user" } })
      .then((response) => response.json())
      .then((payload: { data?: { profile?: { name?: string } } | null }) => {
        const name = payload.data?.profile?.name?.trim();
        if (name) setDisplayName(name);
      })
      .catch(() => undefined);
  }, []);

  const activeCourses = courses.filter((course) => course.progressPercent > 0 && course.progressPercent < 100);
  const nextCourse = activeCourses[0] ?? courses[0];

  return <>
    <PageTitle eyebrow={dateText} title={t("dashboard.greeting", { name: displayName })} description={t("dashboard.description")} action={<button className="primary-button" onClick={() => onNavigate("exams")}>{t("dashboard.practice")}</button>} />
    <section className="stats-grid">
      <div className="stat-card streak"><span className="stat-icon">♨</span><div><small>{t("dashboard.streak")}</small><strong>12 <em>{t("dashboard.days")}</em></strong><span className="positive">{t("dashboard.thisWeek")}</span></div></div>
      <div className="stat-card"><span className="stat-icon blue-icon">▣</span><div><small>{t("dashboard.courses")}</small><strong>{courses.length} <em>{t("dashboard.courseUnit")}</em></strong><span className="muted">{t("dashboard.inProgress", { count: activeCourses.length })}</span></div></div>
      <div className="stat-card"><span className="stat-icon gold-icon">★</span><div><small>{t("dashboard.average")}</small><strong>8.4 <em>/ 10</em></strong><span className="positive">{t("dashboard.sinceLastMonth")}</span></div></div>
    </section>
    <div className="dashboard-grid">
      <section className="panel progress-panel"><div className="section-heading"><div><span className="section-kicker">{t("dashboard.overview")}</span><h2>{t("dashboard.progress")}</h2></div><button className="text-button" onClick={() => onNavigate("analytics")}>{t("dashboard.analytics")}</button></div>{courses.map((course, index) => <div className="progress-row" key={course.id}><div><span>{course.title}</span><b>{course.progressPercent}%</b></div><div className="progress-track"><i className={progressTones[index % progressTones.length]} style={{ width: `${course.progressPercent}%` }} /></div></div>)}{loading && <p className="muted">{t("dashboard.syncing")}</p>}<div className="continue-card"><div><small>{t("dashboard.nextLesson")}</small><strong>{nextCourse?.nextLesson ?? t("dashboard.startCourse")}</strong><span>{nextCourse?.title ?? t("dashboard.startCourse")} · {t("dashboard.description")}</span></div><button className="primary-button" onClick={() => onNavigate("courses")}>{t("dashboard.continue")}</button></div></section>
      <section className="panel activity-panel"><div className="section-heading"><div><span className="section-kicker">{t("dashboard.yourCourses")}</span><h2>{t("dashboard.courseList")}</h2></div></div>{courses.map((course) => <div className="activity-item" key={course.id}><span>{course.progressPercent === 100 ? "✓" : "◇"}</span><div><strong>{course.title}</strong><small>{course.meta}</small></div><b>{course.progressPercent}%</b></div>)}</section>
    </div>
  </>;
}
