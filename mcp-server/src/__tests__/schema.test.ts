import { describe, it, expect } from 'vitest';
import {
  COLLECTIONS,
  getAllCollections,
  getAllTypes,
  getCollectionByType,
  isValidType,
} from '../schema.js';

describe('getAllCollections', () => {
  it('returns 8 collections', () => {
    expect(getAllCollections()).toHaveLength(8);
  });
});

describe('getAllTypes', () => {
  it('returns 8 types matching the expected set', () => {
    const types = getAllTypes();
    expect(types).toHaveLength(8);
    expect(types).toEqual(
      expect.arrayContaining([
        'persona', 'segment', 'use_case', 'business_rule',
        'icp', 'competitor', 'customer_evidence', 'skill',
      ]),
    );
  });
});

describe('getCollectionByType', () => {
  it('returns the Persona collection for type "persona"', () => {
    const col = getCollectionByType('persona');
    expect(col).toBeDefined();
    expect(col!.name).toBe('Persona');
    expect(col!.description.length).toBeGreaterThan(0);
  });

  it('returns undefined for an invalid type', () => {
    expect(getCollectionByType('invalid')).toBeUndefined();
  });
});

describe('isValidType', () => {
  it('returns true for a known type', () => {
    expect(isValidType('persona')).toBe(true);
  });

  it('returns false for an unknown type', () => {
    expect(isValidType('invalid')).toBe(false);
  });
});

describe('collection property counts', () => {
  it('every collection has at least 5 properties', () => {
    for (const col of getAllCollections()) {
      expect(col.properties.length).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('cross-references', () => {
  it('Persona has 2 cross-references (hasSegments, hasUseCases)', () => {
    const persona = getCollectionByType('persona')!;
    expect(persona.crossReferences).toHaveLength(2);
    expect(persona.crossReferences.map((r) => r.property)).toEqual(
      expect.arrayContaining(['hasSegments', 'hasUseCases']),
    );
  });

  it('ICP has 2 cross-references, both with single=true', () => {
    const icp = getCollectionByType('icp')!;
    expect(icp.crossReferences).toHaveLength(2);
    for (const ref of icp.crossReferences) {
      expect(ref.single).toBe(true);
    }
  });

  it.each(['business_rule', 'competitor', 'customer_evidence', 'use_case', 'skill'])(
    '%s has 0 cross-references',
    (type) => {
      const col = getCollectionByType(type)!;
      expect(col.crossReferences).toHaveLength(0);
    },
  );
});
