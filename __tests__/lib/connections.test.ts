import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/weaviate", () => ({
  withWeaviate: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  generateApiKey: vi.fn(),
  invalidateApiKeyCache: vi.fn(),
}));

import {
  listConnectedSystems,
  getConnectedSystem,
  createConnectedSystem,
  deleteConnectedSystem,
  activateConnectedSystem,
  deactivateConnectedSystem,
  ConnectedSystemNameConflictError,
} from "@/lib/connections";
import { withWeaviate } from "@/lib/weaviate";
import { generateApiKey, invalidateApiKeyCache } from "@/lib/api-auth";

const mockedWithWeaviate = vi.mocked(withWeaviate);
const mockedGenerateApiKey = vi.mocked(generateApiKey);
const mockedInvalidateApiKeyCache = vi.mocked(invalidateApiKeyCache);

function makeObj(id: string, overrides: Record<string, unknown> = {}) {
  return {
    uuid: id,
    properties: {
      name: `System ${id}`,
      description: "desc",
      apiKeyPrefix: "pref1234",
      permissions: ["read"],
      subscribedTypes: ["*"],
      rateLimitTier: "standard",
      active: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      ...overrides,
    },
  };
}

function setupClient(mockCollection: Record<string, unknown>) {
  mockedWithWeaviate.mockImplementation(async (fn) => {
    const client = { collections: { use: () => mockCollection } };
    return fn(client as never);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listConnectedSystems", () => {
  it("returns mapped items sorted by updatedAt", async () => {
    const obj1 = makeObj("a", { updatedAt: "2026-01-01T00:00:00.000Z" });
    const obj2 = makeObj("b", { updatedAt: "2026-01-03T00:00:00.000Z" });
    setupClient({
      query: { fetchObjects: vi.fn().mockResolvedValue({ objects: [obj1, obj2] }) },
    });

    const items = await listConnectedSystems();
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe("b");
    expect(items[1].id).toBe("a");
  });

  it("filters by active status", async () => {
    const active = makeObj("a", { active: true });
    const inactive = makeObj("b", { active: false });
    setupClient({
      query: { fetchObjects: vi.fn().mockResolvedValue({ objects: [active, inactive] }) },
    });

    const items = await listConnectedSystems({ active: true });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("a");
  });
});

describe("getConnectedSystem", () => {
  it("returns null when not found", async () => {
    setupClient({
      query: { fetchObjectById: vi.fn().mockResolvedValue(null) },
    });

    const result = await getConnectedSystem("missing-id");
    expect(result).toBeNull();
  });
});

describe("createConnectedSystem", () => {
  it("generates a key and invalidates the cache", async () => {
    mockedGenerateApiKey.mockReturnValue({
      plaintextKey: "pk-abc",
      hash: "hash-abc",
      prefix: "pk-abc12",
    });

    const insertMock = vi.fn().mockResolvedValue("new-id");
    setupClient({
      query: {
        fetchObjects: vi.fn().mockResolvedValue({ objects: [] }),
      },
      data: { insert: insertMock },
    });

    const result = await createConnectedSystem({
      name: "New System",
      description: "A new system",
    });

    expect(result).toEqual({ id: "new-id", plaintextKey: "pk-abc" });
    expect(mockedGenerateApiKey).toHaveBeenCalled();
    expect(mockedInvalidateApiKeyCache).toHaveBeenCalled();
  });

  it("throws ConnectedSystemNameConflictError on duplicate name", async () => {
    setupClient({
      query: {
        fetchObjects: vi.fn().mockResolvedValue({ objects: [makeObj("existing")] }),
      },
    });

    await expect(
      createConnectedSystem({ name: "dupe", description: "desc" })
    ).rejects.toThrow(ConnectedSystemNameConflictError);
  });
});

describe("deleteConnectedSystem", () => {
  it("returns false for non-existent id", async () => {
    setupClient({
      query: { fetchObjectById: vi.fn().mockResolvedValue(null) },
      data: { deleteById: vi.fn() },
    });

    const result = await deleteConnectedSystem("missing");
    expect(result).toBe(false);
  });

  it("deletes and invalidates cache", async () => {
    const deleteMock = vi.fn();
    setupClient({
      query: { fetchObjectById: vi.fn().mockResolvedValue(makeObj("x")) },
      data: { deleteById: deleteMock },
    });

    const result = await deleteConnectedSystem("x");
    expect(result).toBe(true);
    expect(mockedInvalidateApiKeyCache).toHaveBeenCalled();
  });
});

describe("activateConnectedSystem / deactivateConnectedSystem", () => {
  it("activate invalidates cache on success", async () => {
    const updateMock = vi.fn();
    setupClient({
      query: { fetchObjectById: vi.fn().mockResolvedValue(makeObj("x")) },
      data: { update: updateMock },
    });

    const result = await activateConnectedSystem("x");
    expect(result).toBe(true);
    expect(mockedInvalidateApiKeyCache).toHaveBeenCalled();
  });

  it("deactivate returns false when not found", async () => {
    setupClient({
      query: { fetchObjectById: vi.fn().mockResolvedValue(null) },
      data: { update: vi.fn() },
    });

    const result = await deactivateConnectedSystem("missing");
    expect(result).toBe(false);
    expect(mockedInvalidateApiKeyCache).not.toHaveBeenCalled();
  });
});
