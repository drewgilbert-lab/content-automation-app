import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AuthenticatedSystem } from '../auth.js';
import { registerCreateObjectTool } from '../tools/create-object.js';
import { registerUpdateObjectTool } from '../tools/update-object.js';
import { registerCheckStatusTool } from '../tools/check-status.js';

type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

function captureToolHandler(
  server: McpServer,
  registerFn: (server: McpServer, auth?: AuthenticatedSystem) => void,
  authSystem?: AuthenticatedSystem,
): ToolHandler {
  const toolSpy = vi.spyOn(server, 'tool');
  registerFn(server, authSystem);
  const lastCall = toolSpy.mock.calls[toolSpy.mock.calls.length - 1];
  return lastCall[lastCall.length - 1] as ToolHandler;
}

function captureToolSchema(
  server: McpServer,
  registerFn: (server: McpServer, auth?: AuthenticatedSystem) => void,
  authSystem?: AuthenticatedSystem,
): Record<string, unknown> {
  const toolSpy = vi.spyOn(server, 'tool');
  registerFn(server, authSystem);
  const lastCall = toolSpy.mock.calls[toolSpy.mock.calls.length - 1];
  return lastCall[2] as Record<string, unknown>;
}

function makeServer(): McpServer {
  return new McpServer(
    { name: 'test', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );
}

const READ_ONLY_SYSTEM: AuthenticatedSystem = {
  id: 'sys-1',
  name: 'read-only-client',
  description: 'Test client with read only',
  apiKeyPrefix: 'ce_ro',
  permissions: ['mcp-read'],
  subscribedTypes: [],
  rateLimitTier: 'standard',
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const WRITE_SYSTEM: AuthenticatedSystem = {
  id: 'sys-2',
  name: 'write-client',
  description: 'Test client with write access',
  apiKeyPrefix: 'ce_wr',
  permissions: ['mcp-read', 'mcp-write'],
  subscribedTypes: [],
  rateLimitTier: 'standard',
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('create_knowledge_object', () => {
  it('rejects when authSystem lacks mcp-write permission', async () => {
    const handler = captureToolHandler(makeServer(), registerCreateObjectTool, READ_ONLY_SYSTEM);
    const result = await handler({
      objectType: 'persona',
      name: 'Test',
      content: 'Content',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('mcp-write permission');
  });

  it('rejects invalid objectType', async () => {
    const handler = captureToolHandler(makeServer(), registerCreateObjectTool);
    const result = await handler({
      objectType: 'invalid_type',
      name: 'Test',
      content: 'Content',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid objectType');
  });

  it('rejects empty name', async () => {
    const handler = captureToolHandler(makeServer(), registerCreateObjectTool);
    const result = await handler({
      objectType: 'persona',
      name: '  ',
      content: 'Content',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name is required');
  });

  it('rejects empty content', async () => {
    const handler = captureToolHandler(makeServer(), registerCreateObjectTool);
    const result = await handler({
      objectType: 'persona',
      name: 'Test',
      content: '  ',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('content is required');
  });

  it('does not reject with permission error when authSystem is undefined (stdio)', async () => {
    const handler = captureToolHandler(makeServer(), registerCreateObjectTool, undefined);
    const result = await handler({
      objectType: 'persona',
      name: 'Test Persona',
      content: 'Test content',
    });
    expect(result.content[0].text).not.toContain('mcp-write permission');
  });
});

describe('update_knowledge_object', () => {
  it('rejects when authSystem lacks mcp-write permission', async () => {
    const handler = captureToolHandler(makeServer(), registerUpdateObjectTool, READ_ONLY_SYSTEM);
    const result = await handler({
      objectId: 'some-id',
      content: 'Updated content',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('mcp-write permission');
  });

  it('does not reject with permission error when authSystem has mcp-write', async () => {
    const handler = captureToolHandler(makeServer(), registerUpdateObjectTool, WRITE_SYSTEM);
    const result = await handler({
      objectId: 'obj-1',
      content: 'Updated content',
    });
    expect(result.content[0].text).not.toContain('mcp-write permission');
  });
});

describe('check_submission_status', () => {
  it('registers as a tool without requiring authSystem', () => {
    const server = makeServer();
    const toolSpy = vi.spyOn(server, 'tool');
    registerCheckStatusTool(server);
    expect(toolSpy).toHaveBeenCalledTimes(1);
    expect(toolSpy.mock.calls[0][0]).toBe('check_submission_status');
  });
});

describe('tool schemas expose skill contentType fields', () => {
  it('create_knowledge_object schema includes skill fields', () => {
    const schema = captureToolSchema(makeServer(), registerCreateObjectTool);
    expect(schema).toHaveProperty('contentType');
    expect(schema).toHaveProperty('description');
    expect(schema).toHaveProperty('category');
    expect(schema).toHaveProperty('author');
    expect(schema).toHaveProperty('triggerConditions');
    expect(schema).toHaveProperty('parameters');
    expect(schema).toHaveProperty('outputFormat');
  });

  it('update_knowledge_object schema includes skill fields', () => {
    const schema = captureToolSchema(makeServer(), registerUpdateObjectTool);
    expect(schema).toHaveProperty('contentType');
    expect(schema).toHaveProperty('description');
    expect(schema).toHaveProperty('category');
    expect(schema).toHaveProperty('author');
    expect(schema).toHaveProperty('triggerConditions');
    expect(schema).toHaveProperty('parameters');
    expect(schema).toHaveProperty('outputFormat');
  });
});
