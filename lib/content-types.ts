export type ContentStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "published";

export const VALID_CONTENT_STATUSES: ContentStatus[] = [
  "draft",
  "submitted",
  "in_review",
  "approved",
  "rejected",
  "published",
];

export type ContentSourceChannel =
  | "generate_ui"
  | "direct_upload"
  | "mcp"
  | "api"
  | "bulk_import";

export const VALID_CONTENT_SOURCE_CHANNELS: ContentSourceChannel[] = [
  "generate_ui",
  "direct_upload",
  "mcp",
  "api",
  "bulk_import",
];

export interface ContentReference {
  id: string;
  name: string;
}

export interface ContentListItem {
  id: string;
  title: string;
  contentType: string;
  status: ContentStatus;
  tags: string[];
  sourceChannel?: ContentSourceChannel;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentDetail extends ContentListItem {
  body: string;
  prompt?: string;
  sourceAppId?: string;
  sourceDescription?: string;
  reviewComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  updatedBy?: string;
  usedPersona: ContentReference | null;
  usedSegment: ContentReference | null;
  usedUseCases: ContentReference[];
  usedBusinessRules: ContentReference[];
  usedSkills: ContentReference[];
}

export interface ContentCreateInput {
  title: string;
  contentType: string;
  body: string;
  prompt?: string;
  tags?: string[];
  sourceChannel?: ContentSourceChannel;
  sourceAppId?: string;
  sourceDescription?: string;
  createdBy: string;
  personaId?: string;
  segmentId?: string;
  useCaseIds?: string[];
  businessRuleIds?: string[];
  skillIds?: string[];
}

export interface ContentUpdateInput {
  title?: string;
  body?: string;
  tags?: string[];
  updatedBy: string;
}

export interface ContentListParams {
  contentType?: string;
  status?: ContentStatus;
  sourceChannel?: ContentSourceChannel;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
  createdBy?: string;
}

export interface ContentSearchResult {
  id: string;
  title: string;
  contentType: string;
  status: ContentStatus;
  snippet: string;
  score: number;
}

export function getContentStatusLabel(status: ContentStatus): string {
  const labels: Record<ContentStatus, string> = {
    draft: "Draft",
    submitted: "Submitted",
    in_review: "In Review",
    approved: "Approved",
    rejected: "Rejected",
    published: "Published",
  };
  return labels[status];
}

export function getContentSourceChannelLabel(
  channel: ContentSourceChannel,
): string {
  const labels: Record<ContentSourceChannel, string> = {
    generate_ui: "Generate UI",
    direct_upload: "Direct Upload",
    mcp: "MCP",
    api: "API",
    bulk_import: "Bulk Import",
  };
  return labels[channel];
}

export function isEditableStatus(status: ContentStatus): boolean {
  return status === "draft";
}
