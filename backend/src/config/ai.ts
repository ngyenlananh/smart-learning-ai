import dotenv from "dotenv";

dotenv.config();

export type AiConfig = {
	apiKey: string;
	baseUrl: string;
	model: string;
	fallbackModel: string;
	isNativeGemini: boolean;
};

type ProviderModel = { id?: string; supportedGenerationMethods?: string[] };

export function getAiConfig(): AiConfig {
	const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY;
	if (!apiKey) throw new Error("Chưa cấu hình AI_API_KEY hoặc OPENAI_API_KEY");
	const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
	return {
		apiKey,
		baseUrl,
		model: process.env.AI_MODEL ?? "gemini-3.8-flash",
		fallbackModel: process.env.AI_FALLBACK_MODEL ?? "gemini-3.7-flash",
		isNativeGemini: baseUrl.includes("generativelanguage.googleapis.com") && !baseUrl.endsWith("/openai"),
	};
}

function redactUrl(url: string): string {
	return url.replace(/([?&]key=)[^&]+/i, "$1[REDACTED]");
}

function modelsUrl(config: AiConfig): string {
	return config.isNativeGemini
		? `${config.baseUrl}/models?key=${encodeURIComponent(config.apiKey)}`
		: `${config.baseUrl}/models`;
}

export async function listAiModels(config = getAiConfig()): Promise<string[]> {
	const url = modelsUrl(config);
	const response = await fetch(url, {
		headers: config.isNativeGemini ? {} : { Authorization: `Bearer ${config.apiKey}` },
		signal: AbortSignal.timeout(20_000),
	});
	const body = await response.text();
	console.log(`[AI config] list models url=${redactUrl(url)} status=${response.status} body=${body}`);
	if (!response.ok) throw new Error(`Không thể lấy danh sách model AI (HTTP ${response.status})`);
	const payload = JSON.parse(body) as { data?: ProviderModel[]; models?: ProviderModel[] };
	const models = [...(payload.data ?? []), ...(payload.models ?? [])]
		.filter((item) => item.supportedGenerationMethods?.includes("generateContent") ?? true)
		.map((item) => String(item.id ?? "").replace(/^models\//, ""))
		.filter(Boolean);
	return [...new Set(models)];
}

export async function validateAiConfiguration(): Promise<void> {
	try {
		const config = getAiConfig();
		const models = await listAiModels(config);
		const configured = [config.model, config.fallbackModel];
		const missing = configured.filter((model) => !models.includes(model));
		if (missing.length) {
			console.warn(`[AI config] Model không hợp lệ: ${missing.join(", ")}. Model hỗ trợ generateContent: ${models.join(", ")}`);
			return;
		}

		const url = config.isNativeGemini
			? `${config.baseUrl}/models/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`
			: `${config.baseUrl}/chat/completions`;
		const body = config.isNativeGemini
			? { contents: [{ role: "user", parts: [{ text: "Reply with exactly OK." }] }] }
			: { model: config.model, messages: [{ role: "user", content: "Reply with exactly OK." }] };
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...(config.isNativeGemini ? {} : { Authorization: `Bearer ${config.apiKey}` }) },
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(20_000),
		});
		const responseBody = await response.text();
		console.log(`[AI config] startup probe url=${redactUrl(url)} model=${config.model} status=${response.status} body=${responseBody}`);
		if (!response.ok) console.warn(`[AI config] Startup probe thất bại. Model hợp lệ: ${models.join(", ")}`);
	} catch (error) {
		console.warn("[AI config] Không thể kiểm tra cấu hình AI khi khởi động", error);
	}
}

export function redactAiUrl(url: string): string {
	return redactUrl(url);
}
