import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import weaviate, { WeaviateClient, type CollectionConfig } from "weaviate-client";

const WEAVIATE_URL = process.env.WEAVIATE_URL!;
const WEAVIATE_API_KEY = process.env.WEAVIATE_API_KEY!;
const CONTENT_REPO_PATH = process.env.CONTENT_REPO_PATH!;

if (!WEAVIATE_URL || !WEAVIATE_API_KEY) {
  console.error("Missing WEAVIATE_URL or WEAVIATE_API_KEY in .env.local");
  process.exit(1);
}
if (!CONTENT_REPO_PATH) {
  console.error("Missing CONTENT_REPO_PATH in .env.local");
  process.exit(1);
}

const { dataType } = weaviate.configure;

// ── Collection Schemas ──────────────────────────────────────────────

function personaSchema(): CollectionConfig {
  return {
    name: "Persona",
    properties: [
      { name: "name", dataType: dataType.TEXT },
      { name: "content", dataType: dataType.TEXT },
      { name: "tags", dataType: dataType.TEXT_ARRAY },
      { name: "sourceFile", dataType: dataType.TEXT },
      { name: "createdAt", dataType: dataType.DATE },
      { name: "updatedAt", dataType: dataType.DATE },
    ],
  };
}

function segmentSchema(): CollectionConfig {
  return {
    name: "Segment",
    properties: [
      { name: "name", dataType: dataType.TEXT },
      { name: "content", dataType: dataType.TEXT },
      { name: "revenueRange", dataType: dataType.TEXT },
      { name: "employeeRange", dataType: dataType.TEXT },
      { name: "tags", dataType: dataType.TEXT_ARRAY },
      { name: "sourceFile", dataType: dataType.TEXT },
      { name: "createdAt", dataType: dataType.DATE },
      { name: "updatedAt", dataType: dataType.DATE },
    ],
  };
}

function useCaseSchema(): CollectionConfig {
  return {
    name: "UseCase",
    properties: [
      { name: "name", dataType: dataType.TEXT },
      { name: "content", dataType: dataType.TEXT },
      { name: "tags", dataType: dataType.TEXT_ARRAY },
      { name: "sourceFile", dataType: dataType.TEXT },
      { name: "createdAt", dataType: dataType.DATE },
      { name: "updatedAt", dataType: dataType.DATE },
    ],
  };
}

function icpSchema(): CollectionConfig {
  return {
    name: "ICP",
    properties: [
      { name: "name", dataType: dataType.TEXT },
      { name: "content", dataType: dataType.TEXT },
      { name: "tags", dataType: dataType.TEXT_ARRAY },
      { name: "createdAt", dataType: dataType.DATE },
      { name: "updatedAt", dataType: dataType.DATE },
    ],
  };
}

function businessRuleSchema(): CollectionConfig {
  return {
    name: "BusinessRule",
    properties: [
      { name: "name", dataType: dataType.TEXT },
      { name: "content", dataType: dataType.TEXT },
      { name: "subType", dataType: dataType.TEXT },
      { name: "tags", dataType: dataType.TEXT_ARRAY },
      { name: "sourceFile", dataType: dataType.TEXT },
      { name: "createdAt", dataType: dataType.DATE },
      { name: "updatedAt", dataType: dataType.DATE },
    ],
  };
}

function generatedContentSchema(): CollectionConfig {
  return {
    name: "GeneratedContent",
    properties: [
      { name: "title", dataType: dataType.TEXT },
      { name: "contentType", dataType: dataType.TEXT },
      { name: "body", dataType: dataType.TEXT },
      { name: "prompt", dataType: dataType.TEXT },
      { name: "status", dataType: dataType.TEXT },
      { name: "createdAt", dataType: dataType.DATE },
      { name: "updatedAt", dataType: dataType.DATE },
    ],
  };
}

// ── Cross-Reference Definitions ─────────────────────────────────────

interface CrossRefDef {
  collection: string;
  name: string;
  targetCollection: string;
}

