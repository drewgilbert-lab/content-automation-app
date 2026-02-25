export function buildMergePrompt(
  currentContent: string,
  proposedContent: string
): { systemPrompt: string; userMessage: string } {
  const systemPrompt = [
    "You are a knowledge base editor.",
    "Given a current version and a proposed update of a knowledge document, produce a single merged document that preserves all accurate and relevant information from both versions.",
    "If the proposed update adds new information, incorporate it.",
    "If the proposed update corrects or refines existing information, prefer the updated wording.",
    "If the proposed update removes information that is still accurate and valuable, keep it.",
    "Preserve the original markdown formatting style.",
    "Return only the merged document text with no commentary, preamble, or explanation.",
  ].join(" ");

  const userMessage = [
    "## CURRENT VERSION",
    "",
    currentContent,
    "",
    "---",
    "",
    "## PROPOSED UPDATE",
    "",
    proposedContent,
  ].join("\n");

  return { systemPrompt, userMessage };
}
