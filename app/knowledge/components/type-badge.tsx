import { type KnowledgeType, getTypeLabel } from "@/lib/knowledge-types";
import { Badge } from "@/app/components/ui/badge";

const typeColorOverrides: Record<KnowledgeType, string> = {
  persona: "border-blue-800 bg-blue-500/15 text-blue-400",
  segment: "border-emerald-800 bg-emerald-500/15 text-emerald-400",
  use_case: "border-amber-800 bg-amber-500/15 text-amber-400",
  business_rule: "border-purple-800 bg-purple-500/15 text-purple-400",
  icp: "border-rose-800 bg-rose-500/15 text-rose-400",
  competitor: "border-orange-800 bg-orange-500/15 text-orange-400",
  customer_evidence: "border-teal-800 bg-teal-500/15 text-teal-400",
};

export function TypeBadge({ type }: { type: KnowledgeType }) {
  return (
    <Badge className={typeColorOverrides[type]}>{getTypeLabel(type)}</Badge>
  );
}
