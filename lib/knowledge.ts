import { withWeaviate } from "./weaviate";
import weaviate from "weaviate-client";
import type { WeaviateClient } from "weaviate-client";
import type {
  KnowledgeType,
  KnowledgeListItem,
  KnowledgeDetail,
  KnowledgeCreateInput,
  KnowledgeUpdateInput,
  CrossReference,
  RelationshipConfig,
} from "./knowledge-types";

export type {
  KnowledgeType,
  KnowledgeListItem,
  KnowledgeDetail,
  KnowledgeCreateInput,
  KnowledgeUpdateInput,
  CrossReference,
  RelationshipConfig,
};
export { VALID_TYPES, getTypeLabel } from "./knowledge-types";

const COLLECTIONS = [
  "Persona",
  "Segment",
  "UseCase",
  "BusinessRule",
  "ICP",
  "Competitor",
  "CustomerEvidence",
] as const;

const COLLECTION_TO_TYPE: Record<string, KnowledgeType> = {
  Persona: "persona",
  Segment: "segment",
  UseCase: "use_case",
  BusinessRule: "business_rule",
  ICP: "icp",
  Competitor: "competitor",
  CustomerEvidence: "customer_evidence",
};

const TYPE_TO_COLLECTION: Record<KnowledgeType, string> = {
  persona: "Persona",
  segment: "Segment",
  use_case: "UseCase",
  business_rule: "BusinessRule",
  icp: "ICP",
  competitor: "Competitor",
  customer_evidence: "CustomerEvidence",
};

const CROSS_REF_CONFIG: Record<
  string,
  { linkOn: string; targetType: KnowledgeType; label: string }[]
> = {
  Persona: [
    { linkOn: "hasSegments", targetType: "segment", label: "Segments" },
    { linkOn: "hasUseCases", targetType: "use_case", label: "Use Cases" },
  ],
  Segment: [
    { linkOn: "hasPersonas", targetType: "persona", label: "Personas" },
    { linkOn: "hasUseCases", targetType: "use_case", label: "Use Cases" },
  ],
  ICP: [
    { linkOn: "persona", targetType: "persona", label: "Persona" },
    { linkOn: "segment", targetType: "segment", label: "Segment" },
  ],
};

