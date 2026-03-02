import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getAllCollections } from '../schema.js';

function buildOverviewMarkdown(): string {
  const collections = getAllCollections();

  const lines: string[] = [
    '# Content Engine — Knowledge Base Overview',
    '',
    'The Content Engine is an internal AI platform that stores company knowledge in a structured vector database (Weaviate).',
    'Knowledge objects are organized into typed collections. Each object contains markdown content that is vectorized for semantic search.',
    'Objects can be linked via cross-references to capture relationships (e.g. which personas appear in which segments).',
    '',
    '## Collections',
    '',
  ];

  for (const col of collections) {
    lines.push(`### ${col.name} (\`${col.type}\`)`);
    lines.push('');
    lines.push(col.description);
    lines.push('');

    if (col.crossReferences.length > 0) {
      lines.push('**Relationships:**');
      for (const ref of col.crossReferences) {
        const cardinality = ref.single ? '(single)' : '(many)';
        lines.push(`- \`${ref.property}\` → ${ref.targetCollection} ${cardinality} — ${ref.label}`);
      }
      lines.push('');
    }
  }

  lines.push('## How to Use');
  lines.push('');
  lines.push('1. Call `list_collections` to see all collections with object counts.');
  lines.push('2. Call `list_objects` with a `type` filter to browse objects in a collection.');
  lines.push('3. Call `search_objects` with a natural language query to find relevant objects across collections.');
  lines.push('4. Call `get_object` with an ID to retrieve full content and metadata.');
  lines.push('5. Call `get_relationships` to explore how an object connects to others.');
  lines.push('6. Call `get_dashboard_health` to assess knowledge base completeness and quality.');

  return lines.join('\n');
}

export function registerOverviewResource(server: McpServer): void {
  const markdown = buildOverviewMarkdown();

  server.resource(
    'overview',
    'knowledge://overview',
    {
      description: 'Overview of the Content Engine knowledge base: what it is, what each collection stores, and how to query it.',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [{
        uri: 'knowledge://overview',
        mimeType: 'text/markdown',
        text: markdown,
      }],
    }),
  );
}
