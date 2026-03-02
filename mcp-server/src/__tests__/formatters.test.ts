import { describe, it, expect } from 'vitest';
import {
  formatListItem,
  formatDetail,
  formatSearchResult,
  formatDashboardHealth,
  formatCollectionSchema,
  formatRelationships,
} from '../formatters.js';
import { getCollectionByType } from '../schema.js';

describe('formatListItem', () => {
  it('returns the correct shape with all fields', () => {
    const result = formatListItem({
      id: '1',
      name: 'Test',
      type: 'persona',
      tags: ['gtm'],
      deprecated: true,
      createdAt: '2025-01-01',
      updatedAt: '2025-06-01',
    });

    expect(result).toEqual({
      id: '1',
      name: 'Test',
      type: 'persona',
      tags: ['gtm'],
      deprecated: true,
      createdAt: '2025-01-01',
      updatedAt: '2025-06-01',
    });
  });

  it('defaults tags to [] and deprecated to false when missing', () => {
    const result = formatListItem({ id: '2', name: 'Minimal' });

    expect(result.tags).toEqual([]);
    expect(result.deprecated).toBe(false);
  });
});

describe('formatDetail', () => {
  it('includes crossReferences when present', () => {
    const result = formatDetail({
      id: '1',
      name: 'Test',
      crossReferences: {
        hasSegments: [{ id: 's1', name: 'Enterprise', type: 'segment' }],
      },
    });

    expect(result.crossReferences).toEqual({
      hasSegments: [{ id: 's1', name: 'Enterprise', type: 'segment' }],
    });
  });

  it('includes optional meta fields when present', () => {
    const result = formatDetail({
      id: '1',
      name: 'Acme',
      type: 'competitor',
      subType: 'direct',
      website: 'https://acme.com',
      industry: 'SaaS',
    });

    expect(result.subType).toBe('direct');
    expect(result.website).toBe('https://acme.com');
    expect(result.industry).toBe('SaaS');
  });

  it('excludes meta fields when absent', () => {
    const result = formatDetail({ id: '1', name: 'Plain' });

    expect(result).not.toHaveProperty('subType');
    expect(result).not.toHaveProperty('website');
    expect(result).not.toHaveProperty('crossReferences');
  });
});

describe('formatSearchResult', () => {
  it('truncates snippet at 500 chars and adds ellipsis', () => {
    const longSnippet = 'a'.repeat(600);
    const result = formatSearchResult({
      id: '1',
      name: 'Test',
      type: 'persona',
      score: 0.87654,
      snippet: longSnippet,
    });

    const snippet = result.snippet as string;
    expect(snippet).toHaveLength(501); // 500 chars + ellipsis character
    expect(snippet.endsWith('…')).toBe(true);
  });

  it('rounds score to 3 decimal places', () => {
    const result = formatSearchResult({
      id: '1',
      name: 'Test',
      type: 'persona',
      score: 0.87654,
      snippet: 'short snippet',
    });

    expect(result.score).toBe(0.877);
  });
});

describe('formatDashboardHealth', () => {
  const mockDashboardData = {
    counts: { persona: 4, segment: 5, use_case: 15, business_rule: 2, icp: 0, competitor: 0, customer_evidence: 0 },
    totalCount: 26,
    neverReviewed: [{ id: '1', name: 'Test', type: 'persona' }],
    stale: [{ id: '2', name: 'Old', type: 'segment', updatedAt: '2024-01-01' }],
    gaps: {
      noRelationships: [{ id: '3', name: 'Orphan', type: 'icp' }],
      partialRelationships: [],
      asymmetricRelationships: [],
      icpMissingRefs: [],
      businessRulesNoSubType: [],
      customerEvidenceNoSubType: [],
    },
  };

  it('includes totalObjects, countsByType, staleCount, and totalGaps', () => {
    const result = formatDashboardHealth(mockDashboardData);

    expect(result.totalObjects).toBe(26);
    expect(result.countsByType).toEqual(mockDashboardData.counts);
    expect(result.staleCount).toBe(1);
    expect(result.totalGaps).toBe(1);
  });
});

describe('formatCollectionSchema', () => {
  it('returns name, type, description, properties array, and crossReferences array', () => {
    const collection = getCollectionByType('persona')!;
    const result = formatCollectionSchema(collection);

    expect(result.name).toBe('Persona');
    expect(result.type).toBe('persona');
    expect(typeof result.description).toBe('string');
    expect(Array.isArray(result.properties)).toBe(true);
    expect((result.properties as unknown[]).length).toBeGreaterThan(0);
    expect(Array.isArray(result.crossReferences)).toBe(true);
    expect((result.crossReferences as unknown[]).length).toBe(2);
  });
});

describe('formatRelationships', () => {
  it('returns objectId, objectName, objectType, outbound, and inbound', () => {
    const outbound = { hasSegments: [{ id: 's1', name: 'Enterprise', type: 'segment' }] };
    const inbound = { hasPersonas: [{ id: 'p1', name: 'Sales', type: 'persona' }] };

    const result = formatRelationships('obj-1', 'My ICP', 'icp', outbound, inbound);

    expect(result).toEqual({
      objectId: 'obj-1',
      objectName: 'My ICP',
      objectType: 'icp',
      outbound,
      inbound,
    });
  });
});
