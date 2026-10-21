import mongoose from "mongoose";

export type CourseSummary = {
	id: string;
	title: string;
	subject: string;
	meta: string;
	progressPercent: number;
	completedLessons: number;
	totalLessons: number;
	status: "in_progress" | "not_started" | "completed";
	nextLesson?: string;
};

export type CourseCatalogItem = CourseSummary & {
	description: string;
	icon: string;
	isEnrolled: boolean;
	teacher?: string;
	level?: string;
	 syllabus?: string[];
	prerequisites?: string;
	credits?: number;
	semester?: string;
	studyHours?: number;
};

export type Lesson = {
	id: string;
	courseId: string;
	chapter: string;
	title: string;
	order: number;
	status: "completed" | "current" | "locked";
	durationMinutes: number;
	videoUrl?: string;
};

type CourseRecord = CourseSummary & { description: string; icon: string };

const demoCourses: CourseRecord[] = [
	{
		id: "course-ho-chi-minh-thought",
		title: "Tư tưởng Hồ Chí Minh",
		subject: "political-theory",
		meta: "7 chương · 28 bài học",
		progressPercent: 34,
		completedLessons: 10,
		totalLessons: 28,
		status: "in_progress",
		nextLesson: "Chương 3: Tư tưởng độc lập dân tộc",
		description: "Hệ thống hóa cơ sở hình thành, nội dung cốt lõi và giá trị tư tưởng Hồ Chí Minh.",
		icon: "★",
	},
	{
		id: "course-party-history",
		title: "Lịch sử Đảng Cộng sản Việt Nam",
		subject: "party-history",
		meta: "6 chương · 24 bài học",
		progressPercent: 58,
		completedLessons: 14,
		totalLessons: 24,
		status: "in_progress",
		nextLesson: "Chương 4: Đảng lãnh đạo công cuộc đổi mới",
		description: "Tìm hiểu quá trình ra đời, lãnh đạo cách mạng và những dấu mốc quan trọng của Đảng.",
		icon: "▣",
	},
	{
		id: "course-computer-networks",
		title: "Mạng máy tính",
		subject: "computer-networks",
		meta: "8 chương · 32 bài học",
		progressPercent: 22,
		completedLessons: 7,
		totalLessons: 32,
		status: "in_progress",
		nextLesson: "Chương 2: Mô hình OSI và TCP/IP",
		description: "Nắm nền tảng truyền thông dữ liệu, mô hình mạng, giao thức và thiết kế mạng máy tính.",
		icon: "◇",
	},
	{
		id: "course-database-systems",
		title: "Cơ sở dữ liệu",
		subject: "information-technology",
		meta: "7 chương · 30 bài học",
		progressPercent: 0,
		completedLessons: 0,
		totalLessons: 30,
		status: "not_started",
		description: "Thực hành mô hình hóa dữ liệu, SQL, chuẩn hóa và xây dựng hệ quản trị cơ sở dữ liệu.",
		icon: "□",
	},
	{
		id: "course-english-toeic",
		title: "Ngôn ngữ",
		subject: "english",
		meta: "4 chương · 4 bài học",
		progressPercent: 0,
		completedLessons: 0,
		totalLessons: 4,
		status: "not_started",
		description: "Luyện từ vựng, đọc hiểu và nghe tiếng Anh theo định hướng TOEIC.",
		icon: "Aa",
	},
];

