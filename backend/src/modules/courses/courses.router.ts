import { Router } from "express";
import { completeLesson, enrollInCourse, getCourseById, getCourseCatalog, getCourseLessons, getMyCourses } from "./courses.service.js";

export const coursesRouter = Router();
const defaultUserId = "000000000000000000000001";

coursesRouter.get("/my", async (request, response) => {
	try {
		const userId = request.header("X-User-Id") ?? defaultUserId;
		const courses = await getMyCourses(userId, typeof request.query.subject === "string" ? request.query.subject : undefined, typeof request.query.search === "string" ? request.query.search : undefined);
		response.json({ data: courses });
	} catch (error) {
		console.error("Failed to load enrolled courses", error);
		response.status(500).json({ error: "Không thể tải danh sách khóa học" });
	}
});

coursesRouter.get("/catalog", async (request, response) => {
	try {
		const userId = request.header("X-User-Id") ?? defaultUserId;
		const courses = await getCourseCatalog(userId, typeof request.query.search === "string" ? request.query.search : undefined);
		response.json({ data: courses });
	} catch (error) {
		console.error("Failed to load course catalog", error);
		response.status(500).json({ error: "Không thể tải danh mục khóa học" });
	}
});

coursesRouter.post("/:courseId/lessons/:lessonId/complete", async (request, response) => {
	try {
		const userId = request.header("X-User-Id") ?? defaultUserId;
		const result = await completeLesson(userId, request.params.courseId, request.params.lessonId);
		if (!result) {
			response.status(404).json({ error: "Không tìm thấy bài học hoặc khóa học" });
			return;
		}
		response.json({ data: result });
	} catch (error) {
		console.error("Failed to complete lesson", error);
		response.status(500).json({ error: "Không thể lưu tiến độ bài học" });
	}
});

coursesRouter.get("/:courseId", async (request, response) => {
	try {
		const userId = request.header("X-User-Id") ?? defaultUserId;
		const course = await getCourseById(userId, request.params.courseId);
		if (!course) {
			response.status(404).json({ error: "Không tìm thấy khóa học" });
			return;
		}
		response.json({ data: course });
	} catch (error) {
		console.error("Failed to load course", error);
		response.status(500).json({ error: "Không thể tải thông tin khóa học" });
	}
});

coursesRouter.get("/:courseId/lessons", async (request, response) => {
	try {
		const userId = request.header("X-User-Id") ?? defaultUserId;
		const lessons = await getCourseLessons(userId, request.params.courseId);
		if (!lessons) {
			response.status(404).json({ error: "Không tìm thấy khóa học" });
			return;
		}
		response.json({ data: lessons });
	} catch (error) {
		console.error("Failed to load course lessons", error);
		response.status(500).json({ error: "Không thể tải danh sách bài học" });
	}
});

coursesRouter.post("/:courseId/enroll", async (request, response) => {
	try {
		const userId = request.header("X-User-Id") ?? defaultUserId;
		const course = await enrollInCourse(userId, request.params.courseId);
		if (!course) {
			response.status(404).json({ error: "Không tìm thấy khóa học để đăng ký" });
			return;
		}
		response.status(201).json({ data: course, message: "Đăng ký khóa học thành công" });
	} catch (error) {
		console.error("Failed to enroll in course", error);
		response.status(500).json({ error: "Không thể đăng ký khóa học" });
	}
});