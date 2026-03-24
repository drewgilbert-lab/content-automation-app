import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-sm text-text-primary placeholder-text-muted transition-colors focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus",
          error && "border-status-danger focus:ring-status-danger",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
