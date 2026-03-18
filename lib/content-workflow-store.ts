import { Redis } from "@upstash/redis";
import {
  BRANCH_TYPES,
  type BranchStatus,
  type BranchType,
  canTransitionBranchStatus,
  canTransitionRunStatus,
  canTransitionStepStatus,
  type CreateRunInput,
  type PillarResearchBranch,
  type PillarResearchRun,
  type PillarResearchStep,
  type RunStatus,
  type StepStatus,
  validateCreateRunInput,
} from "./content-workflow-types";

const STORE_KEY_PREFIX = "content-workflow:";
const RUN_KEY_PREFIX = `${STORE_KEY_PREFIX}run:`;
const BRANCH_KEY_PREFIX = `${STORE_KEY_PREFIX}branch:`;
const STEP_KEY_PREFIX = `${STORE_KEY_PREFIX}step:`;
const IDEMPOTENCY_KEY_PREFIX = `${STORE_KEY_PREFIX}idempotency:`;
const RUN_BRANCH_INDEX_PREFIX = `${STORE_KEY_PREFIX}run-branches:`;
const RUN_STEP_INDEX_PREFIX = `${STORE_KEY_PREFIX}run-steps:`;
const RUN_TTL_SECONDS = 7 * 24 * 60 * 60;

let redis: Redis | null = null;
let redisInitialized = false;

