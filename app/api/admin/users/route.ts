import { requireRole } from "@/lib/auth";
import { listUsers } from "@/lib/users";

export const runtime = "nodejs";

export async function GET() {
  try {
    const authResult = await requireRole("admin");
    if (authResult instanceof Response) return authResult;

    const users = await listUsers();
    return Response.json({ users });
  } catch (error) {
    console.error("Admin users list API error:", error);
    return Response.json({ error: "Failed to list users" }, { status: 500 });
  }
}
