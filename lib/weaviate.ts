import weaviate, { WeaviateClient } from "weaviate-client";

export type KnowledgeObject = {
  name: string;
  type: "persona" | "segment" | "use_case" | "icp" | "business_rule";
  content: string;
  tags?: string[];
};

/**
 * Serverless-safe Weaviate client factory.
 * Creates a fresh connection, runs the provided function, then always closes
 * the connection — even on error. This prevents resource leaks in Vercel's
 * stateless serverless environment where persistent singletons are unreliable.
 */
export async function withWeaviate<T>(
  fn: (client: WeaviateClient) => Promise<T>
): Promise<T> {
  const url = process.env.WEAVIATE_URL;
  const apiKey = process.env.WEAVIATE_API_KEY;

  if (!url || !apiKey) {
    throw new Error(
      "Missing Weaviate environment variables. Check WEAVIATE_URL and WEAVIATE_API_KEY."
    );
  }

  const client = await weaviate.connectToWeaviateCloud(url, {
    authCredentials: new weaviate.ApiKey(apiKey),
  });

  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

export async function checkWeaviateConnection(): Promise<boolean> {
  try {
    return await withWeaviate((client) => client.isReady());
  } catch {
    return false;
  }
}
