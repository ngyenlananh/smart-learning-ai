import { useEffect, useState } from "react";
import { HeroBanner } from "../common/HeroBanner";
import { useTranslation } from "react-i18next";
import { Star, Award, Flame, Calendar, Sparkles, TrendingUp, CheckCircle2 } from "lucide-react";

type AnalyticsData = {
	weeks: Array<{ label: string; averageScore: number | null; attempts: number }>;
	subjects: Array<{ subject: string; averageScore: number; masteryPercent: number; attempts: number; level: "Thành thạo" | "Trung bình" | "Cần cải thiện" }>;
	recommendation: string | null;
};

const sampleData: AnalyticsData = {
	weeks: [
		{ label: "T1", averageScore: 6.8, attempts: 2 }, { label: "T2", averageScore: 7.1, attempts: 2 },
		{ label: "T3", averageScore: 6.4, attempts: 1 }, { label: "T4", averageScore: 7.5, attempts: 2 },
		{ label: "T5", averageScore: 7.2, attempts: 2 }, { label: "T6", averageScore: 8, attempts: 3 },
		{ label: "T7", averageScore: 7.6, attempts: 2 }, { label: "T8", averageScore: 8.3, attempts: 2 },
	],
	subjects: [
		{ subject: "Mạng máy tính", averageScore: 8.4, masteryPercent: 84, attempts: 5, level: "Thành thạo" },
		{ subject: "Cơ sở dữ liệu", averageScore: 7.1, masteryPercent: 71, attempts: 4, level: "Trung bình" },
		{ subject: "Tư tưởng Hồ Chí Minh", averageScore: 6.2, masteryPercent: 62, attempts: 3, level: "Trung bình" },
		{ subject: "Ngôn ngữ (TOEIC)", averageScore: 5.4, masteryPercent: 54, attempts: 4, level: "Cần cải thiện" },
		{ subject: "Lịch sử Đảng Cộng sản Việt Nam", averageScore: 4.8, masteryPercent: 48, attempts: 2, level: "Cần cải thiện" },
	],
	recommendation: "Tập trung 60% thời gian vào Lịch sử Đảng Cộng sản Việt Nam để cân bằng năng lực.",
};

const apiUrl = `${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/exams/analytics`;

