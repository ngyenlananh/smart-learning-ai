import { Router } from "express";
import { prisma } from "../../config/prisma.js";

export const settingsRouter = Router();

settingsRouter.get("/", async (request, response) => {
	const userId = request.header("X-User-Id") ?? "demo-user";
	try {
		const setting = await prisma.appSetting.findUnique({ where: { userId } });
		response.json({ data: setting?.data ?? null });
	} catch (error) {
		console.error("Failed to load settings", error);
		response.status(500).json({ error: "Không thể tải cài đặt" });
	}
});

settingsRouter.put("/", async (request, response) => {
	const userId = request.header("X-User-Id") ?? "demo-user";
	try {
		const setting = await prisma.appSetting.upsert({
			where: { userId },
			create: { userId, data: request.body ?? {} },
			update: { data: request.body ?? {} },
		});
		response.json({ data: setting.data, message: "Cài đặt đã được lưu" });
	} catch (error) {
		console.error("Failed to save settings", error);
		response.status(500).json({ error: "Không thể lưu cài đặt" });
	}
});
