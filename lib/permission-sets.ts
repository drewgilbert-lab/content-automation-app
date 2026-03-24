import { withWeaviate } from "./weaviate";
import weaviate from "weaviate-client";
import type { WeaviateClient } from "weaviate-client";
import type { Permission } from "./permissions";
import { ALL_PERMISSIONS } from "./permissions";
import type {
  PermissionSetRecord,
  PermissionSetCreateInput,
  PermissionSetUpdateInput,
} from "./permission-set-types";
import { DEFAULT_PERMISSION_SETS } from "./permission-set-types";

const COLLECTION = "PermissionSet";
const CACHE_TTL_MS = 300_000;

const g = globalThis as unknown as {
  __permissionSetCache?: Map<string, PermissionSetRecord>;
  __permissionSetCacheTimestamp?: number;
};

function dateToString(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function mapToRecord(obj: {
  uuid: string;
  properties: Record<string, unknown>;
}): PermissionSetRecord {
  const rawPermissions = obj.properties.permissions;
  const permissions: Permission[] = Array.isArray(rawPermissions)
    ? (rawPermissions as string[]).filter((p): p is Permission =>
        ALL_PERMISSIONS.includes(p as Permission)
      )
    : [];

  return {
    id: obj.uuid,
    name: String(obj.properties.name ?? ""),
    description: String(obj.properties.description ?? ""),
    permissions,
    isBuiltIn: obj.properties.isBuiltIn === true,
    createdAt: dateToString(obj.properties.createdAt),
    updatedAt: dateToString(obj.properties.updatedAt),
  };
}

async function ensurePermissionSetCollection(
  client: WeaviateClient
): Promise<void> {
  const exists = await client.collections.exists(COLLECTION);
  if (!exists) {
    await client.collections.create({
      name: COLLECTION,
      vectorizers: [],
      properties: [
        { name: "name", dataType: "text" as const },
        { name: "description", dataType: "text" as const },
        { name: "permissions", dataType: "text[]" as const },
        { name: "isBuiltIn", dataType: "boolean" as const },
        { name: "createdAt", dataType: "date" as const },
        { name: "updatedAt", dataType: "date" as const },
      ],
    });
    await seedDefaults(client);
  }
}

async function seedDefaults(client: WeaviateClient): Promise<void> {
  const collection = client.collections.use(COLLECTION);
  const now = new Date().toISOString();

  for (const preset of DEFAULT_PERMISSION_SETS) {
    await collection.data.insert({
      name: preset.name,
      description: preset.description,
      permissions: preset.permissions,
      isBuiltIn: true,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function listPermissionSets(): Promise<PermissionSetRecord[]> {
  return withWeaviate(async (client) => {
    await ensurePermissionSetCollection(client);
    const collection = client.collections.use(COLLECTION);
    const result = await collection.query.fetchObjects({ limit: 100 });
    const sets = result.objects.map(mapToRecord);
    sets.sort((a, b) => {
      if (a.isBuiltIn !== b.isBuiltIn) return a.isBuiltIn ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return sets;
  });
}

export async function getPermissionSetById(
  id: string
): Promise<PermissionSetRecord | null> {
  return withWeaviate(async (client) => {
    await ensurePermissionSetCollection(client);
    const collection = client.collections.use(COLLECTION);
    const obj = await collection.query.fetchObjectById(id);
    if (!obj) return null;
    return mapToRecord(obj);
  });
}

export class PermissionSetNameConflictError extends Error {
  constructor(name: string) {
    super(`A permission set named "${name}" already exists`);
    this.name = "PermissionSetNameConflictError";
  }
}

export async function createPermissionSet(
  input: PermissionSetCreateInput
): Promise<PermissionSetRecord> {
  return withWeaviate(async (client) => {
    await ensurePermissionSetCollection(client);
    const collection = client.collections.use(COLLECTION);

    const existing = await collection.query.fetchObjects({
      filters: weaviate.filter.byProperty("name").equal(input.name),
      limit: 1,
    });
    if (existing.objects.length > 0) {
      throw new PermissionSetNameConflictError(input.name);
    }

    const validPermissions = input.permissions.filter((p): p is Permission =>
      ALL_PERMISSIONS.includes(p as Permission)
    );

    const now = new Date().toISOString();
    const id = await collection.data.insert({
      name: input.name,
      description: input.description,
      permissions: validPermissions,
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now,
    });

    invalidatePermissionSetCache();

    return {
      id,
      name: input.name,
      description: input.description,
      permissions: validPermissions,
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now,
    };
  });
}

export async function updatePermissionSet(
  id: string,
  input: PermissionSetUpdateInput
): Promise<PermissionSetRecord | null> {
  return withWeaviate(async (client) => {
    await ensurePermissionSetCollection(client);
    const collection = client.collections.use(COLLECTION);

    const obj = await collection.query.fetchObjectById(id);
    if (!obj) return null;

    const current = mapToRecord(obj);

    if (input.name !== undefined && input.name !== current.name) {
      const existing = await collection.query.fetchObjects({
        filters: weaviate.filter.byProperty("name").equal(input.name),
        limit: 1,
      });
      if (existing.objects.length > 0) {
        throw new PermissionSetNameConflictError(input.name);
      }
    }

    const properties: Record<string, string | string[] | boolean> = {
      updatedAt: new Date().toISOString(),
    };
    if (input.name !== undefined && !current.isBuiltIn) {
      properties.name = input.name;
    }
    if (input.description !== undefined) {
      properties.description = input.description;
    }
    if (input.permissions !== undefined) {
      properties.permissions = input.permissions.filter((p): p is Permission =>
        ALL_PERMISSIONS.includes(p as Permission)
      );
    }

    await collection.data.update({ id, properties });
    invalidatePermissionSetCache();

    const updated = await collection.query.fetchObjectById(id);
    if (!updated) return null;
    return mapToRecord(updated);
  });
}

export class PermissionSetBuiltInDeleteError extends Error {
  constructor() {
    super("Cannot delete a built-in permission set");
    this.name = "PermissionSetBuiltInDeleteError";
  }
}

export async function deletePermissionSet(id: string): Promise<boolean> {
  return withWeaviate(async (client) => {
    await ensurePermissionSetCollection(client);
    const collection = client.collections.use(COLLECTION);

    const obj = await collection.query.fetchObjectById(id);
    if (!obj) return false;

    if (obj.properties.isBuiltIn === true) {
      throw new PermissionSetBuiltInDeleteError();
    }

    await collection.data.deleteById(id);
    invalidatePermissionSetCache();
    return true;
  });
}

// ─── Permission set cache ──────────────────────────────────────────────────────

export async function getPermissionSetCached(
  id: string
): Promise<PermissionSetRecord | null> {
  const now = Date.now();
  const ts = g.__permissionSetCacheTimestamp ?? 0;
  if (!g.__permissionSetCache || now - ts > CACHE_TTL_MS) {
    await refreshPermissionSetCache();
  }
  return g.__permissionSetCache?.get(id) ?? null;
}

export async function refreshPermissionSetCache(): Promise<void> {
  const cache = new Map<string, PermissionSetRecord>();
  await withWeaviate(async (client) => {
    await ensurePermissionSetCollection(client);
    const collection = client.collections.use(COLLECTION);
    const result = await collection.query.fetchObjects({ limit: 100 });
    for (const obj of result.objects) {
      const record = mapToRecord(obj);
      cache.set(record.id, record);
    }
  });
  g.__permissionSetCache = cache;
  g.__permissionSetCacheTimestamp = Date.now();
}

export function invalidatePermissionSetCache(): void {
  g.__permissionSetCacheTimestamp = 0;
}
