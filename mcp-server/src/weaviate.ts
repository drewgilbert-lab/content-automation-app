import weaviate, { WeaviateClient } from "weaviate-client";

let client: WeaviateClient | null = null;

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS = [1000, 2000, 4000, 8000];

function getConfig(): { url: string; apiKey: string } {
  const url = process.env.WEAVIATE_URL;
  const apiKey = process.env.WEAVIATE_MCP_API_KEY ?? process.env.WEAVIATE_API_KEY;

  if (!url) {
    throw new Error(
      "Missing WEAVIATE_URL environment variable. Set it to your Weaviate Cloud instance URL."
    );
  }
  if (!apiKey) {
    throw new Error(
      "Missing Weaviate API key. Set WEAVIATE_MCP_API_KEY or WEAVIATE_API_KEY."
    );
  }

  return { url, apiKey };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestamp(): string {
  return new Date().toISOString();
}

export async function initializeClient(): Promise<void> {
  const { url, apiKey } = getConfig();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.error(
        `[${timestamp()}] Weaviate connection attempt ${attempt}/${MAX_ATTEMPTS}...`
      );
      client = await weaviate.connectToWeaviateCloud(url, {
        authCredentials: new weaviate.ApiKey(apiKey),
      });
      console.error(`[${timestamp()}] Weaviate connected successfully.`);
      return;
    } catch (error) {
      const isLastAttempt = attempt === MAX_ATTEMPTS;

      if (isLastAttempt) {
        console.error(
          `[${timestamp()}] Weaviate connection failed after ${MAX_ATTEMPTS} attempts.`,
          error
        );
        client = null;
        throw new Error(
          `Failed to connect to Weaviate after ${MAX_ATTEMPTS} attempts: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      const delay = RETRY_DELAYS[attempt - 1]!;
      console.error(
        `[${timestamp()}] Weaviate connection attempt ${attempt} failed. Retrying in ${delay}ms...`,
        error instanceof Error ? error.message : error
      );
      await sleep(delay);
    }
  }
}

export function getClient(): WeaviateClient {
  if (!client) {
    throw new Error(
      "Weaviate client is not initialized. Call initializeClient() before using getClient()."
    );
  }
  return client;
}

export async function reconnect(): Promise<void> {
  console.error(`[${timestamp()}] Reconnecting to Weaviate...`);
  if (client) {
    try {
      await client.close();
    } catch (error) {
      console.error(
        `[${timestamp()}] Error closing existing Weaviate client during reconnect:`,
        error instanceof Error ? error.message : error
      );
    }
    client = null;
  }
  await initializeClient();
}

export async function closeClient(): Promise<void> {
  if (client) {
    console.error(`[${timestamp()}] Closing Weaviate client connection...`);
    await client.close();
    client = null;
    console.error(`[${timestamp()}] Weaviate client closed.`);
  }
}

export async function checkHealth(): Promise<boolean> {
  if (!client) return false;
  try {
    return await client.isReady();
  } catch {
    return false;
  }
}
