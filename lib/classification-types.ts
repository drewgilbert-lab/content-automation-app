import type { KnowledgeType } from "./knowledge-types";

export interface SuggestedRelationship {
  targetId: string;
  targetName: string;
  targetType: KnowledgeType;
  relationshipType: string;
}

export interface ClassificationResult {
  filename: string;
  objectType: KnowledgeType;
  objectName: string;
  tags: string[];
  suggestedRelationships: SuggestedRelationship[];
  confidence: number;
  needsReview: boolean;
}

export const CONFIDENCE_THRESHOLD = 0.7;

export interface ClassificationProgressEvent {
  index: number;
  total: number;
  filename: string;
  status: "classifying";
}

export interface ClassificationResultEvent {
  index: number;
  filename: string;
  classification: ClassificationResult;
}

export interface ClassificationErrorEvent {
  index: number;
  filename: string;
  error: string;
}

export interface ClassificationDoneEvent {
  total: number;
  classified: number;
  failed: number;
}

/** Shape Claude is instructed to return (before relationship ID resolution). */
export interface RawClassificationResponse {
  objectType: string;
  objectName: string;
  tags: string[];
  suggestedRelationships: {
    targetName: string;
    targetType: string;
    relationshipType: string;
  }[];
  confidence: number;
}
