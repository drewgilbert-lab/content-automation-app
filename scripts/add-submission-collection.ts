import weaviate from "weaviate-client";

async function addSubmissionCollection() {
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
    const exists = existing.some(
      (c: { name: string }) => c.name === "Submission"
    );

    if (exists) {
      console.log('Submission collection already exists, skipping creation.');
      return;
    }

    await client.collections.create({
      name: "Submission",
      properties: [
        { name: "submitter", dataType: "text" as const },
        { name: "objectType", dataType: "text" as const },
        { name: "objectName", dataType: "text" as const },
        { name: "submissionType", dataType: "text" as const },
        { name: "proposedContent", dataType: "text" as const, skipVectorization: true },
        { name: "targetObjectId", dataType: "text" as const },
        { name: "status", dataType: "text" as const },
        { name: "reviewComment", dataType: "text" as const },
        { name: "reviewNote", dataType: "text" as const },
        { name: "createdAt", dataType: "date" as const },
        { name: "reviewedAt", dataType: "date" as const },
      ],
    });

    console.log("Created Submission collection successfully.");
  } finally {
    await client.close();
  }
}

addSubmissionCollection();
