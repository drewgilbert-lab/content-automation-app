import type { KnowledgeType } from "./knowledge-types";

export type SubmissionType = "new" | "update" | "document_add";

export type SubmissionStatus = "pending" | "accepted" | "rejected" | "deferred";

export type ReviewAction = "accept" | "reject" | "defer";

export const VALID_SUBMISSION_TYPES: SubmissionType[] = ["new", "update", "document_add"];
export const VALID_STATUSES: SubmissionStatus[] = ["pending", "accepted", "rejected", "deferred"];
export const VALID_REVIEW_ACTIONS: ReviewAction[] = ["accept", "reject", "defer"];

export interface SubmissionCreateInput {
  submitter: string;
  objectType: KnowledgeType;
  objectName: string;
  submissionType: SubmissionType;
  proposedContent: string;
  targetObjectId?: string;
}

export interface SubmissionListItem {
  id: string;
  submitter: string;
  objectName: string;
  objectType: KnowledgeType;
  submissionType: SubmissionType;
  status: SubmissionStatus;
  createdAt: string;
}

export interface SubmissionDetail {
  id: string;
  submitter: string;
  objectType: KnowledgeType;
  objectName: string;
  submissionType: SubmissionType;
  proposedContent: string;
  targetObjectId?: string;
  status: SubmissionStatus;
  reviewComment?: string;
  reviewNote?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface ReviewInput {
  action: ReviewAction;
  comment?: string;
  note?: string;
}

export function getSubmissionTypeLabel(type: SubmissionType): string {
  const labels: Record<SubmissionType, string> = {
    new: "New Object",
    update: "Update",
    document_add: "Document Addition",
  };
  return labels[type];
}

export function getStatusLabel(status: SubmissionStatus): string {
  const labels: Record<SubmissionStatus, string> = {
    pending: "Pending",
    accepted: "Accepted",
    rejected: "Rejected",
    deferred: "Deferred",
  };
  return labels[status];
}
