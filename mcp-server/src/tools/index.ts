import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AuthenticatedSystem } from '../auth.js';
import { registerListCollectionsTool } from './list-collections.js';
import { registerListObjectsTool } from './list-objects.js';
import { registerGetObjectTool } from './get-object.js';
import { registerSearchObjectsTool } from './search-objects.js';
import { registerGetRelationshipsTool } from './get-relationships.js';
import { registerGetDashboardHealthTool } from './get-dashboard-health.js';
import { registerGetCollectionSchemaTool } from './get-collection-schema.js';
import { registerCreateObjectTool } from './create-object.js';
import { registerUpdateObjectTool } from './update-object.js';
import { registerCheckStatusTool } from './check-status.js';

export function registerTools(server: McpServer, authSystem?: AuthenticatedSystem): void {
  registerListCollectionsTool(server);
  registerListObjectsTool(server);
  registerGetObjectTool(server);
  registerSearchObjectsTool(server);
  registerGetRelationshipsTool(server);
  registerGetDashboardHealthTool(server);
  registerGetCollectionSchemaTool(server);
  registerCreateObjectTool(server, authSystem);
  registerUpdateObjectTool(server, authSystem);
  registerCheckStatusTool(server);
}
