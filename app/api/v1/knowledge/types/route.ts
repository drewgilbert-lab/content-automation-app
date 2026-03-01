import { withApiAuth } from "@/lib/api-middleware";
import { getDashboardData } from "@/lib/dashboard";
import { getTypeLabel, VALID_TYPES } from "@/lib/knowledge-types";

export const runtime = "nodejs";

const TYPE_DESCRIPTIONS: Record<string, string> = {
  persona: "Target audience profiles with roles, pain points, and motivations",
  segment: "Market segments defined by company characteristics",
  use_case: "Business problems and solutions the product addresses",
  business_rule: "Constraints, tone guidelines, and content rules",
  icp: "Ideal Customer Profiles combining a persona and segment",
  competitor: "Competitive landscape profiles and differentiators",
  customer_evidence: "Case studies, proof points, and customer references",
};

export const GET = withApiAuth(async () => {
  try {
    const dashboard = await getDashboardData();

    const data = VALID_TYPES.map((type) => ({
      type,
      displayName: getTypeLabel(type),
      count: dashboard.counts[type] ?? 0,
      description: TYPE_DESCRIPTIONS[type] ?? "",
    }));

    return Response.json({ data });
  } catch {
    return Response.json(
      { error: "Failed to fetch knowledge types" },
      { status: 500 }
    );
  }
});
