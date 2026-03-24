import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, rows = 4, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
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

Textarea.displayName = "Textarea";