const demoCatalogCourses: CourseRecord[] = [
	...demoCourses,
	{
		id: "course-operating-systems",
		title: "Hệ điều hành",
		subject: "information-technology",
		meta: "8 chương · 36 bài học",
		progressPercent: 0,
		completedLessons: 0,
		totalLessons: 36,
		status: "not_started",
		description: "Khám phá tiến trình, quản lý bộ nhớ, hệ thống tệp và cơ chế vận hành của máy tính.",
		icon: "◫",
	},
	{
		id: "course-software-engineering",
		title: "Công nghệ phần mềm",
		subject: "information-technology",
		meta: "6 chương · 27 bài học",
		progressPercent: 0,
		completedLessons: 0,
		totalLessons: 27,
		status: "not_started",
		description: "Làm quen quy trình phát triển phần mềm, quản lý yêu cầu, kiểm thử và làm việc nhóm.",
		icon: "⌘",
	},
	{
		id: "course-game-theory",
		title: "Lý thuyết trò chơi và ra quyết định",
		subject: "economics",
		meta: "5 chương · 20 bài học",
		progressPercent: 0,
		completedLessons: 0,
		totalLessons: 20,
		status: "not_started",
		description: "Tìm hiểu cách phân tích xung đột, hợp tác và ra quyết định chiến lược giữa các tác nhân.",
		icon: "♟",
	},
	{
		id: "course-web-development",
		title: "Phát triển ứng dụng Web",
		subject: "information-technology",
		meta: "6 chương · 24 bài học",
		progressPercent: 0,
		completedLessons: 0,
		totalLessons: 24,
		status: "not_started",
		description: "Xây dựng ứng dụng web hiện đại với HTML, CSS, JavaScript và kiến trúc frontend/backend.",
		icon: "⌘",
	},
	{
		id: "course-cyber-security",
		title: "An toàn thông tin",
		subject: "information-technology",
		meta: "6 chương · 24 bài học",
		progressPercent: 0,
		completedLessons: 0,
		totalLessons: 24,
		status: "not_started",
		description: "Nhận diện rủi ro, bảo vệ hệ thống và áp dụng các nguyên tắc an toàn thông tin.",
		icon: "◇",
	},
	{
		id: "course-cloud-computing",
		title: "Điện toán đám mây",
		subject: "information-technology",
		meta: "5 chương · 20 bài học",
		progressPercent: 0,
		completedLessons: 0,
		totalLessons: 20,
		status: "not_started",
		description: "Tìm hiểu mô hình dịch vụ, triển khai và vận hành hệ thống trên nền tảng đám mây.",
		icon: "□",
	},
];

const demoEnrolledCourseIds = new Set(demoCourses.map((course) => course.id));
const demoCompletedLessonIds = new Map<string, Set<string>>();

export async function getMyCourses(userId: string, subject?: string, search?: string): Promise<CourseSummary[]> {
	if (!isDatabaseReady() || !mongoose.isValidObjectId(userId)) {
		return filterCourses(demoCatalogCourses.filter((course) => demoEnrolledCourseIds.has(course.id)).map((course) => ({ ...course, ...getDemoCourseProgress(userId, course) })), subject, search);
	}

	const user = await mongoose.connection.collection("users").findOne({ _id: toObjectId(userId) });
	const enrolledIds = Array.isArray(user?.enrolledCourseIds) ? user.enrolledCourseIds : [];
	const courses = await mongoose.connection.collection("courses").find({ _id: { $in: enrolledIds } }).toArray();
	const completedLessonIds = new Set((Array.isArray(user?.completedLessonIds) ? user.completedLessonIds : []).map(String));
	const courseIds = courses.map((course) => course._id);
	const lessons = await mongoose.connection.collection("lessons").find({ courseId: { $in: courseIds } }, { projection: { _id: 1, courseId: 1 } }).toArray();
	const lessonCounts = new Map<string, number>();
	const completedCounts = new Map<string, number>();
	for (const lesson of lessons) {
		const courseId = String(lesson.courseId);
		lessonCounts.set(courseId, (lessonCounts.get(courseId) ?? 0) + 1);
		if (completedLessonIds.has(String(lesson._id))) completedCounts.set(courseId, (completedCounts.get(courseId) ?? 0) + 1);
	}

	const summaries = courses.map((course) => {
		const courseId = String(course._id);
		const totalLessons = lessonCounts.get(courseId) ?? Number(course.totalLessons ?? 0);
		const completedLessons = completedCounts.get(courseId) ?? 0;
		const progressPercent = calculateProgress(completedLessons, totalLessons);
		return {
			id: courseId,
			title: String(course.title ?? "Khóa học"),
			subject: String(course.subject ?? "other"),
			meta: `${Number(course.chapterCount ?? 0)} chương · ${totalLessons} bài học`,
			progressPercent,
			completedLessons,
			totalLessons,
			status: getCourseStatus(progressPercent),
			nextLesson: course.nextLesson ? String(course.nextLesson) : undefined,
		};
	});

	return filterCourses(summaries, subject, search);
}