function getRedis(): Redis | null {
  if (redisInitialized) return redis;
  redisInitialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn(
      "Content workflow store: Redis not configured, falling back to in-memory store"
    );
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

interface InMemoryStore {
  runs: Map<string, PillarResearchRun>;
  branches: Map<string, PillarResearchBranch>;
  steps: Map<string, PillarResearchStep>;
  idempotency: Map<string, string>;
  runBranchIds: Map<string, string[]>;
  runStepIds: Map<string, string[]>;
}

const g = globalThis as unknown as {
  __contentWorkflowStore?: InMemoryStore;
};

if (!g.__contentWorkflowStore) {
  g.__contentWorkflowStore = {
    runs: new Map<string, PillarResearchRun>(),
    branches: new Map<string, PillarResearchBranch>(),
    steps: new Map<string, PillarResearchStep>(),
    idempotency: new Map<string, string>(),
    runBranchIds: new Map<string, string[]>(),
    runStepIds: new Map<string, string[]>(),
  };
}

const fallback = g.__contentWorkflowStore;

function keyRun(id: string): string {
  return `${RUN_KEY_PREFIX}${id}`;
}
function keyBranch(id: string): string {
  return `${BRANCH_KEY_PREFIX}${id}`;
}
function keyStep(id: string): string {
  return `${STEP_KEY_PREFIX}${id}`;
}
function keyIdempotency(idempotencyKey: string): string {
  return `${IDEMPOTENCY_KEY_PREFIX}${idempotencyKey}`;
}
function keyRunBranches(runId: string): string {
  return `${RUN_BRANCH_INDEX_PREFIX}${runId}`;
}
function keyRunSteps(runId: string): string {
  return `${RUN_STEP_INDEX_PREFIX}${runId}`;
}

async function writeWithTtl(r: Redis, key: string, value: unknown): Promise<void> {
  await r.set(key, value, { ex: RUN_TTL_SECONDS });
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

async function appendIndex(
  r: Redis,
  indexKey: string,
  id: string
): Promise<void> {
  const existing = await readJsonArray(r, indexKey);
  if (!existing.includes(id)) {
    existing.push(id);
    await writeWithTtl(r, indexKey, existing);
  }
}

export async function getRunByIdempotencyKey(
  idempotencyKey: string
): Promise<PillarResearchRun | null> {
  const r = getRedis();
  if (r) {
    const runId = await r.get<string>(keyIdempotency(idempotencyKey));
    if (!runId) return null;
    const run = await r.get<PillarResearchRun>(keyRun(runId));
    return run ?? null;
  }

  const runId = fallback.idempotency.get(idempotencyKey);
  if (!runId) return null;
  return fallback.runs.get(runId) ?? null;
}

export async function createWorkflowRun(
  input: CreateRunInput
): Promise<{ run: PillarResearchRun; deduped: boolean }> {
  const validation = validateCreateRunInput(input);
  if (!validation.valid) {
    throw new Error(validation.errors.join("; "));
  }

  const normalizedIdempotency =
    input.idempotencyKey?.trim() || crypto.randomUUID();
  const existing = await getRunByIdempotencyKey(normalizedIdempotency);
  if (existing) {
    return { run: existing, deduped: true };
  }

  const now = new Date().toISOString();
  const run: PillarResearchRun = {
    id: crypto.randomUUID(),
    status: "created",
    inputType: input.inputType,
    inputValue: input.inputValue.trim(),
    createdBy: input.createdBy.trim(),
    startedAt: now,
    idempotencyKey: normalizedIdempotency,
  };

  const r = getRedis();
  if (r) {
    await writeWithTtl(r, keyRun(run.id), run);
    await writeWithTtl(r, keyIdempotency(normalizedIdempotency), run.id);
  } else {
    fallback.runs.set(run.id, run);
    fallback.idempotency.set(normalizedIdempotency, run.id);
  }

  await ensureDefaultBranches(run.id);
  return { run, deduped: false };
}

async function ensureDefaultBranches(runId: string): Promise<void> {
  const existing = await listBranchesByRun(runId);
  if (existing.length > 0) return;

  await Promise.all(
    BRANCH_TYPES.map((branchType) =>
      upsertBranch({
        id: crypto.randomUUID(),
        runId,
        branchType,
        status: "pending",
        attemptCount: 0,
        startedAt: new Date().toISOString(),
      })
    )
  );
}

export async function getWorkflowRun(id: string): Promise<PillarResearchRun | null> {
  const r = getRedis();
  if (r) {
    const run = await r.get<PillarResearchRun>(keyRun(id));
    return run ?? null;
  }
  return fallback.runs.get(id) ?? null;
}

export async function updateRunStatus(
  runId: string,
  nextStatus: RunStatus,
  errorSummary?: string
): Promise<PillarResearchRun | null> {
  const run = await getWorkflowRun(runId);
  if (!run) return null;

  if (run.status !== nextStatus && !canTransitionRunStatus(run.status, nextStatus)) {
    throw new Error(`Invalid run status transition: ${run.status} -> ${nextStatus}`);
  }

  const updated: PillarResearchRun = {
    ...run,
    status: nextStatus,
    ...(nextStatus === "completed" ? { completedAt: new Date().toISOString() } : {}),
    ...(errorSummary ? { errorSummary } : {}),
  };

  const r = getRedis();
  if (r) {
    await writeWithTtl(r, keyRun(runId), updated);
  } else {
    fallback.runs.set(runId, updated);
  }

  return updated;
}

export async function cancelRun(runId: string): Promise<PillarResearchRun | null> {
  const run = await getWorkflowRun(runId);
  if (!run) return null;
  if (run.status === "completed" || run.status === "failed") return run;

  const updatedRun = await updateRunStatus(runId, "cancelled");
  const branches = await listBranchesByRun(runId);
  const steps = await listStepsByRun(runId);

  await Promise.all(
    branches
      .filter((branch) => !["completed", "failed", "cancelled"].includes(branch.status))
      .map((branch) => setBranchStatus(branch.id, "cancelled"))
  );
  await Promise.all(
    steps
      .filter((step) => !["completed", "failed", "cancelled"].includes(step.status))
      .map((step) => setStepStatus(step.id, "cancelled"))
  );

  return updatedRun;
}

export async function upsertBranch(
  branch: PillarResearchBranch
): Promise<PillarResearchBranch> {
  const r = getRedis();
  if (r) {
    await writeWithTtl(r, keyBranch(branch.id), branch);
    await appendIndex(r, keyRunBranches(branch.runId), branch.id);
  } else {
    fallback.branches.set(branch.id, branch);
    const existing = fallback.runBranchIds.get(branch.runId) ?? [];
    if (!existing.includes(branch.id)) {
      fallback.runBranchIds.set(branch.runId, [...existing, branch.id]);
    }
  }
  return branch;
}

export async function listBranchesByRun(
  runId: string
): Promise<PillarResearchBranch[]> {
  const r = getRedis();
  if (r) {
    const ids = await readJsonArray(r, keyRunBranches(runId));
    if (ids.length === 0) return [];
    const branches = await Promise.all(
      ids.map((id) => r.get<PillarResearchBranch>(keyBranch(id)))
    );
    return branches.filter((branch): branch is PillarResearchBranch => Boolean(branch));
  }

  const ids = fallback.runBranchIds.get(runId) ?? [];
  return ids
    .map((id) => fallback.branches.get(id))
    .filter((branch): branch is PillarResearchBranch => Boolean(branch));
}

export async function getBranchById(
  branchId: string
): Promise<PillarResearchBranch | null> {
  const r = getRedis();
  if (r) {
    const branch = await r.get<PillarResearchBranch>(keyBranch(branchId));
    return branch ?? null;
  }
  return fallback.branches.get(branchId) ?? null;
}

export async function setBranchStatus(
  branchId: string,
  nextStatus: BranchStatus,
  error?: string
): Promise<PillarResearchBranch | null> {
  const branches = getRedis()
    ? await getRedis()!.get<PillarResearchBranch>(keyBranch(branchId))
    : fallback.branches.get(branchId);
  if (!branches) return null;

  if (
    branches.status !== nextStatus &&
    !canTransitionBranchStatus(branches.status, nextStatus)
  ) {
    throw new Error(
      `Invalid branch status transition: ${branches.status} -> ${nextStatus}`
    );
  }

  const updated: PillarResearchBranch = {
    ...branches,
    status: nextStatus,
    ...(nextStatus === "completed" ? { completedAt: new Date().toISOString() } : {}),
    ...(error ? { lastError: error } : {}),
  };

  await upsertBranch(updated);
  return updated;
}

export async function upsertStep(step: PillarResearchStep): Promise<PillarResearchStep> {
  const r = getRedis();
  if (r) {
    await writeWithTtl(r, keyStep(step.id), step);
    await appendIndex(r, keyRunSteps(step.runId), step.id);
  } else {
    fallback.steps.set(step.id, step);
    const existing = fallback.runStepIds.get(step.runId) ?? [];
    if (!existing.includes(step.id)) {
      fallback.runStepIds.set(step.runId, [...existing, step.id]);
    }
  }
  return step;
}

export async function listStepsByRun(runId: string): Promise<PillarResearchStep[]> {
  const r = getRedis();
  if (r) {
    const ids = await readJsonArray(r, keyRunSteps(runId));
    if (ids.length === 0) return [];
    const steps = await Promise.all(
      ids.map((id) => r.get<PillarResearchStep>(keyStep(id)))
    );
    return steps.filter((step): step is PillarResearchStep => Boolean(step));
  }

  const ids = fallback.runStepIds.get(runId) ?? [];
  return ids
    .map((id) => fallback.steps.get(id))
    .filter((step): step is PillarResearchStep => Boolean(step));
}

export async function getStepById(stepId: string): Promise<PillarResearchStep | null> {
  const r = getRedis();
  if (r) {
    const step = await r.get<PillarResearchStep>(keyStep(stepId));
    return step ?? null;
  }
  return fallback.steps.get(stepId) ?? null;
}

export async function setStepStatus(
  stepId: string,
  nextStatus: StepStatus,
  error?: string
): Promise<PillarResearchStep | null> {
  const step = getRedis()
    ? await getRedis()!.get<PillarResearchStep>(keyStep(stepId))
    : fallback.steps.get(stepId);
  if (!step) return null;

  if (step.status !== nextStatus && !canTransitionStepStatus(step.status, nextStatus)) {
    throw new Error(`Invalid step status transition: ${step.status} -> ${nextStatus}`);
  }

  const updated: PillarResearchStep = {
    ...step,
    status: nextStatus,
    ...(nextStatus === "completed" ? { completedAt: new Date().toISOString() } : {}),
    ...(error ? { lastError: error } : {}),
  };

  await upsertStep(updated);
  return updated;
}

export async function getWorkflowSnapshot(
  runId: string
): Promise<{
  run: PillarResearchRun;
  branches: PillarResearchBranch[];
  steps: PillarResearchStep[];
} | null> {
  const run = await getWorkflowRun(runId);
  if (!run) return null;

  const [branches, steps] = await Promise.all([
    listBranchesByRun(runId),
    listStepsByRun(runId),
  ]);

  return { run, branches, steps };
}

export async function _clearWorkflowStore(): Promise<void> {
  const r = getRedis();
  if (r) {
    let cursor = "0";
    do {
      const [nextCursor, keys]: [string, string[]] = await r.scan(cursor, {
        match: `${STORE_KEY_PREFIX}*`,
        count: 200,
      });
      cursor = nextCursor;
      if (keys.length > 0) {
        await r.del(...keys);
      }
    } while (cursor !== "0");
  }

  fallback.runs.clear();
  fallback.branches.clear();
  fallback.steps.clear();
  fallback.idempotency.clear();
  fallback.runBranchIds.clear();
  fallback.runStepIds.clear();
}

export function _setRedisForWorkflowStoreTesting(client: Redis | null): void {
  redis = client;
  redisInitialized = true;
}

export function buildBranch(
  runId: string,
  branchType: BranchType
): PillarResearchBranch {
  return {
    id: crypto.randomUUID(),
    runId,
    branchType,
    status: "pending",
    attemptCount: 0,
    startedAt: new Date().toISOString(),
  };
}
