export type UserRole = "admin" | "editor" | "contributor" | "viewer";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  role: UserRole;
  active: boolean;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserCreateInput {
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface UserUpdateInput {
  name?: string;
  avatarUrl?: string;
  role?: UserRole;
  active?: boolean;
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 0,
  contributor: 1,
  editor: 2,
  admin: 3,
};

export const VALID_ROLES: UserRole[] = ["admin", "editor", "contributor", "viewer"];

export function isValidRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role as UserRole);
}

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
