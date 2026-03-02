export interface PropertyDefinition {
  name: string;
  dataType: string;
  description: string;
}

export interface CrossReferenceDefinition {
  property: string;
  targetCollection: string;
  targetType: string;
  label: string;
  single?: boolean;
}

export interface CollectionDefinition {
  name: string;
  type: string;
  description: string;
  properties: PropertyDefinition[];
  crossReferences: CrossReferenceDefinition[];
}

const COLLECTIONS: Record<string, CollectionDefinition> = {
  persona: {
    name: 'Persona',
    type: 'persona',
    description: 'Buyer personas representing key audience roles (e.g. Sales, Marketing, RevOps). Each persona captures role-specific pain points, goals, preferred channels, and messaging angles.',
    properties: [
      { name: 'name', dataType: 'text', description: 'Persona name (e.g. "Sales")' },
      { name: 'content', dataType: 'text', description: 'Full markdown content — vectorized for semantic search' },
      { name: 'tags', dataType: 'text[]', description: 'Optional labels (e.g. ["gtm", "revenue"])' },
      { name: 'sourceFile', dataType: 'text', description: 'Original filename from seed import' },
      { name: 'deprecated', dataType: 'boolean', description: 'Soft-delete flag' },
      { name: 'createdAt', dataType: 'date', description: 'Record creation timestamp' },
      { name: 'updatedAt', dataType: 'date', description: 'Last modification timestamp' },
    ],
    crossReferences: [
      { property: 'hasSegments', targetCollection: 'Segment', targetType: 'segment', label: 'Segments' },
      { property: 'hasUseCases', targetCollection: 'UseCase', targetType: 'use_case', label: 'Use Cases' },
    ],
  },
  segment: {
    name: 'Segment',
    type: 'segment',
    description: 'Account segments defined by firmographic characteristics like revenue range and employee count (e.g. Enterprise, Mid-Market, SMB). Used to tailor messaging to company size and profile.',
    properties: [
      { name: 'name', dataType: 'text', description: 'Segment name (e.g. "Enterprise Account Segment")' },
      { name: 'content', dataType: 'text', description: 'Full markdown content — vectorized for semantic search' },
      { name: 'revenueRange', dataType: 'text', description: 'Revenue band (e.g. "$1B–$10B")' },
      { name: 'employeeRange', dataType: 'text', description: 'Employee count range' },
      { name: 'tags', dataType: 'text[]', description: 'Optional labels' },
      { name: 'sourceFile', dataType: 'text', description: 'Original filename from seed import' },
      { name: 'deprecated', dataType: 'boolean', description: 'Soft-delete flag' },
      { name: 'createdAt', dataType: 'date', description: 'Record creation timestamp' },
      { name: 'updatedAt', dataType: 'date', description: 'Last modification timestamp' },
    ],
    crossReferences: [
      { property: 'hasPersonas', targetCollection: 'Persona', targetType: 'persona', label: 'Personas' },
      { property: 'hasUseCases', targetCollection: 'UseCase', targetType: 'use_case', label: 'Use Cases' },
    ],
  },
  use_case: {
    name: 'UseCase',
    type: 'use_case',
    description: 'Go-to-market use cases describing specific business scenarios and how the product addresses them (e.g. "High-Intent Lead Generation", "Territory Planning").',
    properties: [
      { name: 'name', dataType: 'text', description: 'Use case name' },
      { name: 'content', dataType: 'text', description: 'Full markdown content — vectorized for semantic search' },
      { name: 'tags', dataType: 'text[]', description: 'Optional labels' },
      { name: 'sourceFile', dataType: 'text', description: 'Original filename from seed import' },
      { name: 'deprecated', dataType: 'boolean', description: 'Soft-delete flag' },
      { name: 'createdAt', dataType: 'date', description: 'Record creation timestamp' },
      { name: 'updatedAt', dataType: 'date', description: 'Last modification timestamp' },
    ],
    crossReferences: [],
  },
  business_rule: {
    name: 'BusinessRule',
    type: 'business_rule',
    description: 'Passive constraints and guidelines that govern content generation: tone guides, brand constraints, prohibited terms, and instruction templates.',
    properties: [
      { name: 'name', dataType: 'text', description: 'Rule name (e.g. "Tone Guide")' },
      { name: 'content', dataType: 'text', description: 'Rule content or instruction template — vectorized' },
      { name: 'subType', dataType: 'text', description: '"tone", "constraint", or "instruction_template"' },
      { name: 'tags', dataType: 'text[]', description: 'Optional labels' },
      { name: 'sourceFile', dataType: 'text', description: 'Original filename if seeded from file' },
      { name: 'deprecated', dataType: 'boolean', description: 'Soft-delete flag' },
      { name: 'createdAt', dataType: 'date', description: 'Record creation timestamp' },
      { name: 'updatedAt', dataType: 'date', description: 'Last modification timestamp' },
    ],
    crossReferences: [],
  },
  icp: {
    name: 'ICP',
    type: 'icp',
    description: 'Ideal Customer Profiles combining a persona and a segment into a specific targeting definition. Links to exactly one Persona and one Segment.',
    properties: [
      { name: 'name', dataType: 'text', description: 'ICP name' },
      { name: 'content', dataType: 'text', description: 'Full definition — vectorized for semantic search' },
      { name: 'tags', dataType: 'text[]', description: 'Optional labels' },
      { name: 'deprecated', dataType: 'boolean', description: 'Soft-delete flag' },
      { name: 'createdAt', dataType: 'date', description: 'Record creation timestamp' },
      { name: 'updatedAt', dataType: 'date', description: 'Last modification timestamp' },
    ],
    crossReferences: [
      { property: 'persona', targetCollection: 'Persona', targetType: 'persona', label: 'Persona', single: true },
      { property: 'segment', targetCollection: 'Segment', targetType: 'segment', label: 'Segment', single: true },
    ],
  },
  competitor: {
    name: 'Competitor',
    type: 'competitor',
    description: 'Competitive intelligence about rival products or companies. Used as context for generating battlecards, positioning documents, and objection responses.',
    properties: [
      { name: 'name', dataType: 'text', description: 'Competitor name (e.g. "Acme Corp")' },
      { name: 'content', dataType: 'text', description: 'Full markdown content — vectorized for semantic search' },
      { name: 'website', dataType: 'text', description: "Competitor's website URL" },
      { name: 'tags', dataType: 'text[]', description: 'Optional labels (e.g. ["direct", "enterprise"])' },
      { name: 'deprecated', dataType: 'boolean', description: 'Soft-delete flag' },
      { name: 'createdAt', dataType: 'date', description: 'Record creation timestamp' },
      { name: 'updatedAt', dataType: 'date', description: 'Last modification timestamp' },
    ],
    crossReferences: [],
  },
  customer_evidence: {
    name: 'CustomerEvidence',
    type: 'customer_evidence',
    description: 'Customer proof points and named references. Proof points are quantified results; references are named customers or quotes. Used to ground generated content in real outcomes.',
    properties: [
      { name: 'name', dataType: 'text', description: 'Evidence name or short label' },
      { name: 'content', dataType: 'text', description: 'Full markdown content — vectorized for semantic search' },
      { name: 'subType', dataType: 'text', description: '"proof_point" or "reference"' },
      { name: 'customerName', dataType: 'text', description: 'Name of the customer' },
      { name: 'industry', dataType: 'text', description: "Customer's industry vertical" },
      { name: 'tags', dataType: 'text[]', description: 'Optional labels' },
      { name: 'deprecated', dataType: 'boolean', description: 'Soft-delete flag' },
      { name: 'createdAt', dataType: 'date', description: 'Record creation timestamp' },
      { name: 'updatedAt', dataType: 'date', description: 'Last modification timestamp' },
    ],
    crossReferences: [],
  },
  skill: {
    name: 'Skill',
    type: 'skill',
    description: 'Procedural task instructions that tell the AI how to perform specific types of work (e.g. "Campaign Brief Generator"). Separated from BusinessRule (passive constraints).',
    properties: [
      { name: 'name', dataType: 'text', description: 'Skill name — vectorized' },
      { name: 'description', dataType: 'text', description: 'Short summary of what this skill does — vectorized' },
      { name: 'content', dataType: 'text', description: 'Full instruction body in markdown — vectorized (primary)' },
      { name: 'active', dataType: 'boolean', description: 'Toggle to enable/disable' },
      { name: 'contentType', dataType: 'text[]', description: 'Content types that trigger this skill' },
      { name: 'triggerConditions', dataType: 'text', description: 'Optional JSON for complex trigger logic' },
      { name: 'parameters', dataType: 'text', description: 'Optional JSON array of SkillParameter objects' },
      { name: 'outputFormat', dataType: 'text', description: 'Description of expected output structure' },
      { name: 'version', dataType: 'text', description: 'Semantic version string (e.g. "1.0.0")' },
      { name: 'previousVersionId', dataType: 'text', description: 'UUID of the prior version (for rollback)' },
      { name: 'tags', dataType: 'text[]', description: 'Categorization labels' },
      { name: 'category', dataType: 'text', description: 'Skill category (e.g. "content_generation")' },
      { name: 'author', dataType: 'text', description: 'Who created this skill' },
      { name: 'sourceFile', dataType: 'text', description: 'Original file path if migrated from seed' },
      { name: 'deprecated', dataType: 'boolean', description: 'Soft-delete flag' },
      { name: 'createdAt', dataType: 'date', description: 'Creation timestamp' },
      { name: 'updatedAt', dataType: 'date', description: 'Last modification timestamp' },
    ],
    crossReferences: [],
  },
};

export function getCollectionByType(type: string): CollectionDefinition | undefined {
  return COLLECTIONS[type];
}

export function getAllCollections(): CollectionDefinition[] {
  return Object.values(COLLECTIONS);
}

export function getAllTypes(): string[] {
  return Object.keys(COLLECTIONS);
}

export function isValidType(type: string): boolean {
  return type in COLLECTIONS;
}

export { COLLECTIONS };
