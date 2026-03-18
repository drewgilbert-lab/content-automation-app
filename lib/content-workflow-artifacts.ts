import { Redis } from "@upstash/redis";
import {
  type ArtifactType,
  type PillarResearchArtifact,
  validateArtifactFields,
} from "./content-workflow-types";
import { enforceArtifactOutputBudget } from "./content-workflow-budget";

const ARTIFACT_KEY_PREFIX = "content-workflow:artifact:";
const RUN_ARTIFACT_INDEX_PREFIX = "content-workflow:run-artifacts:";
const ARTIFACT_TTL_SECONDS = 30 * 24 * 60 * 60;

let redis: Redis | null = null;
let redisInitialized = false;

function getRedis(): Redis | null {
  if (redisInitialized) return redis;
  redisInitialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn(
      "Content workflow artifacts: Redis not configured, falling back to in-memory store"
    );
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

const g = globalThis as unknown as {
  __contentWorkflowArtifacts?: {
    artifacts: Map<string, PillarResearchArtifact>;
    runArtifactIds: Map<string, string[]>;
  };
};

if (!g.__contentWorkflowArtifacts) {
  g.__contentWorkflowArtifacts = {
    artifacts: new Map<string, PillarResearchArtifact>(),
    runArtifactIds: new Map<string, string[]>(),
  };
}

const fallback = g.__contentWorkflowArtifacts;

function keyArtifact(id: string): string {
  return `${ARTIFACT_KEY_PREFIX}${id}`;
}

function keyRunArtifacts(runId: string): string {
  return `${RUN_ARTIFACT_INDEX_PREFIX}${runId}`;
}

async function writeWithTtl(r: Redis, key: string, value: unknown): Promise<void> {
  await r.set(key, value, { ex: ARTIFACT_TTL_SECONDS });
}

async function readJsonArray(r: Redis, key: string): Promise<string[]> {
  const value = await r.get<string[] | string>(key);
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function indexArtifactByRun(runId: string, artifactId: string): Promise<void> {
  const r = getRedis();
  if (r) {
    const key = keyRunArtifacts(runId);
    const ids = await readJsonArray(r, key);
    if (!ids.includes(artifactId)) {
      ids.push(artifactId);
      await writeWithTtl(r, key, ids);
    }
    return;
  }

  const ids = fallback.runArtifactIds.get(runId) ?? [];
  if (!ids.includes(artifactId)) {
    fallback.runArtifactIds.set(runId, [...ids, artifactId]);
  }
}

export type CreateArtifactInput<T extends ArtifactType = ArtifactType> = Omit<
  PillarResearchArtifact<T>,
  "id" | "createdAt"
> & {
  id?: string;
  createdAt?: string;
};

export async function createArtifact<T extends ArtifactType>(
  input: CreateArtifactInput<T>
): Promise<PillarResearchArtifact<T>> {
  const artifactBase: PillarResearchArtifact<T> = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  const enforced = enforceArtifactOutputBudget(artifactBase);
  const artifact = enforced.artifact;

  const validation = validateArtifactFields(
    artifact as Partial<PillarResearchArtifact>
  );
  if (!validation.valid) {
    throw new Error(validation.errors.join("; "));
  }

  if (artifact.previousArtifactId) {
    const previous = await getArtifact(artifact.previousArtifactId);
    if (!previous) {
      throw new Error("previousArtifactId does not exist");
    }
    if (previous.runId !== artifact.runId) {
      throw new Error("previousArtifactId must belong to the same run");
    }
    if (previous.artifactType !== artifact.artifactType) {
      throw new Error("previousArtifactId must match artifactType");
    }
    if (artifact.version <= previous.version) {
      throw new Error("version must be greater than previous artifact version");
    }
  } else if (artifact.version !== 1) {
    throw new Error("version must be 1 when previousArtifactId is not set");
  }

  const existing = await listArtifactsByRunAndType(
    artifact.runId,
    artifact.artifactType
  );
  const duplicateVersion = existing.find(
    (candidate) =>
      candidate.name === artifact.name && candidate.version === artifact.version
  );
  if (duplicateVersion) {
    throw new Error(
      `artifact version already exists for name "${artifact.name}" and type "${artifact.artifactType}"`
    );
  }

  const r = getRedis();
  if (r) {
    await writeWithTtl(r, keyArtifact(artifact.id), artifact);
  } else {
    fallback.artifacts.set(artifact.id, artifact);
  }
  await indexArtifactByRun(artifact.runId, artifact.id);

  return artifact;
}

export async function getArtifact(
  artifactId: string
): Promise<PillarResearchArtifact | null> {
  const r = getRedis();
  if (r) {
    const artifact = await r.get<PillarResearchArtifact>(keyArtifact(artifactId));
    return artifact ?? null;
  }
  return fallback.artifacts.get(artifactId) ?? null;
}

export async function listArtifactsByRun(
  runId: string
): Promise<PillarResearchArtifact[]> {
  const r = getRedis();
  if (r) {
    const ids = await readJsonArray(r, keyRunArtifacts(runId));
    if (ids.length === 0) return [];
    const artifacts = await Promise.all(
      ids.map((id) => r.get<PillarResearchArtifact>(keyArtifact(id)))
    );
    return artifacts.filter((item): item is PillarResearchArtifact => Boolean(item));
  }

  const ids = fallback.runArtifactIds.get(runId) ?? [];
  return ids
    .map((id) => fallback.artifacts.get(id))
    .filter((item): item is PillarResearchArtifact => Boolean(item));
}

export async function listArtifactsByRunAndType<T extends ArtifactType>(
  runId: string,
  artifactType: T
): Promise<PillarResearchArtifact<T>[]> {
  const all = await listArtifactsByRun(runId);
  return all.filter(
    (artifact): artifact is PillarResearchArtifact<T> =>
      artifact.artifactType === artifactType
  );
}

export async function getLatestArtifactForNameAndType(
  runId: string,
  artifactType: ArtifactType,
  name: string
): Promise<PillarResearchArtifact | null> {
  const artifacts = await listArtifactsByRunAndType(runId, artifactType);
  const candidates = artifacts
    .filter((artifact) => artifact.name === name)
    .sort((a, b) => b.version - a.version);
  return candidates[0] ?? null;
}

export async function _clearAllArtifacts(): Promise<void> {
  const r = getRedis();
  if (r) {
    let cursor = "0";
    do {
      const [nextCursor, keys]: [string, string[]] = await r.scan(cursor, {
        match: "content-workflow:*",
        count: 200,
      });
      cursor = nextCursor;
      if (keys.length > 0) {
        await r.del(...keys);
      }
    } while (cursor !== "0");
  }

  fallback.artifacts.clear();
  fallback.runArtifactIds.clear();
}

export function _setRedisForWorkflowArtifactsTesting(client: Redis | null): void {
  redis = client;
  redisInitialized = true;
}
