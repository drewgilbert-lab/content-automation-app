import { config } from "dotenv";
config({ path: ".env.local" });
import weaviate from "weaviate-client";

const WEAVIATE_URL = process.env.WEAVIATE_URL!;
const WEAVIATE_API_KEY = process.env.WEAVIATE_API_KEY!;

if (!WEAVIATE_URL || !WEAVIATE_API_KEY) {
  console.error("Missing WEAVIATE_URL or WEAVIATE_API_KEY in .env.local");
  process.exit(1);
}

const COLLECTIONS_TO_CLEAR = [
  "Persona",
  "Segment",
  "UseCase",
  "BusinessRule",
  "ICP",
  "Competitor",
  "CustomerEvidence",
  "Skill",
  "GeneratedContent",
  "Submission",
];

const COLLECTIONS_TO_KEEP = ["User", "PermissionSet", "AuditLog", "ConnectedSystem"];

async function main() {
  console.log("Connecting to Weaviate...");
  const client = await weaviate.connectToWeaviateCloud(WEAVIATE_URL, {
    authCredentials: new weaviate.ApiKey(WEAVIATE_API_KEY),
  });

  console.log("Connected.\n");
  console.log(`Will CLEAR objects from: ${COLLECTIONS_TO_CLEAR.join(", ")}`);
  console.log(`Will KEEP untouched:     ${COLLECTIONS_TO_KEEP.join(", ")}\n`);

  for (const name of COLLECTIONS_TO_CLEAR) {
    try {
      const exists = await client.collections.exists(name);
      if (!exists) {
        console.log(`  [SKIP] ${name} — collection does not exist`);
        continue;
      }

      const collection = client.collections.use(name);
      const before = await collection.query.fetchObjects({ limit: 1 });
      const countResult = await collection.aggregate.overAll();
      const count = countResult.totalCount ?? 0;

      if (count === 0 && before.objects.length === 0) {
        console.log(`  [SKIP] ${name} — already empty`);
        continue;
      }

      console.log(`  [DEL]  ${name} — deleting ~${count} objects...`);

      // Delete in batches by fetching IDs and removing individually
      let deleted = 0;
      let batch = await collection.query.fetchObjects({ limit: 500 });
      while (batch.objects.length > 0) {
        for (const obj of batch.objects) {
          await collection.data.deleteById(obj.uuid);
          deleted++;
        }
        batch = await collection.query.fetchObjects({ limit: 500 });
      }
      console.log(`    Deleted ${deleted} objects`);

      const afterFinal = await collection.aggregate.overAll();
      console.log(`    Done — ${afterFinal.totalCount ?? 0} objects remaining`);
    } catch (err) {
      console.error(`  [ERR]  ${name} — ${err}`);
    }
  }

  console.log("\nVerifying kept collections:");
  for (const name of COLLECTIONS_TO_KEEP) {
    try {
      const exists = await client.collections.exists(name);
      if (!exists) {
        console.log(`  ${name} — does not exist`);
        continue;
      }
      const countResult = await client.collections.use(name).aggregate.overAll();
      console.log(`  ${name} — ${countResult.totalCount ?? 0} objects (untouched)`);
    } catch (err) {
      console.error(`  ${name} — error checking: ${err}`);
    }
  }

  await client.close();
  console.log("\nDone. All test data collections cleared.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
