import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

export type FilterChipProps = {
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
  icon?: LucideIcon | ReactNode;
  className?: string;
};

export function FilterChip({
  label,
  count,
  active = false,
  onClick,
  icon,
  className = "",
}: FilterChipProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === "function") {
      const IconComp = icon as LucideIcon;
      return <IconComp size={15} />;
    }
    return icon as ReactNode;
  };

  return (
    <button
      type="button"
      className={`filter-pill pill-float ${active ? "selected" : ""} ${className}`}
      onClick={onClick}
    >
      {renderIcon()}
      <span>{label}</span>
      {count !== undefined && (
        <b className={`pill-counter ${active ? "counter-selected" : ""}`}>{count}</b>
      )}
    </button>
  );
}
