import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { isValidType, getCollectionByType, getAllCollections } from '../schema.js';
import { formatCollectionSchema } from '../formatters.js';

export function registerGetCollectionSchemaTool(server: McpServer): void {
  server.tool(
    'get_collection_schema',
    'Get the schema definition for knowledge base collections, including property names, data types, and cross-reference definitions. Useful for understanding data structure.',
    {
      type: z.string().optional(),
    },
    async ({ type }) => {
      try {
        if (type) {
          if (!isValidType(type)) {
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

          const collection = getCollectionByType(type)!;
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(formatCollectionSchema(collection), null, 2),
              },
            ],
          };
        }

        const allCollections = getAllCollections();
        const schemas = allCollections.map((col) => formatCollectionSchema(col));

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(schemas, null, 2),
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
