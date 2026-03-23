export const runtime = "nodejs";

import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    return Response.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
    });
  } catch (error) {
    console.error("Auth me API error:", error);
    return Response.json(
      { error: "Failed to fetch user info" },
      { status: 500 }
    );
  }
}
