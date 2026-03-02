import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { isValidType } from '../schema.js';
import { formatListItem } from '../formatters.js';

export function registerListObjectsTool(server: McpServer): void {
  server.tool(
    'list_objects',
    'List knowledge objects with optional type filtering and pagination. Use to browse objects before retrieving full details.',
    {
      type: z.string().optional(),
      includeDeprecated: z.boolean().optional().default(false),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    },
    async ({ type, includeDeprecated, limit, offset }) => {
      try {
        if (type && !isValidType(type)) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: Invalid type "${type}". Use list_collections to see available types.`,
              },
            ],
            isError: true,
          };
        }

        const clampedLimit = Math.min(limit, 200);

        if (type === 'skill') {
          const skillsModulePath = '../../lib/skills.js';
          const skillsMod = (await import(skillsModulePath)) as {
            listSkills: (filters?: Record<string, unknown>) => Promise<Array<{
              id: string; name: string; type?: string; tags?: string[];
              deprecated?: boolean; createdAt?: string; updatedAt?: string;
              [key: string]: unknown;
            }>>;
          };

          const allSkills = await skillsMod.listSkills();
          const filtered = includeDeprecated
            ? allSkills
            : allSkills.filter((s) => !s.deprecated);
          const page = filtered.slice(offset, offset + clampedLimit);

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    objects: page.map((s) => formatListItem({ ...s, type: s.type ?? 'skill' })),
                    total: filtered.length,
                    limit: clampedLimit,
                    offset,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        const knowledgeModulePath = '../../lib/knowledge.js';
        const knowledgeMod = (await import(knowledgeModulePath)) as {
          listKnowledgeObjectsPaginated: (params?: {
            type?: string;
            limit?: number;
            offset?: number;
            includeDeprecated?: boolean;
          }) => Promise<{ items: Array<{
            id: string; name: string; type?: string; tags?: string[];
            deprecated?: boolean; createdAt?: string; updatedAt?: string;
          }>; total: number }>;
        };

        const { items, total } = await knowledgeMod.listKnowledgeObjectsPaginated({
          type,
          limit: clampedLimit,
          offset,
          includeDeprecated,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  objects: items.map((item) => formatListItem(item)),
                  total,
                  limit: clampedLimit,
                  offset,
                },
                null,
                2,
              ),
            },
          ],
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
