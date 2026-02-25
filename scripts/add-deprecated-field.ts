import weaviate from "weaviate-client";

const COLLECTIONS = ["Persona", "Segment", "UseCase", "BusinessRule", "ICP"];

async function addDeprecatedField() {
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
    for (const name of COLLECTIONS) {
      try {
        const collection = client.collections.use(name);
        const config = await collection.config.get();
        const hasDeprecated = config.properties.some(
          (p) => p.name === "deprecated"
        );

        if (hasDeprecated) {
          console.log(`  ${name}: "deprecated" property already exists, skipping`);
          continue;
        }

        await collection.config.addProperty({
          name: "deprecated",
          dataType: "boolean" as const,
        });
        console.log(`  ${name}: added "deprecated" boolean property`);
      } catch (err) {
        console.error(`  ${name}: failed —`, err);
      }
    }

    console.log("\nDone.");
  } finally {
    await client.close();
  }
}

addDeprecatedField();