const CROSS_REFS: CrossRefDef[] = [
  { collection: "Persona", name: "hasSegments", targetCollection: "Segment" },
  { collection: "Persona", name: "hasUseCases", targetCollection: "UseCase" },
  { collection: "Segment", name: "hasPersonas", targetCollection: "Persona" },
  { collection: "Segment", name: "hasUseCases", targetCollection: "UseCase" },
  { collection: "ICP", name: "persona", targetCollection: "Persona" },
  { collection: "ICP", name: "segment", targetCollection: "Segment" },
  { collection: "GeneratedContent", name: "usedPersona", targetCollection: "Persona" },
  { collection: "GeneratedContent", name: "usedSegment", targetCollection: "Segment" },
  { collection: "GeneratedContent", name: "usedUseCases", targetCollection: "UseCase" },
  { collection: "GeneratedContent", name: "usedBusinessRules", targetCollection: "BusinessRule" },
];

// ── Seed Data Maps ──────────────────────────────────────────────────

const PERSONA_SEGMENT_MAP: Record<string, string[]> = {
  Sales: ["Enterprise", "Strategic", "Mid-Market"],
  Marketing: ["Enterprise", "Mid-Market", "Commercial"],
  RevOps: ["Enterprise", "Mid-Market"],
  Strategy: ["Strategic", "Enterprise"],
};

const PERSONA_USECASE_MAP: Record<string, string[]> = {
  Sales: ["High-Intent Lead Generation", "Competitor Analysis And Takeout", "Territory Planning and Optimization"],
  Marketing: ["ICP Segmentation Refinement", "Inbound Marketing Automation", "Signal-based Account Prioritization"],
  RevOps: ["Predictive Account Scoring", "Territory Coverage Optimization", "B2B Data Enrichment For GTM Precision"],
  Strategy: ["Market Sizing", "Whitespace Analysis And Activation", "Revenue Growth Intelligence Platform"],
};

// Segment → UseCase cross-refs (derived from overlapping persona relationships)
const SEGMENT_USECASE_MAP: Record<string, string[]> = {
  Enterprise: [
    "High-Intent Lead Generation", "Competitor Analysis And Takeout",
    "ICP Segmentation Refinement", "Predictive Account Scoring", "Market Sizing",
  ],
  Strategic: ["Market Sizing", "Whitespace Analysis And Activation", "Territory Planning and Optimization"],
  "Mid-Market": [
    "High-Intent Lead Generation", "Inbound Marketing Automation",
    "Territory Coverage Optimization", "B2B Data Enrichment For GTM Precision",
  ],
  Commercial: ["ICP Segmentation Refinement", "Inbound Marketing Automation", "Signal-based Account Prioritization"],
  SMB: ["Inbound Marketing Automation", "Maximize ABM Performance"],
};

// ── Helpers ─────────────────────────────────────────────────────────

function readMarkdownFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

function extractSegmentName(filename: string): string {
  return filename.replace(" Account Segment.md", "").replace(".md", "");
}

function extractName(filename: string): string {
  return filename.replace(".md", "");
}

function nowISO(): string {
  return new Date().toISOString();
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("Connecting to Weaviate...");
  const client = await weaviate.connectToWeaviateCloud(WEAVIATE_URL, {
    authCredentials: new weaviate.ApiKey(WEAVIATE_API_KEY),
  });

  const ready = await client.isReady();
  if (!ready) {
    console.error("Weaviate is not ready");
    process.exit(1);
  }
  console.log("Connected.\n");

  try {
    await createCollections(client);
    await addCrossReferenceProperties(client);
    const uuids = await seedData(client);
    await createCrossReferences(client, uuids);
    console.log("\n✓ Seed complete.");
  } finally {
    await client.close();
  }
}

// ── Phase 1: Create Collections ─────────────────────────────────────

async function createCollections(client: WeaviateClient) {
  console.log("── Creating collections ──");

  const schemas = [
    useCaseSchema(),
    businessRuleSchema(),
    personaSchema(),
    segmentSchema(),
    icpSchema(),
    generatedContentSchema(),
  ];

  const existing = await client.collections.listAll();
  const existingNames = existing.map((c: { name: string }) => c.name);

  for (const schema of schemas) {
    if (existingNames.includes(schema.name)) {
      console.log(`  ⤳ ${schema.name} already exists, deleting...`);
      await client.collections.delete(schema.name);
    }
    await client.collections.create(schema as any);
    console.log(`  ✓ ${schema.name} created`);
  }
  console.log();
}

