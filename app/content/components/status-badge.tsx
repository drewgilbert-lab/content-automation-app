import { Badge, type BadgeProps } from "@/app/components/ui/badge";
import {
  type ContentStatus,
  getContentStatusLabel,
} from "@/lib/content-types";

const statusVariant: Record<ContentStatus, BadgeProps["variant"]> = {
  draft: "default",
  submitted: "info",
  in_review: "warning",
  approved: "success",
  rejected: "danger",
  published: "purple",
};

export function StatusBadge({
  status,
  size = "md",
  className,
}: {
  status: ContentStatus;
  size?: BadgeProps["size"];
  className?: string;
}) {
  return (
    <Badge variant={statusVariant[status]} size={size} className={className}>
      {getContentStatusLabel(status)}
    </Badge>
  );
}
