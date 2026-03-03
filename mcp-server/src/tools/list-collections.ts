import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAllCollections } from '../schema.js';

export function registerListCollectionsTool(server: McpServer): void {
  server.tool(
    'list_collections',
    'List all knowledge base collections with object counts and descriptions. Call this first to understand what data is available.',
    {},
    async () => {
      try {
        const collections = getAllCollections();

        const knowledgeModulePath = '../../../lib/knowledge.js';
        const skillsModulePath = '../../../lib/skills.js';
        const knowledgeMod = (await import(knowledgeModulePath)) as {
          listKnowledgeObjectsPaginated: (params?: {
            type?: string;
            limit?: number;
            offset?: number;
          }) => Promise<{ items: unknown[]; total: number }>;
        };
        const skillsMod = (await import(skillsModulePath)) as {
          listSkills: (filters?: Record<string, unknown>) => Promise<unknown[]>;
        };

        const results = await Promise.all(
          collections.map(async (col) => {
            let objectCount = 0;

            if (col.type === 'skill') {
              const skills = await skillsMod.listSkills();
              objectCount = skills.length;
            } else {
              const { total } = await knowledgeMod.listKnowledgeObjectsPaginated({
                type: col.type,
                limit: 1,
                offset: 0,
              });
              objectCount = total;
            }

            return {
              name: col.name,
              type: col.type,
              description: col.description,
              objectCount,
              crossReferences: col.crossReferences.map((ref) => ({
                property: ref.property,
                targetType: ref.targetType,
                label: ref.label,
              })),
            };
          }),
        );

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
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
