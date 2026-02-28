export const RATE_LIMIT_TIERS = ["standard", "elevated"] as const;

export type RateLimitTier = (typeof RATE_LIMIT_TIERS)[number];

export const PERMISSIONS = ["read"] as const;

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
  subscribedTypes?: string[];
  rateLimitTier?: string;
}

export interface ConnectedSystemUpdateInput {
  name?: string;
  description?: string;
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
