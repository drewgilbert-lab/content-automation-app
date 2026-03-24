import type { SkillParameter, SkillKnowledgeLink } from "./skill-types";

export interface SkillFrontmatter {
  name: string;
  description: string;
  "disable-model-invocation"?: boolean;
  "user-invocable"?: boolean;
  "allowed-tools"?: string | string[];
  context?: string;
  agent?: string;
  "argument-hint"?: string;
  model?: string;
  hooks?: Record<string, unknown>;
}

export interface SkillPackageMetadata {
  contentType?: string[];
  category?: string;
  tags?: string[];
  parameters?: SkillParameter[];
  outputFormat?: string;
  version?: string;
  author?: string;
  triggerConditions?: string;
  sourceKnowledgeObjects?: SkillKnowledgeLink[];
}

export interface SkillPackage {
  frontmatter: SkillFrontmatter;
  body: string;
  metadata?: SkillPackageMetadata;
  supportingFiles?: Map<string, string>;
}

export interface PackageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
