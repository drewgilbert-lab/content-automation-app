import { withWeaviate } from "./weaviate";
import weaviate, { Filters } from "weaviate-client";
import { isValidContentType } from "./skill-types";
import type {
  ContentStatus,
  ContentSourceChannel,
  ContentListItem,
  ContentDetail,
  ContentCreateInput,
  ContentUpdateInput,
  ContentListParams,
  ContentSearchResult,
  ContentReference,
} from "./content-types";

export type {
  ContentStatus,
  ContentSourceChannel,
  ContentListItem,
  ContentDetail,
  ContentCreateInput,
  ContentUpdateInput,
  ContentListParams,
  ContentSearchResult,
  ContentReference,
};
export {
  VALID_CONTENT_STATUSES,
  VALID_CONTENT_SOURCE_CHANNELS,
  getContentStatusLabel,
  getContentSourceChannelLabel,
  isEditableStatus,
} from "./content-types";

const COLLECTION = "GeneratedContent";

function dateToString(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

export class ContentStatusError extends Error {
  constructor(currentStatus: string, attemptedAction: string) {
    super(
      `Cannot ${attemptedAction} content with status "${currentStatus}"`
    );
    this.name = "ContentStatusError";
  }
}

// ─── CRUD ──────────────────────────────────────────────────────────────────────

export async function listContent(
  params: ContentListParams = {}
): Promise<ContentListItem[]> {
  const {
    contentType,
    status,
    sourceChannel,
    tags,
    createdBy,
    limit = 100,
    offset = 0,
  } = params;

  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const result = await collection.query.fetchObjects({ limit: 1000 });

    let items: ContentListItem[] = result.objects.map((obj) => ({
      id: obj.uuid,
      title: String(obj.properties.title ?? ""),
      contentType: String(obj.properties.contentType ?? ""),
      status: String(obj.properties.status ?? "draft") as ContentStatus,
      tags: (obj.properties.tags as string[]) ?? [],
      sourceChannel: obj.properties.sourceChannel
        ? (String(obj.properties.sourceChannel) as ContentSourceChannel)
        : undefined,
      createdBy: obj.properties.createdBy
        ? String(obj.properties.createdBy)
        : undefined,
      createdAt: dateToString(obj.properties.createdAt),
      updatedAt: dateToString(obj.properties.updatedAt),
    }));

    if (contentType) {
      items = items.filter((c) => c.contentType === contentType);
    }
    if (status) {
      items = items.filter((c) => c.status === status);
    }
    if (sourceChannel) {
      items = items.filter((c) => c.sourceChannel === sourceChannel);
    }
    if (tags && tags.length > 0) {
      const lowerTags = tags.map((t) => t.toLowerCase());
      items = items.filter((c) =>
        c.tags.some((t) => lowerTags.includes(t.toLowerCase()))
      );
    }
    if (createdBy) {
      items = items.filter((c) => c.createdBy === createdBy);
    }

    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const clampedLimit = Math.min(Math.max(limit, 1), 500);
    const clampedOffset = Math.max(offset, 0);
    return items.slice(clampedOffset, clampedOffset + clampedLimit);
  });
}

const SINGLE_REF_PROPS = ["usedPersona", "usedSegment"] as const;
const MULTI_REF_PROPS = [
  "usedUseCases",
  "usedBusinessRules",
  "usedSkills",
] as const;
const ALL_REF_PROPS = [...SINGLE_REF_PROPS, ...MULTI_REF_PROPS];

function resolveRefs(
  references: Record<string, unknown> | undefined,
  prop: string
): ContentReference[] {
  if (!references) return [];
  const refData = references[prop] as
    | { objects?: Array<{ uuid: string; properties: Record<string, unknown> }> }
    | undefined;
  return (refData?.objects ?? []).map((r) => ({
    id: r.uuid,
    name: String(r.properties.name ?? ""),
  }));
}

