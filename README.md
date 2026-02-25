# Content Engine

Internal AI platform that stores company knowledge (personas, segments, use cases, ICP, business rules) in Weaviate and uses it as context for Claude-powered content generation.

## Prerequisites

- Node.js 20+
- Weaviate Cloud account ([console.weaviate.cloud](https://console.weaviate.cloud))
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

## Setup

```bash
git clone <repo-url>
cd content-automation-app
npm install
```

Copy the credential template and fill in your keys:

```bash
cp .env.example .env.local
```

Required variables in `.env.local`:

```
WEAVIATE_URL=        # REST endpoint from Weaviate Cloud console
WEAVIATE_API_KEY=    # Admin API key from Weaviate Cloud console
ANTHROPIC_API_KEY=   # From Anthropic console
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard shows connection status for both Weaviate and Claude.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16, App Router, TypeScript |
| Styling | Tailwind CSS v4 |
| Vector DB | Weaviate Cloud |
| LLM | Anthropic Claude |
| Deploy | Vercel (pending) |

## Documentation

Detailed documentation lives in `docs/`:

| Document | Purpose |
|---|---|
| [SCOPE.md](docs/SCOPE.md) | Project identity, goals, development status |
| [PRD.md](docs/PRD.md) | Functional requirements and user stories |
| [BUSINESS_LOGIC.md](docs/BUSINESS_LOGIC.md) | Context assembly, content types, runtime logic |
| [KNOWLEDGE_BASE.md](docs/KNOWLEDGE_BASE.md) | Weaviate schema, content inventory, seed plan |
| [TECH_DECISIONS.md](docs/TECH_DECISIONS.md) | Architecture decision records |
| [ROADMAP.md](docs/ROADMAP.md) | Phases, future modules, backlog, open questions |
| [CHANGELOG.md](docs/CHANGELOG.md) | What was built and when |
| [API.md](docs/API.md) | API route contracts |
