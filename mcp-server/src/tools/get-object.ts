import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { formatDetail } from '../formatters.js';

export function registerGetObjectTool(server: McpServer): void {
  server.tool(
    'get_object',
    'Get full details of a single knowledge object or skill by ID. Returns complete content, metadata, and cross-references.',
    {
      id: z.string(),
    },
    async ({ id }) => {
      try {
        const knowledgeModulePath = '../../lib/knowledge.js';
        const knowledgeMod = (await import(knowledgeModulePath)) as {
          getKnowledgeObject: (id: string) => Promise<Record<string, unknown> | null>;
        };

        const knowledgeObj = await knowledgeMod.getKnowledgeObject(id);
        if (knowledgeObj) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(formatDetail(knowledgeObj as Parameters<typeof formatDetail>[0]), null, 2),
              },
            ],
          };
        }

        const skillsModulePath = '../../lib/skills.js';
        const skillsMod = (await import(skillsModulePath)) as {
          getSkill: (id: string) => Promise<Record<string, unknown> | null>;
        };

        const skillObj = await skillsMod.getSkill(id);
        if (skillObj) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(formatDetail({ ...skillObj, type: (skillObj.type as string) ?? 'skill' } as Parameters<typeof formatDetail>[0]), null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: No object found with ID "${id}". Verify the ID using list_objects.`,
            },
          ],
          isError: true,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
