import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerResources } from '../resources/index.js';

describe('registerResources', () => {
  it('registers all 3 resources on the server', () => {
    const server = new McpServer(
      { name: 'test', version: '1.0.0' },
      { capabilities: { resources: {} } },
    );

    const resourceSpy = vi.spyOn(server, 'resource');

    registerResources(server);

    expect(resourceSpy).toHaveBeenCalledTimes(3);

    const resourceNames = resourceSpy.mock.calls.map((call) => call[0]);
    expect(resourceNames).toContain('overview');
    expect(resourceNames).toContain('relationships');
    expect(resourceNames).toContain('collection-summary');
  });
});
