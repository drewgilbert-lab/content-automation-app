import type { ParsedDocument } from "./document-parser-types";
import type { ClassificationResult } from "./classification-types";

export type SessionStatus =
  | "parsing"
  | "classifying"
  | "reviewing"
  | "approved";

export interface UploadSession {
  id: string;
  documents: ParsedDocument[];
  classifications: Map<number, ClassificationResult>;
  userEdits: Map<number, Partial<ClassificationResult>>;
  status: SessionStatus;
  createdAt: Date;
  expiresAt: Date;
}

export interface SerializedSessionDocument {
  index: number;
  filename: string;
  format: string;
  content: string;
  wordCount: number;
  parseErrors: string[];
}

export interface SerializedClassification {
  index: number;
  classification: ClassificationResult;
}

export interface SerializedUserEdit {
  index: number;
  edits: Partial<ClassificationResult>;
}

/** Client-safe, JSON-serializable session state. */
export interface UploadSessionState {
  id: string;
  documents: SerializedSessionDocument[];
  classifications: SerializedClassification[];
  userEdits: SerializedUserEdit[];
  status: SessionStatus;
  createdAt: string;
  expiresAt: string;
}

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const SESSION_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function serializeSession(session: UploadSession): UploadSessionState {
  return {
    id: session.id,
    documents: session.documents.map((doc, index) => ({
      index,
      filename: doc.filename,
      format: doc.format,
      content: doc.content,
      wordCount: doc.wordCount,
      parseErrors: doc.errors,
    })),
    classifications: Array.from(session.classifications.entries()).map(
      ([index, classification]) => ({ index, classification })
    ),
    userEdits: Array.from(session.userEdits.entries()).map(
      ([index, edits]) => ({ index, edits })
    ),
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}

/**
 * Merges user edits on top of AI classification for a given document index.
 * Returns the classification with edits applied, or the raw classification if no edits.
 */
export function getEffectiveClassification(
  session: UploadSession,
  index: number
): ClassificationResult | null {
  const base = session.classifications.get(index);
  if (!base) return null;

  const edits = session.userEdits.get(index);
  if (!edits) return base;

  return { ...base, ...edits };
}