export async function getContent(
  id: string
): Promise<ContentDetail | null> {
  return withWeaviate(async (client) => {
    try {
      const collection = client.collections.use(COLLECTION);

      const returnReferences = ALL_REF_PROPS.map((prop) => ({
        linkOn: prop,
        returnProperties: ["name" as const],
      }));

      const obj = await collection.query.fetchObjectById(id, {
        returnReferences,
      });

      if (!obj) return null;

      const refs = obj.references;
      const personaRefs = resolveRefs(refs, "usedPersona");
      const segmentRefs = resolveRefs(refs, "usedSegment");

      return {
        id: obj.uuid,
        title: String(obj.properties.title ?? ""),
        contentType: String(obj.properties.contentType ?? ""),
        status: String(obj.properties.status ?? "draft") as ContentStatus,
        tags: (obj.properties.tags as string[]) ?? [],
        sourceChannel: obj.properties.sourceChannel
          ? (String(obj.properties.sourceChannel) as ContentSourceChannel)
          : undefined,
        createdBy: obj.properties.createdBy
          ? String(obj.properties.createdBy)
          : undefined,
        createdAt: dateToString(obj.properties.createdAt),
        updatedAt: dateToString(obj.properties.updatedAt),
        body: String(obj.properties.body ?? ""),
        prompt: obj.properties.prompt
          ? String(obj.properties.prompt)
          : undefined,
        sourceAppId: obj.properties.sourceAppId
          ? String(obj.properties.sourceAppId)
          : undefined,
        sourceDescription: obj.properties.sourceDescription
          ? String(obj.properties.sourceDescription)
          : undefined,
        reviewComment: obj.properties.reviewComment
          ? String(obj.properties.reviewComment)
          : undefined,
        reviewedBy: obj.properties.reviewedBy
          ? String(obj.properties.reviewedBy)
          : undefined,
        reviewedAt: obj.properties.reviewedAt
          ? dateToString(obj.properties.reviewedAt)
          : undefined,
        updatedBy: obj.properties.updatedBy
          ? String(obj.properties.updatedBy)
          : undefined,
        usedPersona: personaRefs.length > 0 ? personaRefs[0] : null,
        usedSegment: segmentRefs.length > 0 ? segmentRefs[0] : null,
        usedUseCases: resolveRefs(refs, "usedUseCases"),
        usedBusinessRules: resolveRefs(refs, "usedBusinessRules"),
        usedSkills: resolveRefs(refs, "usedSkills"),
      };
    } catch {
      return null;
    }
  });
}

export async function createContent(
  input: ContentCreateInput
): Promise<string> {
  if (!isValidContentType(input.contentType)) {
    throw new Error(
      `Invalid content type "${input.contentType}". Must be one of the valid content types.`
    );
  }

  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);

    const now = new Date().toISOString();
    const properties: Record<string, string | string[]> = {
      title: input.title,
      contentType: input.contentType,
      body: input.body,
      status: "draft",
      tags: input.tags ?? [],
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    if (input.prompt) properties.prompt = input.prompt;
    if (input.sourceChannel) properties.sourceChannel = input.sourceChannel;
    if (input.sourceAppId) properties.sourceAppId = input.sourceAppId;
    if (input.sourceDescription)
      properties.sourceDescription = input.sourceDescription;

    const id = await collection.data.insert(properties);

    if (input.personaId) {
      await collection.data.referenceAdd({
        fromUuid: id,
        fromProperty: "usedPersona",
        to: input.personaId,
      });
    }
    if (input.segmentId) {
      await collection.data.referenceAdd({
        fromUuid: id,
        fromProperty: "usedSegment",
        to: input.segmentId,
      });
    }
    if (input.useCaseIds) {
      for (const ucId of input.useCaseIds) {
        await collection.data.referenceAdd({
          fromUuid: id,
          fromProperty: "usedUseCases",
          to: ucId,
        });
      }
    }
    if (input.businessRuleIds) {
      for (const brId of input.businessRuleIds) {
        await collection.data.referenceAdd({
          fromUuid: id,
          fromProperty: "usedBusinessRules",
          to: brId,
        });
      }
    }
    if (input.skillIds) {
      for (const skillId of input.skillIds) {
        await collection.data.referenceAdd({
          fromUuid: id,
          fromProperty: "usedSkills",
          to: skillId,
        });
      }
    }

    return id;
  });
}

