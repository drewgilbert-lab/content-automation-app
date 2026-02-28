import crypto from "crypto";
import { withWeaviate } from "./weaviate";
import type { ConnectedSystemDetail } from "./connection-types";

const CACHE_TTL_MS = 300_000;

const g = globalThis as unknown as {
  __apiKeyCache?: Map<string, ConnectedSystemDetail>;
  __apiKeyCacheTimestamp?: number;
};

export function generateApiKey(): {
  plaintextKey: string;
  hash: string;
  prefix: string;
} {
  const plaintextKey = crypto.randomBytes(32).toString("hex");
  const hash = hashApiKey(plaintextKey);
  const prefix = plaintextKey.slice(0, 8);
  return { plaintextKey, hash, prefix };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

async function refreshCacheIfNeeded(): Promise<void> {
  const now = Date.now();
  const ts = g.__apiKeyCacheTimestamp ?? 0;
  if (!g.__apiKeyCache || now - ts > CACHE_TTL_MS) {
    await refreshApiKeyCache();
  }
}

export async function validateApiKey(
  key: string
): Promise<ConnectedSystemDetail | null> {
  const incomingHash = hashApiKey(key);
  await refreshCacheIfNeeded();
  const cache = g.__apiKeyCache;
  if (!cache) return null;

  const incomingBuf = Buffer.from(incomingHash, "hex");
  for (const [storedHash, system] of cache) {
    const storedBuf = Buffer.from(storedHash, "hex");
    if (
      storedBuf.length === incomingBuf.length &&
      crypto.timingSafeEqual(storedBuf, incomingBuf)
    ) {
      return system;
    }
  }
  return null;
}

export function invalidateApiKeyCache(): void {
  g.__apiKeyCacheTimestamp = 0;
}

export async function refreshApiKeyCache(): Promise<void> {
  const cache = new Map<string, ConnectedSystemDetail>();
  await withWeaviate(async (client) => {
    const collection = client.collections.use("ConnectedSystem");
    const result = await collection.query.fetchObjects({ limit: 1000 });
    for (const obj of result.objects) {
      const apiKeyHash = String(obj.properties.apiKeyHash ?? "");
      if (!apiKeyHash) continue;
      const system: ConnectedSystemDetail = {
        id: obj.uuid,
        name: String(obj.properties.name ?? ""),
        description: String(obj.properties.description ?? ""),
        apiKeyPrefix: String(obj.properties.apiKeyPrefix ?? ""),
        permissions: (obj.properties.permissions as string[]) ?? [],
        subscribedTypes: (obj.properties.subscribedTypes as string[]) ?? [],
        rateLimitTier: String(obj.properties.rateLimitTier ?? ""),
        active: obj.properties.active === true,
        createdAt: dateToString(obj.properties.createdAt),
        updatedAt: dateToString(obj.properties.updatedAt),
      };
      cache.set(apiKeyHash, system);
    }
  });
  g.__apiKeyCache = cache;
  g.__apiKeyCacheTimestamp = Date.now();
}

function dateToString(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString();
  return String(val);
}
