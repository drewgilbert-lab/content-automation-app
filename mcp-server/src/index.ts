import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { initializeClient, closeClient, checkHealth } from './weaviate.js';
import { authenticateRequest } from './auth.js';
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';

type TransportType = 'stdio' | 'http';

function parseArgs(): { transport: TransportType; port: number } {
  const args = process.argv.slice(2);
  let transport: TransportType = (process.env.TRANSPORT as TransportType) || 'stdio';
  let port = parseInt(process.env.PORT || '3100', 10);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--transport' && args[i + 1]) {
      transport = args[++i] as TransportType;
    } else if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[++i], 10);
    }
  }

  if (transport !== 'stdio' && transport !== 'http') {
    throw new Error(`Invalid transport "${transport}". Must be "stdio" or "http".`);
  }
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port "${port}". Must be 1–65535.`);
  }

  return { transport, port };
}

// Mutable so we can redirect to stderr in stdio mode before anything logs
let log: (...args: unknown[]) => void = console.log;

/**
 * Factory for McpServer instances. Each HTTP session gets its own server.
 * Tool/resource/prompt registration goes here (J5).
 */
function createServer(): McpServer {
  const server = new McpServer(
    { name: 'content-engine', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {}, logging: {} } },
  );

  registerTools(server);
  registerResources(server);

  return server;
}

// ── stdio ──────────────────────────────────────────────────────────────

async function startStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('Content Engine MCP Server running on stdio');
}

// ── HTTP (Streamable HTTP) ─────────────────────────────────────────────

async function startHttp(port: number): Promise<void> {
  const app = express();

  // CORS — must come before routes so preflight OPTIONS are handled
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Mcp-Session-Id',
    );
    if (_req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json());

  // Health probe (Railway / load-balancer)
  app.get('/health', async (_req, res) => {
    const healthy = await checkHealth();
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      transport: 'http',
      timestamp: new Date().toISOString(),
    });
  });

  // ── session management ──
  const transports = new Map<string, StreamableHTTPServerTransport>();

  // POST /mcp — primary MCP request handler
  app.post('/mcp', async (req, res) => {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      res.status(authResult.status).json({ error: authResult.message });
      return;
    }

    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports.has(sessionId)) {
      transport = transports.get(sessionId)!;
    } else if (!sessionId) {
      const newSessionId = randomUUID();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
      });
      transports.set(newSessionId, transport);

      const sessionServer = createServer();
      await sessionServer.connect(transport);

      transport.onclose = () => {
        transports.delete(newSessionId);
      };
    } else {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  });

  // GET /mcp — SSE stream for server-initiated messages
  app.get('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({ error: 'Invalid or missing session ID' });
      return;
    }
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  // DELETE /mcp — terminate a session
  app.delete('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.close();
      transports.delete(sessionId);
    }
    res.status(200).json({ status: 'session closed' });
  });

  app.listen(port, () => {
    log(`Content Engine MCP Server (HTTP) listening on port ${port}`);
  });
}

// ── graceful shutdown ──────────────────────────────────────────────────

async function shutdown(): Promise<void> {
  log('Shutting down…');
  await closeClient();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ── main ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { transport, port } = parseArgs();

  if (transport === 'stdio') {
    log = console.error.bind(console);
  }

  log(`Starting Content Engine MCP Server (transport=${transport})`);

  try {
    await initializeClient();
    log('Weaviate client initialized');
  } catch (error) {
    log(
      'WARNING: Weaviate initialization failed — starting in degraded mode.',
      error instanceof Error ? error.message : error,
    );
  }

  if (transport === 'stdio') {
    await startStdio();
  } else {
    await startHttp(port);
  }
}

main().catch((error) => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});