export async function updateContent(
  id: string,
  input: ContentUpdateInput
): Promise<ContentDetail | null> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const obj = await collection.query.fetchObjectById(id);
    if (!obj) return null;

    const currentStatus = String(obj.properties.status ?? "draft");
    if (currentStatus !== "draft") {
      throw new ContentStatusError(currentStatus, "update");
    }

    const properties: Record<string, string | string[]> = {
      updatedAt: new Date().toISOString(),
      updatedBy: input.updatedBy,
    };

    if (input.title !== undefined) properties.title = input.title;
    if (input.body !== undefined) properties.body = input.body;
    if (input.tags !== undefined) properties.tags = input.tags;

    await collection.data.update({ id, properties });

    return null;
  });
}

export async function deleteContent(id: string): Promise<boolean> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const obj = await collection.query.fetchObjectById(id);
    if (!obj) return false;

    const currentStatus = String(obj.properties.status ?? "draft");
    if (currentStatus !== "draft") {
      throw new ContentStatusError(currentStatus, "delete");
    }

    await collection.data.deleteById(id);
    return true;
  });
}

export async function semanticSearchContent(
  query: string,
  params?: { contentType?: string; status?: ContentStatus; limit?: number; certainty?: number }
): Promise<ContentSearchResult[]> {
  const { contentType, status, limit = 10, certainty = 0.7 } = params ?? {};
  const clampedLimit = Math.min(Math.max(limit, 1), 50);

  return withWeaviate(async (client) => {
    try {
      const collection = client.collections.use(COLLECTION);

      let filter = undefined;
      if (contentType && status) {
        filter = Filters.and(
          weaviate.filter.byProperty("contentType").equal(contentType),
          weaviate.filter.byProperty("status").equal(status)
        );
      } else if (contentType) {
        filter = weaviate.filter
          .byProperty("contentType")
          .equal(contentType);
      } else if (status) {
        filter = weaviate.filter.byProperty("status").equal(status);
      }

      const result = await collection.query.nearText(query, {
        limit: clampedLimit,
        certainty,
        returnMetadata: ["certainty"],
        ...(filter ? { filters: filter } : {}),
      });

      return result.objects.map((obj) => {
        const body = String(obj.properties.body ?? "");
        return {
          id: obj.uuid,
          title: String(obj.properties.title ?? ""),
          contentType: String(obj.properties.contentType ?? ""),
          status: String(obj.properties.status ?? "draft") as ContentStatus,
          snippet: body.slice(0, 500),
          score: obj.metadata?.certainty ?? 0,
        };
      });
    } catch {
      return [];
    }
  });
}

// ─── Workflow transitions ──────────────────────────────────────────────────────

export async function submitForReview(
  id: string,
  submitterId: string
): Promise<void> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const obj = await collection.query.fetchObjectById(id);
    if (!obj) throw new Error("Content not found");

    const currentStatus = String(obj.properties.status ?? "draft");
    if (currentStatus !== "draft") {
      throw new ContentStatusError(currentStatus, "submit for review");
    }

    await collection.data.update({
      id,
      properties: {
        status: "submitted",
        updatedAt: new Date().toISOString(),
        updatedBy: submitterId,
      },
    });
  });
}

export async function beginReview(
  id: string,
  reviewerId: string
): Promise<void> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const obj = await collection.query.fetchObjectById(id);
    if (!obj) throw new Error("Content not found");

    const currentStatus = String(obj.properties.status ?? "draft");
    if (currentStatus !== "submitted") {
      throw new ContentStatusError(currentStatus, "begin review");
    }

    await collection.data.update({
      id,
      properties: {
        status: "in_review",
        reviewedBy: reviewerId,
        updatedAt: new Date().toISOString(),
        updatedBy: reviewerId,
      },
    });
  });
}

