import type { UserRole } from "./user-types";

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

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
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
