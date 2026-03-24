import { describe, expect, it } from "vitest";
import {
  toKebabCase,
  skillToPackage,
  packageToSkillInput,
  generateSkillMd,
  parseSkillMd,
  validateSkillPackage,
  generateMetadataJson,
} from "@/lib/skill-package";
import type { SkillDetail } from "@/lib/skill-types";
import type { SkillPackage } from "@/lib/skill-package-types";

function makeSkill(overrides: Partial<SkillDetail> = {}): SkillDetail {
  return {
    id: "sk-1",
    name: "Campaign Brief Generator",
    description: "Generates campaign briefs for marketing teams",
    content: "# Campaign Brief\n\nFollow these instructions to generate a campaign brief.",
    active: true,
    contentType: ["email", "blog"],
    category: "content_generation",
    tags: ["marketing", "campaigns"],
    version: "1.0.0",
    author: "test-author",
    deprecated: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-02T00:00:00Z",
    usageCount: 5,
    ...overrides,
  };
}

describe("skill-package", () => {
  describe("toKebabCase", () => {
    it("converts spaced title case", () => {
      expect(toKebabCase("Campaign Brief Generator")).toBe("campaign-brief-generator");
    });

    it("converts underscores and mixed separators", () => {
      expect(toKebabCase("hello_world test")).toBe("hello-world-test");
    });

    it("lowercases already-kebab input", () => {
      expect(toKebabCase("Already-Kebab")).toBe("already-kebab");
    });

    it("truncates names longer than 64 chars and strips trailing hyphens", () => {
      const long = "a".repeat(30) + " " + "b".repeat(30) + " " + "c".repeat(10);
      const result = toKebabCase(long);
      expect(result.length).toBeLessThanOrEqual(64);
      expect(result).not.toMatch(/-$/);
    });

    it("strips special characters", () => {
      expect(toKebabCase("Skill @#$% Name!")).toBe("skill-name");
    });

    it("handles single character", () => {
      expect(toKebabCase("A")).toBe("a");
    });

    it("handles empty string", () => {
      expect(toKebabCase("")).toBe("");
    });
  });

  describe("parseSkillMd", () => {
    it("parses valid SKILL.md with frontmatter and body", () => {
      const md = "---\nname: test-skill\ndescription: A test skill\n---\n\n# Instructions\n\nDo the thing.";
      const result = parseSkillMd(md);
      expect(result.frontmatter.name).toBe("test-skill");
      expect(result.frontmatter.description).toBe("A test skill");
      expect(result.body).toBe("# Instructions\n\nDo the thing.");
    });

    it("throws on missing opening ---", () => {
      const md = "name: test\ndescription: bad\n---\nbody";
      expect(() => parseSkillMd(md)).toThrow("no opening ---");
    });

    it("throws on missing closing ---", () => {
      const md = "---\nname: test\ndescription: bad\nbody here";
      expect(() => parseSkillMd(md)).toThrow("no closing ---");
    });

    it("throws when name is missing", () => {
      const md = "---\ndescription: just a desc\n---\nbody";
      expect(() => parseSkillMd(md)).toThrow("name");
    });

    it("throws when description is missing", () => {
      const md = "---\nname: test-skill\n---\nbody";
      expect(() => parseSkillMd(md)).toThrow("description");
    });

    it("handles multiline description with > indicator", () => {
      const md = [
        "---",
        "name: test-skill",
        "description: >",
        "  This is a long",
        "  description that spans",
        "  multiple lines",
        "---",
        "",
        "Body content",
      ].join("\n");
      const result = parseSkillMd(md);
      expect(result.frontmatter.description).toBe(
        "This is a long description that spans multiple lines",
      );
    });

    it("parses boolean frontmatter values", () => {
      const md = "---\nname: test-skill\ndescription: A skill\nuser-invocable: true\ndisable-model-invocation: false\n---\n\nBody";
      const result = parseSkillMd(md);
      expect(result.frontmatter["user-invocable"]).toBe(true);
      expect(result.frontmatter["disable-model-invocation"]).toBe(false);
    });

    it("handles quoted string values", () => {
      const md = '---\nname: test-skill\ndescription: "A skill with: colons"\n---\n\nBody';
      const result = parseSkillMd(md);
      expect(result.frontmatter.description).toBe("A skill with: colons");
    });

    it("handles leading blank lines before frontmatter", () => {
      const md = "\n\n---\nname: test-skill\ndescription: A skill\n---\n\nBody";
      const result = parseSkillMd(md);
      expect(result.frontmatter.name).toBe("test-skill");
    });
  });

  describe("generateSkillMd", () => {
    it("produces correct frontmatter delimiters", () => {
      const skill = makeSkill();
      const md = generateSkillMd(skill);
      expect(md.startsWith("---\n")).toBe(true);
      expect(md).toContain("\n---\n");
    });

    it("preserves body content after frontmatter", () => {
      const skill = makeSkill({ content: "# My Skill\n\nDo things." });
      const md = generateSkillMd(skill);
      expect(md).toContain("# My Skill\n\nDo things.");
    });

    it("quotes description containing YAML special chars", () => {
      const skill = makeSkill({ description: "A skill with: colons and #hashes" });
      const md = generateSkillMd(skill);
      const descLine = md.split("\n").find((l) => l.startsWith("description:"));
      expect(descLine).toContain('"');
    });

    it("does not quote simple description", () => {
      const skill = makeSkill({ description: "Simple description" });
      const md = generateSkillMd(skill);
      const descLine = md.split("\n").find((l) => l.startsWith("description:"));
      expect(descLine).toBe("description: Simple description");
    });

    it("kebab-cases the name in frontmatter", () => {
      const skill = makeSkill({ name: "My Fancy Skill" });
      const md = generateSkillMd(skill);
      expect(md).toContain("name: my-fancy-skill");
    });
  });

  describe("round-trip: skillToPackage -> packageToSkillInput", () => {
    it("preserves name and description", () => {
      const skill = makeSkill();
      const pkg = skillToPackage(skill);
      const input = packageToSkillInput(pkg);
      expect(input.name).toBe(toKebabCase(skill.name));
      expect(input.description).toBe(skill.description);
    });

    it("preserves body content", () => {
      const skill = makeSkill();
      const pkg = skillToPackage(skill);
      const input = packageToSkillInput(pkg);
      expect(input.content).toBe(skill.content);
    });

    it("preserves metadata fields", () => {
      const skill = makeSkill();
      const pkg = skillToPackage(skill);
      const input = packageToSkillInput(pkg);
      expect(input.contentType).toEqual(skill.contentType);
      expect(input.category).toBe(skill.category);
      expect(input.tags).toEqual(skill.tags);
    });

    it("round-trips parameters through JSON", () => {
      const params = [
        { name: "tone", type: "select" as const, description: "Tone of voice", required: true, options: ["formal", "casual"] },
      ];
      const skill = makeSkill({ parameters: JSON.stringify(params) });
      const pkg = skillToPackage(skill);
      const input = packageToSkillInput(pkg);
      expect(JSON.parse(input.parameters!)).toEqual(params);
    });

    it("preserves optional fields when present", () => {
      const skill = makeSkill({
        outputFormat: "markdown",
        triggerConditions: "When user asks for a brief",
        author: "drew",
        sourceKnowledgeObjects: [
          { id: "ko-1", collection: "KnowledgeObject", name: "Personas", integrationPrompt: "Use these personas" },
        ],
      });
      const pkg = skillToPackage(skill);
      const input = packageToSkillInput(pkg);
      expect(input.outputFormat).toBe("markdown");
      expect(input.triggerConditions).toBe("When user asks for a brief");
      expect(input.author).toBe("drew");
      expect(input.sourceKnowledgeObjects).toHaveLength(1);
    });

    it("omits metadata object when skill has no metadata fields", () => {
      const skill = makeSkill({
        contentType: [],
        category: "",
        tags: [],
        outputFormat: undefined,
        version: "",
        author: "",
        triggerConditions: undefined,
        parameters: undefined,
        sourceKnowledgeObjects: [],
      });
      const pkg = skillToPackage(skill);
      expect(pkg.metadata).toBeUndefined();
    });
  });

  describe("validateSkillPackage", () => {
    function makePackage(overrides: Partial<SkillPackage> = {}): SkillPackage {
      return {
        frontmatter: { name: "valid-name", description: "A valid description" },
        body: "# Content\n\nInstructions here.",
        ...overrides,
      };
    }

    it("returns valid for a well-formed package", () => {
      const result = validateSkillPackage(makePackage());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns error for name with spaces", () => {
      const result = validateSkillPackage(
        makePackage({ frontmatter: { name: "has spaces", description: "desc" } }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("name"))).toBe(true);
    });

    it("returns error for name with uppercase", () => {
      const result = validateSkillPackage(
        makePackage({ frontmatter: { name: "HasUppercase", description: "desc" } }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("name"))).toBe(true);
    });

    it("returns error for empty description", () => {
      const result = validateSkillPackage(
        makePackage({ frontmatter: { name: "valid-name", description: "" } }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("description"))).toBe(true);
    });

    it("returns error for empty body", () => {
      const result = validateSkillPackage(makePackage({ body: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("body"))).toBe(true);
    });

    it("returns warning for invalid semver in metadata", () => {
      const result = validateSkillPackage(
        makePackage({ metadata: { version: "not-semver" } }),
      );
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes("semver"))).toBe(true);
    });

    it("returns warning for unknown category", () => {
      const result = validateSkillPackage(
        makePackage({ metadata: { category: "unknown_category" } }),
      );
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes("category"))).toBe(true);
    });

    it("accepts valid semver without warning", () => {
      const result = validateSkillPackage(
        makePackage({ metadata: { version: "2.1.0" } }),
      );
      expect(result.warnings.filter((w) => w.includes("semver"))).toHaveLength(0);
    });

    it("returns error for name starting with hyphen", () => {
      const result = validateSkillPackage(
        makePackage({ frontmatter: { name: "-bad-start", description: "desc" } }),
      );
      expect(result.valid).toBe(false);
    });
  });

  describe("generateMetadataJson", () => {
    it("produces valid JSON", () => {
      const skill = makeSkill();
      const json = generateMetadataJson(skill);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it("includes contentType, category, and tags", () => {
      const skill = makeSkill();
      const parsed = JSON.parse(generateMetadataJson(skill));
      expect(parsed.contentType).toEqual(["email", "blog"]);
      expect(parsed.category).toBe("content_generation");
      expect(parsed.tags).toEqual(["marketing", "campaigns"]);
    });

    it("parses parameters from JSON string", () => {
      const params = [
        { name: "tone", type: "select", description: "Voice tone", required: true, options: ["formal"] },
      ];
      const skill = makeSkill({ parameters: JSON.stringify(params) });
      const parsed = JSON.parse(generateMetadataJson(skill));
      expect(parsed.parameters).toEqual(params);
    });

    it("omits parameters when JSON is invalid", () => {
      const skill = makeSkill({ parameters: "not-json" });
      const parsed = JSON.parse(generateMetadataJson(skill));
      expect(parsed.parameters).toBeUndefined();
    });

    it("omits empty arrays and falsy fields", () => {
      const skill = makeSkill({
        contentType: [],
        tags: [],
        category: "",
        outputFormat: undefined,
        triggerConditions: undefined,
        author: "",
        sourceKnowledgeObjects: [],
      });
      const parsed = JSON.parse(generateMetadataJson(skill));
      expect(parsed.contentType).toBeUndefined();
      expect(parsed.tags).toBeUndefined();
      expect(parsed.category).toBeUndefined();
    });

    it("includes version and author when present", () => {
      const skill = makeSkill({ version: "2.0.0", author: "drew" });
      const parsed = JSON.parse(generateMetadataJson(skill));
      expect(parsed.version).toBe("2.0.0");
      expect(parsed.author).toBe("drew");
    });
  });
});
