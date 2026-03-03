import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { formatDashboardHealth } from '../formatters.js';

export function registerGetDashboardHealthTool(server: McpServer): void {
  server.tool(
    'get_dashboard_health',
    'Get knowledge base health metrics including object counts, stale content, and relationship gaps. Use this to assess overall knowledge base quality.',
    {},
    async () => {
      try {
        const modulePath = '../../../lib/dashboard.js';
        const mod = (await import(modulePath)) as {
          getDashboardData: () => Promise<unknown>;
        };

        const data = await mod.getDashboardData();
        const formatted = formatDashboardHealth(data as Parameters<typeof formatDashboardHealth>[0]);

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