export async function getCourseCatalog(userId: string, search?: string): Promise<CourseCatalogItem[]> {
	if (!isDatabaseReady() || !mongoose.isValidObjectId(userId)) {
		return filterCatalog(demoCatalogCourses.map((course) => ({ ...course, ...getDemoCourseDetails(course), isEnrolled: demoEnrolledCourseIds.has(course.id) })), search);
	}

	const user = await mongoose.connection.collection("users").findOne({ _id: toObjectId(userId) });
	const enrolledIds = new Set((Array.isArray(user?.enrolledCourseIds) ? user.enrolledCourseIds : []).map(String));
	const courses = await mongoose.connection.collection("courses").find({}).toArray();
	return filterCatalog(courses.map((course) => ({
		id: String(course._id),
		title: String(course.title ?? "Khóa học"),
		subject: String(course.subject ?? "other"),
		meta: `${Number(course.chapterCount ?? 0)} chương · ${Number(course.totalLessons ?? 0)} bài học`,
		progressPercent: 0,
		completedLessons: 0,
		totalLessons: Number(course.totalLessons ?? 0),
		status: "not_started" as const,
		description: String(course.description ?? ""),
		icon: String(course.icon ?? "□"),
		teacher: typeof course.teacher === "string" ? course.teacher : undefined,
		level: typeof course.level === "string" ? course.level : "Đại học",
		syllabus: Array.isArray(course.syllabus) ? course.syllabus.map(String) : undefined,
		prerequisites: typeof course.prerequisites === "string" ? course.prerequisites : "Không yêu cầu",
		credits: Number(course.credits ?? 3),
		semester: typeof course.semester === "string" ? course.semester : "Theo kế hoạch đào tạo",
		studyHours: Number(course.studyHours ?? 135),
		isEnrolled: enrolledIds.has(String(course._id)),
	})), search);
}

export async function enrollInCourse(userId: string, courseId: string): Promise<CourseCatalogItem | null> {
	const course = demoCatalogCourses.find((item) => item.id === courseId);
	if (!isDatabaseReady() || !mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) {
		if (!course) return null;
		demoEnrolledCourseIds.add(courseId);
		return { ...course, ...getDemoCourseDetails(course), isEnrolled: true };
	}

	const update = await mongoose.connection.collection("users").updateOne(
		{ _id: toObjectId(userId) },
		{ $addToSet: { enrolledCourseIds: toObjectId(courseId) } },
	);
	if (!update.matchedCount) return null;
	return getCourseCatalog(userId).then((items) => items.find((item) => item.id === courseId) ?? null);
}

export type LessonCompletion = {
	courseId: string;
	lessonId: string;
	completedLessons: number;
	totalLessons: number;
	progressPercent: number;
};

