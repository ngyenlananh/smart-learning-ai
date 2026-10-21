export function timeAgo(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (elapsedMinutes < 1) return "vừa tạo";
  if (elapsedMinutes < 60) return `${elapsedMinutes} phút trước`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} giờ trước`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays === 1) return "hôm qua";
  if (elapsedDays < 7) return `${elapsedDays} ngày trước`;

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
