import { useEffect, useState } from "react";
import { PageTitle } from "../common/PageTitle";
import { useTranslation } from "react-i18next";
import { HeroBanner } from "./HeroBanner";
import { FilterBar } from "./FilterBar";
import { CourseCard } from "./CourseCard";
import {
  BookOpen,
  ArrowRight,
  Clock,
  Search,
  CheckCircle2,
  X,
  Plus,
  Inbox,
} from "lucide-react";

const initialCourses = [
  { id: "course-ho-chi-minh-thought", title: "Tư tưởng Hồ Chí Minh", meta: "7 chương · 28 bài học", progress: 34, category: "general", tone: "blue", icon: "★" },
  { id: "course-party-history", title: "Lịch sử Đảng Cộng sản Việt Nam", meta: "6 chương · 24 bài học", progress: 58, category: "general", tone: "rose", icon: "▣" },
  { id: "course-computer-networks", title: "Mạng máy tính", meta: "8 chương · 32 bài học", progress: 22, category: "core", tone: "gold", icon: "◇" },
  { id: "course-database-systems", title: "Cơ sở dữ liệu", meta: "7 chương · 30 bài học", progress: 0, category: "core", tone: "mint", icon: "□" },
];

const categoryLabels = {
  all: "Tất cả",
  general: "Lý luận chính trị & Đại cương",
  core: "Cơ sở ngành & Cốt lõi",
  applied: "Chuyên ngành & Ứng dụng",
} as const;

const statusLabels = {
  all: "Tất cả trạng thái",
  studying: "Đang học",
  not_started: "Chưa bắt đầu",
  completed: "Đã hoàn thành",
} as const;

type Course = (typeof initialCourses)[number];
type Category = keyof typeof categoryLabels;
type Status = keyof typeof statusLabels;
type Lesson = { id: string; chapter: string; title: string; status: string; durationMinutes: number; videoUrl?: string };
type Detail = { title: string; description: string; progressPercent: number; nextLesson?: string };
type CatalogCourse = { id: string; title: string; subject: string; meta: string; description: string; isEnrolled: boolean; totalLessons?: number; teacher?: string; level?: string; syllabus?: string[]; prerequisites?: string; credits?: number; semester?: string; studyHours?: number };