export async function completeLesson(userId: string, courseId: string, lessonId: string): Promise<LessonCompletion | null> {
	const demoCourse = demoCatalogCourses.find((course) => course.id === courseId);
	if (!isDatabaseReady() || !mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(lessonId)) {
		if (!demoCourse || !demoEnrolledCourseIds.has(courseId)) return null;
		const lessonExists = demoLessons(courseId, 0).some((lesson) => lesson.id === lessonId);
		if (!lessonExists) return null;
		const completed = demoCompletedLessonIds.get(userId) ?? new Set<string>();
		completed.add(lessonId);
		demoCompletedLessonIds.set(userId, completed);
		const totalLessons = demoLessons(courseId, 0).length;
		return { courseId, lessonId, completedLessons: completed.size, totalLessons, progressPercent: calculateProgress(completed.size, totalLessons) };
	}

	const user = await mongoose.connection.collection("users").findOne({ _id: toObjectId(userId), enrolledCourseIds: toObjectId(courseId) });
	const lesson = await mongoose.connection.collection("lessons").findOne({ _id: toObjectId(lessonId), courseId: toObjectId(courseId) });
	if (!user || !lesson) return null;
	await mongoose.connection.collection("users").updateOne({ _id: toObjectId(userId) }, { $addToSet: { completedLessonIds: toObjectId(lessonId) } });
	const updatedUser = await mongoose.connection.collection("users").findOne({ _id: toObjectId(userId) }, { projection: { completedLessonIds: 1 } });
	const completedIds = new Set((Array.isArray(updatedUser?.completedLessonIds) ? updatedUser.completedLessonIds : []).map(String));
	const totalLessons = await mongoose.connection.collection("lessons").countDocuments({ courseId: toObjectId(courseId) });
	const completedLessons = await mongoose.connection.collection("lessons").countDocuments({ courseId: toObjectId(courseId), _id: { $in: [...completedIds].filter(mongoose.isValidObjectId).map(toObjectId) } });
	return { courseId, lessonId, completedLessons, totalLessons, progressPercent: calculateProgress(completedLessons, totalLessons) };
}

export async function getCourseById(userId: string, courseId: string): Promise<CourseRecord | null> {
	const demoCourse = demoCatalogCourses.find((course) => course.id === courseId);
	if (!isDatabaseReady() || !mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) {
		return demoCourse && demoEnrolledCourseIds.has(courseId) ? { ...demoCourse, ...getDemoCourseProgress(userId, demoCourse) } : null;
	}

	const user = await mongoose.connection.collection("users").findOne({ _id: toObjectId(userId), enrolledCourseIds: toObjectId(courseId) });
	if (!user) return null;
	const course = await mongoose.connection.collection("courses").findOne({ _id: toObjectId(courseId) });
	if (!course) return null;
	const lessons = await mongoose.connection.collection("lessons").countDocuments({ courseId: toObjectId(courseId) });
	const completedLessonIds = new Set((Array.isArray(user.completedLessonIds) ? user.completedLessonIds : []).map(String));
	const completedLessons = await mongoose.connection.collection("lessons").countDocuments({ courseId: toObjectId(courseId), _id: { $in: [...completedLessonIds].filter(mongoose.isValidObjectId).map(toObjectId) } });
	const progressPercent = calculateProgress(completedLessons, lessons);
	return {
		id: String(course._id),
		title: String(course.title ?? "Khóa học"),
		subject: String(course.subject ?? "other"),
		meta: `${Number(course.chapterCount ?? 0)} chương · ${lessons} bài học`,
		progressPercent,
		completedLessons,
		totalLessons: lessons,
		status: getCourseStatus(progressPercent),
		nextLesson: course.nextLesson ? String(course.nextLesson) : undefined,
		description: String(course.description ?? ""),
		icon: String(course.icon ?? "□"),
	};
}

export async function getCourseLessons(userId: string, courseId: string): Promise<Lesson[] | null> {
	const demoCourse = demoCatalogCourses.find((course) => course.id === courseId);
	if (!isDatabaseReady() || !mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(courseId)) {
		const completed = demoCompletedLessonIds.get(userId) ?? new Set<string>();
		return demoCourse && demoEnrolledCourseIds.has(courseId) ? demoLessons(courseId, demoCourse.progressPercent, completed) : null;
	}

	const user = await mongoose.connection.collection("users").findOne({ _id: toObjectId(userId), enrolledCourseIds: toObjectId(courseId) });
	if (!user) return null;
	const completedIds = new Set((Array.isArray(user.completedLessonIds) ? user.completedLessonIds : []).map(String));
	const lessons = await mongoose.connection.collection("lessons").find({ courseId: toObjectId(courseId) }).sort({ order: 1 }).toArray();
	const completedCount = lessons.filter((lesson) => completedIds.has(String(lesson._id))).length;
	return lessons.map((lesson, index) => ({
		id: String(lesson._id),
		courseId,
		chapter: String(lesson.chapter ?? "Chương học"),
		title: String(lesson.title ?? "Bài học"),
		order: Number(lesson.order ?? index + 1),
		status: completedIds.has(String(lesson._id)) ? "completed" : index === completedCount ? "current" : "locked",
		durationMinutes: Number(lesson.durationMinutes ?? 20),
		videoUrl: typeof lesson.videoUrl === "string" ? lesson.videoUrl : undefined,
	}));
}

