import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { formatSearchResult } from '../formatters.js';
import { isValidType } from '../schema.js';

export function registerSearchObjectsTool(server: McpServer): void {
  server.tool(
    'search_objects',
    'Semantic search across the knowledge base using natural language. Returns results ranked by relevance. This is the primary way to find knowledge objects related to a topic.',
    {
      query: z.string(),
      type: z.string().optional(),
      limit: z.number().optional().default(10),
      certaintyThreshold: z.number().optional().default(0.5),
    },
    async ({ query, type, limit, certaintyThreshold }) => {
      try {
        if (type && !isValidType(type)) {
          return {
            content: [{ type: 'text' as const, text: `Error: Invalid type "${type}". Use a valid KnowledgeType.` }],
            isError: true,
          };
        }

        const clampedLimit = Math.min(limit, 25);

        const modulePath = '../../lib/knowledge.js';
        const mod = (await import(modulePath)) as {
          semanticSearchKnowledge: (params: {
            q: string;
            type?: string;
            limit?: number;
            certainty?: number;
          }) => Promise<Array<{ id: string; name: string; type: string; tags?: string[]; score: number; snippet: string }>>;
        };

        const results = await mod.semanticSearchKnowledge({
          q: query,
          type,
          limit: clampedLimit,
          certainty: certaintyThreshold,
        });

        const formatted = results.map(formatSearchResult);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ results: formatted, query, resultCount: formatted.length }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );
}
