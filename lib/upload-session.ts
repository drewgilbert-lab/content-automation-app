import { Redis } from "@upstash/redis";
import type { ParsedDocument } from "./document-parser-types";
import type { ClassificationResult } from "./classification-types";
import type { UploadSession, UploadSessionState } from "./upload-session-types";
import { SESSION_TTL_MS, serializeSession } from "./upload-session-types";

const SESSION_KEY_PREFIX = "upload-session:";
const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

// --- Redis client (lazy singleton) ---

let redis: Redis | null = null;
let redisInitialized = false;

function getRedis(): Redis | null {
  if (redisInitialized) return redis;
  redisInitialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "Upload session store: Redis not configured, falling back to in-memory store"
    );
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

// --- In-memory fallback (local dev without Redis) ---

const g = globalThis as unknown as {
  __uploadSessions?: Map<string, UploadSession>;
};
if (!g.__uploadSessions) g.__uploadSessions = new Map();
const fallbackStore = g.__uploadSessions;

// --- Redis serialization ---

interface RedisSessionData {
  id: string;
  documents: ParsedDocument[];
  classifications: [number, ClassificationResult][];
  userEdits: [number, Partial<ClassificationResult>][];
  status: string;
  createdAt: string;
  expiresAt: string;
}

function toRedis(session: UploadSession): RedisSessionData {
  return {
    id: session.id,
    documents: session.documents,
    classifications: Array.from(session.classifications.entries()),
    userEdits: Array.from(session.userEdits.entries()),
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}

function fromRedis(data: RedisSessionData): UploadSession {
  return {
    id: data.id,
    documents: data.documents,
    classifications: new Map(data.classifications),
    userEdits: new Map(data.userEdits),
    status: data.status as UploadSession["status"],
    createdAt: new Date(data.createdAt),
    expiresAt: new Date(data.expiresAt),
  };
}

function sessionKey(id: string): string {
  return `${SESSION_KEY_PREFIX}${id}`;
}

async function writeToRedis(
  r: Redis,
  session: UploadSession,
  preserveTtl = false
): Promise<void> {
  let ex = SESSION_TTL_SECONDS;
  if (preserveTtl) {
    const remaining = await r.ttl(sessionKey(session.id));
    if (remaining > 0) ex = remaining;
  }
  await r.set(sessionKey(session.id), toRedis(session), { ex });
}

// --- Public API (signatures match the old module, but return Promises) ---

export async function createSession(
  documents: ParsedDocument[]
): Promise<UploadSession> {
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

  const r = getRedis();
  if (r) {
    await r.set(sessionKey(session.id), toRedis(session), {
      ex: SESSION_TTL_SECONDS,
    });
  } else {
    fallbackStore.set(session.id, session);
  }

  return session;
}

export async function getSession(
  id: string
): Promise<UploadSession | null> {
  const r = getRedis();
  if (r) {
    const data = await r.get<RedisSessionData>(sessionKey(id));
    if (!data) return null;
    return fromRedis(data);
  }

  const session = fallbackStore.get(id);
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    fallbackStore.delete(id);
    return null;
  }
  return session;
}

export async function getSerializedSession(
  id: string
): Promise<UploadSessionState | null> {
  const session = await getSession(id);
  if (!session) return null;
  return serializeSession(session);
}

export async function updateSessionStatus(
  id: string,
  status: UploadSession["status"]
): Promise<boolean> {
  const r = getRedis();
  if (r) {
    const session = await getSession(id);
    if (!session) return false;
    session.status = status;
    await writeToRedis(r, session, true);
    return true;
  }

  const session = fallbackStore.get(id);
  if (!session) return false;
  if (session.expiresAt.getTime() <= Date.now()) {
    fallbackStore.delete(id);
    return false;
  }
  session.status = status;
  return true;
}

export async function setClassification(
  sessionId: string,
  documentIndex: number,
  classification: ClassificationResult
): Promise<boolean> {
  const r = getRedis();
  if (r) {
    const session = await getSession(sessionId);
    if (!session) return false;
    if (documentIndex < 0 || documentIndex >= session.documents.length)
      return false;
    session.classifications.set(documentIndex, classification);
    await writeToRedis(r, session, true);
    return true;
  }

  const session = fallbackStore.get(sessionId);
  if (!session) return false;
  if (session.expiresAt.getTime() <= Date.now()) {
    fallbackStore.delete(sessionId);
    return false;
  }
  if (documentIndex < 0 || documentIndex >= session.documents.length)
    return false;
  session.classifications.set(documentIndex, classification);
  return true;
}

export async function setUserEdit(
  sessionId: string,
  documentIndex: number,
  edits: Partial<ClassificationResult>
): Promise<boolean> {
  const r = getRedis();
  if (r) {
    const session = await getSession(sessionId);
    if (!session) return false;
    if (documentIndex < 0 || documentIndex >= session.documents.length)
      return false;
    const existing = session.userEdits.get(documentIndex) ?? {};
    session.userEdits.set(documentIndex, { ...existing, ...edits });
    await writeToRedis(r, session, true);
    return true;
  }

  const session = fallbackStore.get(sessionId);
  if (!session) return false;
  if (session.expiresAt.getTime() <= Date.now()) {
    fallbackStore.delete(sessionId);
    return false;
  }
  if (documentIndex < 0 || documentIndex >= session.documents.length)
    return false;
  const existing = session.userEdits.get(documentIndex) ?? {};
  session.userEdits.set(documentIndex, { ...existing, ...edits });
  return true;
}

export async function deleteSession(id: string): Promise<boolean> {
  const r = getRedis();
  if (r) {
    const count = await r.del(sessionKey(id));
    return count > 0;
  }
  return fallbackStore.delete(id);
}

/** Visible for testing only. */
export async function _clearAllSessions(): Promise<void> {
  const r = getRedis();
  if (r) {
    let cursor = 0;
    do {
      const [nextCursor, keys] = await r.scan(cursor, {
        match: `${SESSION_KEY_PREFIX}*`,
        count: 100,
      });
      cursor = nextCursor;
      if (keys.length > 0) {
        await r.del(...(keys as string[]));
      }
    } while (cursor !== 0);
  }
  fallbackStore.clear();
}

/** Visible for testing only. */
export async function _getSessionCount(): Promise<number> {
  const r = getRedis();
  if (r) {
    let count = 0;
    let cursor = 0;
    do {
      const [nextCursor, keys] = await r.scan(cursor, {
        match: `${SESSION_KEY_PREFIX}*`,
        count: 100,
      });
      cursor = nextCursor;
      count += keys.length;
    } while (cursor !== 0);
    return count;
  }
  return fallbackStore.size;
}

/** Visible for testing only – resets lazy-init state so the next call re-reads env vars. */
export function _resetInit(): void {
  redisInitialized = false;
  redis = null;
}
