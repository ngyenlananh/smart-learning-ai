import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

export type StatCardProps = {
  icon: LucideIcon | ReactNode;
  label: string;
  value: string | number;
  sub?: string | ReactNode;
  tone?: "blue" | "gold" | "rose" | "mint" | "cyan" | "purple";
  badgeText?: string;
  className?: string;
};

export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "blue",
  badgeText,
  className = "",
}: StatCardProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === "function") {
      const IconComp = icon as LucideIcon;
      return <IconComp size={22} strokeWidth={2.2} />;
    }
    return icon as ReactNode;
  };

  return (
    <div className={`modern-stat-card stat-tone-${tone} ${className}`}>
      <div className="stat-card-top">
        <span className={`stat-icon-wrapper tone-${tone}`}>
          {renderIcon()}
        </span>
        {badgeText && <span className="stat-badge">{badgeText}</span>}
      </div>
      <div className="stat-card-content">
        <span className="stat-card-label">{label}</span>
        <strong className="stat-card-number">{value}</strong>
        {sub && <div className="stat-card-sub">{sub}</div>}
      </div>
    </div>
  );
}
