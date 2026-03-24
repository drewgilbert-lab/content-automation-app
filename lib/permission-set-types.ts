import type { Permission } from "./permissions";

export interface PermissionSetRecord {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionSetCreateInput {
  name: string;
  description: string;
  permissions: Permission[];
}

export interface PermissionSetUpdateInput {
  name?: string;
  description?: string;
  permissions?: Permission[];
}

export const DEFAULT_PERMISSION_SETS: Omit<PermissionSetRecord, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "Admin",
    description: "Full platform access including user management and system configuration",
    permissions: [
      "knowledge:read", "knowledge:write", "knowledge:delete",
      "skills:read", "skills:write", "skills:delete",
      "submissions:create", "submissions:read", "submissions:review", "submissions:merge",
      "bulk_upload:use",
      "connections:read", "connections:manage",
      "users:manage",
      "dashboard:read",
      "generate:use",
      "settings:configure",
    ],
    isBuiltIn: true,
  },
  {
    name: "Editor",
    description: "Content governance — review, approve, and create content directly",
    permissions: [
      "knowledge:read", "knowledge:write", "knowledge:delete",
      "skills:read", "skills:write", "skills:delete",
      "submissions:create", "submissions:read", "submissions:review", "submissions:merge",
      "bulk_upload:use",
      "dashboard:read",
      "generate:use",
    ],
    isBuiltIn: true,
  },
  {
    name: "Contributor",
    description: "Propose changes via the review queue",
    permissions: [
      "knowledge:read", "knowledge:write",
      "skills:read", "skills:write",
      "submissions:create", "submissions:read",
      "bulk_upload:use",
      "dashboard:read",
      "generate:use",
    ],
    isBuiltIn: true,
  },
  {
    name: "Viewer",
    description: "Read-only access to knowledge objects, skills, and dashboard",
    permissions: [
      "knowledge:read",
      "skills:read",
      "submissions:read",
      "dashboard:read",
    ],
    isBuiltIn: true,
  },
];