export function Analytics() {
	const { t } = useTranslation();
	const [data, setData] = useState<AnalyticsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [usingSample, setUsingSample] = useState(false);

	useEffect(() => {
		let active = true;
		fetch(apiUrl, { headers: { "X-User-Id": "demo-user" } })
			.then((response) => {
				if (!response.ok) throw new Error(`Analytics request failed: ${response.status}`);
				return response.json() as Promise<{ data: AnalyticsData }>;
			})
			.then((payload) => { if (active) setData(payload.data); })
			.catch(() => { if (active) { setData(sampleData); setUsingSample(true); } })
			.finally(() => { if (active) setLoading(false); });
		return () => { active = false; };
	}, []);

	const hasData = Boolean(data?.weeks.some((week) => week.attempts > 0) || data?.subjects.length);

	const avgScore = data?.weeks
		.filter((w) => w.averageScore !== null)
		.map((w) => w.averageScore as number);
	const latestAvg = avgScore && avgScore.length ? (avgScore[avgScore.length - 1]).toFixed(1) : "8.3";
	const masteredCount = data?.subjects.filter((s) => s.level === "Thành thạo").length ?? 3;
	const totalSubjects = data?.subjects.length ?? 5;

	return (
		<div className="analytics-page-wrapper">
			{/* HERO BANNER TRUYỀN CẢM HỨNG */}
			<HeroBanner
				tag="📊 Phân tích hiệu suất & Năng lực học tập"
				title="Hiệu suất"
				subtitle="Theo dõi chi tiết tiến bộ học tập, mức độ thành thạo từng học phần và nhận gợi ý lộ trình thông minh từ AI."
				metrics={[
					{
						icon: Star,
						label: "Điểm TB gần nhất",
						value: `${latestAvg} / 10`,
						sub: "⭐ Phong độ học tập tốt",
						badgeClass: "star-badge",
					},
					{
						icon: Award,
						label: "Mức độ thành thạo",
						value: `${masteredCount} / ${totalSubjects} môn`,
						sub: "🎯 Đang tăng đều đặn",
						badgeClass: "target-badge",
					},
					{
						icon: Flame,
						label: "Chuỗi rèn luyện",
						value: "12 ngày",
						sub: "🔥 Duy trì liên tục",
						badgeClass: "flame-badge",
					},
				]}
				headerAction={{
					sectionTitle: "Báo cáo hiệu suất học tập",
					sectionSubtitle: "Điểm số 8 tuần gần đây và mức độ thành thạo chi tiết",
					buttonText: "8 tuần gần đây ⌄",
					buttonIcon: Calendar,
					onAction: () => {},
				}}
			/>

			{loading && <p className="loading-note">{t("analytics.loading")}</p>}
			{!loading && usingSample && <p className="analytics-sample-note">{t("analytics.sample")}</p>}
			{!loading && !hasData && <p className="empty-note analytics-empty">{t("analytics.empty")}</p>}

			{!loading && hasData && data && (
				<>
					{/* BIỂU ĐỒ CỘT CAO >= 320PX */}
					<section className="panel chart-panel modern-panel">
						<div className="section-heading">
							<div>
								<span className="section-kicker">KẾT QUẢ LUYỆN TẬP</span>
								<h2>Điểm số 8 tuần gần đây</h2>
							</div>
							<div className="legend">
								<span className="legend-dot" />
								<span>Điểm số / 10</span>
							</div>
						</div>

						<div className="large-bars modern-chart-bars">
							{data.weeks.map((week, index) => (
								<div className="large-bar-wrap" key={week.label}>
									<strong className="large-bar-score">
										{week.averageScore === null ? "–" : week.averageScore.toFixed(1)}
									</strong>
									{week.averageScore !== null && (
										<div
											className={index === data.weeks.length - 1 ? "large-bar current" : "large-bar"}
											style={{ height: `${Math.max(week.averageScore * 10, 6)}%` }}
										/>
									)}
									{week.averageScore === null && <div className="large-bar empty" />}
									<span className="large-bar-label">{week.label}</span>
								</div>
							))}
						</div>
					</section>

					{/* PHÂN TÍCH MỨC ĐỘ THÀNH THẠO THEO HỌC PHẦN */}
					<section className="panel mastery modern-panel">
						<div className="section-heading">
							<div>
								<span className="section-kicker">PHÂN TÍCH CHI TIẾT</span>
								<h2>Mức độ thành thạo theo học phần</h2>
							</div>
						</div>

						<div className="mastery-list-modern">
							{data.subjects.map((item) => (
								<div className="mastery-row modern-mastery-row" key={item.subject}>
									<div className="mastery-row-header">
										<span className="mastery-course-name">{item.subject}</span>
										<span className={`mastery-pill-badge ${levelBadgeClass(item.level)}`}>
											{item.level === "Thành thạo" && <CheckCircle2 size={13} strokeWidth={2.5} />}
											<span>{item.level}</span>
										</span>
									</div>
									<small className="mastery-meta">
										{item.attempts} bài thi · Điểm TB <strong>{item.averageScore.toFixed(1)}/10</strong>
									</small>
									<div className="mastery-progress-track">
										<div
											className={`mastery-progress-fill ${levelFillClass(item.level)}`}
											style={{ width: `${item.masteryPercent}%` }}
										/>
									</div>
								</div>
							))}
						</div>
					</section>

					{/* GỢI Ý LỘ TRÌNH TỪ AI */}
					{data.recommendation && (
						<div className="recommendation modern-recommendation">
							<span className="rec-icon">
								<Sparkles size={24} />
							</span>
							<div className="rec-content">
								<strong>Lộ trình AI đề xuất tuần này</strong>
								<p>{data.recommendation}</p>
							</div>
							<button className="enroll-new-course-btn btn-float rec-btn" type="button">
								<span>Xem lộ trình →</span>
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
}

function levelBadgeClass(level: AnalyticsData["subjects"][number]["level"]): string {
	return level === "Thành thạo" ? "pill-mastered" : level === "Trung bình" ? "pill-average" : "pill-needs-work";
}

function levelFillClass(level: AnalyticsData["subjects"][number]["level"]): string {
	return level === "Thành thạo" ? "fill-green" : level === "Trung bình" ? "fill-amber" : "fill-rose";
}

