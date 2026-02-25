export type KnowledgeType =
  | "persona"
  | "segment"
  | "use_case"
  | "business_rule"
  | "icp"
  | "competitor"
  | "customer_evidence";

export interface KnowledgeListItem {
  id: string;
  name: string;
  type: KnowledgeType;
  tags: string[];
  deprecated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CrossReference {
  id: string;
  name: string;
  type: KnowledgeType;
}

export interface KnowledgeDetail {
  id: string;
  name: string;
  type: KnowledgeType;
  content: string;
  tags: string[];
  deprecated: boolean;
  createdAt: string;
  updatedAt: string;
  subType?: string;
  revenueRange?: string;
  employeeRange?: string;
  website?: string;
  customerName?: string;
  industry?: string;
  sourceFile?: string;
  crossReferences: Record<string, CrossReference[]>;
}

export interface RelationshipConfig {
  property: string;
  targetType: KnowledgeType;
  label: string;
  single?: boolean;
  reverse?: boolean;
}

export interface KnowledgeCreateInput {
  type: KnowledgeType;
  name: string;
  content: string;
  tags?: string[];
  subType?: string;
  revenueRange?: string;
  employeeRange?: string;
  website?: string;
  customerName?: string;
  industry?: string;
  personaId?: string;
  segmentId?: string;
}

export interface KnowledgeUpdateInput {
  name?: string;
  content?: string;
  tags?: string[];
  subType?: string;
  revenueRange?: string;
  employeeRange?: string;
  website?: string;
  customerName?: string;
  industry?: string;
}

export const VALID_TYPES: KnowledgeType[] = [
  "persona",
  "segment",
  "use_case",
  "business_rule",
  "icp",
  "competitor",
  "customer_evidence",
];

export const SUB_TYPES = ["tone", "constraint", "instruction_template"] as const;

export const CUSTOMER_EVIDENCE_SUB_TYPES = ["proof_point", "reference"] as const;

export function getTypeLabel(type: KnowledgeType): string {
  const labels: Record<KnowledgeType, string> = {
    persona: "Persona",
    segment: "Segment",
    use_case: "Use Case",
    business_rule: "Business Rule",
    icp: "ICP",
    competitor: "Competitor",
    customer_evidence: "Customer Evidence",
  };
  return labels[type];
}
