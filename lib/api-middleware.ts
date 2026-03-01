import { NextRequest } from "next/server";
import { validateApiKey } from "./api-auth";
import { checkRateLimit } from "./rate-limit";
import type { ConnectedSystemDetail } from "./connection-types";

export interface ApiContext {
  system: ConnectedSystemDetail;
}

type RouteContext = { params: Promise<Record<string, string>> };

function jsonError(status: number, error: string, extra?: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ error, ...extra }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function applySecurityHeaders(
  response: Response,
  req?: NextRequest
): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Frame-Options", "DENY");
  const origins = process.env.ALLOWED_ORIGINS;
  if (origins) {
    const allowed = origins.split(",").map((o) => o.trim());
    const origin = req?.headers.get("Origin");
    if (origin && allowed.includes(origin)) {
      headers.set("Access-Control-Allow-Origin", origin);
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function applyRateLimitHeaders(
  response: Response,
  rateLimit: { limit: number; remaining: number; reset: number }
): Response {
  const headers = new Headers(response.headers);
  if (rateLimit.limit > 0) {
    headers.set("X-RateLimit-Limit", String(rateLimit.limit));
    headers.set("X-RateLimit-Remaining", String(Math.max(rateLimit.remaining, 0)));
    headers.set("X-RateLimit-Reset", String(rateLimit.reset));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function withApiAuth(
  handler: (req: NextRequest, context: ApiContext) => Promise<Response>
): (req: NextRequest, routeContext?: RouteContext) => Promise<Response> {
  return async (req: NextRequest, _routeContext?: RouteContext) => {
    const start = Date.now();
    const endpoint = req.nextUrl?.pathname ?? new URL(req.url).pathname;
    const method = req.method;

    const apiKey = req.headers.get("X-API-Key");
    if (!apiKey) {
      const res = jsonError(401, "Missing X-API-Key header");
      return applySecurityHeaders(res, req);
    }

    const system = await validateApiKey(apiKey);
    if (!system) {
      const res = jsonError(401, "Invalid API key");
      return applySecurityHeaders(res, req);
    }

    if (!system.active) {
      const res = jsonError(403, "API key is deactivated");
      return applySecurityHeaders(res, req);
    }

    const isSearch = endpoint.includes("/knowledge/search");

    try {
      const rateLimit = await checkRateLimit(
        system.apiKeyPrefix,
        system.rateLimitTier,
        isSearch
      );

      if (!rateLimit.success) {
        const retryAfter = Math.ceil((rateLimit.reset - Date.now()) / 1000);
        const res = jsonError(429, "Rate limit exceeded", {
          retryAfter: Math.max(retryAfter, 1),
        });
        const withRl = applyRateLimitHeaders(res, rateLimit);
        const secured = applySecurityHeaders(withRl, req);
        logRequest(system.apiKeyPrefix, endpoint, method, secured.status, start);
        return secured;
      }

      const response = await handler(req, { system });
      const withRl = applyRateLimitHeaders(response, rateLimit);
      const secured = applySecurityHeaders(withRl, req);
      logRequest(system.apiKeyPrefix, endpoint, method, secured.status, start);
      return secured;
    } catch {
      const response = await handler(req, { system });
      const secured = applySecurityHeaders(response, req);
      logRequest(system.apiKeyPrefix, endpoint, method, secured.status, start);
      return secured;
    }
  };
}

function logRequest(
  apiKeyPrefix: string,
  endpoint: string,
  method: string,
  statusCode: number,
  start: number
) {
  const durationMs = Date.now() - start;
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      apiKeyPrefix,
      endpoint,
      method,
      statusCode,
      durationMs,
    })
  );
}
