import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAllCollections } from '../schema.js';

function buildRelationshipMap(): string {
  const collections = getAllCollections();
  const lines: string[] = [
    '# Content Engine — Relationship Map',
    '',
    'Cross-reference graph showing all directional relationships between collections.',
    'Arrows indicate the direction of the reference (from → to).',
    '',
    '## Relationships',
    '',
    '```',
  ];

  for (const col of collections) {
    for (const ref of col.crossReferences) {
      const cardinality = ref.single ? '1' : 'N';
      lines.push(`${col.name} ──${ref.property}──► ${ref.targetCollection} [${cardinality}]`);
    }
  }

  lines.push('```');
  lines.push('');
  lines.push('## Reference Details');
  lines.push('');

  for (const col of collections) {
    if (col.crossReferences.length === 0) continue;

    lines.push(`### ${col.name}`);
    lines.push('');
    lines.push('| Property | Target | Label | Cardinality |');
    lines.push('|---|---|---|---|');
    for (const ref of col.crossReferences) {
      lines.push(`| \`${ref.property}\` | ${ref.targetCollection} | ${ref.label} | ${ref.single ? 'Single' : 'Many'} |`);
    }
    lines.push('');
  }

  lines.push('## Bidirectional Pairs');
  lines.push('');
  lines.push('Some relationships are maintained bidirectionally:');
  lines.push('- Persona.hasSegments ↔ Segment.hasPersonas');
  lines.push('- Persona.hasUseCases and Segment.hasUseCases both reference UseCase');
  lines.push('- ICP.persona → Persona and ICP.segment → Segment (single-value)');

  return lines.join('\n');
}

export function registerRelationshipsResource(server: McpServer): void {
  const markdown = buildRelationshipMap();

  server.resource(
    'relationships',
    'knowledge://relationships',
    {
      description: 'Text representation of the cross-reference graph showing all directional relationships between knowledge base collections.',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [{
        uri: 'knowledge://relationships',
        mimeType: 'text/markdown',
        text: markdown,
      }],
    }),
  );
}
