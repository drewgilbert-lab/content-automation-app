import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from '../tools/index.js';

describe('registerTools', () => {
  it('registers all 7 tools on the server', () => {
    const server = new McpServer(
      { name: 'test', version: '1.0.0' },
      { capabilities: { tools: {} } },
    );

    const toolSpy = vi.spyOn(server, 'tool');

    registerTools(server);

    expect(toolSpy).toHaveBeenCalledTimes(7);

    const toolNames = toolSpy.mock.calls.map((call) => call[0]);
    expect(toolNames).toContain('list_collections');
    expect(toolNames).toContain('list_objects');
    expect(toolNames).toContain('get_object');
    expect(toolNames).toContain('search_objects');
    expect(toolNames).toContain('get_relationships');
    expect(toolNames).toContain('get_dashboard_health');
    expect(toolNames).toContain('get_collection_schema');
  });
});