// ── Phase 2: Add Cross-Reference Properties ─────────────────────────

async function addCrossReferenceProperties(client: WeaviateClient) {
  console.log("── Adding cross-reference properties ──");

  for (const ref of CROSS_REFS) {
    const collection = client.collections.use(ref.collection);
    await (collection.config as any).addReference({
      name: ref.name,
      targetCollection: ref.targetCollection,
    });
    console.log(`  ✓ ${ref.collection}.${ref.name} → ${ref.targetCollection}`);
  }
  console.log();
}

// ── Phase 3: Seed Data ──────────────────────────────────────────────

interface SeedUUIDs {
  personas: Record<string, string>;
  segments: Record<string, string>;
  useCases: Record<string, string>;
  businessRules: Record<string, string>;
}

async function seedData(client: WeaviateClient): Promise<SeedUUIDs> {
  const uuids: SeedUUIDs = {
    personas: {},
    segments: {},
    useCases: {},
    businessRules: {},
  };

  const now = nowISO();

  // Personas
  console.log("── Seeding personas ──");
  const personaDir = path.join(CONTENT_REPO_PATH, "Octave/Library/Personas");
  const personaFiles = fs.readdirSync(personaDir).filter((f) => f.endsWith(".md"));
  const personaCollection = client.collections.use("Persona");

  for (const file of personaFiles) {
    const name = extractName(file);
    const content = readMarkdownFile(path.join(personaDir, file));
    const uuid = await personaCollection.data.insert({
      properties: { name, content, tags: [], sourceFile: file, createdAt: now, updatedAt: now },
    });
    uuids.personas[name] = uuid;
    console.log(`  ✓ ${name} (${uuid})`);
  }
  console.log();

  // Segments
  console.log("── Seeding segments ──");
  const segmentDir = path.join(CONTENT_REPO_PATH, "Octave/Library/Account Segments");
  const segmentFiles = fs.readdirSync(segmentDir).filter((f) => f.endsWith(".md"));
  const segmentCollection = client.collections.use("Segment");

  for (const file of segmentFiles) {
    const name = extractSegmentName(file);
    const content = readMarkdownFile(path.join(segmentDir, file));
    const uuid = await segmentCollection.data.insert({
      properties: {
        name, content, revenueRange: "", employeeRange: "",
        tags: [], sourceFile: file, createdAt: now, updatedAt: now,
      },
    });
    uuids.segments[name] = uuid;
    console.log(`  ✓ ${name} (${uuid})`);
  }
  console.log();

  // Use Cases
  console.log("── Seeding use cases ──");
  const useCaseDir = path.join(CONTENT_REPO_PATH, "Octave/Library/Use Cases");
  const useCaseFiles = fs.readdirSync(useCaseDir).filter((f) => f.endsWith(".md"));
  const useCaseCollection = client.collections.use("UseCase");

  for (const file of useCaseFiles) {
    const name = extractName(file);
    const content = readMarkdownFile(path.join(useCaseDir, file));
    const uuid = await useCaseCollection.data.insert({
      properties: { name, content, tags: [], sourceFile: file, createdAt: now, updatedAt: now },
    });
    uuids.useCases[name] = uuid;
    console.log(`  ✓ ${name} (${uuid})`);
  }
  console.log();

  // Instruction Templates → BusinessRule
  console.log("── Seeding instruction templates ──");
  const templateDir = path.join(CONTENT_REPO_PATH, "content_transformation");
  const templates = [
    { file: "campaign_brief_instructions.md", name: "Campaign Brief Generator" },
    { file: "ops_guide_instructions.md", name: "Ops Configuration Guide Generator" },
  ];
  const businessRuleCollection = client.collections.use("BusinessRule");

  for (const tpl of templates) {
    const filePath = path.join(templateDir, tpl.file);
    if (!fs.existsSync(filePath)) {
      console.log(`  ✗ ${tpl.name} — file not found: ${tpl.file}`);
      continue;
    }
    const content = readMarkdownFile(filePath);
    const uuid = await businessRuleCollection.data.insert({
      properties: {
        name: tpl.name, content, subType: "instruction_template",
        tags: [], sourceFile: tpl.file, createdAt: now, updatedAt: now,
      },
    });
    uuids.businessRules[tpl.name] = uuid;
    console.log(`  ✓ ${tpl.name} (${uuid})`);
  }
  console.log();

  const total =
    Object.keys(uuids.personas).length +
    Object.keys(uuids.segments).length +
    Object.keys(uuids.useCases).length +
    Object.keys(uuids.businessRules).length;
  console.log(`Total objects inserted: ${total}\n`);

  return uuids;
}

