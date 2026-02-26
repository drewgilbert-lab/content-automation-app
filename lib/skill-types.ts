export const CONTENT_TYPES = [
  "email",
  "blog",
  "social",
  "thought_leadership",
  "internal_doc",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const SKILL_CATEGORIES = [
  "content_generation",
  "documentation",
  "transformation",
  "analysis",
  "outreach",
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export interface SkillParameter {
  name: string;
  type: "string" | "number" | "boolean" | "select";
  description: string;
  required: boolean;
  options?: string[];
  default?: string;
}

export interface SkillListItem {
  id: string;
  name: string;
  description: string;
  active: boolean;
  contentType: string[];
  category: string;
  tags: string[];
  version: string;
  deprecated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SkillDetail {
  id: string;
  name: string;
  description: string;
  content: string;
  active: boolean;
  contentType: string[];
  triggerConditions?: string;
  parameters?: string;
  outputFormat?: string;
  version: string;
  previousVersionId?: string;
  tags: string[];
  category: string;
  author: string;
  sourceFile?: string;
  deprecated: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface SkillCreateInput {
  name: string;
  description: string;
  content: string;
  contentType: string[];
  active?: boolean;
  triggerConditions?: string;
  parameters?: string;
  outputFormat?: string;
  tags?: string[];
  category?: string;
  author?: string;
}

export interface SkillUpdateInput {
  name?: string;
  description?: string;
  content?: string;
  contentType?: string[];
  active?: boolean;
  triggerConditions?: string;
  parameters?: string;
  outputFormat?: string;
  version?: string;
  tags?: string[];
  category?: string;
  author?: string;
}

export function getContentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    email: "Email",
    blog: "Blog Post",
    social: "Social Post",
    thought_leadership: "Thought Leadership",
    internal_doc: "Internal Doc",
  };
  return labels[type] || type;
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    content_generation: "Content Generation",
    documentation: "Documentation",
    transformation: "Transformation",
    analysis: "Analysis",
    outreach: "Outreach",
  };
  return labels[category] || category;
}