export function Courses({ search }: { search: string }) {
  const { t, i18n } = useTranslation();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courseList, setCourseList] = useState<Course[]>(initialCourses);
  const [category, setCategory] = useState<Category>("all");
  const [status, setStatus] = useState<Status>("all");
  const [catalog, setCatalog] = useState<CatalogCourse[]>([]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [selectedCatalogCourse, setSelectedCatalogCourse] = useState<string | null>(null);
  const [detailCourse, setDetailCourse] = useState<CatalogCourse | null>(null);
  const [registering, setRegistering] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("Bạn");

  // Lấy tên người dùng để hiển thị lời chào Hero
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/settings`, { headers: { "X-User-Id": "demo-user" } })
      .then((res) => res.json())
      .then((res: { data?: { profile?: { name?: string } } | null }) => {
        const name = res.data?.profile?.name?.trim();
        if (name) setUserName(name);
      })
      .catch(() => undefined);
  }, []);

  async function loadCourses() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`http://localhost:4000/courses/my?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setCourseList(
        payload.data.map((item: { id: string; title: string; subject: string; meta: string; progressPercent: number }) => ({
          ...item,
          category: item.subject === "political-theory" || item.subject === "party-history" ? "general" : "core",
          tone: item.subject === "party-history" ? "rose" : item.subject === "computer-networks" ? "gold" : item.subject === "information-technology" ? "mint" : "blue",
          icon: item.subject === "party-history" ? "▣" : item.subject === "computer-networks" ? "◇" : item.subject === "information-technology" ? "□" : "★",
          progress: item.progressPercent,
        }))
      );
    } catch {
      setError("Không thể tải danh sách khóa học. Hãy kiểm tra backend đang chạy ở cổng 4000.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCourses();
  }, [search]);

  async function openCatalog() {
    setShowCatalog(true);
    setNotice("");
    setSelectedCatalogCourse(null);
    setDetailCourse(null);
    try {
      const response = await fetch("http://localhost:4000/courses/catalog");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setCatalog(payload.data);
    } catch {
      setError("Không thể tải danh mục khóa học.");
    }
  }

  useEffect(() => {
    if (!detailCourse) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailCourse(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailCourse]);

  async function enroll(courseId: string) {
    setRegistering(courseId);
    try {
      const response = await fetch(`http://localhost:4000/courses/${courseId}/enroll`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setCatalog((items) => items.map((item) => (item.id === courseId ? { ...item, isEnrolled: true } : item)));
      setNotice("Đăng ký khóa học thành công.");
      await loadCourses();
    } catch {
      setError("Không thể đăng ký khóa học.");
    } finally {
      setRegistering("");
    }
  }

  async function completeLesson(lessonId: string, nextLessonId?: string) {
    if (!selectedCourseId) return;
    try {
      const response = await fetch(`http://localhost:4000/courses/${selectedCourseId}/lessons/${lessonId}/complete`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setDetail((current) => (current ? { ...current, progressPercent: payload.data.progressPercent } : current));
      setLessons((current) =>
        current.map((item) => (item.id === lessonId ? { ...item, status: "completed" } : item.id === nextLessonId ? { ...item, status: "current" } : item))
      );
      if (nextLessonId) setActiveLessonId(nextLessonId);
      await loadCourses();
    } catch {
      setError("Không thể lưu tiến độ bài học.");
    }
  }

  useEffect(() => {
    if (!selectedCourseId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      fetch(`http://localhost:4000/courses/${selectedCourseId}`).then((res) => res.json()),
      fetch(`http://localhost:4000/courses/${selectedCourseId}/lessons`).then((res) => res.json()),
    ])
      .then(([courseResponse, lessonsResponse]) => {
        if (cancelled) return;
        if (courseResponse.error || lessonsResponse.error) throw new Error("Course request failed");
        setDetail(courseResponse.data);
        setLessons(lessonsResponse.data);
      })
      .catch(() => {
        if (!cancelled) setError("Không thể tải dữ liệu bài học. Hãy kiểm tra backend đang chạy ở cổng 4000.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCourseId]);

  // View Chi tiết khóa học khi bấm vào 1 khóa
  if (selectedCourseId && detail) {
    const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons.find((lesson) => lesson.status === "current");
    const index = activeLesson ? lessons.findIndex((lesson) => lesson.id === activeLesson.id) : -1;
    return (
      <div className="course-detail-container">
        <PageTitle
          title={detail.title}
          description={`${detail.progressPercent}% hoàn thành · ${detail.nextLesson ?? "Sẵn sàng bắt đầu"}`}
          action={
            <button
              className="outline-button btn-float"
              onClick={() => {
                setSelectedCourseId(null);
                setActiveLessonId(null);
                setDetail(null);
              }}
            >
              ← Về danh sách khóa học
            </button>
          }
        />
        {activeLesson && (
          <LessonPlayer
            lesson={activeLesson}
            previousLesson={index > 0 ? lessons[index - 1] : undefined}
            nextLesson={index >= 0 ? lessons[index + 1] : undefined}
            onSelectLesson={setActiveLessonId}
            onCompleteLesson={completeLesson}
            onBack={() => setActiveLessonId(null)}
          />
        )}
        <section className="course-detail-layout">
          <div className="panel course-overview">
            <span className="section-kicker">KHÓA HỌC CỦA TÔI</span>
            <h2>Tiếp tục hành trình học tập</h2>
            <p>{detail.description}</p>
            <div className="detail-progress">
              <div className="progress-track">
                <i style={{ width: `${detail.progressPercent}%` }} />
              </div>
              <strong>{detail.progressPercent}%</strong>
            </div>
            <button
              className="primary-button btn-float"
              onClick={() => activeLesson && setActiveLessonId(activeLesson.id)}
              disabled={!activeLesson}
            >
              ▶ Bắt đầu bài học tiếp theo
            </button>
          </div>
          <div className="panel lesson-panel">
            <div className="section-heading">
              <div>
                <span className="section-kicker">NỘI DUNG KHÓA HỌC</span>
                <h2>Chương và bài học</h2>
              </div>
              <span className="lesson-count">{lessons.length} bài</span>
            </div>
            <div className="lesson-list">
              {lessons.map((lesson) => (
                <button
                  className={`lesson-item ${lesson.status} ${activeLesson?.id === lesson.id ? "selected" : ""}`}
                  key={lesson.id}
                  onClick={() => setActiveLessonId(lesson.id)}
                >
                  <span className="lesson-status">
                    {lesson.status === "completed" ? "✓" : lesson.status === "current" ? "▶" : "○"}
                  </span>
                  <span>
                    <small>{lesson.chapter}</small>
                    <strong>{lesson.title}</strong>
                  </span>
                  <em>{lesson.durationMinutes} phút</em>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Lọc danh sách khóa học theo Bộ lọc
  const visibleCourses = courseList.filter(
    (course) =>
      (category === "all" || course.category === category) &&
      (status === "all" ||
        (status === "studying" && course.progress > 0 && course.progress < 100) ||
        (status === "not_started" && course.progress === 0) ||
        (status === "completed" && course.progress === 100))
  );

  const countCategory = (val: Category) =>
    val === "all" ? courseList.length : courseList.filter((course) => course.category === val).length;

  const countStatus = (val: Status) =>
    val === "all"
      ? courseList.length
      : val === "studying"
      ? courseList.filter((course) => course.progress > 0 && course.progress < 100).length
      : val === "not_started"
      ? courseList.filter((course) => course.progress === 0).length
      : courseList.filter((course) => course.progress === 100).length;

  const activeStudyingCourse = courseList.find((c) => c.progress > 0 && c.progress < 100) ?? courseList[0];

  return (
    <div className="my-courses-page-wrapper">
      {/* 1. HERO BANNER TRUYỀN CẢM HỨNG HỌC TẬP */}
      <HeroBanner
        name={userName}
        totalCourses={courseList.length}
        activeCourseTitle={activeStudyingCourse?.title ?? "Tư tưởng Hồ Chí Minh"}
        activeLessonTitle="Chương 3: Tư tưởng độc lập dân tộc"
        activeLessonProgress={activeStudyingCourse?.progress ?? 34}
        onContinue={() => {
          if (activeStudyingCourse) setSelectedCourseId(activeStudyingCourse.id);
        }}
        onEnroll={() => void openCatalog()}
      />

      {/* 2. BỘ LỌC HIỆN ĐẠI DẠNG PILL NỔI */}
      <FilterBar
        category={category}
        status={status}
        onCategoryChange={setCategory}
        onStatusChange={setStatus}
        countCategory={countCategory}
        countStatus={countStatus}
      />

      {/* Thông báo lỗi / trạng thái */}
      {error && <div className="error-note">{error}</div>}
      {search.trim() && !loading && (
        <div className="search-result-note">
          Kết quả tìm kiếm cho “<strong>{search}</strong>” ({visibleCourses.length} khóa học)
        </div>
      )}

      {/* 3. LƯỚI KHÓA HỌC 3 CỘT (COURSE GRID) */}
      {loading ? (
        /* Shimmer Skeleton Loading */
        <div className="course-grid-modern">
          {[1, 2, 3, 4, 5, 6].map((sk) => (
            <div className="skeleton-course-card" key={sk}>
              <div className="skeleton-banner shimmer" />
              <div className="skeleton-body">
                <div className="skeleton-line shimmer title" />
                <div className="skeleton-line shimmer meta" />
                <div className="skeleton-line shimmer bar" />
                <div className="skeleton-line shimmer btn" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleCourses.length === 0 ? (
        /* Empty State */
        <div className="courses-empty-state">
          <div className="empty-icon-wrap">
            <Inbox size={48} strokeWidth={1.5} />
          </div>
          <h3>Không tìm thấy học phần phù hợp</h3>
          <p>Thử điều chỉnh lại bộ lọc hoặc tìm kiếm với từ khóa khác.</p>
          <button
            type="button"
            className="primary-button btn-float"
            onClick={() => {
              setCategory("all");
              setStatus("all");
            }}
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <div className="course-grid-modern">
          {visibleCourses.map((course) => (
            <CourseCard
              key={course.id}
              id={course.id}
              title={course.title}
              meta={course.meta}
              progress={course.progress}
              category={course.category}
              tone={course.tone}
              onSelect={setSelectedCourseId}
            />
          ))}
        </div>
      )}

      {/* MODAL DANH MỤC HỌC PHẦN (CATALOG MODAL) */}
      {showCatalog && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setShowCatalog(false);
            setDetailCourse(null);
          }}
        >
          <section className="course-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <span className="section-kicker">DANH MỤC HỌC PHẦN</span>
                <h2>Đăng ký học phần mới</h2>
              </div>
              <button
                className="icon-button modal-close-btn"
                onClick={() => {
                  setShowCatalog(false);
                  setDetailCourse(null);
                }}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            {notice && <div className="success-note">{notice}</div>}
            <div className="catalog-list">
              {catalog.map((item) => (
                <button
                  className={`catalog-item ${item.isEnrolled ? "enrolled" : "available"}`}
                  disabled={item.isEnrolled}
                  key={item.id}
                  onClick={() => {
                    setSelectedCatalogCourse(item.id);
                    if (!item.isEnrolled) setDetailCourse(item);
                  }}
                >
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.meta}</small>
                  </span>
                  <b>{item.isEnrolled ? "Đã đăng ký" : "Xem chi tiết"}</b>
                </button>
              ))}
            </div>
            {selectedCatalogCourse && (
              <button
                className="primary-button btn-float"
                disabled={!!registering}
                onClick={() => void enroll(selectedCatalogCourse)}
              >
                {registering ? "Đang đăng ký..." : "Đăng ký học phần"}
              </button>
            )}
          </section>

          {/* Modal chi tiết học phần trong catalog */}
          {detailCourse && (
            <div className="course-detail-backdrop" onClick={() => setDetailCourse(null)}>
              <section
                className="course-detail-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="course-detail-title"
              >
                <div className="modal-heading">
                  <div>
                    <span className="section-kicker">CHI TIẾT HỌC PHẦN</span>
                    <h2 id="course-detail-title">{detailCourse.title}</h2>
                  </div>
                  <button className="icon-button" onClick={() => setDetailCourse(null)} aria-label="Đóng">
                    <X size={18} />
                  </button>
                </div>
                {detailCourse.description && <p className="course-detail-description">{detailCourse.description}</p>}
                <div className="course-detail-meta">
                  {detailCourse.syllabus?.length ? (
                    <span>
                      <strong>{detailCourse.syllabus.length}</strong> chương
                    </span>
                  ) : null}
                  {detailCourse.totalLessons ? (
                    <span>
                      <strong>{detailCourse.totalLessons}</strong> bài học
                    </span>
                  ) : null}
                  {detailCourse.teacher && (
                    <span>
                      <strong>Giảng viên</strong>
                      {detailCourse.teacher}
                    </span>
                  )}
                </div>
                {detailCourse.syllabus?.length ? (
                  <div className="course-chapters">
                    <h3>Danh sách chương</h3>
                    <ol>
                      {detailCourse.syllabus.map((chapter, index) => (
                        <li key={`${detailCourse.id}-chapter-${index}`}>{chapter}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                <button className="primary-button btn-float" onClick={() => setDetailCourse(null)}>
                  Đóng
                </button>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LessonPlayer({
  lesson,
  previousLesson,
  nextLesson,
  onSelectLesson,
  onCompleteLesson,
  onBack,
}: {
  lesson: Lesson;
  previousLesson?: Lesson;
  nextLesson?: Lesson;
  onSelectLesson: (id: string) => void;
  onCompleteLesson: (lessonId: string, nextLessonId?: string) => void;
  onBack: () => void;
}) {
  const youtube = lesson.videoUrl?.includes("youtube.com/embed/") || lesson.videoUrl?.includes("youtu.be/");
  const youtubeUrl =
    youtube && lesson.videoUrl
      ? `${lesson.videoUrl}${lesson.videoUrl.includes("?") ? "&" : "?"}origin=${encodeURIComponent(
          window.location.origin
        )}&rel=0`
      : "";
  return (
    <section className="panel lesson-player">
      <div className="section-heading">
        <div>
          <span className="section-kicker">BÀI GIẢNG · {lesson.chapter}</span>
          <h2>{lesson.title}</h2>
        </div>
        <button className="text-button" onClick={onBack}>
          Thu gọn
        </button>
      </div>
      {lesson.videoUrl ? (
        youtube ? (
          <iframe
            className="lesson-video"
            src={youtubeUrl}
            title={lesson.title}
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <video className="lesson-video" controls preload="metadata" src={lesson.videoUrl}>
            Trình duyệt không hỗ trợ phát video.
          </video>
        )
      ) : (
        <div className="video-missing">
          <strong>Video bài giảng của “{lesson.title}” chưa được cập nhật</strong>
          <span>
            Thêm URL video đúng bài vào trường <code>videoUrl</code> của lesson để hiển thị tại đây.
          </span>
        </div>
      )}
      <div className="lesson-navigation">
        <button
          className="outline-button btn-float"
          disabled={!previousLesson}
          onClick={() => previousLesson && onSelectLesson(previousLesson.id)}
        >
          ← Bài trước
        </button>
        <button
          className="primary-button btn-float"
          onClick={() => onCompleteLesson(lesson.id, nextLesson?.id)}
        >
          {nextLesson ? "Bài tiếp theo →" : "Hoàn thành bài học"}
        </button>
      </div>
      <p className="lesson-player-meta">Thời lượng dự kiến: {lesson.durationMinutes} phút</p>
    </section>
  );
}