// ── Phase 4: Cross-References ───────────────────────────────────────

async function createCrossReferences(client: WeaviateClient, uuids: SeedUUIDs) {
  console.log("── Creating cross-references ──");
  let count = 0;

  const personaCollection = client.collections.use("Persona");
  const segmentCollection = client.collections.use("Segment");

  // Persona → Segments
  for (const [personaName, segmentNames] of Object.entries(PERSONA_SEGMENT_MAP)) {
    const personaUuid = uuids.personas[personaName];
    if (!personaUuid) continue;

    for (const segName of segmentNames) {
      const segUuid = uuids.segments[segName];
      if (!segUuid) {
        console.log(`  ⚠ Segment "${segName}" not found for persona "${personaName}"`);
        continue;
      }
      await personaCollection.data.referenceAdd({
        fromUuid: personaUuid,
        fromProperty: "hasSegments",
        to: segUuid,
      });
      count++;
    }
  }
  console.log(`  ✓ Persona → Segments: ${count} refs`);

  // Persona → UseCases
  let ucCount = 0;
  for (const [personaName, useCaseNames] of Object.entries(PERSONA_USECASE_MAP)) {
    const personaUuid = uuids.personas[personaName];
    if (!personaUuid) continue;

    for (const ucName of useCaseNames) {
      const ucUuid = uuids.useCases[ucName];
      if (!ucUuid) {
        console.log(`  ⚠ UseCase "${ucName}" not found for persona "${personaName}"`);
        continue;
      }
      await personaCollection.data.referenceAdd({
        fromUuid: personaUuid,
        fromProperty: "hasUseCases",
        to: ucUuid,
      });
      ucCount++;
    }
  }
  console.log(`  ✓ Persona → UseCases: ${ucCount} refs`);

  // Segment → Personas (reverse of Persona → Segments)
  let spCount = 0;
  for (const [personaName, segmentNames] of Object.entries(PERSONA_SEGMENT_MAP)) {
    const personaUuid = uuids.personas[personaName];
    if (!personaUuid) continue;

    for (const segName of segmentNames) {
      const segUuid = uuids.segments[segName];
      if (!segUuid) continue;
      await segmentCollection.data.referenceAdd({
        fromUuid: segUuid,
        fromProperty: "hasPersonas",
        to: personaUuid,
      });
      spCount++;
    }
  }
  console.log(`  ✓ Segment → Personas: ${spCount} refs`);

  // Segment → UseCases
  let suCount = 0;
  for (const [segName, useCaseNames] of Object.entries(SEGMENT_USECASE_MAP)) {
    const segUuid = uuids.segments[segName];
    if (!segUuid) continue;

    for (const ucName of useCaseNames) {
      const ucUuid = uuids.useCases[ucName];
      if (!ucUuid) {
        console.log(`  ⚠ UseCase "${ucName}" not found for segment "${segName}"`);
        continue;
      }
      await segmentCollection.data.referenceAdd({
        fromUuid: segUuid,
        fromProperty: "hasUseCases",
        to: ucUuid,
      });
      suCount++;
    }
  }
  console.log(`  ✓ Segment → UseCases: ${suCount} refs`);

  const total = count + ucCount + spCount + suCount;
  console.log(`\nTotal cross-references created: ${total}`);
}

// ── Run ─────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
