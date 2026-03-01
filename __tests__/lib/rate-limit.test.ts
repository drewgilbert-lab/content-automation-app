import { describe, it, expect, vi, beforeEach } from "vitest";

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

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("checkRateLimit", () => {
  it("returns success when Upstash env vars are not set", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("prefix", "standard", false);

    expect(result.success).toBe(true);
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it("returns success for standard tier within limits", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";

    mockLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60000,
    });

    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("prefix", "standard", false);

    expect(result.success).toBe(true);
    expect(result.limit).toBe(100);
  });

  it("returns failure when rate limit exceeded", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";

    mockLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = await checkRateLimit("prefix", "standard", false);

    expect(result.success).toBe(false);
  });

  it("checks search limiter when isSearch is true", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";

    mockLimit.mockResolvedValue({
      success: true,
      remaining: 19,
      reset: Date.now() + 60000,
    });

    const { checkRateLimit } = await import("@/lib/rate-limit");
    await checkRateLimit("prefix", "standard", true);

    // Search calls limiter twice: once for search, once for standard
    expect(mockLimit).toHaveBeenCalledTimes(2);
    expect(mockLimit).toHaveBeenCalledWith("search:prefix");
  });
});
