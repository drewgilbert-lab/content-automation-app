import { describe, it, expect } from 'vitest';

describe('module exports — weaviate', () => {
  it('exports initializeClient, getClient, closeClient, checkHealth, reconnect', async () => {
    const mod = await import('../weaviate.js');
    expect(mod.initializeClient).toBeTypeOf('function');
    expect(mod.getClient).toBeTypeOf('function');
    expect(mod.closeClient).toBeTypeOf('function');
    expect(mod.checkHealth).toBeTypeOf('function');
    expect(mod.reconnect).toBeTypeOf('function');
  });
});

describe('module exports — auth', () => {
  it('exports authenticateRequest and hasPermission', async () => {
    const mod = await import('../auth.js');
    expect(mod.authenticateRequest).toBeTypeOf('function');
    expect(mod.hasPermission).toBeTypeOf('function');
  });
});
