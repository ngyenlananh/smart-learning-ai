import { useEffect, useState } from "react";

export function ProgressBar({
  progress,
  showLabel = true,
}: {
  progress: number;
  showLabel?: boolean;
}) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(Math.min(Math.max(progress, 0), 100));
    }, 80);
    return () => clearTimeout(timer);
  }, [progress]);

  // Phân cấp gradient theo mức phần trăm
  let gradientClass = "gradient-blue";
  if (progress === 100) {
    gradientClass = "gradient-green";
  } else if (progress < 30 && progress > 0) {
    gradientClass = "gradient-amber";
  } else if (progress === 0) {
    gradientClass = "gradient-neutral";
  }

  return (
    <div className="custom-progress-container">
      <div className="custom-progress-track">
        <div
          className={`custom-progress-bar ${gradientClass}`}
          style={{ width: `${animatedProgress}%` }}
        />
      </div>
      {showLabel && (
        <span className={`custom-progress-label ${progress === 100 ? "finished" : ""}`}>
          {progress}%
        </span>
      )}
    </div>
  );
}
