import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getCollectionByType, isValidType } from '../schema.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerCollectionSummariesResource(server: McpServer): void {
  server.resource(
    'collection-summary',
    new ResourceTemplate('knowledge://collections/{type}', { list: undefined }),
    {
      description: 'Dynamic summary of a specific collection: object count, list of names, and common tags.',
      mimeType: 'application/json',
    },
    async (uri, params) => {
      const type = params.type as string;

      if (!isValidType(type)) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: `Invalid type "${type}"` }),
          }],
        };
      }

      const collection = getCollectionByType(type)!;

      try {
        if (type === 'skill') {
          const skillsPath = '../../lib/skills.js';
          const skillsMod = (await import(skillsPath)) as {
            listSkills: () => Promise<Array<{
              id: string; name: string; tags?: string[]; deprecated?: boolean;
            }>>;
          };

          const skills = await skillsMod.listSkills();
          const active = skills.filter((s) => !s.deprecated);
          const tagCounts = countTags(active.flatMap((s) => s.tags ?? []));

          return {
            contents: [{
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({
                collection: collection.name,
                type: collection.type,
                description: collection.description,
                totalCount: skills.length,
                activeCount: active.length,
                names: active.map((s) => s.name),
                commonTags: tagCounts.slice(0, 10),
              }, null, 2),
            }],
          };
        }

        const knowledgePath = '../../lib/knowledge.js';
        const knowledgeMod = (await import(knowledgePath)) as {
          listKnowledgeObjectsPaginated: (params: {
            type?: string; limit?: number; offset?: number; includeDeprecated?: boolean;
          }) => Promise<{
            items: Array<{ name: string; tags?: string[]; deprecated?: boolean }>;
            total: number;
          }>;
        };

        const { items: allItems, total } = await knowledgeMod.listKnowledgeObjectsPaginated({
          type,
          limit: 500,
          offset: 0,
          includeDeprecated: true,
        });

        const active = allItems.filter((item) => !item.deprecated);
        const tagCounts = countTags(active.flatMap((item) => item.tags ?? []));

        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({
              collection: collection.name,
              type: collection.type,
              description: collection.description,
              totalCount: total,
              activeCount: active.length,
              names: active.map((item) => item.name),
              commonTags: tagCounts.slice(0, 10),
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({
              error: `Failed to load collection summary: ${error instanceof Error ? error.message : String(error)}`,
            }),
          }],
        };
      }
    },
  );
}

function countTags(tags: string[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const tag of tags) {
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
