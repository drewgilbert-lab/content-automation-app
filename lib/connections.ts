import { withWeaviate } from "./weaviate";
import weaviate from "weaviate-client";
import type {
  ConnectedSystemListItem,
  ConnectedSystemDetail,
  ConnectedSystemCreateInput,
  ConnectedSystemUpdateInput,
} from "./connection-types";
import { generateApiKey, invalidateApiKeyCache } from "./api-auth";

export type {
  ConnectedSystemListItem,
  ConnectedSystemDetail,
  ConnectedSystemCreateInput,
  ConnectedSystemUpdateInput,
};
export {
  RATE_LIMIT_TIERS,
  PERMISSIONS,
  getRateLimitTierLabel,
} from "./connection-types";

const COLLECTION = "ConnectedSystem";

function dateToString(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

export class ConnectedSystemNameConflictError extends Error {
  constructor(name: string) {
    super(`A connected system named "${name}" already exists`);
    this.name = "ConnectedSystemNameConflictError";
  }
}

function mapToListItem(obj: {
  uuid: string;
  properties: Record<string, unknown>;
}): ConnectedSystemListItem {
  return {
    id: obj.uuid,
    name: String(obj.properties.name ?? ""),
    description: String(obj.properties.description ?? ""),
    apiKeyPrefix: String(obj.properties.apiKeyPrefix ?? ""),
    permissions: (obj.properties.permissions as string[]) ?? [],
    subscribedTypes: (obj.properties.subscribedTypes as string[]) ?? [],
    rateLimitTier: String(obj.properties.rateLimitTier ?? "standard"),
    active: obj.properties.active === true,
    createdAt: dateToString(obj.properties.createdAt),
    updatedAt: dateToString(obj.properties.updatedAt),
  };
}

export async function listConnectedSystems(filters?: {
  active?: boolean;
}): Promise<ConnectedSystemListItem[]> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const result = await collection.query.fetchObjects({ limit: 1000 });

    let items: ConnectedSystemListItem[] = result.objects.map((obj) =>
      mapToListItem(obj)
    );

    if (filters?.active !== undefined) {
      items = items.filter((s) => s.active === filters.active);
    }

    items.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return items;
  });
}

export async function getConnectedSystem(
  id: string
): Promise<ConnectedSystemDetail | null> {
  return withWeaviate(async (client) => {
    try {
      const collection = client.collections.use(COLLECTION);
      const obj = await collection.query.fetchObjectById(id);

      if (!obj) return null;

      return mapToListItem(obj);
    } catch {
      return null;
    }
  });
}

export async function createConnectedSystem(
  input: ConnectedSystemCreateInput
): Promise<{ id: string; plaintextKey: string }> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);

    const existing = await collection.query.fetchObjects({
      filters: weaviate.filter.byProperty("name").equal(input.name),
      limit: 1,
    });

    if (existing.objects.length > 0) {
      throw new ConnectedSystemNameConflictError(input.name);
    }

    const { plaintextKey, hash, prefix } = generateApiKey();
    const now = new Date().toISOString();

    const properties: Record<string, string | string[] | boolean> = {
      name: input.name,
      description: input.description,
      apiKeyHash: hash,
      apiKeyPrefix: prefix,
      permissions: ["read"],
      subscribedTypes: input.subscribedTypes ?? ["*"],
      rateLimitTier: input.rateLimitTier ?? "standard",
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    const id = await collection.data.insert(properties);
    invalidateApiKeyCache();
    return { id, plaintextKey };
  });
}

export async function updateConnectedSystem(
  id: string,
  input: ConnectedSystemUpdateInput
): Promise<ConnectedSystemDetail | null> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);

    const obj = await collection.query.fetchObjectById(id);
    if (!obj) return null;

    if (input.name) {
      const existing = await collection.query.fetchObjects({
        filters: weaviate.filter.byProperty("name").equal(input.name),
        limit: 1,
      });
      if (existing.objects.length > 0 && existing.objects[0].uuid !== id) {
        throw new ConnectedSystemNameConflictError(input.name);
      }
    }

    const properties: Record<string, string | string[] | boolean> = {
      updatedAt: new Date().toISOString(),
    };

    if (input.name !== undefined) properties.name = input.name;
    if (input.description !== undefined) properties.description = input.description;
    if (input.subscribedTypes !== undefined)
      properties.subscribedTypes = input.subscribedTypes;
    if (input.rateLimitTier !== undefined)
      properties.rateLimitTier = input.rateLimitTier;

    await collection.data.update({ id, properties });

    const updated = await collection.query.fetchObjectById(id);
    return updated ? mapToListItem(updated) : null;
  });
}

export async function deleteConnectedSystem(id: string): Promise<boolean> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const obj = await collection.query.fetchObjectById(id);
    if (!obj) return false;

    await collection.data.deleteById(id);
    invalidateApiKeyCache();
    return true;
  });
}

export async function activateConnectedSystem(id: string): Promise<boolean> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const obj = await collection.query.fetchObjectById(id);
    if (!obj) return false;

    await collection.data.update({
      id,
      properties: { active: true, updatedAt: new Date().toISOString() },
    });
    invalidateApiKeyCache();
    return true;
  });
}

export async function deactivateConnectedSystem(id: string): Promise<boolean> {
  return withWeaviate(async (client) => {
    const collection = client.collections.use(COLLECTION);
    const obj = await collection.query.fetchObjectById(id);
    if (!obj) return false;

    await collection.data.update({
      id,
      properties: { active: false, updatedAt: new Date().toISOString() },
    });
    invalidateApiKeyCache();
    return true;
  });
}
