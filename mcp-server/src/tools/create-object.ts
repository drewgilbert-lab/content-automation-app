import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AuthenticatedSystem } from '../auth.js';

const VALID_TYPES = [
  'persona', 'segment', 'use_case', 'business_rule',
  'icp', 'competitor', 'customer_evidence', 'skill',
];

export function registerCreateObjectTool(
  server: McpServer,
  authSystem?: AuthenticatedSystem,
): void {
  server.tool(
    'create_knowledge_object',
    'Propose a new knowledge object for review. Creates a submission that enters the admin review queue — nothing is written directly to the knowledge base.',
    {
      objectType: z.string().describe('Knowledge object type: persona, segment, use_case, business_rule, icp, competitor, customer_evidence, or skill'),
      name: z.string().describe('Name of the proposed object'),
      content: z.string().describe('Full markdown content for the object'),
      tags: z.array(z.string()).optional().describe('Optional tags for categorization'),
      sourceDescription: z.string().optional().describe('Free-text description of where this content came from'),
      subType: z.string().optional().describe('Sub-type for business_rule (tone, constraint, instruction_template) or customer_evidence (proof_point, reference)'),
      revenueRange: z.string().optional().describe('Revenue range for segment objects'),
      employeeRange: z.string().optional().describe('Employee count range for segment objects'),
      website: z.string().optional().describe('Website URL for competitor objects'),
      customerName: z.string().optional().describe('Customer name for customer_evidence objects'),
      industry: z.string().optional().describe('Industry for customer_evidence objects'),
      personaId: z.string().optional().describe('Persona UUID for ICP objects'),
      segmentId: z.string().optional().describe('Segment UUID for ICP objects'),
      description: z.string().optional().describe('Description for skill objects'),
      contentType: z.array(z.string()).optional().describe('Content types for skill objects'),
      category: z.string().optional().describe('Category for skill objects'),
      author: z.string().optional().describe('Author for skill objects'),
      triggerConditions: z.string().optional().describe('Trigger conditions for skill objects'),
      parameters: z.string().optional().describe('JSON parameters for skill objects'),
      outputFormat: z.string().optional().describe('Output format for skill objects'),
    },
    async (args) => {
      try {
        if (authSystem && !authSystem.permissions.includes('mcp-write')) {
          return {
            content: [{ type: 'text' as const, text: 'Error: mcp-write permission is required to create knowledge objects.' }],
            isError: true,
          };
        }

        if (!VALID_TYPES.includes(args.objectType)) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: Invalid objectType "${args.objectType}". Valid types: ${VALID_TYPES.join(', ')}`,
            }],
            isError: true,
          };
        }

        if (!args.name.trim()) {
          return {
            content: [{ type: 'text' as const, text: 'Error: name is required and cannot be empty.' }],
            isError: true,
          };
        }

        if (!args.content.trim()) {
          return {
            content: [{ type: 'text' as const, text: 'Error: content is required and cannot be empty.' }],
            isError: true,
          };
        }

        if (args.objectType === 'skill' && args.contentType !== undefined) {
          const skillTypesModulePath = '../../../lib/skill-types.js';
          const skillTypesMod = (await import(skillTypesModulePath)) as {
            CONTENT_TYPES: readonly string[];
          };
          const invalidContentTypes = args.contentType.filter(
            (ct) => !skillTypesMod.CONTENT_TYPES.includes(ct),
          );
          if (invalidContentTypes.length > 0) {
            return {
              content: [{
                type: 'text' as const,
                text: `Error: Invalid contentType value(s): ${invalidContentTypes.join(', ')}. Valid content types: ${skillTypesMod.CONTENT_TYPES.join(', ')}`,
              }],
              isError: true,
            };
          }
        }

        const proposedFields: Record<string, unknown> = {
          name: args.name.trim(),
          content: args.content,
        };

        if (args.tags) proposedFields.tags = args.tags;
        if (args.subType) proposedFields.subType = args.subType;
        if (args.revenueRange) proposedFields.revenueRange = args.revenueRange;
        if (args.employeeRange) proposedFields.employeeRange = args.employeeRange;
        if (args.website) proposedFields.website = args.website;
        if (args.customerName) proposedFields.customerName = args.customerName;
        if (args.industry) proposedFields.industry = args.industry;
        if (args.personaId) proposedFields.personaId = args.personaId;
        if (args.segmentId) proposedFields.segmentId = args.segmentId;
        if (args.objectType === 'skill') {
          if (args.description) proposedFields.description = args.description;
          if (args.contentType) proposedFields.contentType = args.contentType;
          if (args.category) proposedFields.category = args.category;
          if (args.author) proposedFields.author = args.author;
          if (args.triggerConditions) proposedFields.triggerConditions = args.triggerConditions;
          if (args.parameters) proposedFields.parameters = args.parameters;
          if (args.outputFormat) proposedFields.outputFormat = args.outputFormat;
        }

        const submissionsModulePath = '../../../lib/submissions.js';
        const submissionsMod = (await import(submissionsModulePath)) as {
          createSubmission: (input: Record<string, unknown>) => Promise<{ id: string; status: string }>;
        };

        const result = await submissionsMod.createSubmission({
          submitter: authSystem?.name ?? 'mcp-local',
          objectType: args.objectType,
          objectName: args.name.trim(),
          submissionType: 'new',
          proposedContent: JSON.stringify(proposedFields),
          sourceChannel: 'mcp',
          sourceAppId: authSystem?.name,
          sourceDescription: args.sourceDescription,
        });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              submissionId: result.id,
              status: result.status,
              message: `Submission created for new ${args.objectType} "${args.name}". It will appear in the admin review queue.`,
            }, null, 2),
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    },
  );
}
