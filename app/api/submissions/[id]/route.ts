export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getSubmission } from "@/lib/submissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const submission = await getSubmission(id);
    if (!submission) {
      return new Response(
        JSON.stringify({ error: "Submission not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    return Response.json(submission);
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch submission" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
