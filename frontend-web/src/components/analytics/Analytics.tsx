import { useEffect, useState } from "react";
import { PageTitle } from "../common/PageTitle";
import { useTranslation } from "react-i18next";

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
	return <>
		<PageTitle title={t("analytics.title")} description={t("analytics.description")} action={<button className="outline-button analytics-period-button" type="button">{t("analytics.period")} <span aria-hidden="true">⌄</span></button>} />
		{loading && <p className="loading-note">{t("analytics.loading")}</p>}
		{!loading && usingSample && <p className="analytics-sample-note">{t("analytics.sample")}</p>}
		{!loading && !hasData && <p className="empty-note analytics-empty">{t("analytics.empty")}</p>}
		{!loading && hasData && data && <>
			<section className="panel chart-panel"><div className="section-heading"><div><span className="section-kicker">{t("analytics.results")}</span><h2>{t("analytics.scoreWeeks")}</h2></div><div className="legend"><span className="legend-dot" />{t("analytics.score")}</div></div><div className="large-bars">{data.weeks.map((week, index) => <div className="large-bar-wrap" key={week.label}><strong className="large-bar-score">{week.averageScore === null ? "–" : week.averageScore.toFixed(1)}</strong>{week.averageScore !== null && <div className={index === data.weeks.length - 1 ? "large-bar current" : "large-bar"} style={{ height: `${Math.max(week.averageScore * 10, 4)}%` }} />}{week.averageScore === null && <div className="large-bar empty" /> }<span>{week.label}</span></div>)}</div></section>
			<section className="panel mastery"><div className="section-heading"><div><span className="section-kicker">PHÂN TÍCH CHI TIẾT</span><h2>Mức độ thành thạo theo học phần</h2></div></div>{data.subjects.map((item) => <div className="mastery-row" key={item.subject}><div><span>{item.subject}</span><b className={`mastery-level ${levelClass(item.level)}`}>{item.level}</b></div><small className="mastery-meta">{item.attempts} bài · Điểm TB {item.averageScore.toFixed(1)}/10</small><div className="progress-track"><i className={levelClass(item.level)} style={{ width: `${item.masteryPercent}%` }} /></div></div>)}</section>
			{data.recommendation && <div className="recommendation"><span>◎</span><div><strong>Lộ trình AI đề xuất tuần này</strong><p>{data.recommendation}</p></div><button className="text-button" type="button">Xem lộ trình →</button></div>}
		</>}
	</>;
}

function levelClass(level: AnalyticsData["subjects"][number]["level"]): string {
	return level === "Thành thạo" ? "green-fill" : level === "Trung bình" ? "yellow-fill" : "red-fill";
}
