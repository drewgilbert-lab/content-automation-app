import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import {
  authenticateRequest,
  hasPermission,
  _setValidateApiKeyForTesting,
  type AuthenticatedSystem,
} from '../auth.js';

const mockValidateApiKey = vi.fn<(key: string) => Promise<AuthenticatedSystem | null>>();

function createMockRequest(headers: Record<string, string> = {}): IncomingMessage {
  const req = new IncomingMessage(new Socket());
  Object.assign(req.headers, headers);
  return req;
}

function createMockSystem(overrides: Partial<AuthenticatedSystem> = {}): AuthenticatedSystem {
  return {
    id: 'sys-001',
    name: 'Test System',
    description: 'A test system',
    apiKeyPrefix: 'ce_test',
    permissions: ['read', 'mcp-read'],
    subscribedTypes: ['messaging', 'positioning'],
    rateLimitTier: 'standard',
    active: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('authenticateRequest', () => {
  beforeEach(() => {
    mockValidateApiKey.mockReset();
    _setValidateApiKeyForTesting(mockValidateApiKey);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const req = createMockRequest();
    const result = await authenticateRequest(req);

    expect(result).toEqual({
      authenticated: false,
      status: 401,
      message: expect.stringContaining('Missing or malformed'),
    });
  });

  it('returns 401 when Authorization header has no Bearer prefix', async () => {
    const req = createMockRequest({ authorization: 'Basic abc123' });
    const result = await authenticateRequest(req);

    expect(result).toEqual({
      authenticated: false,
      status: 401,
      message: expect.stringContaining('Missing or malformed'),
    });
  });

  it('returns 401 when API key is invalid', async () => {
    mockValidateApiKey.mockResolvedValueOnce(null);
    const req = createMockRequest({ authorization: 'Bearer ce_invalid_key' });
    const result = await authenticateRequest(req);

    expect(result).toEqual({
      authenticated: false,
      status: 401,
      message: 'Invalid API key',
    });
    expect(mockValidateApiKey).toHaveBeenCalledWith('ce_invalid_key');
  });

  it('returns 403 when system is inactive', async () => {
    mockValidateApiKey.mockResolvedValueOnce(createMockSystem({ active: false }));
    const req = createMockRequest({ authorization: 'Bearer ce_valid_key' });
    const result = await authenticateRequest(req);

    expect(result).toEqual({
      authenticated: false,
      status: 403,
      message: 'Connected system is deactivated',
    });
  });

  it('returns 403 when system lacks mcp-read permission', async () => {
    mockValidateApiKey.mockResolvedValueOnce(createMockSystem({ permissions: ['read'] }));
    const req = createMockRequest({ authorization: 'Bearer ce_valid_key' });
    const result = await authenticateRequest(req);

    expect(result).toEqual({
      authenticated: false,
      status: 403,
      message: 'Connected system does not have mcp-read permission',
    });
  });

  it('returns authenticated with system for valid key and permissions', async () => {
    const system = createMockSystem();
    mockValidateApiKey.mockResolvedValueOnce(system);
    const req = createMockRequest({ authorization: 'Bearer ce_valid_key' });
    const result = await authenticateRequest(req);

    expect(result).toEqual({ authenticated: true, system });
  });
});

describe('hasPermission', () => {
  it('returns true when system has the permission', () => {
    const system = createMockSystem({ permissions: ['read', 'mcp-read', 'write'] });
    expect(hasPermission(system, 'mcp-read')).toBe(true);
  });

  it('returns false when system lacks the permission', () => {
    const system = createMockSystem({ permissions: ['read'] });
    expect(hasPermission(system, 'mcp-read')).toBe(false);
  });
});
