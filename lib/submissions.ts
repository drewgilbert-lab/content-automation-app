import { withWeaviate } from "./weaviate";
import weaviate from "weaviate-client";
import {
  createKnowledgeObject,
  updateKnowledgeObject,
} from "./knowledge";
import type {
  SubmissionCreateInput,
  SubmissionListItem,
  SubmissionDetail,
  SubmissionStatus,
  SubmissionType,
  ReviewAction,
} from "./submission-types";
import type { KnowledgeType, KnowledgeCreateInput } from "./knowledge-types";

export type {
  SubmissionCreateInput,
  SubmissionListItem,
  SubmissionDetail,
  SubmissionStatus,
  SubmissionType,
  ReviewAction,
};
export {
  VALID_SUBMISSION_TYPES,
  VALID_STATUSES,
  VALID_REVIEW_ACTIONS,
  getSubmissionTypeLabel,
  getStatusLabel,
} from "./submission-types";

function dateToString(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createSubmission(
  input: SubmissionCreateInput
): Promise<{ id: string; status: SubmissionStatus }> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use("Submission");

    const now = new Date().toISOString();
    const properties: Record<string, string> = {
      submitter: input.submitter,
      objectType: input.objectType,
      objectName: input.objectName,
      submissionType: input.submissionType,
      proposedContent: input.proposedContent,
      status: "pending",
      createdAt: now,
    };

    if (input.targetObjectId) {
      properties.targetObjectId = input.targetObjectId;
    }

    const id = await collection.data.insert(properties);
    return { id, status: "pending" as const };
  });
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listSubmissions(filters?: {
  submissionType?: SubmissionType;
  status?: SubmissionStatus;
}): Promise<SubmissionListItem[]> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use("Submission");

    let singleFilter = undefined;

    if (filters?.submissionType) {
      singleFilter = weaviate.filter
        .byProperty("submissionType")
        .equal(filters.submissionType);
    } else if (filters?.status) {
      singleFilter = weaviate.filter
        .byProperty("status")
        .equal(filters.status);
    }

    const result = await collection.query.fetchObjects({
      limit: 500,
      ...(singleFilter ? { filters: singleFilter } : {}),
    });

    let items: SubmissionListItem[] = result.objects.map((obj) => ({
      id: obj.uuid,
      submitter: String(obj.properties.submitter ?? ""),
      objectName: String(obj.properties.objectName ?? ""),
      objectType: String(obj.properties.objectType ?? "") as KnowledgeType,
      submissionType: String(obj.properties.submissionType ?? "") as SubmissionType,
      status: String(obj.properties.status ?? "") as SubmissionStatus,
      createdAt: dateToString(obj.properties.createdAt),
    }));

    if (filters?.submissionType && filters?.status) {
      items = items.filter((s) => s.status === filters.status);
    }

    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return items;
  });
}

// ─── Count pending ────────────────────────────────────────────────────────────

export async function countPendingSubmissions(): Promise<number> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use("Submission");
    const result = await collection.query.fetchObjects({ limit: 500 });
    return result.objects.filter((obj) => {
      const status = String(obj.properties.status ?? "");
      return status === "pending" || status === "deferred";
    }).length;
  });
}

// ─── Get detail ───────────────────────────────────────────────────────────────

export async function getSubmission(
  id: string
): Promise<SubmissionDetail | null> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use("Submission");

    try {
      const obj = await collection.query.fetchObjectById(id);
      if (!obj) return null;

      return {
        id: obj.uuid,
        submitter: String(obj.properties.submitter ?? ""),
        objectType: String(obj.properties.objectType ?? "") as KnowledgeType,
        objectName: String(obj.properties.objectName ?? ""),
        submissionType: String(obj.properties.submissionType ?? "") as SubmissionType,
        proposedContent: String(obj.properties.proposedContent ?? ""),
        targetObjectId: obj.properties.targetObjectId
          ? String(obj.properties.targetObjectId)
          : undefined,
        status: String(obj.properties.status ?? "") as SubmissionStatus,
        reviewComment: obj.properties.reviewComment
          ? String(obj.properties.reviewComment)
          : undefined,
        reviewNote: obj.properties.reviewNote
          ? String(obj.properties.reviewNote)
          : undefined,
        createdAt: dateToString(obj.properties.createdAt),
        reviewedAt: obj.properties.reviewedAt
          ? dateToString(obj.properties.reviewedAt)
          : undefined,
      };
    } catch {
      return null;
    }
  });
}

// ─── Review ───────────────────────────────────────────────────────────────────

export async function reviewSubmission(
  id: string,
  action: ReviewAction,
  comment?: string,
  note?: string
): Promise<{
  id: string;
  status: SubmissionStatus;
  objectId?: string;
}> {
  const submission = await getSubmission(id);
  if (!submission) throw new Error("Submission not found");

  if (submission.status === "accepted" || submission.status === "rejected") {
    throw new SubmissionClosedError(id, submission.status);
  }

  if (action === "reject" && (!comment || !comment.trim())) {
    throw new Error("Comment is required when rejecting a submission");
  }

  const now = new Date().toISOString();

  if (action === "accept") {
    let objectId: string | undefined;

    const proposed = JSON.parse(submission.proposedContent);

    if (submission.submissionType === "new") {
      const createInput: KnowledgeCreateInput = {
        type: submission.objectType,
        name: proposed.name ?? submission.objectName,
        content: proposed.content ?? "",
        tags: proposed.tags,
        subType: proposed.subType,
        revenueRange: proposed.revenueRange,
        employeeRange: proposed.employeeRange,
        personaId: proposed.personaId,
        segmentId: proposed.segmentId,
      };
      objectId = await createKnowledgeObject(createInput);
    } else if (submission.submissionType === "update" && submission.targetObjectId) {
      await updateKnowledgeObject(submission.targetObjectId, {
        name: proposed.name,
        content: proposed.content,
        tags: proposed.tags,
        subType: proposed.subType,
        revenueRange: proposed.revenueRange,
        employeeRange: proposed.employeeRange,
      });
      objectId = submission.targetObjectId;
    }

    await withWeaviate(async (client) => {
      const collection = client.collections.use("Submission");
      await collection.data.update({
        id,
        properties: { status: "accepted", reviewedAt: now },
      });
    });

    return { id, status: "accepted", objectId };
  }

  if (action === "reject") {
    await withWeaviate(async (client) => {
      const collection = client.collections.use("Submission");
      await collection.data.update({
        id,
        properties: {
          status: "rejected",
          reviewComment: comment!,
          reviewedAt: now,
        },
      });
    });

    return { id, status: "rejected" };
  }

  // defer
  await withWeaviate(async (client) => {
    const collection = client.collections.use("Submission");
    await collection.data.update({
      id,
      properties: {
        status: "deferred",
        ...(note ? { reviewNote: note } : {}),
      },
    });
  });

  return { id, status: "deferred" };
}

export class SubmissionClosedError extends Error {
  constructor(id: string, status: string) {
    super(`Submission ${id} is already ${status}`);
    this.name = "SubmissionClosedError";
  }
}
