import { requireRole } from "@/lib/auth-server";
import {
  listPermissionSets,
  createPermissionSet,
  PermissionSetNameConflictError,
} from "@/lib/permission-sets";
import type { Permission } from "@/lib/permissions";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  try {
    const authResult = await requireRole("admin");
    if (authResult instanceof Response) return authResult;

    const sets = await listPermissionSets();
    return Response.json({ permissionSets: sets });
  } catch (error) {
    console.error("Admin roles list API error:", error);
    return Response.json(
      { error: "Failed to list permission sets" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await requireRole("admin");
    if (authResult instanceof Response) return authResult;

    const body = (await req.json()) as {
      name?: unknown;
      description?: unknown;
      permissions?: unknown;
    };

    if (!body.name || typeof body.name !== "string") {
      return Response.json(
        { error: "name is required and must be a string" },
        { status: 400 }
      );
    }
    if (typeof body.description !== "string") {
      return Response.json(
        { error: "description must be a string" },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.permissions)) {
      return Response.json(
        { error: "permissions must be an array" },
        { status: 400 }
      );
    }

    const invalidPerms = (body.permissions as string[]).filter(
      (p) => !ALL_PERMISSIONS.includes(p as Permission)
    );
    if (invalidPerms.length > 0) {
      return Response.json(
        { error: `Invalid permissions: ${invalidPerms.join(", ")}` },
        { status: 400 }
      );
    }

    const created = await createPermissionSet({
      name: body.name.trim(),
      description: body.description.trim(),
      permissions: body.permissions as Permission[],
    });

    logAuditEvent({
      eventType: "permission_set_created",
      actorEmail: authResult.email,
      actorName: authResult.name,
      targetId: created.id,
      details: { name: created.name, permissionCount: created.permissions.length },
    });

    return Response.json({ permissionSet: created }, { status: 201 });
  } catch (error) {
    if (error instanceof PermissionSetNameConflictError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    console.error("Admin roles create API error:", error);
    return Response.json(
      { error: "Failed to create permission set" },
      { status: 500 }
    );
  }
}
