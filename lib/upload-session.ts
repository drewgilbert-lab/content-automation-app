import type { ParsedDocument } from "./document-parser-types";
import type { ClassificationResult } from "./classification-types";
import type { UploadSession, UploadSessionState } from "./upload-session-types";
import {
  SESSION_TTL_MS,
  SESSION_CLEANUP_INTERVAL_MS,
  serializeSession,
} from "./upload-session-types";

// TODO: Replace in-memory store with Redis for production persistence across deploys/restarts
const sessions = new Map<string, UploadSession>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanupTimer() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (session.expiresAt.getTime() <= now) {
        sessions.delete(id);
      }
    }
  }, SESSION_CLEANUP_INTERVAL_MS);

  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export function createSession(documents: ParsedDocument[]): UploadSession {
  ensureCleanupTimer();

  const now = new Date();
  const session: UploadSession = {
    id: crypto.randomUUID(),
    documents,
    classifications: new Map(),
    userEdits: new Map(),
    status: "parsing",
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  };

  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): UploadSession | null {
  const session = sessions.get(id);
  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    sessions.delete(id);
    return null;
  }

  return session;
}

export function getSerializedSession(id: string): UploadSessionState | null {
  const session = getSession(id);
  if (!session) return null;
  return serializeSession(session);
}

export function updateSessionStatus(
  id: string,
  status: UploadSession["status"]
): boolean {
  const session = getSession(id);
  if (!session) return false;
  session.status = status;
  return true;
}

export function setClassification(
  sessionId: string,
  documentIndex: number,
  classification: ClassificationResult
): boolean {
  const session = getSession(sessionId);
  if (!session) return false;
  if (documentIndex < 0 || documentIndex >= session.documents.length) return false;
  session.classifications.set(documentIndex, classification);
  return true;
}

export function setUserEdit(
  sessionId: string,
  documentIndex: number,
  edits: Partial<ClassificationResult>
): boolean {
  const session = getSession(sessionId);
  if (!session) return false;
  if (documentIndex < 0 || documentIndex >= session.documents.length) return false;

  const existing = session.userEdits.get(documentIndex) ?? {};
  session.userEdits.set(documentIndex, { ...existing, ...edits });
  return true;
}

export function deleteSession(id: string): boolean {
  return sessions.delete(id);
}

/** Visible for testing only. */
export function _clearAllSessions() {
  sessions.clear();
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/** Visible for testing only. */
export function _getSessionCount(): number {
  return sessions.size;
}