export async function approveContent(
  id: string,
  reviewerId: string,
  comment?: string
): Promise<void> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const obj = await collection.query.fetchObjectById(id);
    if (!obj) throw new Error("Content not found");

    const currentStatus = String(obj.properties.status ?? "draft");
    if (currentStatus !== "in_review") {
      throw new ContentStatusError(currentStatus, "approve");
    }

    const now = new Date().toISOString();
    const properties: Record<string, string> = {
      status: "approved",
      reviewedBy: reviewerId,
      reviewedAt: now,
      updatedAt: now,
      updatedBy: reviewerId,
    };
    if (comment) properties.reviewComment = comment;

    await collection.data.update({ id, properties });
  });
}

export async function rejectContent(
  id: string,
  reviewerId: string,
  comment: string
): Promise<void> {
  if (!comment || comment.trim().length === 0) {
    throw new Error("A comment is required when rejecting content");
  }

  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const obj = await collection.query.fetchObjectById(id);
    if (!obj) throw new Error("Content not found");

    const currentStatus = String(obj.properties.status ?? "draft");
    if (currentStatus !== "in_review") {
      throw new ContentStatusError(currentStatus, "reject");
    }

    const now = new Date().toISOString();
    await collection.data.update({
      id,
      properties: {
        status: "draft",
        reviewedBy: reviewerId,
        reviewedAt: now,
        reviewComment: comment.trim(),
        updatedAt: now,
        updatedBy: reviewerId,
      },
    });
  });
}

export async function publishContent(
  id: string,
  publisherId: string
): Promise<void> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const obj = await collection.query.fetchObjectById(id);
    if (!obj) throw new Error("Content not found");

    const currentStatus = String(obj.properties.status ?? "draft");
    if (currentStatus !== "approved") {
      throw new ContentStatusError(currentStatus, "publish");
    }

    const now = new Date().toISOString();
    await collection.data.update({
      id,
      properties: {
        status: "published",
        updatedAt: now,
        updatedBy: publisherId,
      },
    });
  });
}

export async function resetToDraft(
  id: string,
  userId: string
): Promise<void> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const obj = await collection.query.fetchObjectById(id);
    if (!obj) throw new Error("Content not found");

    const currentStatus = String(obj.properties.status ?? "draft");
    if (currentStatus !== "approved" && currentStatus !== "published") {
      throw new ContentStatusError(currentStatus, "reset to draft");
    }

    const now = new Date().toISOString();
    await collection.data.update({
      id,
      properties: {
        status: "draft",
        reviewComment: "",
        reviewedBy: "",
        reviewedAt: "",
        updatedAt: now,
        updatedBy: userId,
      },
    });
  });
}

// ─── Reference guard ───────────────────────────────────────────────────────────

export async function countContentByKnowledgeObject(
  objectId: string
): Promise<number> {
  return withWeaviate(async (client) => {
    try {
      const gc = client.collections.use(COLLECTION);
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
            filters: weaviate.filter.byRef(prop).byId().equal(objectId),
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

// ─── Content counts (for dashboard) ────────────────────────────────────────────

export async function getContentCounts(): Promise<{
  total: number;
  byStatus: Record<ContentStatus, number>;
  byContentType: Record<string, number>;
}> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const result = await collection.query.fetchObjects({ limit: 1000 });

    const byStatus: Record<ContentStatus, number> = {
      draft: 0,
      submitted: 0,
      in_review: 0,
      approved: 0,
      rejected: 0,
      published: 0,
    };
    const byContentType: Record<string, number> = {};

    for (const obj of result.objects) {
      const status = String(obj.properties.status ?? "draft") as ContentStatus;
      byStatus[status] = (byStatus[status] ?? 0) + 1;

      const ct = String(obj.properties.contentType ?? "");
      if (ct) {
        byContentType[ct] = (byContentType[ct] ?? 0) + 1;
      }
    }

    return {
      total: result.objects.length,
      byStatus,
      byContentType,
    };
  });
}
