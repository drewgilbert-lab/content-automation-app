import { withWeaviate } from "./weaviate";
import type { WeaviateClient } from "weaviate-client";
import type { KnowledgeType } from "./knowledge-types";
import {
  CROSS_REF_CONFIG,
  COLLECTION_TO_TYPE,
  REVERSE_REF_MAP,
} from "./knowledge";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardItem {
  id: string;
  name: string;
  type: KnowledgeType;
  updatedAt: string;
}

export interface DashboardGapItem extends DashboardItem {
  gapDetail: string;
}

export interface DashboardData {
  counts: Record<KnowledgeType, number>;
  totalCount: number;
  neverReviewed: DashboardItem[];
  stale: DashboardItem[];
  gaps: {
    noRelationships: DashboardItem[];
    partialRelationships: DashboardGapItem[];
    asymmetricRelationships: DashboardGapItem[];
    icpMissingRefs: DashboardGapItem[];
    businessRulesNoSubType: DashboardItem[];
  };
}

// ─── Internal types ────────────────────────────────────────────────────────────

interface ObjectWithRefs {
  id: string;
  name: string;
  type: KnowledgeType;
  collectionName: string;
  createdAt: string;
  updatedAt: string;
  subType?: string;
  refs: Record<string, string[]>; // linkOn -> array of target UUIDs
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const COLLECTIONS = [
  "Persona",
  "Segment",
  "UseCase",
  "BusinessRule",
  "ICP",
] as const;

const STALE_THRESHOLD_DAYS = 90;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function dateToString(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function datesAreEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

function isStale(updatedAt: string): boolean {
  if (!updatedAt) return false;
  const threshold = Date.now() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  return new Date(updatedAt).getTime() < threshold;
}

function toItem(obj: ObjectWithRefs): DashboardItem {
  return { id: obj.id, name: obj.name, type: obj.type, updatedAt: obj.updatedAt };
}

// ─── Fetch all objects with refs ───────────────────────────────────────────────

async function fetchAllObjectsWithRefs(
  client: WeaviateClient
): Promise<ObjectWithRefs[]> {
  const results = await Promise.all(
    COLLECTIONS.map(async (collectionName) => {
      const collection = client.collections.use(collectionName);
      const type = COLLECTION_TO_TYPE[collectionName];
      const refConfig = CROSS_REF_CONFIG[collectionName] ?? [];

      const returnReferences = refConfig.map((ref) => ({
        linkOn: ref.linkOn,
        returnProperties: ["name" as const],
      }));

      const result = await collection.query.fetchObjects({
        limit: 1000,
        ...(returnReferences.length > 0 ? { returnReferences } : {}),
      });

      return result.objects.map((obj) => {
        const refs: Record<string, string[]> = {};
        for (const ref of refConfig) {
          const refObjects =
            (
              obj.references?.[ref.linkOn] as
                | { objects?: Array<{ uuid: string }> }
                | undefined
            )?.objects ?? [];
          refs[ref.linkOn] = refObjects.map((r) => r.uuid);
        }

        return {
          id: obj.uuid,
          name: String(obj.properties.name ?? ""),
          type,
          collectionName,
          createdAt: dateToString(obj.properties.createdAt),
          updatedAt: dateToString(obj.properties.updatedAt),
          subType: obj.properties.subType
            ? String(obj.properties.subType)
            : undefined,
          refs,
        };
      });
    })
  );

  return results.flat();
}

// ─── Analysis functions ────────────────────────────────────────────────────────

function computeCounts(objects: ObjectWithRefs[]): Record<KnowledgeType, number> {
  const counts: Record<KnowledgeType, number> = {
    persona: 0,
    segment: 0,
    use_case: 0,
    business_rule: 0,
    icp: 0,
  };
  for (const obj of objects) {
    counts[obj.type]++;
  }
  return counts;
}

function findNeverReviewed(objects: ObjectWithRefs[]): DashboardItem[] {
  return objects
    .filter((obj) => datesAreEqual(obj.createdAt, obj.updatedAt))
    .map(toItem);
}

function findStale(objects: ObjectWithRefs[]): DashboardItem[] {
  return objects
    .filter((obj) => isStale(obj.updatedAt))
    .map(toItem)
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
}

function findNoRelationships(objects: ObjectWithRefs[]): DashboardItem[] {
  const typesWithRefs: KnowledgeType[] = ["persona", "segment", "icp"];
  return objects
    .filter((obj) => {
      if (!typesWithRefs.includes(obj.type)) return false;
      const totalRefs = Object.values(obj.refs).reduce(
        (sum, arr) => sum + arr.length,
        0
      );
      return totalRefs === 0;
    })
    .map(toItem);
}

/**
 * Detect objects with partial relationships:
 * - UseCase not linked from any Persona or Segment
 * - Persona with segments but no use cases (or vice versa)
 * - Segment with personas but no use cases (or vice versa)
 */
function findPartialRelationships(objects: ObjectWithRefs[]): DashboardGapItem[] {
  const gaps: DashboardGapItem[] = [];

  // Build a set of UseCases that are referenced by at least one Persona or Segment
  const referencedUseCaseIds = new Set<string>();
  for (const obj of objects) {
    if (obj.type === "persona" || obj.type === "segment") {
      const ucRefKey = obj.type === "persona" ? "hasUseCases" : "hasUseCases";
      const ucRefs = obj.refs[ucRefKey] ?? [];
      for (const id of ucRefs) referencedUseCaseIds.add(id);
    }
  }

  for (const obj of objects) {
    if (obj.type === "use_case" && !referencedUseCaseIds.has(obj.id)) {
      gaps.push({
        ...toItem(obj),
        gapDetail: "Not linked from any Persona or Segment",
      });
    }

    if (obj.type === "persona") {
      const hasSegs = (obj.refs["hasSegments"]?.length ?? 0) > 0;
      const hasUCs = (obj.refs["hasUseCases"]?.length ?? 0) > 0;
      if (hasSegs && !hasUCs) {
        gaps.push({ ...toItem(obj), gapDetail: "Has Segments but no Use Cases" });
      } else if (!hasSegs && hasUCs) {
        gaps.push({ ...toItem(obj), gapDetail: "Has Use Cases but no Segments" });
      }
    }

    if (obj.type === "segment") {
      const hasPers = (obj.refs["hasPersonas"]?.length ?? 0) > 0;
      const hasUCs = (obj.refs["hasUseCases"]?.length ?? 0) > 0;
      if (hasPers && !hasUCs) {
        gaps.push({ ...toItem(obj), gapDetail: "Has Personas but no Use Cases" });
      } else if (!hasPers && hasUCs) {
        gaps.push({ ...toItem(obj), gapDetail: "Has Use Cases but no Personas" });
      }
    }
  }

  return gaps;
}

/**
 * Detect asymmetric relationships: A→B exists but B→A does not.
 * Only applies to bidirectional pairs defined in REVERSE_REF_MAP.
 */
function findAsymmetricRelationships(objects: ObjectWithRefs[]): DashboardGapItem[] {
  const gaps: DashboardGapItem[] = [];
  const objectMap = new Map(objects.map((o) => [o.id, o]));

  for (const [forwardKey, reverse] of Object.entries(REVERSE_REF_MAP)) {
    const [sourceCollection, sourceProperty] = forwardKey.split(".");
    const sourceType = COLLECTION_TO_TYPE[sourceCollection];

    for (const obj of objects) {
      if (obj.type !== sourceType) continue;
      const targetIds = obj.refs[sourceProperty] ?? [];

      for (const targetId of targetIds) {
        const target = objectMap.get(targetId);
        if (!target) continue;

        const reverseRefs = target.refs[reverse.property] ?? [];
        if (!reverseRefs.includes(obj.id)) {
          gaps.push({
            ...toItem(obj),
            gapDetail: `Links to "${target.name}" but reverse link is missing`,
          });
        }
      }
    }
  }

  return gaps;
}

function findIcpMissingRefs(objects: ObjectWithRefs[]): DashboardGapItem[] {
  const gaps: DashboardGapItem[] = [];

  for (const obj of objects) {
    if (obj.type !== "icp") continue;
    const hasPersona = (obj.refs["persona"]?.length ?? 0) > 0;
    const hasSegment = (obj.refs["segment"]?.length ?? 0) > 0;

    if (!hasPersona && !hasSegment) {
      gaps.push({ ...toItem(obj), gapDetail: "Missing Persona and Segment references" });
    } else if (!hasPersona) {
      gaps.push({ ...toItem(obj), gapDetail: "Missing Persona reference" });
    } else if (!hasSegment) {
      gaps.push({ ...toItem(obj), gapDetail: "Missing Segment reference" });
    }
  }

  return gaps;
}

function findBusinessRulesNoSubType(objects: ObjectWithRefs[]): DashboardItem[] {
  return objects
    .filter((obj) => obj.type === "business_rule" && !obj.subType)
    .map(toItem);
}

// ─── Main export ───────────────────────────────────────────────────────────────

export async function getDashboardData(): Promise<DashboardData> {
  return withWeaviate(async (client) => {
    const objects = await fetchAllObjectsWithRefs(client);

    const counts = computeCounts(objects);
    const totalCount = objects.length;
    const neverReviewed = findNeverReviewed(objects);
    const stale = findStale(objects);

    return {
      counts,
      totalCount,
      neverReviewed,
      stale,
      gaps: {
        noRelationships: findNoRelationships(objects),
        partialRelationships: findPartialRelationships(objects),
        asymmetricRelationships: findAsymmetricRelationships(objects),
        icpMissingRefs: findIcpMissingRefs(objects),
        businessRulesNoSubType: findBusinessRulesNoSubType(objects),
      },
    };
  });
}
