import type { CollectionDefinition } from './schema.js';

interface ListItemLike {
  id: string;
  name: string;
  type?: string;
  tags?: string[];
  deprecated?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface DetailLike extends ListItemLike {
  content?: string;
  crossReferences?: Record<string, Array<{ id: string; name: string; type: string }>>;
  [key: string]: unknown;
}

interface SearchResultLike {
  id: string;
  name: string;
  type: string;
  tags?: string[];
  score: number;
  snippet: string;
}

interface DashboardDataLike {
  counts: Record<string, number>;
  totalCount: number;
  neverReviewed: Array<{ id: string; name: string; type: string }>;
  stale: Array<{ id: string; name: string; type: string; updatedAt: string }>;
  gaps: {
    noRelationships: Array<{ id: string; name: string; type: string }>;
    partialRelationships: Array<{ id: string; name: string; type: string; gapDetail: string }>;
    asymmetricRelationships: Array<{ id: string; name: string; type: string; gapDetail: string }>;
    icpMissingRefs: Array<{ id: string; name: string; type: string; gapDetail: string }>;
    businessRulesNoSubType: Array<{ id: string; name: string; type: string }>;
    customerEvidenceNoSubType: Array<{ id: string; name: string; type: string }>;
  };
}

interface RelationshipEntry {
  id: string;
  name: string;
  type: string;
}

export function formatListItem(item: ListItemLike): Record<string, unknown> {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    tags: item.tags ?? [],
    deprecated: item.deprecated ?? false,
    createdAt: item.createdAt ?? '',
    updatedAt: item.updatedAt ?? '',
  };
}

export function formatDetail(detail: DetailLike): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: detail.id,
    name: detail.name,
    type: detail.type,
    content: detail.content ?? '',
    tags: detail.tags ?? [],
    deprecated: detail.deprecated ?? false,
    createdAt: detail.createdAt ?? '',
    updatedAt: detail.updatedAt ?? '',
  };

  const metaFields = ['subType', 'revenueRange', 'employeeRange', 'website',
    'customerName', 'industry', 'sourceFile', 'description', 'active',
    'contentType', 'category', 'author', 'version', 'outputFormat',
    'triggerConditions', 'parameters', 'usageCount'];

  for (const field of metaFields) {
    if (detail[field] !== undefined && detail[field] !== null) {
      base[field] = detail[field];
    }
  }

  if (detail.crossReferences && Object.keys(detail.crossReferences).length > 0) {
    base.crossReferences = detail.crossReferences;
  }

  return base;
}

export function formatSearchResult(result: SearchResultLike): Record<string, unknown> {
  return {
    id: result.id,
    name: result.name,
    type: result.type,
    score: Math.round(result.score * 1000) / 1000,
    snippet: result.snippet.length > 500 ? result.snippet.slice(0, 500) + '…' : result.snippet,
    tags: result.tags ?? [],
  };
}

export function formatDashboardHealth(data: DashboardDataLike): Record<string, unknown> {
  const gapCounts = {
    noRelationships: data.gaps.noRelationships.length,
    partialRelationships: data.gaps.partialRelationships.length,
    asymmetricRelationships: data.gaps.asymmetricRelationships.length,
    icpMissingRefs: data.gaps.icpMissingRefs.length,
    businessRulesNoSubType: data.gaps.businessRulesNoSubType.length,
    customerEvidenceNoSubType: data.gaps.customerEvidenceNoSubType.length,
  };
  const totalGaps = Object.values(gapCounts).reduce((sum, n) => sum + n, 0);

  return {
    totalObjects: data.totalCount,
    countsByType: data.counts,
    staleCount: data.stale.length,
    neverReviewedCount: data.neverReviewed.length,
    totalGaps,
    gapCounts,
    staleItems: data.stale.slice(0, 10).map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      updatedAt: s.updatedAt,
    })),
    gapDetails: {
      noRelationships: data.gaps.noRelationships.slice(0, 10).map((g) => ({
        id: g.id, name: g.name, type: g.type,
      })),
      partialRelationships: data.gaps.partialRelationships.slice(0, 10).map((g) => ({
        id: g.id, name: g.name, type: g.type, detail: g.gapDetail,
      })),
    },
  };
}

export function formatCollectionSchema(collection: CollectionDefinition): Record<string, unknown> {
  return {
    name: collection.name,
    type: collection.type,
    description: collection.description,
    properties: collection.properties.map((p) => ({
      name: p.name,
      dataType: p.dataType,
      description: p.description,
    })),
    crossReferences: collection.crossReferences.map((r) => ({
      property: r.property,
      targetType: r.targetType,
      label: r.label,
      single: r.single ?? false,
    })),
  };
}

export function formatRelationships(
  objectId: string,
  objectName: string,
  objectType: string,
  outbound: Record<string, RelationshipEntry[]>,
  inbound: Record<string, RelationshipEntry[]>,
): Record<string, unknown> {
  return {
    objectId,
    objectName,
    objectType,
    outbound,
    inbound,
  };
}
