import type { UserRole } from "./user-types";
import type { UserRecord } from "./user-types";
import { getPermissionSetCached } from "./permission-sets";

export type Permission =
  | "knowledge:read"
  | "knowledge:write"
  | "knowledge:delete"
  | "skills:read"
  | "skills:write"
  | "skills:delete"
  | "submissions:create"
  | "submissions:read"
  | "submissions:review"
  | "submissions:merge"
  | "bulk_upload:use"
  | "connections:read"
  | "connections:manage"
  | "users:manage"
  | "dashboard:read"
  | "generate:use"
  | "settings:configure";

export const ALL_PERMISSIONS: Permission[] = [
  "knowledge:read", "knowledge:write", "knowledge:delete",
  "skills:read", "skills:write", "skills:delete",
  "submissions:create", "submissions:read", "submissions:review", "submissions:merge",
  "bulk_upload:use",
  "connections:read", "connections:manage",
  "users:manage",
  "dashboard:read",
  "generate:use",
  "settings:configure",
];

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  viewer: [
    "knowledge:read",
    "skills:read",
    "submissions:read",
    "dashboard:read",
  ],
  contributor: [
    "knowledge:read",
    "knowledge:write",
    "skills:read",
    "skills:write",
    "submissions:create",
    "submissions:read",
    "bulk_upload:use",
    "dashboard:read",
    "generate:use",
  ],
  editor: [
    "knowledge:read",
    "knowledge:write",
    "knowledge:delete",
    "skills:read",
    "skills:write",
    "skills:delete",
    "submissions:create",
    "submissions:read",
    "submissions:review",
    "submissions:merge",
    "bulk_upload:use",
    "dashboard:read",
    "generate:use",
  ],
  admin: [
    "knowledge:read",
    "knowledge:write",
    "knowledge:delete",
    "skills:read",
    "skills:write",
    "skills:delete",
    "submissions:create",
    "submissions:read",
    "submissions:review",
    "submissions:merge",
    "bulk_upload:use",
    "connections:read",
    "connections:manage",
    "users:manage",
    "dashboard:read",
    "generate:use",
    "settings:configure",
  ],
} as const;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function requiresReviewQueue(role: UserRole): boolean {
  return role === "contributor" || role === "viewer";
}

export function getPermissions(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

/**
 * Resolve effective permissions for a user. Checks the user's linked
 * permission set first; falls back to the static role-based matrix.
 */
export async function resolvePermissions(
  user: UserRecord
): Promise<readonly Permission[]> {
  if (user.permissionSetId) {
    const cached = await getPermissionSetCached(user.permissionSetId);
    if (cached) return cached.permissions;
  }
  return ROLE_PERMISSIONS[user.role];
}

export async function userHasPermission(
  user: UserRecord,
  permission: Permission
): Promise<boolean> {
  const perms = await resolvePermissions(user);
  return perms.includes(permission);
}
