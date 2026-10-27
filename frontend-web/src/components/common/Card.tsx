import { HTMLAttributes, ReactNode } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: "default" | "elevated" | "tinted" | "interactive";
  padding?: "sm" | "md" | "lg" | "none";
  className?: string;
};

export function Card({
  children,
  variant = "default",
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`app-card card-variant-${variant} card-pad-${padding} ${
        variant === "interactive" ? "card-float" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