function demoLessons(courseId: string, progress: number, completedLessonIds?: Set<string>): Lesson[] {
	const titles = courseId === "course-game-theory"
		? ["Lecture 1: Introduction to Individual Decision-Making", "Các khái niệm cơ bản của lý thuyết trò chơi", "Cân bằng Nash", "Bài tập ra quyết định chiến lược"]
		: courseId === "course-math-12"
		? ["Ôn tập kiến thức nền", "Bài 5: Hàm số mũ và logarit", "Bài tập hàm số mũ", "Bài tập tổng hợp"]
		: courseId === "course-english-toeic"
			? ["Vocabulary: Negotiation", "Reading comprehension", "Listening practice", "Review test"]
			: ["Ôn tập kiến thức nền", "Dao động điều hòa", "Sóng dừng & Sóng giao thoa", "Bài tập tổng hợp"];
	const videoUrls = courseId === "course-english-toeic"
		? ["https://www.youtube.com/embed/juKd26qkNAw", "https://www.youtube.com/embed/pmI5hJ6RkX4", "https://www.youtube.com/embed/3mJ6Q6JvY9M", "https://www.youtube.com/embed/7F3D5QX6x2Q"]
		: [];
	const completedCount = Math.floor((progress / 100) * titles.length);
	return titles.map((title, index) => {
		const id = `${courseId}-lesson-${index + 1}`;
		const completed = completedLessonIds ? completedLessonIds.has(id) : index < completedCount;
		const completedBefore = completedLessonIds ? titles.slice(0, index).filter((_, previousIndex) => completedLessonIds.has(`${courseId}-lesson-${previousIndex + 1}`)).length : completedCount;
		return { id, courseId, chapter: `Chương ${index + 1}`, title, order: index + 1, status: completed ? "completed" : index === completedBefore ? "current" : "locked", durationMinutes: courseId === "course-game-theory" && index === 0 ? 11 : 18 + index * 4, videoUrl: courseId === "course-game-theory" && index === 0 ? "https://www.youtube.com/embed/cNh2GsLTsQg" : videoUrls[index] };
	});
}

function getDemoCourseProgress(userId: string, course: CourseRecord): Pick<CourseSummary, "completedLessons" | "totalLessons" | "progressPercent" | "status"> {
	const completedIds = demoCompletedLessonIds.get(userId) ?? new Set<string>();
	const totalLessons = demoLessons(course.id, 0).length;
	const completedLessons = [...completedIds].filter((lessonId) => lessonId.startsWith(`${course.id}-lesson-`)).length;
	const progressPercent = calculateProgress(completedLessons, totalLessons);
	return { completedLessons, totalLessons, progressPercent, status: getCourseStatus(progressPercent) };
}

