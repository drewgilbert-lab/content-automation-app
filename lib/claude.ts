import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable.");
  }

  client = new Anthropic({ apiKey });
  return client;
}

export async function streamMessage(
  systemPrompt: string,
  userMessage: string
): Promise<ReadableStream<Uint8Array>> {
  const anthropic = getClient();

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
    cancel() {
      stream.abort();
    },
  });
}

export async function checkClaudeConnection(): Promise<boolean> {
  try {
    const anthropic = getClient();
    await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 10,
      messages: [{ role: "user", content: "ping" }],
    });
    return true;
  } catch {
    return false;
  }
}
