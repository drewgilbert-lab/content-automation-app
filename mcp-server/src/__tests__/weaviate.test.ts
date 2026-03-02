import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockClose = vi.fn().mockResolvedValue(undefined);
const mockIsReady = vi.fn().mockResolvedValue(true);

const mockClient = {
  close: mockClose,
  isReady: mockIsReady,
};

const mockConnectToWeaviateCloud = vi.fn();

vi.mock('weaviate-client', () => {
  return {
    default: {
      connectToWeaviateCloud: mockConnectToWeaviateCloud,
      ApiKey: class ApiKey {
        constructor(public key: string) {}
      },
    },
  };
});

let initializeClient: typeof import('../weaviate.js').initializeClient;
let getClient: typeof import('../weaviate.js').getClient;
let closeClient: typeof import('../weaviate.js').closeClient;
let checkHealth: typeof import('../weaviate.js').checkHealth;

async function freshImport() {
  vi.resetModules();
  // Re-apply the mock after resetModules
  vi.doMock('weaviate-client', () => ({
    default: {
      connectToWeaviateCloud: mockConnectToWeaviateCloud,
      ApiKey: class ApiKey {
        constructor(public key: string) {}
      },
    },
  }));
  const mod = await import('../weaviate.js');
  initializeClient = mod.initializeClient;
  getClient = mod.getClient;
  closeClient = mod.closeClient;
  checkHealth = mod.checkHealth;
}

describe('weaviate connection management', () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    process.env.WEAVIATE_URL = 'https://test.weaviate.network';
    process.env.WEAVIATE_API_KEY = 'test-api-key';
    mockConnectToWeaviateCloud.mockReset();
    mockClose.mockReset().mockResolvedValue(undefined);
    mockIsReady.mockReset().mockResolvedValue(true);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await freshImport();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('getClient() throws when uninitialized', () => {
    expect(() => getClient()).toThrow('Weaviate client is not initialized');
  });

  it('checkHealth() returns false when uninitialized', async () => {
    const result = await checkHealth();
    expect(result).toBe(false);
  });

  it('initializeClient() throws on missing WEAVIATE_URL', async () => {
    delete process.env.WEAVIATE_URL;
    await expect(initializeClient()).rejects.toThrow('Missing WEAVIATE_URL');
  });

  it('initializeClient() throws on missing API key', async () => {
    delete process.env.WEAVIATE_API_KEY;
    delete process.env.WEAVIATE_MCP_API_KEY;
    await expect(initializeClient()).rejects.toThrow('Missing Weaviate API key');
  });

  it('initializeClient() connects successfully', async () => {
    mockConnectToWeaviateCloud.mockResolvedValueOnce(mockClient);

    await initializeClient();

    expect(mockConnectToWeaviateCloud).toHaveBeenCalledOnce();
    expect(mockConnectToWeaviateCloud).toHaveBeenCalledWith(
      'https://test.weaviate.network',
      expect.objectContaining({ authCredentials: expect.anything() }),
    );
    expect(getClient()).toBe(mockClient);
  });

  it('initializeClient() retries on failure then succeeds', async () => {
    // Speed up by mocking timers
    vi.useFakeTimers();

    mockConnectToWeaviateCloud
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(mockClient);

    const initPromise = initializeClient();

    // Advance through the retry delays (1000ms, 2000ms)
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    await initPromise;

    expect(mockConnectToWeaviateCloud).toHaveBeenCalledTimes(3);
    expect(getClient()).toBe(mockClient);

    vi.useRealTimers();
  });

  it('closeClient() nulls the client', async () => {
    mockConnectToWeaviateCloud.mockResolvedValueOnce(mockClient);
    await initializeClient();
    expect(getClient()).toBe(mockClient);

    await closeClient();

    expect(mockClose).toHaveBeenCalledOnce();
    expect(() => getClient()).toThrow('Weaviate client is not initialized');
  });
});
