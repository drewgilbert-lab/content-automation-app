import { getDashboardData } from "@/lib/dashboard";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getDashboardData();
    return Response.json(data);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch dashboard data" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
