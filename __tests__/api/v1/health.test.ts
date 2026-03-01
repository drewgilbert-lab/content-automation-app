import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/weaviate", () => ({
  checkWeaviateConnection: vi.fn(),
}));

vi.mock("@/lib/dashboard", () => ({
  getDashboardData: vi.fn(),
}));

import { GET } from "@/app/api/v1/health/route";
import { checkWeaviateConnection } from "@/lib/weaviate";
import { getDashboardData } from "@/lib/dashboard";

const mockedCheckConnection = vi.mocked(checkWeaviateConnection);
const mockedGetDashboard = vi.mocked(getDashboardData);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/health", () => {
  it("returns 200 with status ok when connected", async () => {
    mockedCheckConnection.mockResolvedValue(true);
    mockedGetDashboard.mockResolvedValue({
      counts: { persona: 3, segment: 1, use_case: 0, business_rule: 0, icp: 0, competitor: 0, customer_evidence: 0 },
      totalCount: 4,
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("ok");
    expect(json.weaviate.connected).toBe(true);
    expect(json.collections).toBeDefined();
    expect(json.timestamp).toBeTruthy();
  });

  it("returns degraded when Weaviate is down", async () => {
    mockedCheckConnection.mockRejectedValue(new Error("connection failed"));
    mockedGetDashboard.mockRejectedValue(new Error("no data"));

    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("degraded");
    expect(json.weaviate.connected).toBe(false);
  });

  it("includes security headers", async () => {
    mockedCheckConnection.mockResolvedValue(true);
    mockedGetDashboard.mockResolvedValue({ counts: {}, totalCount: 0 } as never);

    const res = await GET();
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("does NOT require X-API-Key", async () => {
    mockedCheckConnection.mockResolvedValue(true);
    mockedGetDashboard.mockResolvedValue({ counts: {}, totalCount: 0 } as never);

    // No API key header — should still succeed (no withApiAuth)
    const res = await GET();
    expect(res.status).toBe(200);
  });
});
