import { ReactNode } from "react";
import { ArrowRight, LucideIcon } from "lucide-react";

export type HeroMetric = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  badgeClass?: "flame-badge" | "target-badge" | "star-badge" | "blue-badge" | "purple-badge" | "mint-badge";
};

export type HeroBannerProps = {
  tag?: string;
  title: string;
  subtitle: string;
  actionCard?: {
    kicker: string;
    title: string;
    subtitle?: string;
    buttonText?: string;
    onClick: () => void;
  };
  metrics?: HeroMetric[];
  headerAction?: {
    sectionTitle: string;
    sectionSubtitle?: string;
    buttonText: string;
    buttonIcon?: LucideIcon;
    onAction: () => void;
  };
  children?: ReactNode;
};

export function HeroBanner({
  tag,
  title,
  subtitle,
  actionCard,
  metrics = [],
  headerAction,
  children,
}: HeroBannerProps) {
  return (
    <div className="hero-banner-section">
      <div className="hero-banner-card">
        {/* Glow & Pattern */}
        <div className="hero-ambient-glow" aria-hidden="true" />
        <div className="hero-grid-pattern" aria-hidden="true" />

        <div className="hero-banner-content">
          <div className="hero-text-area">
            {tag && <span className="hero-tag-pill">{tag}</span>}
            <h1 className="hero-heading">{title}</h1>
            <p className="hero-subtext">{subtitle}</p>

            {actionCard && (
              <div
                className="hero-quick-resume-card"
                onClick={actionCard.onClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    actionCard.onClick();
                  }
                }}
              >
                <div className="resume-play-icon">▶</div>
                <div className="resume-info">
                  <span className="resume-kicker">{actionCard.kicker}</span>
                  <strong className="resume-lesson">{actionCard.title}</strong>
                  {actionCard.subtitle && <span className="resume-course">{actionCard.subtitle}</span>}
                </div>
                <div className="resume-action">
                  <button
                    type="button"
                    className="resume-btn btn-float"
                    onClick={(e) => {
                      e.stopPropagation();
                      actionCard.onClick();
                    }}
                  >
                    <span>{actionCard.buttonText ?? "Tiếp tục"}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {children}
          </div>

          {metrics.length > 0 && (
            <div className="hero-metrics-grid">
              {metrics.map((metric, idx) => {
                const IconComponent = metric.icon;
                const badgeClass = metric.badgeClass ?? (idx === 0 ? "flame-badge" : idx === 1 ? "target-badge" : "star-badge");
                return (
                  <div className="hero-metric-glass-card" key={idx}>
                    <span className={`metric-icon-badge ${badgeClass}`}>
                      <IconComponent size={20} />
                    </span>
                    <div className="metric-text-wrap">
                      <span className="metric-label">{metric.label}</span>
                      <strong className="metric-val">{metric.value}</strong>
                      {metric.sub && <span className="metric-sub">{metric.sub}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {headerAction && (
        <div className="courses-header-action-row">
          <div>
            <h2 className="courses-section-title">{headerAction.sectionTitle}</h2>
            {headerAction.sectionSubtitle && (
              <p className="courses-section-subtitle">{headerAction.sectionSubtitle}</p>
            )}
          </div>

          <button
            type="button"
            className="enroll-new-course-btn btn-float"
            onClick={headerAction.onAction}
          >
            {headerAction.buttonIcon && <headerAction.buttonIcon size={18} strokeWidth={2.5} />}
            <span>{headerAction.buttonText}</span>
          </button>
        </div>
      )}
    </div>
  );
}