function getDemoCourseDetails(course: CourseRecord): Pick<CourseCatalogItem, "teacher" | "level" | "syllabus" | "prerequisites"> {
	const details: Record<string, Pick<CourseCatalogItem, "teacher" | "level" | "syllabus" | "prerequisites">> = {
		"course-operating-systems": { teacher: "TS. Nguyễn Hoàng Nam", level: "Năm 2 · Cơ sở ngành", syllabus: ["Tiến trình và luồng", "Quản lý bộ nhớ", "Hệ thống tệp và bảo vệ"], prerequisites: "Kiến trúc máy tính" },
		"course-software-engineering": { teacher: "ThS. Trần Ngọc Anh", level: "Năm 2 · Chuyên ngành", syllabus: ["Quy trình phát triển phần mềm", "Phân tích yêu cầu", "Kiểm thử và làm việc nhóm"], prerequisites: "Lập trình căn bản" },
		"course-ho-chi-minh-thought": { teacher: "Khoa Lý luận chính trị", level: "Đại cương", syllabus: ["Cơ sở hình thành tư tưởng", "Độc lập dân tộc và chủ nghĩa xã hội", "Đạo đức và văn hóa"], prerequisites: "Không yêu cầu" },
		"course-party-history": { teacher: "Khoa Lịch sử Đảng", level: "Đại cương", syllabus: ["Đảng ra đời và lãnh đạo cách mạng", "Các thời kỳ kháng chiến", "Công cuộc đổi mới"], prerequisites: "Không yêu cầu" },
		"course-computer-networks": { teacher: "TS. Lê Minh Quân", level: "Năm 2 · Chuyên ngành", syllabus: ["Mô hình OSI và TCP/IP", "Định tuyến và chuyển mạch", "An toàn mạng cơ bản"], prerequisites: "Lập trình căn bản" },
		"course-database-systems": { teacher: "ThS. Phạm Thu Hà", level: "Năm 2 · Chuyên ngành", syllabus: ["Mô hình quan hệ", "SQL và truy vấn", "Chuẩn hóa cơ sở dữ liệu"], prerequisites: "Lập trình căn bản" },
		"course-game-theory": { teacher: "MIT OpenCourseWare", level: "Tự chọn · Nhập môn", syllabus: ["Ra quyết định cá nhân", "Xung đột và hợp tác", "Cân bằng Nash"], prerequisites: "Không yêu cầu" },
		"course-english-toeic": { teacher: "Trung tâm Ngoại ngữ SmartEdu", level: "Cơ bản · TOEIC", syllabus: ["Vocabulary: Negotiation", "Reading comprehension", "Listening practice"], prerequisites: "Không yêu cầu" },
	};
	return details[course.id] ?? { teacher: "Khoa chuyên môn", level: "Đại học", syllabus: ["Nội dung nhập môn", "Kiến thức nền tảng", "Bài tập ứng dụng"], prerequisites: "Không yêu cầu" };
}

function filterCourses(courses: CourseSummary[], subject?: string, search?: string): CourseSummary[] {
	const normalizedSearch = search?.trim().toLocaleLowerCase("vi-VN");
	return courses.filter((course) => (!subject || course.subject === subject) && (!normalizedSearch || `${course.title} ${course.subject} ${course.meta}`.toLocaleLowerCase("vi-VN").includes(normalizedSearch)));
}

function filterCatalog(courses: CourseCatalogItem[], search?: string): CourseCatalogItem[] {
	return filterCourses(courses, undefined, search) as CourseCatalogItem[];
}

function getLessonCounts(courseIds: mongoose.Types.ObjectId[]): Promise<Map<string, number>> {
	return mongoose.connection.collection("lessons").aggregate([{ $match: { courseId: { $in: courseIds } } }, { $group: { _id: "$courseId", count: { $sum: 1 } } }]).toArray().then((rows) => new Map(rows.map((row) => [String(row._id), Number(row.count)])));
}

function isDatabaseReady(): boolean { return mongoose.connection.readyState === 1; }
function clamp(value: number): number { return Math.max(0, Math.min(100, Math.round(value))); }
function calculateProgress(completedLessons: number, totalLessons: number): number { return totalLessons ? clamp(completedLessons / totalLessons * 100) : 0; }
function getCourseStatus(progress: number): CourseSummary["status"] { return progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "not_started"; }
function toObjectId(value: string): mongoose.Types.ObjectId { return new mongoose.Types.ObjectId(value); }