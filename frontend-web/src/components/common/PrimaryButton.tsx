import { ButtonHTMLAttributes, ReactNode } from "react";
import { LucideIcon } from "lucide-react";

export type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon | ReactNode;
  iconPosition?: "left" | "right";
  variant?: "primary" | "cyan" | "outline" | "review";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
};

export function PrimaryButton({
  icon,
  iconPosition = "left",
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: PrimaryButtonProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === "function") {
      const IconComp = icon as LucideIcon;
      return <IconComp size={size === "lg" ? 18 : 16} />;
    }
    return icon as ReactNode;
  };

  let variantClass = "btn-gradient-primary";
  if (variant === "cyan") variantClass = "btn-gradient-cyan";
  if (variant === "outline") variantClass = "outline-button";
  if (variant === "review") variantClass = "btn-gradient-green";

  return (
    <button
      type="button"
      className={`app-primary-button btn-float ${variantClass} btn-size-${size} ${className}`}
      {...props}
    >
      {icon && iconPosition === "left" && renderIcon()}
      <span>{children}</span>
      {icon && iconPosition === "right" && renderIcon()}
    </button>
  );
}
