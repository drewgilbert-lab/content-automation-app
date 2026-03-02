import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerOverviewResource } from './overview.js';
import { registerRelationshipsResource } from './relationships.js';
import { registerCollectionSummariesResource } from './collection-summaries.js';

export function registerResources(server: McpServer): void {
  registerOverviewResource(server);
  registerRelationshipsResource(server);
  registerCollectionSummariesResource(server);
}
