import {
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Clock,
  Landmark,
  Network,
  Database,
  Code2,
  Cpu,
  Layers,
  Languages,
  BookMarked,
  Sparkles,
} from "lucide-react";
import { ProgressBar } from "./ProgressBar";

type CourseCardProps = {
  id: string;
  title: string;
  meta: string;
  progress: number;
  category: string;
  tone?: string;
  onSelect: (id: string) => void;
};

// Chọn icon chuyên ngành phù hợp với từng môn học
function getCourseIcon(title: string, tone?: string) {
  const t = title.toLowerCase();
  if (t.includes("hồ chí minh") || t.includes("triết") || t.includes("chính trị")) {
    return <Landmark size={26} strokeWidth={2.2} />;
  }
  if (t.includes("lịch sử") || t.includes("đảng")) {
    return <BookMarked size={26} strokeWidth={2.2} />;
  }
  if (t.includes("mạng") || t.includes("network")) {
    return <Network size={26} strokeWidth={2.2} />;
  }
  if (t.includes("dữ liệu") || t.includes("database")) {
    return <Database size={26} strokeWidth={2.2} />;
  }
  if (t.includes("lập trình") || t.includes("oop") || t.includes("java") || t.includes("c++")) {
    return <Code2 size={26} strokeWidth={2.2} />;
  }
  if (t.includes("kiến trúc") || t.includes("hệ điều hành") || t.includes("thuật")) {
    return <Cpu size={26} strokeWidth={2.2} />;
  }
  if (t.includes("ngôn ngữ") || t.includes("tiếng anh") || t.includes("toeic")) {
    return <Languages size={26} strokeWidth={2.2} />;
  }
  if (t.includes("hệ thống") || t.includes("thiết kế")) {
    return <Layers size={26} strokeWidth={2.2} />;
  }
  return <BookOpen size={26} strokeWidth={2.2} />;
}

// Map tone sang gradient sinh động
function getBannerGradient(title: string, tone?: string) {
  const t = title.toLowerCase();
  if (t.includes("lịch sử") || tone === "rose") return "banner-rose";
  if (t.includes("mạng") || tone === "gold") return "banner-gold";
  if (t.includes("cơ sở dữ liệu") || tone === "mint") return "banner-mint";
  if (t.includes("lập trình") || tone === "purple") return "banner-purple";
  if (t.includes("kiến trúc") || t.includes("thuật")) return "banner-cyan";
  return "banner-blue";
}

export function CourseCard({
  id,
  title,
  meta,
  progress,
  onSelect,
}: CourseCardProps) {
  const isCompleted = progress === 100;
  const isStudying = progress > 0 && progress < 100;
  const bannerToneClass = getBannerGradient(title);

  return (
    <article
      className="modern-course-card card-float"
      onClick={() => onSelect(id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(id);
        }
      }}
    >
      {/* ẢNH BÌA GRADIENT RỰC RỠ CÓ HỌA TIẾT & ICON LỚN TRONG Ô KÍNH MỜ */}
      <div className={`course-card-banner ${bannerToneClass}`}>
        {/* Họa tiết hình học mờ trên nền */}
        <div className="banner-ambient-pattern" aria-hidden="true" />
        <div className="banner-ambient-circle circle-1" aria-hidden="true" />
        <div className="banner-ambient-circle circle-2" aria-hidden="true" />

        {/* Badge trạng thái ở góc trên */}
        <div className="banner-badge-wrapper">
          {isCompleted ? (
            <span className="banner-status-badge badge-completed">
              <CheckCircle2 size={12} strokeWidth={2.5} />
              <span>Hoàn thành</span>
            </span>
          ) : isStudying ? (
            <span className="banner-status-badge badge-studying">
              <span className="badge-pulse-dot" />
              <span>Đang học</span>
            </span>
          ) : (
            <span className="banner-status-badge badge-notstarted">
              <span>Chưa bắt đầu</span>
            </span>
          )}
        </div>

        {/* Ô Kính mờ lớn 48px chứa Icon môn học */}
        <div className="banner-glass-icon-box">
          {getCourseIcon(title)}
        </div>
      </div>

      {/* THÂN THẺ KHÓA HỌC */}
      <div className="course-card-body">
        {/* Tiêu đề môn học đậm nét 17px */}
        <h3 className="course-card-title" title={title}>
          {title}
        </h3>

        {/* Dòng phụ chương & bài học tách bạch */}
        <div className="course-card-meta-row">
          <BookOpen size={13} className="meta-icon" />
          <span>{meta}</span>
        </div>

        {/* Thanh tiến độ dày 8px bo tròn có animation */}
        <div className="course-card-progress-wrapper">
          <ProgressBar progress={progress} showLabel={true} />
        </div>

        {/* Nút hành động nổi bật với hiệu ứng Nổi 3D (.btn-float) */}
        <div className="course-card-action">
          {isCompleted ? (
            <button
              type="button"
              className="course-action-btn btn-float btn-review"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(id);
              }}
            >
              <CheckCircle2 size={15} />
              <span>Ôn tập lại</span>
            </button>
          ) : (
            <button
              type="button"
              className="course-action-btn btn-float btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(id);
              }}
            >
              <span>{progress > 0 ? "Tiếp tục học" : "Bắt đầu học"}</span>
              <ArrowRight size={15} className="action-arrow" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
