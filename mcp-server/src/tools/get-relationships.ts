import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { formatRelationships } from '../formatters.js';

interface CrossReference {
  id: string;
  name: string;
  type: string;
}

interface KnowledgeDetail {
  id: string;
  name: string;
  type: string;
  crossReferences?: Record<string, CrossReference[]>;
  [key: string]: unknown;
}

export function registerGetRelationshipsTool(server: McpServer): void {
  server.tool(
    'get_relationships',
    'Get all outbound and inbound relationships for a knowledge object. Shows how objects are connected across collections.',
    {
      id: z.string(),
    },
    async ({ id }) => {
      try {
        const knowledgePath = '../../lib/knowledge.js';
        const knowledgeMod = (await import(knowledgePath)) as {
          getKnowledgeObject: (id: string) => Promise<KnowledgeDetail | null>;
          getInboundReferences: (
            objectId: string,
            objectType: string,
          ) => Promise<Record<string, CrossReference[]>>;
        };

        const detail = await knowledgeMod.getKnowledgeObject(id);
        if (!detail) {
          return {
            content: [{ type: 'text' as const, text: `Error: Object with id "${id}" not found.` }],
            isError: true,
          };
        }

        const outbound = detail.crossReferences ?? {};
        const inbound = await knowledgeMod.getInboundReferences(id, detail.type);

        const formatted = formatRelationships(id, detail.name, detail.type, outbound, inbound);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(formatted, null, 2),
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
