import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ParsedDocument } from "@/lib/document-parser-types";
import type { ClassificationResult } from "@/lib/classification-types";
import {
  createSession,
  getSession,
  updateSessionStatus,
  setClassification,
  setUserEdit,
  deleteSession,
  _setRedisForTesting,
} from "@/lib/upload-session";
import { createFakeUploadRedis } from "../helpers/fake-upload-redis";

// --- Top-level mocks for rate-limit tests ---

const mockLimit = vi.fn();

vi.mock("@upstash/ratelimit", () => {
  class MockRatelimit {
    limit = mockLimit;
    static slidingWindow = vi.fn().mockReturnValue("limiter");
  }
  return { Ratelimit: MockRatelimit };
});

vi.mock("@upstash/redis", () => {
  class MockRedis {}
  return { Redis: MockRedis };
});

const fake = createFakeUploadRedis();

// --- Helpers ---

function mockDoc(filename: string, content = "test content"): ParsedDocument {
  return {
    filename,
    format: "md",
    content,
    wordCount: content.split(/\s+/).length,
    errors: [],
  };
}

function mockClassification(filename: string): ClassificationResult {
  return {
    filename,
    objectType: "persona",
    objectName: "Test Persona",
    tags: ["test"],
    suggestedRelationships: [],
    confidence: 0.9,
    needsReview: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Upload session Redis integration
// ─────────────────────────────────────────────────────────────────────────────

describe("Upload session Redis integration", () => {
  beforeEach(() => {
    fake.clear();
    vi.clearAllMocks();
    _setRedisForTesting(fake.redis);
  });

  it("creates a session and retrieves it via Redis", async () => {
    const docs = [mockDoc("readme.md"), mockDoc("guide.md")];
    const created = await createSession(docs);
    const found = await getSession(created.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.documents).toEqual(docs);
    expect(found!.status).toBe("parsing");
    expect(found!.classifications).toBeInstanceOf(Map);
    expect(found!.userEdits).toBeInstanceOf(Map);
  });

  it("session persists across separate get calls", async () => {
    const created = await createSession([mockDoc("a.md")]);
    const first = await getSession(created.id);
    const second = await getSession(created.id);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.id).toBe(second!.id);
    expect(first!.documents).toEqual(second!.documents);
    expect(first!.status).toBe(second!.status);
  });

  it("session round-trip preserves classifications and user edits", async () => {
    const docs = [mockDoc("a.md"), mockDoc("b.md")];
    const session = await createSession(docs);
    const classification = mockClassification("a.md");

    await setClassification(session.id, 0, classification);
    await setUserEdit(session.id, 0, { objectName: "Edited Name" });

    const found = await getSession(session.id);
    expect(found!.classifications.get(0)).toEqual(classification);
    expect(found!.userEdits.get(0)).toEqual({ objectName: "Edited Name" });
  });

  it("updates session status via Redis", async () => {
    const session = await createSession([mockDoc("a.md")]);
    await updateSessionStatus(session.id, "classifying");

    const found = await getSession(session.id);
    expect(found!.status).toBe("classifying");
  });

  it("deletes session from Redis", async () => {
    const session = await createSession([mockDoc("a.md")]);
    const ok = await deleteSession(session.id);
    expect(ok).toBe(true);

    const found = await getSession(session.id);
    expect(found).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Rate limit Redis integration
// ─────────────────────────────────────────────────────────────────────────────

describe("Rate limit Redis integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("enforces standard tier rate limit", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";

    mockLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60000,
    });

    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("test-key", "standard", false);

    expect(result.success).toBe(true);
    expect(result.limit).toBe(100);
  });

  it("returns failure when limit exceeded", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";

    mockLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("test-key", "standard", false);

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("enforces elevated tier with higher limit", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";

    mockLimit.mockResolvedValue({
      success: true,
      remaining: 299,
      reset: Date.now() + 60000,
    });

    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("test-key", "elevated", false);

    expect(result.success).toBe(true);
    expect(result.limit).toBe(300);
  });

  it("enforces search rate limit", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";

    mockLimit.mockResolvedValue({
      success: true,
      remaining: 19,
      reset: Date.now() + 60000,
    });

    const { checkRateLimit } = await import("@/lib/rate-limit");
    await checkRateLimit("test-key", "standard", true);

    expect(mockLimit).toHaveBeenCalledTimes(2);
    expect(mockLimit).toHaveBeenCalledWith("search:test-key");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Graceful fallback without Redis
// ─────────────────────────────────────────────────────────────────────────────

describe("Graceful fallback without Redis", () => {
  beforeEach(() => {
    fake.clear();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("upload session falls back to in-memory store", async () => {
    _setRedisForTesting(null);

    const docs = [mockDoc("fallback.md")];
    const created = await createSession(docs);
    const found = await getSession(created.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.documents).toEqual(docs);
    expect(fake.mocks.set).not.toHaveBeenCalled();
    expect(fake.mocks.get).not.toHaveBeenCalled();
  });

  it("rate limit returns permissive result without env vars", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("test-key", "standard", false);

    expect(result).toEqual({
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
    });
  });

  it("rate limit does not call limiter without env vars", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    await checkRateLimit("test-key", "standard", false);

    expect(mockLimit).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Rate limit header contract
// ─────────────────────────────────────────────────────────────────────────────

describe("Rate limit header contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("rate limit result contains all required header fields", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";

    const resetTs = Date.now() + 60000;
    mockLimit.mockResolvedValue({
      success: true,
      remaining: 95,
      reset: resetTs,
    });

    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("test-key", "standard", false);

    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("limit");
    expect(result).toHaveProperty("remaining");
    expect(result).toHaveProperty("reset");
    expect(typeof result.success).toBe("boolean");
    expect(typeof result.limit).toBe("number");
    expect(typeof result.remaining).toBe("number");
    expect(typeof result.reset).toBe("number");
  });

  it("remaining decreases on successive calls", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";

    const resetTs = Date.now() + 60000;
    mockLimit
      .mockResolvedValueOnce({ success: true, remaining: 99, reset: resetTs })
      .mockResolvedValueOnce({ success: true, remaining: 98, reset: resetTs });

    const { checkRateLimit } = await import("@/lib/rate-limit");
    const first = await checkRateLimit("test-key", "standard", false);
    const second = await checkRateLimit("test-key", "standard", false);

    expect(first.remaining).toBe(99);
    expect(second.remaining).toBe(98);
    expect(second.remaining).toBeLessThan(first.remaining);
  });
});
