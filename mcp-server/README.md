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

## Available Tools

The MCP server exposes 10 tools — 7 read tools and 3 write tools:

| Tool | Description | Input |
|------|-------------|-------|
| `list_collections` | List all collections with object counts and descriptions | None |
| `list_objects` | Browse objects with optional type filtering and pagination | `type?`, `includeDeprecated?`, `limit?`, `offset?` |
| `get_object` | Get full details of a single object by ID | `id` |
| `search_objects` | Semantic search using natural language — the core RAG capability | `query`, `type?`, `limit?`, `certaintyThreshold?` |
| `get_relationships` | Get all outbound and inbound relationships for an object | `id` |
| `get_dashboard_health` | Knowledge base health metrics (counts, stale content, gaps) | None |
| `get_collection_schema` | Schema definitions for collections (properties, cross-references) | `type?` |

### Write Tools

Write tools create Submission records that enter the admin review queue. Nothing is written directly to knowledge collections — all changes require admin approval.

| Tool | Description | Input |
|------|-------------|-------|
| `create_knowledge_object` | Propose a new knowledge object for review | `objectType`, `name`, `content`, `tags?`, `sourceDescription?`, type-specific fields |
| `update_knowledge_object` | Propose an update to an existing object | `objectId`, `name?`, `content?`, `tags?`, `sourceDescription?`, other writable fields |
| `check_submission_status` | Check the status of a previously created submission | `submissionId` |

Write tools require the **mcp-write** permission on the Connected System API key (HTTP transport) or are available by default (stdio transport).

## Available Resources

Static and dynamic resources that help LLMs understand the knowledge base:

| Resource | URI | Description |
|----------|-----|-------------|
| Knowledge Base Overview | `knowledge://overview` | What the Content Engine is, what each collection stores, how to query it |
| Relationship Map | `knowledge://relationships` | Cross-reference graph showing all directional relationships |
| Collection Summary | `knowledge://collections/{type}` | Dynamic: count, names, common tags for a specific collection |

## LLM Client Configuration

### Claude Desktop (stdio)

Claude Desktop spawns the MCP server as a child process using stdio transport.

**Setup:**

1. Build the server: `cd mcp-server && npm run build`
2. Add to your Claude Desktop config file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "content-engine": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "WEAVIATE_URL": "https://your-cluster.weaviate.network",
        "WEAVIATE_API_KEY": "your-weaviate-api-key"
      }
    }
  }
}
```

3. Restart Claude Desktop. The server appears in the MCP tools menu.

### Claude Code (stdio)

Claude Code uses the same stdio mechanism as Claude Desktop.

```json
{
  "mcpServers": {
    "content-engine": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "WEAVIATE_URL": "https://your-cluster.weaviate.network",
        "WEAVIATE_API_KEY": "your-weaviate-api-key"
      }
    }
  }
}
```

### Cursor (stdio)

Add to `.cursor/mcp.json` in your project root (or global Cursor settings):

```json
{
  "mcpServers": {
    "content-engine": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "WEAVIATE_URL": "https://your-cluster.weaviate.network",
        "WEAVIATE_API_KEY": "your-weaviate-api-key"
      }
    }
  }
}
```

After saving, restart Cursor or reload the window. The Content Engine tools appear in the MCP section of the AI assistant settings.

### Gemini (Streamable HTTP)

Gemini and other HTTP-compatible clients connect to the deployed server via Streamable HTTP transport.

**Prerequisites:**
1. Deploy the MCP server with HTTP transport (see Docker section)
2. Create a Connected System at `/connections/new` with **mcp-read** permission
3. Note the API key (shown once at creation)

**Configuration:**

Point your Gemini MCP client at the deployed server URL:

```
Server URL: https://content-automation-app.up.railway.app/mcp
Authorization: Bearer <your-api-key>
```

The server handles MCP session management automatically via the `Mcp-Session-Id` header.

### Remote HTTP Access (any client)

Any MCP-compatible HTTP client can connect to the Streamable HTTP transport:

```bash
# Initialize a session
curl -X POST https://content-automation-app.up.railway.app/mcp \
  -H "Authorization: Bearer <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{}},"id":1}'

# The response includes a Mcp-Session-Id header — use it in subsequent requests
```

## Example Interactions

Once configured, you can ask your AI assistant questions and it will call the appropriate MCP tools:

**Exploring personas:**
> "Show me all our personas and their key pain points."
> → LLM calls `list_objects({ type: "persona" })`, then `get_object` for each → synthesizes pain points

**Semantic search:**
> "Find knowledge objects related to territory planning."
> → LLM calls `search_objects({ query: "territory planning" })` → returns ranked results across collections

**Relationship exploration:**
> "What segments are linked to the Sales persona?"
> → LLM calls `list_objects({ type: "persona" })` to find Sales ID, then `get_relationships({ id })` → returns linked segments

**Health check:**
> "Give me a summary of our knowledge base health."
> → LLM calls `get_dashboard_health()` → returns total counts, stale items, gap analysis

**Schema exploration:**
> "What properties does a Segment have?"
> → LLM calls `get_collection_schema({ type: "segment" })` → returns property definitions

**Proposing new content:**
> "Create a new persona called 'Product Manager' with information about their key responsibilities and pain points."
> → LLM calls `create_knowledge_object({ objectType: "persona", name: "Product Manager", content: "..." })` → returns submission ID

**Updating existing content:**
> "Update the Enterprise segment to include the new revenue threshold of $5B+."
> → LLM calls `search_objects({ query: "Enterprise segment" })`, then `update_knowledge_object({ objectId: "...", content: "..." })` → returns submission ID

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

1. Create a Connected System at `/connections/new` with **mcp-read** permission.
   For write access, also add the **mcp-write** permission.
2. The creation success screen displays the MCP server URL and a ready-to-use config snippet for Claude Desktop / Cursor — copy it directly into your client config.
3. The connection detail page also shows the MCP config for reference (with a `<your-api-key>` placeholder since the key is only shown once at creation).
4. Use the API key in the `Authorization: Bearer <key>` header.

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

The MCP server imports shared library code from the parent `lib/` directory (`knowledge.ts`, `skills.ts`, `dashboard.ts`, `api-auth.ts`) via dynamic imports. This avoids duplicating business logic — the MCP server is a thin transport layer over the same functions the Next.js API routes use.

See [docs/TECH_DECISIONS.md](../docs/TECH_DECISIONS.md) ADR-015 for architecture rationale.
