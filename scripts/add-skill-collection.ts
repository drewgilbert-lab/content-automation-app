import "dotenv/config";
import weaviate from "weaviate-client";

async function addSkillCollection() {
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

    if (existingNames.has("Skill")) {
      console.log("Skill collection already exists, skipping.");
    } else {
      await client.collections.create({
        name: "Skill",
        properties: [
          { name: "name", dataType: "text" as const },
          { name: "description", dataType: "text" as const },
          { name: "content", dataType: "text" as const },
          { name: "active", dataType: "boolean" as const },
          { name: "contentType", dataType: "text[]" as const },
          { name: "triggerConditions", dataType: "text" as const },
          { name: "parameters", dataType: "text" as const },
          { name: "outputFormat", dataType: "text" as const },
          { name: "version", dataType: "text" as const },
          { name: "previousVersionId", dataType: "text" as const },
          { name: "tags", dataType: "text[]" as const },
          { name: "category", dataType: "text" as const },
          { name: "author", dataType: "text" as const },
          { name: "sourceFile", dataType: "text" as const },
          { name: "deprecated", dataType: "boolean" as const },
          { name: "createdAt", dataType: "date" as const },
          { name: "updatedAt", dataType: "date" as const },
        ],
      });
      console.log("Created Skill collection successfully.");
    }
  } finally {
    await client.close();
  }
}

addSkillCollection();
