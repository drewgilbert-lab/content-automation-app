import Anthropic from "@anthropic-ai/sdk";
import type { KnowledgeListItem, KnowledgeType } from "./knowledge-types";
import { VALID_TYPES, getTypeLabel } from "./knowledge-types";
import type { ParsedDocument } from "./document-parser-types";
import type {
  ClassificationResult,
  SuggestedRelationship,
  RawClassificationResponse,
} from "./classification-types";
import { CONFIDENCE_THRESHOLD } from "./classification-types";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY environment variable.");
  client = new Anthropic({ apiKey });
  return client;
}

const TYPE_DESCRIPTIONS: Record<KnowledgeType, string> = {
  persona:
    "A buyer or user persona — describes a role, their responsibilities, goals, pain points, and how they evaluate solutions.",
  segment:
    "An account segment — describes a category of companies by size, industry, revenue range, or employee count.",
  use_case:
    "A use case or topic — describes a specific problem, workflow, or scenario that the product addresses.",
  business_rule:
    "A business rule — a tone guide, constraint, or instruction template that governs content creation. SubTypes: tone, constraint, instruction_template.",
  icp:
    "An Ideal Customer Profile — the intersection of a persona and a segment, describing the ideal buyer at a specific type of company.",
  competitor:
    "A competitor — information about a competing product or company, including positioning, strengths, weaknesses, and differentiation.",
  customer_evidence:
    "Customer evidence — a proof point, case study, reference story, or testimonial from a customer. SubTypes: proof_point, reference.",
};

export function buildClassificationPrompt(
  existingObjects: KnowledgeListItem[]
): string {
  const typeSection = VALID_TYPES.map(
    (t) => `- **${t}** (${getTypeLabel(t)}): ${TYPE_DESCRIPTIONS[t]}`
  ).join("\n");

  const objectsByType = VALID_TYPES.reduce(
    (acc, t) => {
      acc[t] = existingObjects
        .filter((o) => o.type === t && !o.deprecated)
        .map((o) => `  - "${o.name}" [tags: ${o.tags.join(", ") || "none"}]`)
        .join("\n");
      return acc;
    },
    {} as Record<KnowledgeType, string>
  );

  const inventorySection = VALID_TYPES.map((t) => {
    const items = objectsByType[t];
    return `### ${getTypeLabel(t)}\n${items || "  (none)"}`;
  }).join("\n\n");

  return [
    "You are a knowledge base classifier for a B2B SaaS content engine.",
    "Given a document, classify it into exactly one of the following knowledge object types and extract metadata.",
    "",
    "## Knowledge Object Types",
    typeSection,
    "",
    "## Existing Objects in the Knowledge Base",
    "Use these to suggest relationships. Only suggest relationships to objects that genuinely relate to the document content.",
    "",
    inventorySection,
    "",
    "## Response Format",
    "Return ONLY a valid JSON object with these fields (no commentary, no markdown fences):",
    "",
    "{",
    '  "objectType": "<one of: persona, segment, use_case, business_rule, icp, competitor, customer_evidence>",',
    '  "objectName": "<concise name for this knowledge object>",',
    '  "tags": ["<tag1>", "<tag2>"],',
    '  "suggestedRelationships": [',
    "    {",
    '      "targetName": "<exact name of an existing object from the inventory above>",',
    '      "targetType": "<type of that object>",',
    '      "relationshipType": "<relationship property name>"',
    "    }",
    "  ],",
    '  "confidence": <float 0.0 to 1.0 indicating how confident you are in the classification>',
    "}",
    "",
    "## Guidelines",
    "- Choose the single best-fitting type. If the document could be multiple types, pick the strongest match.",
    "- Set confidence below 0.7 if the document is ambiguous, too short, or does not clearly fit any type.",
    "- For objectName, create a clear, concise title — not the filename.",
    "- For tags, extract 2-5 relevant topic keywords.",
    "- Only suggest relationships to objects listed in the inventory. Use the exact name from the inventory.",
    "- Valid relationship types: hasSegments, hasUseCases, hasPersonas, persona, segment.",
  ].join("\n");
}

function resolveRelationships(
  raw: RawClassificationResponse["suggestedRelationships"],
  existingObjects: KnowledgeListItem[]
): SuggestedRelationship[] {
  const resolved: SuggestedRelationship[] = [];

  for (const rel of raw) {
    const match = existingObjects.find(
      (o) =>
        o.name.toLowerCase() === rel.targetName.toLowerCase() &&
        o.type === rel.targetType
    );
    if (match) {
      resolved.push({
        targetId: match.id,
        targetName: match.name,
        targetType: match.type,
        relationshipType: rel.relationshipType,
      });
    }
  }

  return resolved;
}

function parseClassificationJSON(text: string): RawClassificationResponse {
  let cleaned = text.trim();

  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(cleaned);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Response is not a JSON object");
  }
  if (!parsed.objectType || typeof parsed.objectType !== "string") {
    throw new Error('Missing or invalid "objectType" field');
  }
  if (!parsed.objectName || typeof parsed.objectName !== "string") {
    throw new Error('Missing or invalid "objectName" field');
  }
  if (typeof parsed.confidence !== "number" || parsed.confidence < 0 || parsed.confidence > 1) {
    throw new Error('"confidence" must be a number between 0.0 and 1.0');
  }

  return {
    objectType: parsed.objectType,
    objectName: parsed.objectName,
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.filter((t: unknown) => typeof t === "string")
      : [],
    suggestedRelationships: Array.isArray(parsed.suggestedRelationships)
      ? parsed.suggestedRelationships
      : [],
    confidence: parsed.confidence,
  };
}

export async function classifyDocument(
  doc: ParsedDocument,
  existingObjects: KnowledgeListItem[]
): Promise<ClassificationResult> {
  const anthropic = getClient();
  const systemPrompt = buildClassificationPrompt(existingObjects);

  const userMessage = [
    `## Document: ${doc.filename}`,
    `Format: ${doc.format} | Words: ${doc.wordCount}`,
    "",
    doc.content,
  ].join("\n");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const raw = parseClassificationJSON(textBlock.text);

  if (!VALID_TYPES.includes(raw.objectType as KnowledgeType)) {
    throw new Error(
      `Claude returned invalid objectType "${raw.objectType}". Valid types: ${VALID_TYPES.join(", ")}`
    );
  }

  const objectType = raw.objectType as KnowledgeType;
  const suggestedRelationships = resolveRelationships(
    raw.suggestedRelationships,
    existingObjects
  );

  return {
    filename: doc.filename,
    objectType,
    objectName: raw.objectName,
    tags: raw.tags,
    suggestedRelationships,
    confidence: raw.confidence,
    needsReview: raw.confidence < CONFIDENCE_THRESHOLD,
  };
}

export { parseClassificationJSON, resolveRelationships };
