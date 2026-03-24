import { cn } from "@/lib/utils";

const variantStyles = {
  default: "border-border-default bg-surface-input text-text-tertiary",
  success: "border-green-800 bg-status-success-bg text-status-success",
  warning: "border-amber-800 bg-status-warning-bg text-status-warning",
  danger: "border-red-800 bg-status-danger-bg text-status-danger",
  info: "border-blue-800 bg-status-info-bg text-status-info",
  purple: "border-status-purple/30 bg-status-purple-bg text-status-purple",
} as const;

const sizeStyles = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-0.5 text-xs",
} as const;

export interface BadgeProps {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  className?: string;
  children: React.ReactNode;
}

export function Badge({
  variant = "default",
  size = "md",
  className,
  children,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
