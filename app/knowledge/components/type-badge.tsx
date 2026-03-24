import { type KnowledgeType, getTypeLabel } from "@/lib/knowledge-types";
import { Badge } from "@/app/components/ui/badge";

const typeColorOverrides: Record<KnowledgeType, string> = {
  persona: "border-border-focus/30 bg-hg-blue/15 text-hg-blue-bright",
  segment: "border-status-success/30 bg-status-success-bg text-status-success",
  use_case: "border-status-warning/30 bg-status-warning-bg text-status-warning",
  business_rule: "border-status-info/30 bg-status-info-bg text-hg-blue-muted",
  icp: "border-status-danger/30 bg-status-danger-bg text-status-danger",
  competitor: "border-status-warning/30 bg-status-warning-bg text-status-warning",
  customer_evidence: "border-status-success/30 bg-status-success-bg text-status-success",
};

export function TypeBadge({ type }: { type: KnowledgeType }) {
  return (
    <Badge className={typeColorOverrides[type]}>{getTypeLabel(type)}</Badge>
  );
}
