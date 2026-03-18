import { createHash } from "crypto";
import { Redis } from "@upstash/redis";
import {
  createArtifact,
  getLatestArtifactForNameAndType,
} from "./content-workflow-artifacts";

const TEMPLATE_KEY_PREFIX = "content-workflow:template:";
const TEMPLATE_INDEX_PREFIX = "content-workflow:template-versions:";
const TEMPLATE_ACTIVE_PREFIX = "content-workflow:template-active:";
const TEMPLATE_TTL_SECONDS = 30 * 24 * 60 * 60;

let redis: Redis | null = null;
let redisInitialized = false;

function getRedis(): Redis | null {
  if (redisInitialized) return redis;
  redisInitialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn(
      "Content workflow templates: Redis not configured, falling back to in-memory store"
    );
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

export interface PromptTemplateVersion {
  templateKey: string;
  version: string;
  body: string;
  variables: string[];
  active: boolean;
  createdAt: string;
}

export interface RegisterTemplateInput {
  templateKey: string;
  version: string;
  body: string;
  variables: string[];
  active?: boolean;
}

export interface RenderPromptInput {
  templateKey: string;
  templateVersion?: string;
  variables: Record<string, string>;
}

export interface RenderedPromptResult {
  templateKey: string;
  templateVersion: string;
  renderedBody: string;
  variables: Record<string, string>;
  renderHash: string;
}

export interface PromptArtifactNameInput {
  branch: "functionality" | "persona-messaging" | "market";
  contextSlug: string;
  templateVersion: string;
  runId: string;
}

export interface PersistRenderedPromptArtifactInput {
  runId: string;
  branchId?: string;
  stepId?: string;
  templateKey: string;
  templateVersion?: string;
  variables: Record<string, string>;
  namingConventionKey: string;
  branch:
    | "functionality"
    | "persona-messaging"
    | "market";
  contextSlug: string;
  contentRef?: string;
  parentArtifactIds?: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

export class PromptIntegrityError extends Error {
  readonly code:
    | "missing_template"
    | "invalid_template"
    | "missing_variable"
    | "unresolved_placeholder"
    | "invalid_payload";
  readonly retryable: false;

  constructor(
    code:
      | "missing_template"
      | "invalid_template"
      | "missing_variable"
      | "unresolved_placeholder"
      | "invalid_payload",
    message: string
  ) {
    super(message);
    this.name = "PromptIntegrityError";
    this.code = code;
    this.retryable = false;
  }
}

const g = globalThis as unknown as {
  __contentWorkflowTemplates?: {
    templates: Map<string, PromptTemplateVersion>;
    templateVersions: Map<string, string[]>;
    activeByKey: Map<string, string>;
  };
};

if (!g.__contentWorkflowTemplates) {
  g.__contentWorkflowTemplates = {
    templates: new Map<string, PromptTemplateVersion>(),
    templateVersions: new Map<string, string[]>(),
    activeByKey: new Map<string, string>(),
  };
}

const fallback = g.__contentWorkflowTemplates;

function keyTemplate(templateKey: string, version: string): string {
  return `${TEMPLATE_KEY_PREFIX}${templateKey}:${version}`;
}

function keyTemplateVersions(templateKey: string): string {
  return `${TEMPLATE_INDEX_PREFIX}${templateKey}`;
}

function keyTemplateActive(templateKey: string): string {
  return `${TEMPLATE_ACTIVE_PREFIX}${templateKey}`;
}

async function writeWithTtl(r: Redis, key: string, value: unknown): Promise<void> {
  await r.set(key, value, { ex: TEMPLATE_TTL_SECONDS });
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

function assertTemplateInput(input: RegisterTemplateInput): void {
  if (!input.templateKey.trim()) {
    throw new PromptIntegrityError("invalid_template", "templateKey is required");
  }
  if (!input.version.trim()) {
    throw new PromptIntegrityError("invalid_template", "version is required");
  }
  if (!input.body.trim()) {
    throw new PromptIntegrityError("invalid_template", "body is required");
  }
  if (input.variables.length === 0) {
    throw new PromptIntegrityError(
      "invalid_template",
      "variables must include at least one key"
    );
  }
  const unique = new Set(input.variables);
  if (unique.size !== input.variables.length) {
    throw new PromptIntegrityError(
      "invalid_template",
      "variables must not contain duplicates"
    );
  }
}

function normalizeTemplateVersion(
  input: RegisterTemplateInput
): PromptTemplateVersion {
  return {
    templateKey: input.templateKey.trim(),
    version: input.version.trim(),
    body: input.body,
    variables: input.variables.map((item) => item.trim()),
    active: Boolean(input.active),
    createdAt: new Date().toISOString(),
  };
}

export async function registerTemplateVersion(
  input: RegisterTemplateInput
): Promise<PromptTemplateVersion> {
  assertTemplateInput(input);
  const template = normalizeTemplateVersion(input);
  const existing = await getTemplateVersion(template.templateKey, template.version);
  if (existing) {
    throw new PromptIntegrityError(
      "invalid_template",
      `template version already exists: ${template.templateKey}@${template.version}`
    );
  }

  const r = getRedis();
  if (r) {
    await writeWithTtl(
      r,
      keyTemplate(template.templateKey, template.version),
      template
    );
    const versionKey = keyTemplateVersions(template.templateKey);
    const versions = await readJsonArray(r, versionKey);
    if (!versions.includes(template.version)) {
      versions.push(template.version);
      await writeWithTtl(r, versionKey, versions);
    }
  } else {
    fallback.templates.set(
      keyTemplate(template.templateKey, template.version),
      template
    );
    const versions = fallback.templateVersions.get(template.templateKey) ?? [];
    if (!versions.includes(template.version)) {
      fallback.templateVersions.set(template.templateKey, [
        ...versions,
        template.version,
      ]);
    }
  }

  if (template.active) {
    await setActiveTemplateVersion(template.templateKey, template.version);
  }

  return template;
}

export async function listTemplateVersions(
  templateKey: string
): Promise<PromptTemplateVersion[]> {
  const normalizedKey = templateKey.trim();
  const r = getRedis();
  let versions: string[] = [];
  if (r) {
    versions = await readJsonArray(r, keyTemplateVersions(normalizedKey));
  } else {
    versions = fallback.templateVersions.get(normalizedKey) ?? [];
  }

  const templates = await Promise.all(
    versions.map((version) => getTemplateVersion(normalizedKey, version))
  );
  return templates
    .filter((item): item is PromptTemplateVersion => Boolean(item))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getTemplateVersion(
  templateKey: string,
  version: string
): Promise<PromptTemplateVersion | null> {
  const normalizedKey = templateKey.trim();
  const normalizedVersion = version.trim();
  const r = getRedis();
  if (r) {
    const record = await r.get<PromptTemplateVersion>(
      keyTemplate(normalizedKey, normalizedVersion)
    );
    return record ?? null;
  }
  return (
    fallback.templates.get(keyTemplate(normalizedKey, normalizedVersion)) ?? null
  );
}

export async function getActiveTemplateVersion(
  templateKey: string
): Promise<PromptTemplateVersion | null> {
  const normalizedKey = templateKey.trim();
  const r = getRedis();
  const activeVersion = r
    ? await r.get<string>(keyTemplateActive(normalizedKey))
    : fallback.activeByKey.get(normalizedKey);

  if (!activeVersion) return null;
  return getTemplateVersion(normalizedKey, activeVersion);
}

export async function setActiveTemplateVersion(
  templateKey: string,
  version: string
): Promise<void> {
  const normalizedKey = templateKey.trim();
  const normalizedVersion = version.trim();
  const existing = await getTemplateVersion(normalizedKey, normalizedVersion);
  if (!existing) {
    throw new PromptIntegrityError(
      "missing_template",
      `template version not found: ${normalizedKey}@${normalizedVersion}`
    );
  }

  const templates = await listTemplateVersions(normalizedKey);
  const r = getRedis();
  if (r) {
    await writeWithTtl(r, keyTemplateActive(normalizedKey), normalizedVersion);
    await Promise.all(
      templates.map((template) =>
        writeWithTtl(
          r,
          keyTemplate(template.templateKey, template.version),
          {
            ...template,
            active: template.version === normalizedVersion,
          } satisfies PromptTemplateVersion
        )
      )
    );
  } else {
    fallback.activeByKey.set(normalizedKey, normalizedVersion);
    for (const template of templates) {
      fallback.templates.set(keyTemplate(template.templateKey, template.version), {
        ...template,
        active: template.version === normalizedVersion,
      });
    }
  }
}

const PLACEHOLDER_REGEX = /\{\{([a-zA-Z0-9_]+)\}\}/g;

export function extractTemplatePlaceholders(body: string): string[] {
  const matches = body.matchAll(PLACEHOLDER_REGEX);
  return Array.from(new Set(Array.from(matches, (match) => match[1])));
}

function assertVariablesPresent(
  required: string[],
  variables: Record<string, string>
): void {
  for (const key of required) {
    const value = variables[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new PromptIntegrityError(
        "missing_variable",
        `required template variable is missing or empty: ${key}`
      );
    }
  }
}

export function ensureNoUnresolvedPlaceholders(renderedBody: string): void {
  if (PLACEHOLDER_REGEX.test(renderedBody)) {
    throw new PromptIntegrityError(
      "unresolved_placeholder",
      "rendered prompt contains unresolved placeholders"
    );
  }
}

export async function renderPromptTemplate(
  input: RenderPromptInput
): Promise<RenderedPromptResult> {
  const templateKey = input.templateKey.trim();
  if (!templateKey) {
    throw new PromptIntegrityError("invalid_payload", "templateKey is required");
  }

  const template = input.templateVersion
    ? await getTemplateVersion(templateKey, input.templateVersion)
    : await getActiveTemplateVersion(templateKey);
  if (!template) {
    throw new PromptIntegrityError(
      "missing_template",
      input.templateVersion
        ? `template not found: ${templateKey}@${input.templateVersion}`
        : `active template not found: ${templateKey}`
    );
  }

  assertVariablesPresent(template.variables, input.variables);
  const placeholders = extractTemplatePlaceholders(template.body);
  assertVariablesPresent(placeholders, input.variables);

  const renderedBody = template.body.replace(
    PLACEHOLDER_REGEX,
    (_, variableName: string) => input.variables[variableName] ?? ""
  );
  ensureNoUnresolvedPlaceholders(renderedBody);

  const renderHash = createHash("sha256")
    .update(template.templateKey)
    .update(template.version)
    .update(renderedBody)
    .digest("hex");

  return {
    templateKey: template.templateKey,
    templateVersion: template.version,
    renderedBody,
    variables: input.variables,
    renderHash,
  };
}

export function buildPromptArtifactName(input: PromptArtifactNameInput): string {
  const contextSlug = input.contextSlug.trim().toLowerCase().replace(/\s+/g, "-");
  const runShortId = input.runId.slice(0, 8);
  return `pillar-research.${input.branch}.${contextSlug}.v${input.templateVersion}.${runShortId}`;
}

export async function persistRenderedPromptArtifact(
  input: PersistRenderedPromptArtifactInput
) {
  if (!input.namingConventionKey.trim()) {
    throw new PromptIntegrityError(
      "invalid_payload",
      "namingConventionKey is required"
    );
  }

  const rendered = await renderPromptTemplate({
    templateKey: input.templateKey,
    templateVersion: input.templateVersion,
    variables: input.variables,
  });
  const name = buildPromptArtifactName({
    branch: input.branch,
    contextSlug: input.contextSlug,
    templateVersion: rendered.templateVersion,
    runId: input.runId,
  });
  const latest = await getLatestArtifactForNameAndType(
    input.runId,
    "prompt_rendered",
    name
  );
  const version = latest ? latest.version + 1 : 1;
  const contentRef =
    input.contentRef ??
    `prompt://rendered/${input.runId}/${input.stepId ?? "unknown-step"}/${version}`;

  return createArtifact({
    runId: input.runId,
    branchId: input.branchId,
    stepId: input.stepId,
    artifactType: "prompt_rendered",
    name,
    version,
    previousArtifactId: latest?.id,
    contentRef,
    payload: {
      renderedBody: rendered.renderedBody,
      templateKey: rendered.templateKey,
      templateVersion: rendered.templateVersion,
      renderHash: rendered.renderHash,
      namingConventionKey: input.namingConventionKey,
      variables: rendered.variables,
    },
    lineage: {
      parentArtifactIds: input.parentArtifactIds ?? [],
      producedByRunId: input.runId,
      producedByBranchId: input.branchId,
      producedByStepId: input.stepId,
    },
    metadata: input.metadata,
  });
}

export async function seedDefaultWorkflowTemplates(): Promise<void> {
  const defaults: RegisterTemplateInput[] = [
    {
      templateKey: "branch-a-transcript-research",
      version: "1.0.0",
      body: "Research transcript signals for theme {{theme}} and use case {{use_case}}.",
      variables: ["theme", "use_case"],
      active: true,
    },
    {
      templateKey: "branch-b-transcript-research",
      version: "1.0.0",
      body: "Research persona and messaging signals for {{theme}} and {{use_case}}.",
      variables: ["theme", "use_case"],
      active: true,
    },
    {
      templateKey: "branch-c-market-research",
      version: "1.0.0",
      body: "Build market brief inputs for {{theme}}.",
      variables: ["theme"],
      active: true,
    },
    {
      templateKey: "branch-a-competitor-functionality",
      version: "1.0.0",
      body: "Analyze competitor {{competitor}} functionality for {{theme}}.",
      variables: ["competitor", "theme"],
      active: true,
    },
    {
      templateKey: "branch-b-competitor-persona-messaging",
      version: "1.0.0",
      body: "Analyze competitor {{competitor}} persona and messaging for {{theme}}.",
      variables: ["competitor", "theme"],
      active: true,
    },
  ];

  for (const template of defaults) {
    const existing = await getTemplateVersion(template.templateKey, template.version);
    if (!existing) {
      await registerTemplateVersion(template);
    }
  }
}

export async function _clearAllTemplates(): Promise<void> {
  const r = getRedis();
  if (r) {
    let cursor = "0";
    do {
      const [nextCursor, keys]: [string, string[]] = await r.scan(cursor, {
        match: "content-workflow:template*",
        count: 200,
      });
      cursor = nextCursor;
      if (keys.length > 0) {
        await r.del(...keys);
      }
    } while (cursor !== "0");
  }

  fallback.templates.clear();
  fallback.templateVersions.clear();
  fallback.activeByKey.clear();
}

export function _setRedisForWorkflowTemplatesTesting(client: Redis | null): void {
  redis = client;
  redisInitialized = true;
}
