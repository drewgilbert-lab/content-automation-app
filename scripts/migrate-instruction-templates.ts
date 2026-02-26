import "dotenv/config";
import weaviate from "weaviate-client";

const DRY_RUN = process.argv.includes("--dry-run");

async function migrate() {
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
    const existingNames = new Set(
      existing.map((c: { name: string }) => c.name)
    );

    if (!existingNames.has("Skill")) {
      console.error(
        "Skill collection does not exist. Run add-skill-collection.ts first."
      );
      process.exit(1);
    }

    if (!existingNames.has("BusinessRule")) {
      console.error("BusinessRule collection does not exist.");
      process.exit(1);
    }

    const businessRules = client.collections.use("BusinessRule");
    const skills = client.collections.use("Skill");

    const result = await businessRules.query.fetchObjects({
      filters: weaviate.filter
        .byProperty("subType")
        .equal("instruction_template"),
      limit: 100,
    });

    const templates = result.objects;

    if (templates.length === 0) {
      console.log("No instruction_template BusinessRules found. Nothing to migrate.");
      return;
    }

    console.log(
      `Found ${templates.length} instruction_template BusinessRule(s) to migrate.`
    );
    if (DRY_RUN) {
      console.log("[DRY RUN] No changes will be made.\n");
    }

    const migrationMap: Array<{
      name: string;
      oldId: string;
      newId: string;
    }> = [];

    for (const obj of templates) {
      const name = String(obj.properties.name ?? "");
      const content = String(obj.properties.content ?? "");
      const tags = (obj.properties.tags as string[]) ?? [];
      const sourceFile = obj.properties.sourceFile
        ? String(obj.properties.sourceFile)
        : "";

      console.log(`\nMigrating: "${name}" (${obj.uuid})`);
      console.log(`  Content length: ${content.length} chars`);
      console.log(`  Tags: ${tags.length > 0 ? tags.join(", ") : "(none)"}`);

      if (DRY_RUN) {
        console.log("  [DRY RUN] Would create Skill and deprecate BusinessRule");
        migrationMap.push({ name, oldId: obj.uuid, newId: "(dry-run)" });
        continue;
      }

      const existingSkill = await skills.query.fetchObjects({
        filters: weaviate.filter.byProperty("name").equal(name),
        limit: 1,
      });

      if (existingSkill.objects.length > 0) {
        console.log(
          `  SKIP: Skill "${name}" already exists (${existingSkill.objects[0].uuid})`
        );
        migrationMap.push({
          name,
          oldId: obj.uuid,
          newId: existingSkill.objects[0].uuid,
        });
        continue;
      }

      const now = new Date().toISOString();
      const newId = await skills.data.insert({
        name,
        description: `Migrated from BusinessRule instruction_template: ${name}`,
        content,
        active: true,
        contentType: ["internal_doc"],
        version: "1.0.0",
        tags,
        category: "documentation",
        author: "",
        sourceFile,
        deprecated: false,
        createdAt: now,
        updatedAt: now,
      });

      console.log(`  Created Skill: ${newId}`);

      await businessRules.data.update({
        id: obj.uuid,
        properties: {
          deprecated: true,
          updatedAt: now,
        },
      });

      console.log(`  Deprecated BusinessRule: ${obj.uuid}`);

      migrationMap.push({ name, oldId: obj.uuid, newId });
    }

    console.log("\n=== Migration Map ===");
    console.log("BusinessRule UUID → Skill UUID");
    for (const entry of migrationMap) {
      console.log(`  ${entry.name}: ${entry.oldId} → ${entry.newId}`);
    }

    console.log(
      `\nMigration ${DRY_RUN ? "preview" : "complete"}: ${migrationMap.length} template(s) processed.`
    );
  } finally {
    await client.close();
  }
}

migrate();
