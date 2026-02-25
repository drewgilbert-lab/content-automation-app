import type { KnowledgeType } from "@/lib/knowledge-types";
import { TypeBadge } from "@/app/knowledge/components/type-badge";

interface StatCardProps {
  label: string;
  value: number;
  type?: KnowledgeType;
  variant?: "default" | "warning" | "danger";
}

const variantStyles = {
  default: "border-gray-800 bg-gray-900",
  warning: "border-amber-800/50 bg-amber-950/30",
  danger: "border-red-800/50 bg-red-950/30",
};

const valueStyles = {
  default: "text-white",
  warning: "text-amber-400",
  danger: "text-red-400",
};

export function StatCard({ label, value, type, variant = "default" }: StatCardProps) {
  const effectiveVariant =
    variant !== "default" && value > 0 ? variant : "default";

  return (
    <div
      className={`rounded-xl border p-4 ${variantStyles[effectiveVariant]}`}
    >
      <div className="flex items-center gap-2">
        {type && <TypeBadge type={type} />}
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
          {label}
        </p>
      </div>
      <p className={`mt-2 text-2xl font-semibold ${valueStyles[effectiveVariant]}`}>
        {value}
      </p>
    </div>
  );
}
