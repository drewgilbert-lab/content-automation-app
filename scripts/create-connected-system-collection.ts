import "dotenv/config";
import weaviate from "weaviate-client";

async function createConnectedSystemCollection() {
  const url = process.env.WEAVIATE_URL;
  const apiKey = process.env.WEAVIATE_API_KEY;

  if (!url || !apiKey) {
    console.error("Missing WEAVIATE_URL or WEAVIATE_API_KEY");
    process.exit(1);
  }

  const client = await weaviate.connectToWeaviateCloud(url, {
    authCredentials: new weaviate.ApiKey(apiKey),
  });

  try {
    const existing = await client.collections.listAll();
    const existingNames = new Set(existing.map((c: { name: string }) => c.name));

    if (existingNames.has("ConnectedSystem")) {
      console.log("ConnectedSystem collection already exists, skipping.");
    } else {
      await client.collections.create({
        name: "ConnectedSystem",
        properties: [
          { name: "name", dataType: "text" as const },
          { name: "description", dataType: "text" as const },
          { name: "apiKeyHash", dataType: "text" as const },
          { name: "apiKeyPrefix", dataType: "text" as const },
          { name: "permissions", dataType: "text[]" as const },
          { name: "subscribedTypes", dataType: "text[]" as const },
          { name: "rateLimitTier", dataType: "text" as const },
          { name: "active", dataType: "boolean" as const },
          { name: "createdAt", dataType: "date" as const },
          { name: "updatedAt", dataType: "date" as const },
        ],
      });
      console.log("Created ConnectedSystem collection successfully.");
    }
  } finally {
    await client.close();
  }
}

createConnectedSystemCollection();
