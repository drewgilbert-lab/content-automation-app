import weaviate from "weaviate-client";

const COLLECTION = "GeneratedContent";

const NEW_PROPERTIES = [
  { name: "tags", dataType: "text[]" as const },
  { name: "sourceChannel", dataType: "text" as const },
  { name: "sourceAppId", dataType: "text" as const },
  { name: "sourceDescription", dataType: "text" as const },
  { name: "reviewComment", dataType: "text" as const },
  { name: "reviewedBy", dataType: "text" as const },
  { name: "reviewedAt", dataType: "date" as const },
  { name: "createdBy", dataType: "text" as const },
  { name: "updatedBy", dataType: "text" as const },
] as const;

const USED_SKILLS_REF = {
  name: "usedSkills",
  targetCollection: "Skill",
} as const;

async function migrateGeneratedContentSchema() {
  const url = process.env.WEAVIATE_URL;
  const apiKey = process.env.WEAVIATE_API_KEY;

  if (!url || !apiKey) {
    console.error("Missing WEAVIATE_URL or WEAVIATE_API_KEY");
    process.exit(1);
  }

  const client = await weaviate.connectToWeaviateCloud(url, {
    authCredentials: new weaviate.ApiKey(apiKey),
  });

  let propertiesAdded = 0;
  let propertiesSkipped = 0;
  let propertiesFailed = 0;
  let referenceOutcome: "added" | "skipped" | "failed" = "skipped";

  try {
    const collection = client.collections.use(COLLECTION);

    for (const prop of NEW_PROPERTIES) {
      try {
        const config = await collection.config.get();
        const exists = config.properties.some((p) => p.name === prop.name);

        if (exists) {
          console.log(`  ${COLLECTION}: "${prop.name}" property already exists, skipping`);
          propertiesSkipped++;
          continue;
        }

        await collection.config.addProperty({
          name: prop.name,
          dataType: prop.dataType,
        });
        console.log(`  ${COLLECTION}: added "${prop.name}" (${prop.dataType}) property`);
        propertiesAdded++;
      } catch (err) {
        console.error(`  ${COLLECTION}: failed to add "${prop.name}" —`, err);
        propertiesFailed++;
      }
    }

    try {
      const config = await collection.config.get();
      const refs = config.references ?? [];
      const hasUsedSkills = refs.some((r) => r.name === USED_SKILLS_REF.name);

      if (hasUsedSkills) {
        console.log(
          `  ${COLLECTION}: "${USED_SKILLS_REF.name}" cross-reference already exists, skipping`
        );
        referenceOutcome = "skipped";
      } else {
        await collection.config.addReference({
          name: USED_SKILLS_REF.name,
          targetCollection: USED_SKILLS_REF.targetCollection,
        });
        console.log(
          `  ${COLLECTION}: added "${USED_SKILLS_REF.name}" → ${USED_SKILLS_REF.targetCollection} cross-reference`
        );
        referenceOutcome = "added";
      }
    } catch (err) {
      console.error(`  ${COLLECTION}: failed to add cross-reference —`, err);
      referenceOutcome = "failed";
    }

    console.log("\nSummary:");
    console.log(`  Properties added: ${propertiesAdded}`);
    console.log(`  Properties skipped (already present): ${propertiesSkipped}`);
    if (propertiesFailed > 0) {
      console.log(`  Properties failed: ${propertiesFailed}`);
    }
    console.log(
      `  Cross-reference ${USED_SKILLS_REF.name}: ${referenceOutcome === "added" ? "added" : referenceOutcome === "skipped" ? "skipped (already present)" : "failed"}`
    );
    console.log("\nDone.");
  } finally {
    await client.close();
  }
}

migrateGeneratedContentSchema();
