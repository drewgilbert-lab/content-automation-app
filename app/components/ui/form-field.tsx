import { cn } from "@/lib/utils";

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  helpText?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  helpText,
  error,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-0", className)}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-text-secondary"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-status-danger">{error}</p>
      ) : helpText ? (
        <p className="mt-1 text-xs text-text-muted">{helpText}</p>
      ) : null}
    </div>
  );
}
