import { withWeaviate } from "./weaviate";
import weaviate from "weaviate-client";
import type { WeaviateClient } from "weaviate-client";
import type { UserRecord, UserRole, UserUpdateInput } from "./user-types";

const COLLECTION = "User";
const CACHE_TTL_MS = 300_000;

const g = globalThis as unknown as {
  __userCache?: Map<string, UserRecord>;
  __userCacheTimestamp?: number;
};

function dateToString(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function mapToUserRecord(obj: {
  uuid: string;
  properties: Record<string, unknown>;
}): UserRecord {
  return {
    id: obj.uuid,
    email: String(obj.properties.email ?? ""),
    name: String(obj.properties.name ?? ""),
    avatarUrl: String(obj.properties.avatarUrl ?? ""),
    role: String(obj.properties.role ?? "contributor") as UserRole,
    active: obj.properties.active === true,
    lastLoginAt: dateToString(obj.properties.lastLoginAt),
    createdAt: dateToString(obj.properties.createdAt),
    updatedAt: dateToString(obj.properties.updatedAt),
  };
}

async function ensureUserCollection(client: WeaviateClient): Promise<void> {
  const exists = await client.collections.exists(COLLECTION);
  if (!exists) {
    await client.collections.create({
      name: COLLECTION,
      vectorizers: [],
      properties: [
        { name: "email", dataType: "text" as const },
        { name: "name", dataType: "text" as const },
        { name: "avatarUrl", dataType: "text" as const },
        { name: "role", dataType: "text" as const },
        { name: "active", dataType: "boolean" as const },
        { name: "lastLoginAt", dataType: "date" as const },
        { name: "createdAt", dataType: "date" as const },
        { name: "updatedAt", dataType: "date" as const },
      ],
    });
  }
}

export async function getOrCreateUser(
  email: string,
  name: string,
  avatarUrl?: string
): Promise<UserRecord> {
  return withWeaviate(async (client) => {
    await ensureUserCollection(client);
    const collection = client.collections.use(COLLECTION);

    const existing = await collection.query.fetchObjects({
      filters: weaviate.filter.byProperty("email").equal(email),
      limit: 1,
    });

    if (existing.objects.length > 0) {
      const obj = existing.objects[0];
      const current = mapToUserRecord(obj);
      const now = new Date().toISOString();

      const updates: Record<string, string | boolean> = { lastLoginAt: now, updatedAt: now };
      if (name && name !== current.name) updates.name = name;
      if (avatarUrl !== undefined && avatarUrl !== current.avatarUrl) updates.avatarUrl = avatarUrl;

      await collection.data.update({ id: obj.uuid, properties: updates });

      return {
        ...current,
        ...updates,
        lastLoginAt: now,
        updatedAt: now,
      } as UserRecord;
    }

    const now = new Date().toISOString();
    let role: UserRole = "contributor";

    const anyUsers = await collection.query.fetchObjects({ limit: 1 });
    if (anyUsers.objects.length === 0) {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (!adminEmail || email === adminEmail) {
        role = "admin";
      }
    }

    const id = await collection.data.insert({
      email,
      name,
      avatarUrl: avatarUrl ?? "",
      role,
      active: true,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    });

    invalidateUserCache();

    return {
      id,
      email,
      name,
      avatarUrl: avatarUrl ?? "",
      role,
      active: true,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    };
  });
}

export async function getUserByEmail(
  email: string
): Promise<UserRecord | null> {
  return withWeaviate(async (client) => {
    await ensureUserCollection(client);
    const collection = client.collections.use(COLLECTION);

    const result = await collection.query.fetchObjects({
      filters: weaviate.filter.byProperty("email").equal(email),
      limit: 1,
    });

    if (result.objects.length === 0) return null;
    return mapToUserRecord(result.objects[0]);
  });
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  return withWeaviate(async (client) => {
    await ensureUserCollection(client);
    const collection = client.collections.use(COLLECTION);

    const obj = await collection.query.fetchObjectById(id);
    if (!obj) return null;
    return mapToUserRecord(obj);
  });
}

export async function listUsers(): Promise<UserRecord[]> {
  return withWeaviate(async (client) => {
    await ensureUserCollection(client);
    const collection = client.collections.use(COLLECTION);

    const result = await collection.query.fetchObjects({ limit: 1000 });
    const users = result.objects.map(mapToUserRecord);
    users.sort((a, b) => a.name.localeCompare(b.name));
    return users;
  });
}

export async function updateUser(
  id: string,
  input: UserUpdateInput
): Promise<UserRecord | null> {
  return withWeaviate(async (client) => {
    await ensureUserCollection(client);
    const collection = client.collections.use(COLLECTION);

    const obj = await collection.query.fetchObjectById(id);
    if (!obj) return null;

    const properties: Record<string, string | boolean> = {
      updatedAt: new Date().toISOString(),
    };
    if (input.name !== undefined) properties.name = input.name;
    if (input.avatarUrl !== undefined) properties.avatarUrl = input.avatarUrl;
    if (input.role !== undefined) properties.role = input.role;
    if (input.active !== undefined) properties.active = input.active;

    await collection.data.update({ id, properties });

    invalidateUserCache();

    const updated = await collection.query.fetchObjectById(id);
    if (!updated) return null;
    return mapToUserRecord(updated);
  });
}

export async function updateUserRole(
  id: string,
  role: UserRole
): Promise<UserRecord | null> {
  return updateUser(id, { role });
}

export async function deactivateUser(
  id: string
): Promise<UserRecord | null> {
  const result = await updateUser(id, { active: false });
  invalidateUserCache();
  return result;
}

export async function activateUser(
  id: string
): Promise<UserRecord | null> {
  const result = await updateUser(id, { active: true });
  invalidateUserCache();
  return result;
}

// ─── User cache ────────────────────────────────────────────────────────────────

export async function getUserCached(
  email: string
): Promise<UserRecord | null> {
  const now = Date.now();
  const ts = g.__userCacheTimestamp ?? 0;
  if (!g.__userCache || now - ts > CACHE_TTL_MS) {
    await refreshUserCache();
  }
  return g.__userCache?.get(email) ?? null;
}

export async function refreshUserCache(): Promise<void> {
  const cache = new Map<string, UserRecord>();
  await withWeaviate(async (client) => {
    await ensureUserCollection(client);
    const collection = client.collections.use(COLLECTION);
    const result = await collection.query.fetchObjects({ limit: 1000 });
    for (const obj of result.objects) {
      const user = mapToUserRecord(obj);
      cache.set(user.email, user);
    }
  });
  g.__userCache = cache;
  g.__userCacheTimestamp = Date.now();
}

export function invalidateUserCache(): void {
  g.__userCacheTimestamp = 0;
}
