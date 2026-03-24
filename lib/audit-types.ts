export type AuditEventType =
  | "sign_in"
  | "sign_out"
  | "sign_in_failed"
  | "role_change"
  | "user_activated"
  | "user_deactivated"
  | "permission_set_change"
  | "permission_set_created"
  | "permission_set_deleted";

export interface AuditLogRecord {
  id: string;
  eventType: AuditEventType;
  actorEmail: string;
  actorName: string;
  targetEmail: string;
  targetId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface AuditLogCreateInput {
  eventType: AuditEventType;
  actorEmail: string;
  actorName?: string;
  targetEmail?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export const AUDIT_EVENT_LABELS: Record<AuditEventType, string> = {
  sign_in: "Sign In",
  sign_out: "Sign Out",
  sign_in_failed: "Sign In Failed",
  role_change: "Role Change",
  user_activated: "User Activated",
  user_deactivated: "User Deactivated",
  permission_set_change: "Permission Set Updated",
  permission_set_created: "Permission Set Created",
  permission_set_deleted: "Permission Set Deleted",
};

const VALID_EVENT_TYPES: AuditEventType[] = [
  "sign_in", "sign_out", "sign_in_failed",
  "role_change", "user_activated", "user_deactivated",
  "permission_set_change", "permission_set_created", "permission_set_deleted",
];

export function isValidAuditEventType(value: string): value is AuditEventType {
  return VALID_EVENT_TYPES.includes(value as AuditEventType);
}