function dateToString(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

async function findObjectCollection(
  client: WeaviateClient,
  id: string
): Promise<{ collectionName: string; type: KnowledgeType } | null> {
  for (const collectionName of COLLECTIONS) {
    try {
      const collection = client.collections.use(collectionName);
      const obj = await collection.query.fetchObjectById(id);
      if (obj) {
        return { collectionName, type: COLLECTION_TO_TYPE[collectionName] };
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchCollectionObjects(
  client: WeaviateClient,
  collectionName: string
): Promise<KnowledgeListItem[]> {
  const collection = client.collections.use(collectionName);
  const type = COLLECTION_TO_TYPE[collectionName];

  const result = await collection.query.fetchObjects({ limit: 1000 });

  return result.objects.map((obj) => ({
    id: obj.uuid,
    name: String(obj.properties.name ?? ""),
    type,
    tags: (obj.properties.tags as string[]) ?? [],
    deprecated: obj.properties.deprecated === true,
    createdAt: dateToString(obj.properties.createdAt),
    updatedAt: dateToString(obj.properties.updatedAt),
  }));
}

export async function listKnowledgeObjects(
  type?: KnowledgeType
): Promise<KnowledgeListItem[]> {
  return withWeaviate(async (client) => {
    const collectionsToQuery = type
      ? [TYPE_TO_COLLECTION[type]]
      : [...COLLECTIONS];

    const results = await Promise.all(
      collectionsToQuery.map(async (name) => {
        try {
          return await fetchCollectionObjects(client, name);
        } catch {
          return [];
        }
      })
    );

    const all = results.flat();
    all.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return all;
  });
}

export async function getKnowledgeObject(
  id: string
): Promise<KnowledgeDetail | null> {
  return withWeaviate(async (client) => {
    for (const collectionName of COLLECTIONS) {
      try {
        const collection = client.collections.use(collectionName);
        const type = COLLECTION_TO_TYPE[collectionName];
        const refConfig = CROSS_REF_CONFIG[collectionName] ?? [];

        const returnReferences = refConfig.map((ref) => ({
          linkOn: ref.linkOn,
          returnProperties: ["name" as const],
        }));

        const obj = await collection.query.fetchObjectById(id, {
          ...(returnReferences.length > 0 ? { returnReferences } : {}),
        });

        if (!obj) continue;

        const crossReferences: Record<string, CrossReference[]> = {};
        for (const ref of refConfig) {
          const refObjects =
            (
              obj.references?.[ref.linkOn] as
                | {
                    objects?: Array<{
                      uuid: string;
                      properties: Record<string, unknown>;
                    }>;
                  }
                | undefined
            )?.objects ?? [];
          crossReferences[ref.label] = refObjects.map((r) => ({
            id: r.uuid,
            name: String(r.properties.name ?? ""),
            type: ref.targetType,
          }));
        }

        return {
          id: obj.uuid,
          name: String(obj.properties.name ?? ""),
          type,
          content: String(obj.properties.content ?? ""),
          tags: (obj.properties.tags as string[]) ?? [],
          deprecated: obj.properties.deprecated === true,
          createdAt: dateToString(obj.properties.createdAt),
          updatedAt: dateToString(obj.properties.updatedAt),
          subType: obj.properties.subType
            ? String(obj.properties.subType)
            : undefined,
          revenueRange: obj.properties.revenueRange
            ? String(obj.properties.revenueRange)
            : undefined,
          employeeRange: obj.properties.employeeRange
            ? String(obj.properties.employeeRange)
            : undefined,
          website: obj.properties.website
            ? String(obj.properties.website)
            : undefined,
          customerName: obj.properties.customerName
            ? String(obj.properties.customerName)
            : undefined,
          industry: obj.properties.industry
            ? String(obj.properties.industry)
            : undefined,
          sourceFile: obj.properties.sourceFile
            ? String(obj.properties.sourceFile)
            : undefined,
          crossReferences,
        };
      } catch {
        continue;
      }
    }
    return null;
  });
}

// ─── B1: Create ────────────────────────────────────────────────────────────────

export class NameConflictError extends Error {
  constructor(name: string, type: string) {
    super(`A ${type} named "${name}" already exists`);
    this.name = "NameConflictError";
  }
}

export async function createKnowledgeObject(
  input: KnowledgeCreateInput
): Promise<string> {
  return withWeaviate(async (client) => {
    const collectionName = TYPE_TO_COLLECTION[input.type];
    const collection = client.collections.use(collectionName);

    const existing = await collection.query.fetchObjects({
      filters: weaviate.filter.byProperty("name").equal(input.name),
      limit: 1,
    });

    if (existing.objects.length > 0) {
      throw new NameConflictError(input.name, input.type);
    }

    const now = new Date().toISOString();
    const properties: Record<string, string | string[] | boolean> = {
      name: input.name,
      content: input.content,
      tags: input.tags ?? [],
      deprecated: false,
      createdAt: now,
      updatedAt: now,
    };

    if (input.type === "segment") {
      if (input.revenueRange) properties.revenueRange = input.revenueRange;
      if (input.employeeRange) properties.employeeRange = input.employeeRange;
    }
    if (input.type === "business_rule") {
      if (input.subType) properties.subType = input.subType;
    }
    if (input.type === "competitor") {
      if (input.website) properties.website = input.website;
    }
    if (input.type === "customer_evidence") {
      if (input.subType) properties.subType = input.subType;
      if (input.customerName) properties.customerName = input.customerName;
      if (input.industry) properties.industry = input.industry;
    }

    const id = await collection.data.insert(properties);

    if (input.type === "icp") {
      if (input.personaId) {
        await collection.data.referenceAdd({
          fromUuid: id,
          fromProperty: "persona",
          to: input.personaId,
        });
      }
      if (input.segmentId) {
        await collection.data.referenceAdd({
          fromUuid: id,
          fromProperty: "segment",
          to: input.segmentId,
        });
      }
    }

    return id;
  });
}

// ─── B2: Update ────────────────────────────────────────────────────────────────

export async function updateKnowledgeObject(
  id: string,
  input: KnowledgeUpdateInput
): Promise<KnowledgeDetail | null> {
  return withWeaviate(async (client) => {
    const found = await findObjectCollection(client, id);
    if (!found) return null;

    const collection = client.collections.use(found.collectionName);

    if (input.name) {
      const existing = await collection.query.fetchObjects({
        filters: weaviate.filter.byProperty("name").equal(input.name),
        limit: 1,
      });
      if (existing.objects.length > 0 && existing.objects[0].uuid !== id) {
        throw new NameConflictError(input.name, found.type);
      }
    }

    const properties: Record<string, string | string[]> = {
      updatedAt: new Date().toISOString(),
    };
    if (input.name !== undefined) properties.name = input.name;
    if (input.content !== undefined) properties.content = input.content;
    if (input.tags !== undefined) properties.tags = input.tags;
    if (input.subType !== undefined) properties.subType = input.subType;
    if (input.revenueRange !== undefined)
      properties.revenueRange = input.revenueRange;
    if (input.employeeRange !== undefined)
      properties.employeeRange = input.employeeRange;
    if (input.website !== undefined) properties.website = input.website;
    if (input.customerName !== undefined) properties.customerName = input.customerName;
    if (input.industry !== undefined) properties.industry = input.industry;

    await collection.data.update({ id, properties });

    return null;
  });
}

// ─── B3: Delete ────────────────────────────────────────────────────────────────

export async function checkGeneratedContentReferences(
  id: string
): Promise<number> {
  return withWeaviate(async (client) => {
    try {
      const gc = client.collections.use("GeneratedContent");
      const refProps = [
        "usedPersona",
        "usedSegment",
        "usedUseCases",
        "usedBusinessRules",
      ];
      let count = 0;
      for (const prop of refProps) {
        try {
          const result = await gc.query.fetchObjects({
            filters: weaviate.filter
              .byRef(prop)
              .byId()
              .equal(id),
            limit: 100,
          });
          count += result.objects.length;
        } catch {
          // ref property may not exist yet
        }
      }
      return count;
    } catch {
      return 0;
    }
  });
}

export async function deleteKnowledgeObject(id: string): Promise<boolean> {
  return withWeaviate(async (client) => {
    const found = await findObjectCollection(client, id);
    if (!found) return false;

    const collection = client.collections.use(found.collectionName);
    await collection.data.deleteById(id);
    return true;
  });
}

// ─── B5: Deprecation ──────────────────────────────────────────────────────────

export async function deprecateKnowledgeObject(id: string): Promise<boolean> {
  return withWeaviate(async (client) => {
    const found = await findObjectCollection(client, id);
    if (!found) return false;

    const collection = client.collections.use(found.collectionName);
    await collection.data.update({
      id,
      properties: { deprecated: true, updatedAt: new Date().toISOString() },
    });
    return true;
  });
}

export async function restoreKnowledgeObject(id: string): Promise<boolean> {
  return withWeaviate(async (client) => {
    const found = await findObjectCollection(client, id);
    if (!found) return false;

    const collection = client.collections.use(found.collectionName);
    await collection.data.update({
      id,
      properties: { deprecated: false, updatedAt: new Date().toISOString() },
    });
    return true;
  });
}

const REVERSE_REF_MAP: Record<string, { collection: string; property: string }> = {
  "Persona.hasSegments": { collection: "Segment", property: "hasPersonas" },
  "Segment.hasPersonas": { collection: "Persona", property: "hasSegments" },
};

export function getCompatibleRelationships(
  type: KnowledgeType
): RelationshipConfig[] {
  const collectionName = TYPE_TO_COLLECTION[type];
  const config = CROSS_REF_CONFIG[collectionName] ?? [];
  return config.map((c) => ({
    property: c.linkOn,
    targetType: c.targetType,
    label: c.label,
    single: collectionName === "ICP" ? true : undefined,
  }));
}

const PLURAL_TYPE_LABELS: Record<KnowledgeType, string> = {
  persona: "Personas",
  segment: "Segments",
  use_case: "Use Cases",
  business_rule: "Business Rules",
  icp: "ICPs",
  competitor: "Competitors",
  customer_evidence: "Customer Evidence",
};

export function getReverseRelationships(
  type: KnowledgeType
): RelationshipConfig[] {
  const forwardTargetTypes = new Set(
    (CROSS_REF_CONFIG[TYPE_TO_COLLECTION[type]] ?? []).map((c) => c.targetType)
  );

  const results: RelationshipConfig[] = [];
  for (const [collection, configs] of Object.entries(CROSS_REF_CONFIG)) {
    const sourceType = COLLECTION_TO_TYPE[collection];
    if (forwardTargetTypes.has(sourceType)) continue;

    for (const config of configs) {
      if (config.targetType !== type) continue;
      results.push({
        property: config.linkOn,
        targetType: sourceType,
        label: PLURAL_TYPE_LABELS[sourceType],
        reverse: true,
      });
    }
  }
  return results;
}

export async function getInboundReferences(
  objectId: string,
  objectType: KnowledgeType
): Promise<Record<string, CrossReference[]>> {
  const forwardTargetTypes = new Set(
    (CROSS_REF_CONFIG[TYPE_TO_COLLECTION[objectType]] ?? []).map(
      (c) => c.targetType
    )
  );

  return withWeaviate(async (client) => {
    const inbound: Record<string, CrossReference[]> = {};

    for (const [collectionName, configs] of Object.entries(CROSS_REF_CONFIG)) {
      const sourceType = COLLECTION_TO_TYPE[collectionName];
      if (forwardTargetTypes.has(sourceType)) continue;

      const matchingConfigs = configs.filter(
        (c) => c.targetType === objectType
      );
      if (matchingConfigs.length === 0) continue;

      const collection = client.collections.use(collectionName);
      const returnReferences = matchingConfigs.map((c) => ({
        linkOn: c.linkOn,
        returnProperties: ["name" as const],
      }));

      const result = await collection.query.fetchObjects({
        limit: 1000,
        returnReferences,
      });

      for (const obj of result.objects) {
        for (const config of matchingConfigs) {
          const refs =
            (
              obj.references?.[config.linkOn] as
                | { objects?: Array<{ uuid: string }> }
                | undefined
            )?.objects ?? [];
          const hasRef = refs.some((r) => r.uuid === objectId);
          if (hasRef) {
            const label = PLURAL_TYPE_LABELS[sourceType];
            if (!inbound[label]) inbound[label] = [];
            inbound[label].push({
              id: obj.uuid,
              name: String(obj.properties.name ?? ""),
              type: sourceType,
            });
          }
        }
      }
    }

    return inbound;
  });
}

export async function addRelationship(
  sourceId: string,
  targetId: string,
  relationshipType: string
): Promise<void> {
  return withWeaviate(async (client) => {
    const source = await findObjectCollection(client, sourceId);
    if (!source) throw new Error("Source object not found");

    const refConfig = CROSS_REF_CONFIG[source.collectionName] ?? [];
    const refDef = refConfig.find((r) => r.linkOn === relationshipType);
    if (!refDef) throw new Error(`Invalid relationship type "${relationshipType}" for ${source.type}`);

    const target = await findObjectCollection(client, targetId);
    if (!target) throw new Error("Target object not found");

    const expectedTargetCollection = TYPE_TO_COLLECTION[refDef.targetType];
    if (target.collectionName !== expectedTargetCollection) {
      throw new Error(`Target must be a ${refDef.targetType}, got ${target.type}`);
    }

    const collection = client.collections.use(source.collectionName);

    // For ICP single-value references, remove existing reference first
    if (source.collectionName === "ICP" && (relationshipType === "persona" || relationshipType === "segment")) {
      const obj = await collection.query.fetchObjectById(sourceId, {
        returnReferences: [{ linkOn: relationshipType, returnProperties: ["name" as const] }],
      });
      const existing = (obj?.references?.[relationshipType] as { objects?: Array<{ uuid: string }> } | undefined)?.objects ?? [];
      for (const ref of existing) {
        await collection.data.referenceDelete({
          fromUuid: sourceId,
          fromProperty: relationshipType,
          to: ref.uuid,
        });
      }
    }

    await collection.data.referenceAdd({
      fromUuid: sourceId,
      fromProperty: relationshipType,
      to: targetId,
    });

    // Auto-sync reverse reference for bidirectional pairs
    const reverseKey = `${source.collectionName}.${relationshipType}`;
    const reverse = REVERSE_REF_MAP[reverseKey];
    if (reverse) {
      const reverseCollection = client.collections.use(reverse.collection);
      await reverseCollection.data.referenceAdd({
        fromUuid: targetId,
        fromProperty: reverse.property,
        to: sourceId,
      });
    }
  });
}

export async function removeRelationship(
  sourceId: string,
  targetId: string,
  relationshipType: string
): Promise<void> {
  return withWeaviate(async (client) => {
    const source = await findObjectCollection(client, sourceId);
    if (!source) throw new Error("Source object not found");

    const refConfig = CROSS_REF_CONFIG[source.collectionName] ?? [];
    const refDef = refConfig.find((r) => r.linkOn === relationshipType);
    if (!refDef) throw new Error(`Invalid relationship type "${relationshipType}" for ${source.type}`);

    const collection = client.collections.use(source.collectionName);
    await collection.data.referenceDelete({
      fromUuid: sourceId,
      fromProperty: relationshipType,
      to: targetId,
    });

    // Auto-sync reverse reference for bidirectional pairs
    const reverseKey = `${source.collectionName}.${relationshipType}`;
    const reverse = REVERSE_REF_MAP[reverseKey];
    if (reverse) {
      const reverseCollection = client.collections.use(reverse.collection);
      await reverseCollection.data.referenceDelete({
        fromUuid: targetId,
        fromProperty: reverse.property,
        to: sourceId,
      });
    }
  });
}

export { CROSS_REF_CONFIG, TYPE_TO_COLLECTION, COLLECTION_TO_TYPE, REVERSE_REF_MAP };
