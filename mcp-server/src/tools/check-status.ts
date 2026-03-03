import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerCheckStatusTool(server: McpServer): void {
  server.tool(
    'check_submission_status',
    'Check the status of a previously created submission. Returns whether it is pending, accepted, rejected, or deferred.',
    {
      submissionId: z.string().describe('UUID of the submission to check'),
    },
    async ({ submissionId }) => {
      try {
        const submissionsModulePath = '../../lib/submissions.js';
        const submissionsMod = (await import(submissionsModulePath)) as {
          getSubmission: (id: string) => Promise<Record<string, unknown> | null>;
        };

        const submission = await submissionsMod.getSubmission(submissionId);

        if (!submission) {
          return {
            content: [{
              type: 'text' as const,
              text: `Error: No submission found with ID "${submissionId}".`,
            }],
            isError: true,
          };
        }

        const result: Record<string, unknown> = {
          submissionId: submission.id,
          status: submission.status,
          objectType: submission.objectType,
          objectName: submission.objectName,
          submissionType: submission.submissionType,
          createdAt: submission.createdAt,
        };

        if (submission.reviewComment) result.reviewComment = submission.reviewComment;
        if (submission.reviewedAt) result.reviewedAt = submission.reviewedAt;
        if (submission.reviewNote) result.reviewNote = submission.reviewNote;

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
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
