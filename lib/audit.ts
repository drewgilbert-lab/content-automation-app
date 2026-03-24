import { withWeaviate } from "./weaviate";
import weaviate from "weaviate-client";
import type { WeaviateClient } from "weaviate-client";
import type { AuditLogRecord, AuditLogCreateInput } from "./audit-types";

const COLLECTION = "AuditLog";

function dateToString(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function mapToRecord(obj: {
  uuid: string;
  properties: Record<string, unknown>;
}): AuditLogRecord {
  return {
    id: obj.uuid,
    eventType: String(obj.properties.eventType ?? "") as AuditLogRecord["eventType"],
    actorEmail: String(obj.properties.actorEmail ?? ""),
    actorName: String(obj.properties.actorName ?? ""),
    targetEmail: String(obj.properties.targetEmail ?? ""),
    targetId: String(obj.properties.targetId ?? ""),
    details: String(obj.properties.details ?? ""),
    ipAddress: String(obj.properties.ipAddress ?? ""),
    timestamp: dateToString(obj.properties.timestamp),
  };
}

async function ensureAuditLogCollection(
  client: WeaviateClient
): Promise<void> {
  const exists = await client.collections.exists(COLLECTION);
  if (!exists) {
    await client.collections.create({
      name: COLLECTION,
      vectorizers: [],
      properties: [
        { name: "eventType", dataType: "text" as const },
        { name: "actorEmail", dataType: "text" as const },
        { name: "actorName", dataType: "text" as const },
        { name: "targetEmail", dataType: "text" as const },
        { name: "targetId", dataType: "text" as const },
        { name: "details", dataType: "text" as const },
        { name: "ipAddress", dataType: "text" as const },
        { name: "timestamp", dataType: "date" as const },
      ],
    });
  }
}

/**
 * Fire-and-forget audit event writer. Never throws — failures are silently
 * swallowed so audit logging can never break the primary operation.
 */
export function logAuditEvent(input: AuditLogCreateInput): void {
  void logAuditEventAsync(input).catch(() => {
    // intentionally swallowed
  });
}

async function logAuditEventAsync(
  input: AuditLogCreateInput
): Promise<void> {
  await withWeaviate(async (client) => {
    await ensureAuditLogCollection(client);
    const collection = client.collections.use(COLLECTION);
    await collection.data.insert({
      eventType: input.eventType,
      actorEmail: input.actorEmail,
      actorName: input.actorName ?? "",
      targetEmail: input.targetEmail ?? "",
      targetId: input.targetId ?? "",
      details: input.details ? JSON.stringify(input.details) : "",
      ipAddress: input.ipAddress ?? "",
      timestamp: new Date().toISOString(),
    });
  });
}

export interface AuditLogQueryOptions {
  eventType?: string;
  actorEmail?: string;
  limit?: number;
  offset?: number;
}

export async function listAuditEvents(
  options: AuditLogQueryOptions = {}
): Promise<{ events: AuditLogRecord[]; total: number }> {
  const limit = Math.min(options.limit ?? 50, 200);
  const offset = options.offset ?? 0;

  return withWeaviate(async (client) => {
    await ensureAuditLogCollection(client);
    const collection = client.collections.use(COLLECTION);

    type FetchOptions = Parameters<typeof collection.query.fetchObjects>[0];
    const queryOptions: FetchOptions = { limit: 1000 };

    if (options.eventType) {
      queryOptions.filters = weaviate.filter
        .byProperty("eventType")
        .equal(options.eventType);
    }

    const result = await collection.query.fetchObjects(queryOptions);
    let events = result.objects.map(mapToRecord);

    if (options.actorEmail) {
      const actor = options.actorEmail.toLowerCase();
      events = events.filter((e) => e.actorEmail.toLowerCase().includes(actor));
    }

    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const total = events.length;
    const paged = events.slice(offset, offset + limit);

    return { events: paged, total };
  });
}

export async function getAuditEventCount(): Promise<number> {
  return withWeaviate(async (client) => {
    await ensureAuditLogCollection(client);
    const collection = client.collections.use(COLLECTION);
    const result = await collection.query.fetchObjects({ limit: 1000 });
    return result.objects.length;
  });
}
