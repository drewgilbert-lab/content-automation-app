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

/**
 * Session meta (no documents). Documents live in a Redis LIST so each
 * parse-single can RPUSH atomically without read-modify-write races.
 */
interface RedisSessionMeta {
  id: string;
  classifications: [number, ClassificationResult][];
  userEdits: [number, Partial<ClassificationResult>][];
  status: string;
  createdAt: string;
  expiresAt: string;
}

/** Legacy blob format (pre-atomic-list). Still readable for in-flight sessions. */
interface RedisSessionDataLegacy {
  id: string;
  documents: ParsedDocument[];
  classifications: [number, ClassificationResult][];
  userEdits: [number, Partial<ClassificationResult>][];
  status: string;
  createdAt: string;
  expiresAt: string;
}

function metaKey(id: string): string {
  return `${SESSION_KEY_PREFIX}${id}:meta`;
}

function docsKey(id: string): string {
  return `${SESSION_KEY_PREFIX}${id}:docs`;
}

/** Pre-split format key (entire session as one JSON value). */
function legacySessionKey(id: string): string {
  return `${SESSION_KEY_PREFIX}${id}`;
}

function lockKey(id: string): string {
  return `${SESSION_KEY_PREFIX}lock:${id}`;
}

/** True when running on Vercel (or NODE_ENV=production) where in-memory sessions are not durable. */
export function requiresDurableSessionStore(): boolean {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

export function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

function toMeta(session: UploadSession): RedisSessionMeta {
  return {
    id: session.id,
    classifications: Array.from(session.classifications.entries()),
    userEdits: Array.from(session.userEdits.entries()),
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}

function sessionFromParts(
  meta: RedisSessionMeta,
  documents: ParsedDocument[]
): UploadSession {
  return {
    id: meta.id,
    documents,
    classifications: new Map(meta.classifications),
    userEdits: new Map(meta.userEdits),
    status: meta.status as UploadSession["status"],
    createdAt: new Date(meta.createdAt),
    expiresAt: new Date(meta.expiresAt),
  };
}

async function refreshDocsTtl(r: Redis, sessionId: string): Promise<void> {
  const remaining = await r.ttl(metaKey(sessionId));
  const ex = remaining > 0 ? remaining : SESSION_TTL_SECONDS;
  await r.expire(docsKey(sessionId), ex);
}

async function writeMeta(
  r: Redis,
  session: UploadSession,
  preserveTtl = false
): Promise<void> {
  let ex = SESSION_TTL_SECONDS;
  if (preserveTtl) {
    const remaining = await r.ttl(metaKey(session.id));
    if (remaining > 0) ex = remaining;
  }
  await r.set(metaKey(session.id), toMeta(session), { ex });
}

async function loadDocuments(
  r: Redis,
  sessionId: string
): Promise<ParsedDocument[]> {
  const raw = await r.lrange<string>(docsKey(sessionId), 0, -1);
  if (!raw || raw.length === 0) return [];
  return raw.map((item) => {
    if (typeof item === "string") {
      return JSON.parse(item) as ParsedDocument;
    }
    return item as ParsedDocument;
  });
}

// --- Public API ---

export async function createSession(
  documents: ParsedDocument[] = []
): Promise<UploadSession> {
  if (requiresDurableSessionStore() && !isRedisConfigured()) {
    throw new Error(
      "Upload sessions require Redis in production. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
  }

  const now = new Date();
  const session: UploadSession = {
    id: crypto.randomUUID(),
    documents: [...documents],
    classifications: new Map(),
    userEdits: new Map(),
    status: "parsing",
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  };

  const r = getRedis();
  if (r) {
    await r.set(metaKey(session.id), toMeta(session), {
      ex: SESSION_TTL_SECONDS,
    });
    if (documents.length > 0) {
      const payloads = documents.map((d) => JSON.stringify(d));
      await r.rpush(docsKey(session.id), ...payloads);
      await r.expire(docsKey(session.id), SESSION_TTL_SECONDS);
    }
  } else {
    fallbackStore.set(session.id, session);
  }

  return session;
}

/**
 * Appends a parsed document to an existing session.
 * On Redis, uses RPUSH (atomic) so concurrent parse-single calls cannot
 * overwrite each other. Returns the new document index, or null if missing.
 */
export async function addDocumentToSession(
  sessionId: string,
  document: ParsedDocument
): Promise<{ index: number } | null> {
  const r = getRedis();
  if (r) {
    const meta = await r.get<RedisSessionMeta>(metaKey(sessionId));
    if (!meta) {
      // Legacy single-blob sessions (pre-list storage)
      const legacy = await r.get<RedisSessionDataLegacy>(
        legacySessionKey(sessionId)
      );
      if (!legacy) return null;
      const index = legacy.documents.length;
      legacy.documents.push(document);
      const remaining = await r.ttl(legacySessionKey(sessionId));
      const ex = remaining > 0 ? remaining : SESSION_TTL_SECONDS;
      await r.set(legacySessionKey(sessionId), legacy, { ex });
      return { index };
    }

    const length = await r.rpush(docsKey(sessionId), JSON.stringify(document));
    await refreshDocsTtl(r, sessionId);
    return { index: Math.max(0, length - 1) };
  }

  const session = fallbackStore.get(sessionId);
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    fallbackStore.delete(sessionId);
    return null;
  }
  const index = session.documents.length;
  session.documents.push(document);
  return { index };
}

export async function getSession(
  id: string
): Promise<UploadSession | null> {
  const r = getRedis();
  if (r) {
    const meta = await r.get<RedisSessionMeta>(metaKey(id));
    if (meta) {
      const documents = await loadDocuments(r, id);
      return sessionFromParts(meta, documents);
    }

    // Legacy blob
    const legacy = await r.get<RedisSessionDataLegacy>(legacySessionKey(id));
    if (!legacy) return null;
    return {
      id: legacy.id,
      documents: legacy.documents,
      classifications: new Map(legacy.classifications),
      userEdits: new Map(legacy.userEdits),
      status: legacy.status as UploadSession["status"],
      createdAt: new Date(legacy.createdAt),
      expiresAt: new Date(legacy.expiresAt),
    };
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
    await writeMeta(r, session, true);
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
    await writeMeta(r, session, true);
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
    await writeMeta(r, session, true);
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

export async function deleteUserEdit(
  sessionId: string,
  documentIndex: number
): Promise<boolean> {
  const r = getRedis();
  if (r) {
    const session = await getSession(sessionId);
    if (!session) return false;
    if (!session.userEdits.has(documentIndex)) return false;
    session.userEdits.delete(documentIndex);
    await writeMeta(r, session, true);
    return true;
  }

  const session = fallbackStore.get(sessionId);
  if (!session) return false;
  if (session.expiresAt.getTime() <= Date.now()) {
    fallbackStore.delete(sessionId);
    return false;
  }
  return session.userEdits.delete(documentIndex);
}

export async function deleteSession(id: string): Promise<boolean> {
  const r = getRedis();
  if (r) {
    const count = await r.del(
      metaKey(id),
      docsKey(id),
      legacySessionKey(id),
      lockKey(id)
    );
    return count > 0;
  }
  return fallbackStore.delete(id);
}

/** Visible for testing only. */
export async function _clearAllSessions(): Promise<void> {
  const r = getRedis();
  if (r) {
    let cursor = "0";
    do {
      const [nextCursor, keys]: [string, string[]] = await r.scan(cursor, {
        match: `${SESSION_KEY_PREFIX}*`,
        count: 100,
      });
      cursor = nextCursor;
      if (keys.length > 0) {
        await r.del(...keys);
      }
    } while (cursor !== "0");
  }
  fallbackStore.clear();
}

/** Visible for testing only. */
export async function _getSessionCount(): Promise<number> {
  const r = getRedis();
  if (r) {
    const ids = new Set<string>();
    let cursor = "0";
    do {
      const [nextCursor, keys]: [string, string[]] = await r.scan(cursor, {
        match: `${SESSION_KEY_PREFIX}*`,
        count: 100,
      });
      cursor = nextCursor;
      for (const key of keys) {
        const rest = key.slice(SESSION_KEY_PREFIX.length);
        const id = rest.split(":")[0];
        if (id && !rest.startsWith("lock:")) ids.add(id);
      }
    } while (cursor !== "0");
    return ids.size;
  }
  return fallbackStore.size;
}

/** Visible for testing only – injects a Redis client (or null for fallback). */
export function _setRedisForTesting(client: Redis | null): void {
  redis = client;
  redisInitialized = true;
}
