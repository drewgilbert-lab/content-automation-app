import { checkWeaviateConnection } from "@/lib/weaviate";
import { getDashboardData } from "@/lib/dashboard";

export const runtime = "nodejs";

export async function GET() {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
    "X-Frame-Options": "DENY",
  };

  try {
    const [connected, dashboard] = await Promise.allSettled([
      checkWeaviateConnection(),
      getDashboardData(),
    ]);

    const weaviateConnected =
      connected.status === "fulfilled" && connected.value === true;

    const collections =
      dashboard.status === "fulfilled" ? dashboard.value.counts : undefined;

    return Response.json(
      {
        status: weaviateConnected ? "ok" : "degraded",
        version: "1",
        weaviate: { connected: weaviateConnected },
        ...(collections ? { collections } : {}),
        timestamp: new Date().toISOString(),
      },
      { headers }
    );
  } catch {
    return Response.json(
      {
        status: "degraded",
        version: "1",
        weaviate: { connected: false },
        timestamp: new Date().toISOString(),
      },
      { headers }
    );
  }
}
