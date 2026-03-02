import type { IncomingMessage } from 'node:http';

/** Mirrors ConnectedSystemDetail from lib/connection-types.ts */
export interface AuthenticatedSystem {
  id: string;
  name: string;
  description: string;
  apiKeyPrefix: string;
  permissions: string[];
  subscribedTypes: string[];
  rateLimitTier: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AuthResult =
  | { authenticated: true; system: AuthenticatedSystem }
  | { authenticated: false; status: number; message: string };

type ValidateApiKeyFn = (key: string) => Promise<AuthenticatedSystem | null>;

let _validateApiKey: ValidateApiKeyFn | null = null;

async function loadValidateApiKey(): Promise<ValidateApiKeyFn> {
  if (!_validateApiKey) {
    // Dynamic expression import avoids TypeScript rootDir resolution
    // while correctly resolving at runtime to lib/api-auth.js
    const modulePath = '../../lib/api-auth.js';
    const mod = (await import(modulePath)) as {
      validateApiKey: ValidateApiKeyFn;
    };
    _validateApiKey = mod.validateApiKey;
  }
  return _validateApiKey;
}

export async function authenticateRequest(
  req: IncomingMessage
): Promise<AuthResult> {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      status: 401,
      message:
        'Missing or malformed Authorization header. Use: Authorization: Bearer <api-key>',
    };
  }

  const apiKey = authHeader.slice(7);
  const validateApiKey = await loadValidateApiKey();
  const system = await validateApiKey(apiKey);

  if (!system) {
    return { authenticated: false, status: 401, message: 'Invalid API key' };
  }

  if (!system.active) {
    return {
      authenticated: false,
      status: 403,
      message: 'Connected system is deactivated',
    };
  }

  if (!hasPermission(system, 'mcp-read')) {
    return {
      authenticated: false,
      status: 403,
      message: 'Connected system does not have mcp-read permission',
    };
  }

  return { authenticated: true, system };
}

export function hasPermission(
  system: AuthenticatedSystem,
  permission: string
): boolean {
  return system.permissions.includes(permission);
}

/** @internal — test-only injection point; not part of public API */
export function _setValidateApiKeyForTesting(fn: ValidateApiKeyFn | null): void {
  _validateApiKey = fn;
}
