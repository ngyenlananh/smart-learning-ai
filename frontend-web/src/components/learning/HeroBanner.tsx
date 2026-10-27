import { Flame, Target, Star, ArrowRight, Play, Plus } from "lucide-react";

export function HeroBanner({
  name = "Bạn",
  totalCourses,
  activeLessonTitle = "Chương 3: Tư tưởng độc lập dân tộc",
  activeCourseTitle = "Tư tưởng Hồ Chí Minh",
  activeLessonProgress = 34,
  onContinue,
  onEnroll,
}: {
  name?: string;
  totalCourses: number;
  activeLessonTitle?: string;
  activeCourseTitle?: string;
  activeLessonProgress?: number;
  onContinue: () => void;
  onEnroll: () => void;
}) {
  return (
    <div className="hero-banner-section">
      {/* Khối Banner lớn Gradient truyền cảm hứng học tập */}
      <div className="hero-banner-card">
        {/* Họa tiết lưới và vệt sáng ambient */}
        <div className="hero-ambient-glow" aria-hidden="true" />
        <div className="hero-grid-pattern" aria-hidden="true" />

        <div className="hero-banner-content">
          <div className="hero-text-area">
            <span className="hero-tag-pill">🚀 Không gian học tập cá nhân hóa</span>
            <h1 className="hero-heading">
              Chào mừng trở lại, {name}!
            </h1>
            <p className="hero-subtext">
              Bạn đang tham gia <strong>{totalCourses} học phần</strong>. Hãy duy trì nhịp độ học tập để bứt phá mục tiêu tuần này!
            </p>

            {/* Khối Tiếp tục học bài gần nhất ngay trên banner */}
            <div className="hero-quick-resume-card" onClick={onContinue} role="button" tabIndex={0}>
              <div className="resume-play-icon">
                <Play size={16} fill="currentColor" />
              </div>
              <div className="resume-info">
                <span className="resume-kicker">TIẾP TỤC BÀI GẦN NHẤT</span>
                <strong className="resume-lesson">{activeLessonTitle}</strong>
                <span className="resume-course">{activeCourseTitle}</span>
              </div>
              <div className="resume-action">
                <button type="button" className="resume-btn btn-float" onClick={(e) => { e.stopPropagation(); onContinue(); }}>
                  <span>Học tiếp</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* 3 Thẻ Chỉ số nhanh dạng Kính mờ (Glassmorphism Metric Cards) */}
          <div className="hero-metrics-grid">
            <div className="hero-metric-glass-card">
              <span className="metric-icon-badge flame-badge">
                <Flame size={20} />
              </span>
              <div className="metric-text-wrap">
                <span className="metric-label">Chuỗi học tập</span>
                <strong className="metric-val">12 ngày liên tiếp</strong>
                <span className="metric-sub">🔥 Đang giữ phong độ tốt</span>
              </div>
            </div>

            <div className="hero-metric-glass-card">
              <span className="metric-icon-badge target-badge">
                <Target size={20} />
              </span>
              <div className="metric-text-wrap">
                <span className="metric-label">Mục tiêu hôm nay</span>
                <strong className="metric-val">2 / 3 bài học</strong>
                <span className="metric-sub">🎯 Sắp hoàn thành</span>
              </div>
            </div>

            <div className="hero-metric-glass-card">
              <span className="metric-icon-badge star-badge">
                <Star size={20} />
              </span>
              <div className="metric-text-wrap">
                <span className="metric-label">Điểm trung bình</span>
                <strong className="metric-val">8.4 / 10</strong>
                <span className="metric-sub">⭐ Xếp loại Giỏi</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thanh tiêu đề bên dưới Banner */}
      <div className="courses-header-action-row">
        <div>
          <h2 className="courses-section-title">Khóa học của tôi</h2>
          <p className="courses-section-subtitle">
            Quản lý và tiếp tục lộ trình ôn luyện các học phần đã đăng ký
          </p>
        </div>

        <button
          type="button"
          className="enroll-new-course-btn btn-float"
          onClick={onEnroll}
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Đăng ký học phần mới</span>
        </button>
      </div>
    </div>
  );
}
