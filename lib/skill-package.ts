import type {
  SkillDetail,
  SkillCreateInput,
  SkillParameter,
  SkillKnowledgeLink,
} from "./skill-types";
import type {
  SkillFrontmatter,
  SkillPackageMetadata,
  SkillPackage,
  PackageValidationResult,
} from "./skill-package-types";
import { SKILL_CATEGORIES } from "./skill-types";

export type {
  SkillFrontmatter,
  SkillPackageMetadata,
  SkillPackage,
  PackageValidationResult,
} from "./skill-package-types";

const KEBAB_MAX_LENGTH = 64;
const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+/;
const YAML_SPECIAL = /[:#'"{}[\]|>&*!%@`\n]/;

export function toKebabCase(name: string): string {
  let result = name
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  if (result.length > KEBAB_MAX_LENGTH) {
    result = result.slice(0, KEBAB_MAX_LENGTH).replace(/-+$/, "");
  }

  return result;
}

export function skillToPackage(skill: SkillDetail): SkillPackage {
  const frontmatter: SkillFrontmatter = {
    name: toKebabCase(skill.name),
    description: skill.description,
  };

  const metadata: SkillPackageMetadata = {};
  let hasMetadata = false;

  if (skill.contentType?.length) {
    metadata.contentType = skill.contentType;
    hasMetadata = true;
  }
  if (skill.category) {
    metadata.category = skill.category;
    hasMetadata = true;
  }
  if (skill.tags?.length) {
    metadata.tags = skill.tags;
    hasMetadata = true;
  }
  if (skill.outputFormat) {
    metadata.outputFormat = skill.outputFormat;
    hasMetadata = true;
  }
  if (skill.version) {
    metadata.version = skill.version;
    hasMetadata = true;
  }
  if (skill.author) {
    metadata.author = skill.author;
    hasMetadata = true;
  }
  if (skill.triggerConditions) {
    metadata.triggerConditions = skill.triggerConditions;
    hasMetadata = true;
  }
  if (skill.parameters) {
    try {
      metadata.parameters = JSON.parse(skill.parameters) as SkillParameter[];
      hasMetadata = true;
    } catch {
      // invalid JSON — skip parameters
    }
  }
  if (skill.sourceKnowledgeObjects?.length) {
    metadata.sourceKnowledgeObjects = skill.sourceKnowledgeObjects;
    hasMetadata = true;
  }

  return {
    frontmatter,
    body: skill.content,
    ...(hasMetadata ? { metadata } : {}),
  };
}

export function packageToSkillInput(pkg: SkillPackage): SkillCreateInput {
  const input: SkillCreateInput = {
    name: pkg.frontmatter.name,
    description: pkg.frontmatter.description,
    content: pkg.body,
    contentType: pkg.metadata?.contentType ?? [],
  };

  if (pkg.metadata?.category) input.category = pkg.metadata.category;
  if (pkg.metadata?.tags?.length) input.tags = pkg.metadata.tags;
  if (pkg.metadata?.outputFormat) input.outputFormat = pkg.metadata.outputFormat;
  if (pkg.metadata?.author) input.author = pkg.metadata.author;
  if (pkg.metadata?.triggerConditions)
    input.triggerConditions = pkg.metadata.triggerConditions;
  if (pkg.metadata?.parameters) {
    input.parameters = JSON.stringify(pkg.metadata.parameters);
  }
  if (pkg.metadata?.sourceKnowledgeObjects?.length) {
    input.sourceKnowledgeObjects = pkg.metadata.sourceKnowledgeObjects;
  }

  return input;
}

export function generateSkillMd(skill: SkillDetail): string {
  const name = toKebabCase(skill.name);
  const desc = YAML_SPECIAL.test(skill.description)
    ? `"${skill.description.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
    : skill.description;

  return `---\nname: ${name}\ndescription: ${desc}\n---\n\n${skill.content}`;
}

export function parseSkillMd(content: string): {
  frontmatter: SkillFrontmatter;
  body: string;
} {
  const lines = content.split("\n");

  const firstNonEmpty = lines.findIndex((l) => l.trim() !== "");
  if (firstNonEmpty === -1 || lines[firstNonEmpty].trim() !== "---") {
    throw new Error("SKILL.md missing frontmatter (no opening ---)");
  }

  let endIdx: number | null = null;
  for (let i = firstNonEmpty + 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIdx = i;
      break;
    }
  }
  if (endIdx === null) {
    throw new Error("SKILL.md missing frontmatter (no closing ---)");
  }

  const frontmatter = parseYamlBlock(
    lines.slice(firstNonEmpty + 1, endIdx),
  ) as unknown as SkillFrontmatter;

  if (!frontmatter.name || !frontmatter.description) {
    throw new Error(
      "SKILL.md frontmatter must contain 'name' and 'description'",
    );
  }

  const body = lines.slice(endIdx + 1).join("\n").trim();

  return { frontmatter, body };
}

function parseYamlBlock(lines: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "" || line.trim().startsWith("#")) {
      i++;
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = line.slice(0, colonIdx).trim();
    const rawValue = line.slice(colonIdx + 1).trim();

    if (rawValue === "" && i + 1 < lines.length && lines[i + 1].trim().startsWith("- ")) {
      const items: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(stripQuotes(lines[i].trim().slice(2).trim()));
        i++;
      }
      result[key] = items;
      continue;
    }

    if (rawValue === ">" || rawValue === "|" || rawValue === ">-" || rawValue === "|-") {
      const chomp = rawValue.endsWith("-");
      const fold = rawValue.startsWith(">");
      const collected: string[] = [];
      i++;
      while (i < lines.length && (lines[i].startsWith(" ") || lines[i].startsWith("\t") || lines[i].trim() === "")) {
        collected.push(lines[i]);
        i++;
      }
      // Remove trailing empty lines for strip/clip chomping
      while (collected.length && collected[collected.length - 1].trim() === "") {
        collected.pop();
      }
      const dedented = collected.map((l) => {
        const match = l.match(/^[ \t]+/);
        return match ? l.slice(match[0].length) : l;
      });
      let text = fold
        ? dedented.join(" ").replace(/ {2,}/g, " ")
        : dedented.join("\n");
      if (!chomp) text += "\n";
      result[key] = text.trim();
      continue;
    }

    result[key] = coerceValue(rawValue);
    i++;
  }

  return result;
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function coerceValue(raw: string): string | boolean {
  const stripped = stripQuotes(raw);
  if (raw === "true") return true;
  if (raw === "false") return false;
  return stripped;
}

export function validateSkillPackage(
  pkg: SkillPackage,
): PackageValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!pkg.frontmatter.name || !NAME_PATTERN.test(pkg.frontmatter.name)) {
    errors.push(
      "name must be kebab-case (lowercase alphanumeric and hyphens, cannot start/end with hyphen)",
    );
  }
  if (pkg.frontmatter.name && pkg.frontmatter.name.length > KEBAB_MAX_LENGTH) {
    errors.push(`name must be ${KEBAB_MAX_LENGTH} characters or fewer`);
  }
  if (!pkg.frontmatter.description) {
    errors.push("description is required");
  }
  if (!pkg.body) {
    errors.push("body content is required");
  }

  if (pkg.metadata?.version && !SEMVER_PATTERN.test(pkg.metadata.version)) {
    warnings.push(
      `version "${pkg.metadata.version}" does not follow semver (x.y.z)`,
    );
  }
  if (
    pkg.metadata?.category &&
    !(SKILL_CATEGORIES as readonly string[]).includes(pkg.metadata.category)
  ) {
    warnings.push(
      `category "${pkg.metadata.category}" is not a known category (${SKILL_CATEGORIES.join(", ")})`,
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function generateMetadataJson(skill: SkillDetail): string {
  let parameters: SkillParameter[] | undefined;
  if (skill.parameters) {
    try {
      parameters = JSON.parse(skill.parameters) as SkillParameter[];
    } catch {
      // invalid JSON — omit parameters
    }
  }

  const metadata: Record<string, unknown> = {};
  if (skill.contentType?.length) metadata.contentType = skill.contentType;
  if (skill.category) metadata.category = skill.category;
  if (skill.tags?.length) metadata.tags = skill.tags;
  if (parameters) metadata.parameters = parameters;
  if (skill.outputFormat) metadata.outputFormat = skill.outputFormat;
  if (skill.version) metadata.version = skill.version;
  if (skill.author) metadata.author = skill.author;
  if (skill.triggerConditions)
    metadata.triggerConditions = skill.triggerConditions;
  if (skill.sourceKnowledgeObjects?.length)
    metadata.sourceKnowledgeObjects = skill.sourceKnowledgeObjects;

  return JSON.stringify(metadata, null, 2);
}
