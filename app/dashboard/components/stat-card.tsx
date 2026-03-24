import type { KnowledgeType } from "@/lib/knowledge-types";
import { TypeBadge } from "@/app/knowledge/components/type-badge";

interface StatCardProps {
  label: string;
  value: number;
  type?: KnowledgeType;
  variant?: "default" | "warning" | "danger";
}

const variantStyles = {
  default: "border-border-default bg-surface-card",
  warning: "border-status-warning/30 bg-status-warning-bg",
  danger: "border-status-danger/30 bg-status-danger-bg",
};

const valueStyles = {
  default: "text-text-primary",
  warning: "text-status-warning",
  danger: "text-status-danger",
};

export function StatCard({ label, value, type, variant = "default" }: StatCardProps) {
  const effectiveVariant =
    variant !== "default" && value > 0 ? variant : "default";

  return (
    <div
      className={`rounded-card border p-4 ${variantStyles[effectiveVariant]}`}
    >
      <div className="flex items-center gap-2">
        {type && <TypeBadge type={type} />}
        <p className="text-label uppercase tracking-widest text-text-muted">
          {label}
        </p>
      </div>
      <p className={`mt-2 text-2xl font-semibold ${valueStyles[effectiveVariant]}`}>
        {value}
      </p>
    </div>
  );
}
