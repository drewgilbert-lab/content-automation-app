import "dotenv/config";
import weaviate from "weaviate-client";

async function addCollections() {
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

    // ── Competitor ──────────────────────────────────────────────────────────────

    if (existingNames.has("Competitor")) {
      console.log("Competitor collection already exists, skipping.");
    } else {
      await client.collections.create({
        name: "Competitor",
        properties: [
          { name: "name", dataType: "text" as const },
          { name: "content", dataType: "text" as const },
          { name: "website", dataType: "text" as const },
          { name: "tags", dataType: "text[]" as const },
          { name: "sourceFile", dataType: "text" as const },
          { name: "deprecated", dataType: "boolean" as const },
          { name: "createdAt", dataType: "date" as const },
          { name: "updatedAt", dataType: "date" as const },
        ],
      });
      console.log("Created Competitor collection successfully.");
    }

    // ── CustomerEvidence ────────────────────────────────────────────────────────

    if (existingNames.has("CustomerEvidence")) {
      console.log("CustomerEvidence collection already exists, skipping.");
    } else {
      await client.collections.create({
        name: "CustomerEvidence",
        properties: [
          { name: "name", dataType: "text" as const },
          { name: "content", dataType: "text" as const },
          { name: "subType", dataType: "text" as const },
          { name: "customerName", dataType: "text" as const },
          { name: "industry", dataType: "text" as const },
          { name: "tags", dataType: "text[]" as const },
          { name: "sourceFile", dataType: "text" as const },
          { name: "deprecated", dataType: "boolean" as const },
          { name: "createdAt", dataType: "date" as const },
          { name: "updatedAt", dataType: "date" as const },
        ],
      });
      console.log("Created CustomerEvidence collection successfully.");
    }
  } finally {
    await client.close();
  }
}

addCollections();
