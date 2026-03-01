import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/weaviate", () => ({
  withWeaviate: vi.fn(),
}));

import {
  generateApiKey,
  hashApiKey,
  validateApiKey,
  invalidateApiKeyCache,
  refreshApiKeyCache,
} from "@/lib/api-auth";
import { withWeaviate } from "@/lib/weaviate";

const mockedWithWeaviate = vi.mocked(withWeaviate);

const g = globalThis as unknown as {
  __apiKeyCache?: Map<string, unknown>;
  __apiKeyCacheTimestamp?: number;
};

beforeEach(() => {
  vi.clearAllMocks();
  g.__apiKeyCache = undefined;
  g.__apiKeyCacheTimestamp = undefined;
});

describe("generateApiKey", () => {
  it("returns a 64-char hex key, valid SHA-256 hash, and 8-char prefix", () => {
    const { plaintextKey, hash, prefix } = generateApiKey();

    expect(plaintextKey).toHaveLength(64);
    expect(plaintextKey).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(prefix).toBe(plaintextKey.slice(0, 8));
  });
});

describe("hashApiKey", () => {
  it("is deterministic", () => {
    const key = "abcdef1234567890";
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  it("produces different hashes for different keys", () => {
    expect(hashApiKey("key-a")).not.toBe(hashApiKey("key-b"));
  });
});

describe("validateApiKey", () => {
  const testKey = "a".repeat(64);
  const testHash = hashApiKey(testKey);
  const mockSystem = {
    id: "sys-1",
    name: "Test",
    description: "",
    apiKeyPrefix: "aaaaaaaa",
    permissions: ["read"],
    subscribedTypes: ["*"],
    rateLimitTier: "standard",
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  function setupWeaviateMock() {
    mockedWithWeaviate.mockImplementation(async (fn) => {
      const mockCollection = {
        query: {
          fetchObjects: vi.fn().mockResolvedValue({
            objects: [
              {
                uuid: "sys-1",
                properties: {
                  apiKeyHash: testHash,
                  name: "Test",
                  description: "",
                  apiKeyPrefix: "aaaaaaaa",
                  permissions: ["read"],
                  subscribedTypes: ["*"],
                  rateLimitTier: "standard",
                  active: true,
                  createdAt: "2026-01-01T00:00:00.000Z",
                  updatedAt: "2026-01-01T00:00:00.000Z",
                },
              },
            ],
          }),
        },
      };
      const mockClient = {
        collections: { use: () => mockCollection },
      };
      return fn(mockClient as never);
    });
  }

  it("returns the system for a valid key", async () => {
    setupWeaviateMock();
    const result = await validateApiKey(testKey);
    expect(result).toMatchObject({ id: "sys-1", name: "Test" });
  });

  it("returns null for an invalid key", async () => {
    setupWeaviateMock();
    const result = await validateApiKey("b".repeat(64));
    expect(result).toBeNull();
  });

  it("refreshes cache when expired", async () => {
    setupWeaviateMock();

    // Prime cache
    await validateApiKey(testKey);
    expect(mockedWithWeaviate).toHaveBeenCalledTimes(1);

    // Expire it
    g.__apiKeyCacheTimestamp = Date.now() - 400_000;
    await validateApiKey(testKey);
    expect(mockedWithWeaviate).toHaveBeenCalledTimes(2);
  });
});

describe("invalidateApiKeyCache", () => {
  it("forces refresh on next validate call", async () => {
    mockedWithWeaviate.mockImplementation(async (fn) => {
      const mockClient = {
        collections: {
          use: () => ({
            query: { fetchObjects: vi.fn().mockResolvedValue({ objects: [] }) },
          }),
        },
      };
      return fn(mockClient as never);
    });

    // Prime cache
    await refreshApiKeyCache();
    expect(mockedWithWeaviate).toHaveBeenCalledTimes(1);

    // Without invalidation — cache is fresh, no re-fetch
    await validateApiKey("x");
    expect(mockedWithWeaviate).toHaveBeenCalledTimes(1);

    // After invalidation — forces refresh
    invalidateApiKeyCache();
    await validateApiKey("x");
    expect(mockedWithWeaviate).toHaveBeenCalledTimes(2);
  });
});
