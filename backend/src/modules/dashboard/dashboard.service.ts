import mongoose from "mongoose";

type CourseProgress = {
  courseId: string;
  title: string;
  subject: string;
  progressPercent: number;
  nextLesson?: string;
};

export type DashboardSummary = {
  user: { id: string; fullName: string };
  streakDays: number;
  stats: {
    enrolledCourses: number;
    practicedExams: number;
    averageScore: number;
  };
  courseProgress: CourseProgress[];
  recommendation: {
    title: string;
    description: string;
    weakTopics: string[];
  };
  quickActions: { id: string; label: string; count?: number }[];
};

const demoSummary: DashboardSummary = {
  user: { id: "demo-user", fullName: "Nguyễn Minh Anh" },
  streakDays: 12,
  stats: { enrolledCourses: 4, practicedExams: 27, averageScore: 8.4 },
  courseProgress: [
    { courseId: "course-math-12", title: "Toán 12 — Hàm số mũ, logarit", subject: "math", progressPercent: 34, nextLesson: "Bài 5: Hàm số mũ và logarit" },
    { courseId: "course-physics-12", title: "Vật lý 12 — Sóng & Dao động", subject: "physics", progressPercent: 75, nextLesson: "Bài 3 — Sóng dừng & Sóng giao thoa" },
    { courseId: "course-english-toeic", title: "Ngôn ngữ", subject: "english", progressPercent: 58, nextLesson: "Vocabulary: Negotiation" },
  ],
  recommendation: {
    title: "Ôn tập Nguyên hàm, tích phân",
    description: "Tập trung 60% thời gian tuần này vào chủ đề còn yếu để cân bằng năng lực.",
    weakTopics: ["Nguyên hàm, tích phân"],
  },
  quickActions: [
    { id: "flashcards-due", label: "Flashcard đến hạn", count: 8 },
    { id: "ai-tutor", label: "Hỏi AI Tutor" },
  ],
};

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  if (mongoose.connection.readyState !== 1) {
    return { ...demoSummary, user: { ...demoSummary.user, id: userId } };
  }

  if (!mongoose.isValidObjectId(userId)) {
    return { ...demoSummary, user: { ...demoSummary.user, id: userId } };
  }

  const [user, results] = await Promise.all([
    mongoose.connection.collection("users").findOne({ _id: toObjectId(userId) }),
    mongoose.connection.collection("results").find({ userId: toObjectId(userId) }).toArray(),
  ]);

  if (!user) {
    return { ...demoSummary, user: { ...demoSummary.user, id: userId } };
  }

  const enrolledCourseIds = Array.isArray(user.enrolledCourseIds) ? user.enrolledCourseIds : [];
  const courses = await mongoose.connection.collection("courses").find({ _id: { $in: enrolledCourseIds } }).toArray();
  const scores = results.map((result) => Number(result.score)).filter((score) => Number.isFinite(score));
  const averageScore = scores.length ? round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;

  return {
    user: { id: String(user._id), fullName: String(user.fullName ?? "Học viên") },
    streakDays: Number(user.streakDays ?? 0),
    stats: { enrolledCourses: enrolledCourseIds.length, practicedExams: results.length, averageScore },
    courseProgress: courses.map((course) => ({
      courseId: String(course._id),
      title: String(course.title),
      subject: String(course.subject ?? "other"),
      progressPercent: clamp(Number(course.progressPercent ?? 0)),
      nextLesson: course.nextLesson ? String(course.nextLesson) : undefined,
    })),
    recommendation: demoSummary.recommendation,
    quickActions: demoSummary.quickActions,
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function toObjectId(value: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(value);
}