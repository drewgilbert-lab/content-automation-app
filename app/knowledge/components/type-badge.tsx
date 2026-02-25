import { type KnowledgeType, getTypeLabel } from "@/lib/knowledge-types";

const colorMap: Record<KnowledgeType, string> = {
  persona: "bg-blue-500/15 text-blue-400",
  segment: "bg-emerald-500/15 text-emerald-400",
  use_case: "bg-amber-500/15 text-amber-400",
  business_rule: "bg-purple-500/15 text-purple-400",
  icp: "bg-rose-500/15 text-rose-400",
};

export function TypeBadge({ type }: { type: KnowledgeType }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorMap[type]}`}
    >
      {getTypeLabel(type)}
    </span>
  );
}
