export const RATE_LIMIT_TIERS = ["standard", "elevated"] as const;

export type RateLimitTier = (typeof RATE_LIMIT_TIERS)[number];

export const PERMISSIONS = ["read", "mcp-read", "mcp-write"] as const;

export type Permission = (typeof PERMISSIONS)[number];

export interface ConnectedSystemListItem {
  id: string;
  name: string;
  description: string;
  apiKeyPrefix: string;
  permissions: string[];
  subscribedTypes: string[];
  rateLimitTier: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectedSystemDetail extends ConnectedSystemListItem {}

export interface ConnectedSystemCreateInput {
  name: string;
  description: string;
  permissions?: string[];
  subscribedTypes?: string[];
  rateLimitTier?: string;
}

export interface ConnectedSystemUpdateInput {
  name?: string;
  description?: string;
  permissions?: string[];
  subscribedTypes?: string[];
  rateLimitTier?: string;
}

export function getRateLimitTierLabel(tier: string): string {
  const labels: Record<string, string> = {
    standard: "Standard",
    elevated: "Elevated",
  };
  return labels[tier] || tier;
}

export function getPermissionLabel(permission: string): string {
  const labels: Record<string, string> = {
    read: "REST API Read",
    "mcp-read": "MCP Read",
    "mcp-write": "MCP Write",
  };
  return labels[permission] || permission;
}
