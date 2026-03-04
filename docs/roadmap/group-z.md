> Back to [Roadmap Index](./README.md)

# Group Z — CI/CD Pipeline

> Scope: Create a GitHub Actions workflow that runs the existing test suite on push to main and on pull requests. Establishes an automated safety net that prevents regressions from reaching production.
> Dependencies: None. The test suite already exists and passes.

## Why This Matters

The repository has 121 tests that all pass locally, but they do not run automatically. A developer can push code that breaks existing tests and it will deploy to production via Vercel's auto-deploy without any signal. A CI pipeline that costs minutes to configure provides a permanent safety net against regressions. This is a prerequisite for maintaining quality as the codebase grows and more contributors join (Group W).

**Z1 — GitHub Actions Test Workflow**
Create `.github/workflows/test.yml` with the following configuration:

- **Triggers:** `push` to `main` branch, `pull_request` to `main` branch.
- **Environment:** Ubuntu latest, Node.js version matching the project's `.nvmrc` or `engines` field (or LTS if unspecified).
- **Steps:** Checkout code, install dependencies (`npm ci`), run linter if configured (`npm run lint` — skip if not configured), run tests (`npm test`), report results.
- **Environment variables:** Provide mock/test values for required environment variables (`WEAVIATE_URL`, `WEAVIATE_API_KEY`, `ANTHROPIC_API_KEY`, etc.) so tests can run without real service connections. Tests should already mock external dependencies; the CI environment variables prevent startup crashes.
- **Caching:** Cache `node_modules` via `actions/cache` or `actions/setup-node`'s built-in caching to speed up subsequent runs.

**Z2 — MCP Server Test Integration**
Extend the CI workflow to also build and test the MCP server:

- **Steps:** `cd mcp-server && npm ci && npm run build && npm test` (if MCP server has tests) or `cd mcp-server && npm ci && npm run build` (verify compilation succeeds).
- **Type checking:** Run `tsc --noEmit` on the MCP server to catch type errors that may not surface in the main app's build.
- **Matrix strategy (optional):** Run the main app and MCP server builds in parallel matrix jobs to minimize total CI time.

**Z3 — Branch Protection Rules**
Configure GitHub branch protection on `main`:

- Require the CI workflow to pass before merging PRs.
- Require at least one approval (when multiple contributors exist — defer if single-user for now).
- Prevent direct pushes to main (all changes via PR). This can be deferred until Group W adds multiple users — for a single-user workflow, direct push to main is acceptable.

Document the branch protection configuration in `docs/TECH_DECISIONS.md`.

**Z4 — CI Status Badge**
Add a GitHub Actions status badge to the repository's `README.md` showing the current build status. This provides at-a-glance visibility into whether the test suite is passing.

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| Tests require real Weaviate/Claude connections | CI fails because mock environment variables don't connect to real services | Tests should mock all external calls; if any test hits a real service, fix it to use mocks; provide dummy env vars in CI |
| CI run time grows as test count increases | Slow CI discourages frequent pushes | Cache dependencies; run tests in parallel (Jest `--maxWorkers`); split into unit and integration test jobs if needed |
| Flaky tests block merges | A test that passes locally but fails intermittently in CI blocks all PRs | Identify and fix flaky tests immediately; use `--retry` flags sparingly; do not disable tests to unblock merges |
| Branch protection is too strict for a solo developer | Overhead of creating PRs for every change | Defer branch protection rules (Z3) until Group W adds multiple users; enable when team size grows beyond one |
