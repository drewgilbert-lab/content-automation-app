import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AuthenticatedSystem } from '../auth.js';

export function registerUpdateObjectTool(
  server: McpServer,
  authSystem?: AuthenticatedSystem,
): void {
  server.tool(
    'update_knowledge_object',
    'Propose an update to an existing knowledge object. Creates a submission that enters the admin review queue — the original object is not modified until approved.',
    {
      objectId: z.string().describe('UUID of the existing knowledge object to update'),
      name: z.string().optional().describe('Updated name'),
      content: z.string().optional().describe('Updated markdown content'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      sourceDescription: z.string().optional().describe('Free-text description of where the update came from'),
      subType: z.string().optional().describe('Updated sub-type'),
      revenueRange: z.string().optional().describe('Updated revenue range'),
      employeeRange: z.string().optional().describe('Updated employee count range'),
      website: z.string().optional().describe('Updated website URL'),
      customerName: z.string().optional().describe('Updated customer name'),
      industry: z.string().optional().describe('Updated industry'),
    },
    async (args) => {
      try {
        if (authSystem && !authSystem.permissions.includes('mcp-write')) {
          return {
            content: [{ type: 'text' as const, text: 'Error: mcp-write permission is required to update knowledge objects.' }],
            isError: true,
          };
        }

        const knowledgeModulePath = '../../../lib/knowledge.js';
        const knowledgeMod = (await import(knowledgeModulePath)) as {
          getKnowledgeObject: (id: string) => Promise<Record<string, unknown> | null>;
        };

        let targetObject = await knowledgeMod.getKnowledgeObject(args.objectId);
        let objectType: string | undefined;
        let objectName: string | undefined;

        if (targetObject) {
          objectType = String(targetObject.type ?? '');
          objectName = String(targetObject.name ?? '');
        } else {
          const skillsModulePath = '../../../lib/skills.js';
          const skillsMod = (await import(skillsModulePath)) as {
            getSkill: (id: string) => Promise<Record<string, unknown> | null>;
          };
          const skillObj = await skillsMod.getSkill(args.objectId);
          if (skillObj) {
            targetObject = skillObj;
            objectType = 'skill';
            objectName = String(skillObj.name ?? '');
          }
        }

        if (!targetObject) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: No object found with ID "${args.objectId}". Use list_objects or search_objects to find the correct ID.`,
            }],
            isError: true,
          };
        }

        const proposedFields: Record<string, unknown> = {};
        if (args.name !== undefined) proposedFields.name = args.name;
        if (args.content !== undefined) proposedFields.content = args.content;
        if (args.tags !== undefined) proposedFields.tags = args.tags;
        if (args.subType !== undefined) proposedFields.subType = args.subType;
        if (args.revenueRange !== undefined) proposedFields.revenueRange = args.revenueRange;
        if (args.employeeRange !== undefined) proposedFields.employeeRange = args.employeeRange;
        if (args.website !== undefined) proposedFields.website = args.website;
        if (args.customerName !== undefined) proposedFields.customerName = args.customerName;
        if (args.industry !== undefined) proposedFields.industry = args.industry;

        if (Object.keys(proposedFields).length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'Error: At least one field to update must be provided.' }],
            isError: true,
          };
        }

        const submissionsModulePath = '../../../lib/submissions.js';
        const submissionsMod = (await import(submissionsModulePath)) as {
          createSubmission: (input: Record<string, unknown>) => Promise<{ id: string; status: string }>;
        };

        const result = await submissionsMod.createSubmission({
          submitter: authSystem?.name ?? 'mcp-local',
          objectType: objectType,
          objectName: args.name ?? objectName,
          submissionType: 'update',
          proposedContent: JSON.stringify(proposedFields),
          targetObjectId: args.objectId,
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
              targetObjectId: args.objectId,
              message: `Update submission created for ${objectType} "${objectName}". It will appear in the admin review queue.`,
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
