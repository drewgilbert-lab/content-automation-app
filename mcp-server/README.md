# Content Engine MCP Server

Standalone MCP (Model Context Protocol) server that exposes the Content Engine knowledge base to AI assistants and automation tools.

## Overview

This server provides two transport modes:
- **stdio** — for local LLM clients (Claude Desktop, Claude Code, Cursor)
- **Streamable HTTP** — for remote access (deployed on Railway)

## Quick Start (Local Development)

```bash
cd mcp-server
cp .env.example .env
# Fill in WEAVIATE_URL and WEAVIATE_API_KEY in .env

npm install
npm run dev
```

## Building

```bash
npm run build    # Compiles TypeScript to dist/
npm start        # Runs compiled server (stdio by default)
```

## CLI Options

```bash
node dist/index.js --transport stdio     # Default: stdio for local LLM clients
node dist/index.js --transport http      # Streamable HTTP for remote access
node dist/index.js --transport http --port 3100  # Custom port
```

Environment variables (`TRANSPORT`, `PORT`) are also supported. CLI flags take precedence.

## LLM Client Configuration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "content-engine": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "WEAVIATE_URL": "<your-weaviate-url>",
        "WEAVIATE_API_KEY": "<your-api-key>"
      }
    }
  }
}
```

### Claude Code

Same configuration as Claude Desktop — Claude Code uses the stdio transport.

### Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "content-engine": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "WEAVIATE_URL": "<your-weaviate-url>",
        "WEAVIATE_API_KEY": "<your-api-key>"
      }
    }
  }
}
```

## Remote Access (Streamable HTTP)

The HTTP transport is deployed on Railway at:

```
https://content-automation-app.up.railway.app
```

### Endpoints

| Path | Method | Description |
|------|--------|-------------|
| `/health` | GET | Health check (Weaviate connectivity) |
| `/mcp` | POST | MCP request handler |
| `/mcp` | GET | SSE stream (server-initiated messages) |
| `/mcp` | DELETE | Close session |

### Authentication

HTTP transport requires an API key via the Connected Systems admin UI:

1. Create a Connected System at `/connections/new` with **MCP Read** permission
2. Use the API key in requests:

```bash
curl -X POST https://content-automation-app.up.railway.app/mcp \
  -H "Authorization: Bearer <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{}},"id":1}'
```

stdio transport does not require authentication (local-only).

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WEAVIATE_URL` | Yes | — | Weaviate Cloud REST endpoint |
| `WEAVIATE_API_KEY` | Yes* | — | Weaviate API key (admin or scoped) |
| `WEAVIATE_MCP_API_KEY` | No | — | Scoped MCP Weaviate key (preferred over `WEAVIATE_API_KEY`) |
| `TRANSPORT` | No | `stdio` | Transport mode: `stdio` or `http` |
| `PORT` | No | `3100` | HTTP port (only used when `TRANSPORT=http`) |

## Docker

```bash
# Build (from repo root)
docker build -f mcp-server/Dockerfile -t content-engine-mcp .

# Run
docker run -p 3100:3100 \
  -e WEAVIATE_URL=<url> \
  -e WEAVIATE_API_KEY=<key> \
  -e TRANSPORT=http \
  content-engine-mcp
```

## Testing

```bash
npm test          # Run all tests
npm run test:watch  # Watch mode
```

## Architecture

The MCP server imports shared library code from the parent `lib/` directory (`knowledge.ts`, `submissions.ts`, `api-auth.ts`, etc.) via dynamic imports. This avoids duplicating business logic — the MCP server is a thin transport layer over the same functions the Next.js API routes use.

See [docs/TECH_DECISIONS.md](../docs/TECH_DECISIONS.md) ADR-015 for architecture rationale.
