import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerListCollectionsTool } from './list-collections.js';
import { registerListObjectsTool } from './list-objects.js';
import { registerGetObjectTool } from './get-object.js';
import { registerSearchObjectsTool } from './search-objects.js';
import { registerGetRelationshipsTool } from './get-relationships.js';
import { registerGetDashboardHealthTool } from './get-dashboard-health.js';
import { registerGetCollectionSchemaTool } from './get-collection-schema.js';

export function registerTools(server: McpServer): void {
  registerListCollectionsTool(server);
  registerListObjectsTool(server);
  registerGetObjectTool(server);
  registerSearchObjectsTool(server);
  registerGetRelationshipsTool(server);
  registerGetDashboardHealthTool(server);
  registerGetCollectionSchemaTool(server);
}
