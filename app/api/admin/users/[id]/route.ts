import { requireRole } from "@/lib/auth-server";
import { getUserById, updateUser } from "@/lib/users";
import { isValidRole, type UserUpdateInput } from "@/lib/user-types";
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
    const user = await getUserById(id);
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }
    return Response.json({ user });
  } catch (error) {
    console.error("Admin user get API error:", error);
    return Response.json({ error: "Failed to fetch user" }, { status: 500 });
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
      role?: unknown;
      active?: unknown;
      permissionSetId?: unknown;
    };

    if (body.role !== undefined && typeof body.role !== "string") {
      return Response.json({ error: "role must be a string" }, { status: 400 });
    }
    if (body.active !== undefined && typeof body.active !== "boolean") {
      return Response.json({ error: "active must be a boolean" }, { status: 400 });
    }
    if (body.permissionSetId !== undefined && typeof body.permissionSetId !== "string") {
      return Response.json({ error: "permissionSetId must be a string" }, { status: 400 });
    }

    const targetUser = await getUserById(id);
    if (!targetUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const input: UserUpdateInput = {};
    if (body.role !== undefined) {
      if (!isValidRole(body.role)) {
        return Response.json({ error: "Invalid role" }, { status: 400 });
      }
      if (authResult.id === id) {
        return Response.json(
          { error: "Cannot modify your own role" },
          { status: 403 }
        );
      }
      input.role = body.role;
    }
    if (body.permissionSetId !== undefined) {
      input.permissionSetId = body.permissionSetId;
    }
    if (body.active !== undefined) {
      input.active = body.active;
    }

    if (Object.keys(input).length === 0) {
      return Response.json(
        { error: "Provide at least one of role, permissionSetId, or active" },
        { status: 400 }
      );
    }

    const updated = await updateUser(id, input);
    if (!updated) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    if (input.role !== undefined && input.role !== targetUser.role) {
      logAuditEvent({
        eventType: "role_change",
        actorEmail: authResult.email,
        actorName: authResult.name,
        targetEmail: targetUser.email,
        targetId: id,
        details: { previousRole: targetUser.role, newRole: input.role },
      });
    }

    if (input.active !== undefined && input.active !== targetUser.active) {
      logAuditEvent({
        eventType: input.active ? "user_activated" : "user_deactivated",
        actorEmail: authResult.email,
        actorName: authResult.name,
        targetEmail: targetUser.email,
        targetId: id,
      });
    }

    return Response.json({ user: updated });
  } catch (error) {
    console.error("Admin user patch API error:", error);
    return Response.json({ error: "Failed to update user" }, { status: 500 });
  }
}
