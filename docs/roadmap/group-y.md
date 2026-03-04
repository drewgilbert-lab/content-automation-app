> Back to [Roadmap Index](./README.md)

# Group Y — Production Redis Configuration

> Scope: Configure Upstash Redis environment variables in the Vercel production deployment to enable bulk upload session persistence and external API rate limiting. The code is already written and tested; this group covers the deployment configuration, validation, and documentation.
> Dependencies: Groups G (bulk upload — uses Redis for session storage), K (external API — uses Redis for rate limiting).

## Why This Matters

Without Upstash Redis configured in production, two features are degraded: (1) bulk upload sessions fall back to in-memory storage, which is lost on every Vercel serverless function cold start — making multi-step upload workflows unreliable, and (2) the external API at `/api/v1/` has no rate limiting — a misbehaving connected system can make unlimited requests. The code for both features is already written and tested with Redis; they just need the two environment variables (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) added in the Vercel dashboard. This is the highest-impact, lowest-effort improvement available.

**Y1 — Upstash Redis Account and Database Setup**
Create an Upstash Redis database (if not already provisioned) via the Upstash console. Select the region closest to the Vercel deployment (e.g., `us-east-1` for Vercel's default region). Use the free tier for initial deployment (10,000 commands/day, 256 MB storage). Record the database name, region, and plan tier in `docs/TECH_DECISIONS.md` as an ADR entry.

**Y2 — Vercel Environment Variable Configuration**
Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to the Vercel project's environment variables via the Vercel dashboard. Set for the Production environment (and optionally Preview for PR testing). Do not commit these values to the repository — they are secrets. Verify that the existing code in `lib/upload-session.ts` and `lib/rate-limit.ts` correctly reads these variables and falls back gracefully when they are absent (the fallback behavior is already implemented).

**Y3 — Production Validation**
After configuring the environment variables, deploy and validate both features in production:

1. **Bulk upload:** Upload a small batch of test documents via `/bulk-upload`. Navigate away from the page and return — verify the upload session persists (not lost to cold start). Complete the full upload, classify, review, and approve flow.
2. **Rate limiting:** Make multiple rapid requests to `/api/v1/knowledge` with a valid API key. Verify that `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers are present in responses. Verify that exceeding the rate limit returns a 429 status.
3. **Fallback behavior:** Temporarily remove one environment variable and redeploy. Verify that the application still starts and the affected feature degrades gracefully (in-memory sessions, no rate limiting) rather than crashing.

**Y4 — Update .env.example and Documentation**
Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env.example` with placeholder values and comments explaining their purpose. Update `docs/TECH_DECISIONS.md` with the Redis configuration decision. Update the Infrastructure & Integrations section of this roadmap to reflect that Redis is configured.

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| Upstash free tier command limits exceeded | Redis operations fail, features fall back to degraded mode | Monitor usage via Upstash dashboard; upgrade to Pro tier ($0.20/100K commands) if limits are hit; the graceful fallback ensures the app does not crash |
| Redis credentials leaked | Unauthorized access to session data and rate limit state | Store only in Vercel environment variables (encrypted at rest); never commit to repository; rotate token if compromised |
| Region mismatch adds latency | Redis in a different region from Vercel functions adds 50-100ms per operation | Select the same region as the Vercel deployment; Upstash REST API is designed for edge/serverless with low latency |
