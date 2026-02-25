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
| [PRD.md](docs/PRD.md) | Product requirements, modules, user stories |
| [TECH_DECISIONS.md](docs/TECH_DECISIONS.md) | Architecture decision records |
| [BUSINESS_LOGIC.md](docs/BUSINESS_LOGIC.md) | Context assembly, content types, workflows |
| [KNOWLEDGE_BASE.md](docs/KNOWLEDGE_BASE.md) | Weaviate schema, content inventory, seed plan |
| [SCOPE.md](docs/SCOPE.md) | Project overview, goals, development status |
| [CHANGELOG.md](docs/CHANGELOG.md) | What was built and when |
| [API.md](docs/API.md) | API route contracts |
