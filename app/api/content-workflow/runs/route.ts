export const runtime = "nodejs";

import { NextRequest } from "next/server";
import {
  createWorkflowRun,
  getWorkflowSnapshot,
} from "@/lib/content-workflow-store";
import {
  isInputType,
  type CreateRunInput,
} from "@/lib/content-workflow-types";
import { requireRole } from "@/lib/auth-server";

function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireRole("contributor");
    if (authResult instanceof Response) return authResult;
    const body = await req.json();
    const { inputType, inputValue, createdBy, idempotencyKey } = body ?? {};

    if (!isInputType(String(inputType ?? ""))) {
      return jsonError('inputType must be "use_case" or "topic_theme"');
    }

    const input: CreateRunInput = {
      inputType,
      inputValue: String(inputValue ?? ""),
      createdBy: String(createdBy ?? ""),
      idempotencyKey: idempotencyKey ? String(idempotencyKey) : undefined,
    };

    const { run, deduped } = await createWorkflowRun(input);
    const snapshot = await getWorkflowSnapshot(run.id);

    return new Response(
      JSON.stringify({
        run: snapshot?.run ?? run,
        branches: snapshot?.branches ?? [],
        steps: snapshot?.steps ?? [],
        deduped,
      }),
      {
        status: deduped ? 200 : 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create run";
    const status = message.includes("required") ? 400 : 500;
    return jsonError(message, status);
  }
}
