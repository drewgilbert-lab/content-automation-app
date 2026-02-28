import { getConnectedSystem } from "@/lib/connections";
import { generateApiKey, invalidateApiKeyCache } from "@/lib/api-auth";
import { withWeaviate } from "@/lib/weaviate";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const system = await getConnectedSystem(id);

    if (!system) {
      return new Response(
        JSON.stringify({ error: "Connected system not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const { plaintextKey, hash, prefix } = generateApiKey();

    await withWeaviate(async (client) => {
      const collection = client.collections.use("ConnectedSystem");
      await collection.data.update({
        id,
        properties: {
          apiKeyHash: hash,
          apiKeyPrefix: prefix,
          updatedAt: new Date().toISOString(),
        },
      });
    });

    invalidateApiKeyCache();

    return new Response(
      JSON.stringify({
        id,
        name: system.name,
        apiKey: plaintextKey,
        apiKeyPrefix: prefix,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Connected system rotate key API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to rotate API key" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
