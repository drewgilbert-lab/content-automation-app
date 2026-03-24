import { requireRole } from "@/lib/auth-server";
import {
  getPermissionSetById,
  updatePermissionSet,
  deletePermissionSet,
  PermissionSetNameConflictError,
  PermissionSetBuiltInDeleteError,
} from "@/lib/permission-sets";
import type { Permission } from "@/lib/permissions";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole("admin");
    if (authResult instanceof Response) return authResult;

    const { id } = await context.params;
    const set = await getPermissionSetById(id);
    if (!set) {
      return Response.json(
        { error: "Permission set not found" },
        { status: 404 }
      );
    }
    return Response.json({ permissionSet: set });
  } catch (error) {
    console.error("Admin role get API error:", error);
    return Response.json(
      { error: "Failed to fetch permission set" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole("admin");
    if (authResult instanceof Response) return authResult;

    const { id } = await context.params;
    const body = (await req.json()) as {
      name?: unknown;
      description?: unknown;
      permissions?: unknown;
    };

    if (body.name !== undefined && typeof body.name !== "string") {
      return Response.json(
        { error: "name must be a string" },
        { status: 400 }
      );
    }
    if (body.description !== undefined && typeof body.description !== "string") {
      return Response.json(
        { error: "description must be a string" },
        { status: 400 }
      );
    }
    if (body.permissions !== undefined && !Array.isArray(body.permissions)) {
      return Response.json(
        { error: "permissions must be an array" },
        { status: 400 }
      );
    }

    if (Array.isArray(body.permissions)) {
      const invalidPerms = (body.permissions as string[]).filter(
        (p) => !ALL_PERMISSIONS.includes(p as Permission)
      );
      if (invalidPerms.length > 0) {
        return Response.json(
          { error: `Invalid permissions: ${invalidPerms.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const input: { name?: string; description?: string; permissions?: Permission[] } = {};
    if (typeof body.name === "string") input.name = body.name.trim();
    if (typeof body.description === "string") input.description = body.description.trim();
    if (Array.isArray(body.permissions)) input.permissions = body.permissions as Permission[];

    if (Object.keys(input).length === 0) {
      return Response.json(
        { error: "Provide at least one field to update" },
        { status: 400 }
      );
    }

    const updated = await updatePermissionSet(id, input);
    if (!updated) {
      return Response.json(
        { error: "Permission set not found" },
        { status: 404 }
      );
    }

    logAuditEvent({
      eventType: "permission_set_change",
      actorEmail: authResult.email,
      actorName: authResult.name,
      targetId: id,
      details: { name: updated.name, updatedFields: Object.keys(input) },
    });

    return Response.json({ permissionSet: updated });
  } catch (error) {
    if (error instanceof PermissionSetNameConflictError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    console.error("Admin role patch API error:", error);
    return Response.json(
      { error: "Failed to update permission set" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole("admin");
    if (authResult instanceof Response) return authResult;

    const { id } = await context.params;

    const existing = await getPermissionSetById(id);
    const deleted = await deletePermissionSet(id);
    if (!deleted) {
      return Response.json(
        { error: "Permission set not found" },
        { status: 404 }
      );
    }

    logAuditEvent({
      eventType: "permission_set_deleted",
      actorEmail: authResult.email,
      actorName: authResult.name,
      targetId: id,
      details: { name: existing?.name ?? "unknown" },
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof PermissionSetBuiltInDeleteError) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    console.error("Admin role delete API error:", error);
    return Response.json(
      { error: "Failed to delete permission set" },
      { status: 500 }
    );
  }
}
