import { beforeEach, describe, expect, it } from "vitest";
import { _clearAllArtifacts, _setRedisForWorkflowArtifactsTesting } from "@/lib/content-workflow-artifacts";
import {
  _clearAllTemplates,
  _setRedisForWorkflowTemplatesTesting,
  buildPromptArtifactName,
  getActiveTemplateVersion,
  getTemplateVersion,
  listTemplateVersions,
  persistRenderedPromptArtifact,
  PromptIntegrityError,
  registerTemplateVersion,
  renderPromptTemplate,
  setActiveTemplateVersion,
} from "@/lib/content-workflow-templates";

describe("content workflow templates", () => {
  beforeEach(async () => {
    _setRedisForWorkflowTemplatesTesting(null);
    _setRedisForWorkflowArtifactsTesting(null);
    await _clearAllTemplates();
    await _clearAllArtifacts();
  });

  it("registers versions and tracks active version", async () => {
    await registerTemplateVersion({
      templateKey: "branch-a-transcript-research",
      version: "1.0.0",
      body: "Theme: {{theme}}",
      variables: ["theme"],
      active: true,
    });
    await registerTemplateVersion({
      templateKey: "branch-a-transcript-research",
      version: "1.1.0",
      body: "Theme {{theme}}, Use case {{use_case}}",
      variables: ["theme", "use_case"],
    });

    const versions = await listTemplateVersions("branch-a-transcript-research");
    expect(versions).toHaveLength(2);
    expect(versions[0].active).toBe(true);
    expect(versions[1].active).toBe(false);

    await setActiveTemplateVersion("branch-a-transcript-research", "1.1.0");
    const active = await getActiveTemplateVersion("branch-a-transcript-research");
    expect(active?.version).toBe("1.1.0");
    expect(active?.active).toBe(true);
  });

  it("prevents duplicate template versions", async () => {
    await registerTemplateVersion({
      templateKey: "branch-c-market-research",
      version: "1.0.0",
      body: "Theme: {{theme}}",
      variables: ["theme"],
      active: true,
    });

    await expect(
      registerTemplateVersion({
        templateKey: "branch-c-market-research",
        version: "1.0.0",
        body: "Theme: {{theme}}",
        variables: ["theme"],
      })
    ).rejects.toThrow("template version already exists");
  });

  it("renders prompt with deterministic hash", async () => {
    await registerTemplateVersion({
      templateKey: "branch-b-transcript-research",
      version: "1.0.0",
      body: "Analyze {{theme}} for {{use_case}}",
      variables: ["theme", "use_case"],
      active: true,
    });

    const one = await renderPromptTemplate({
      templateKey: "branch-b-transcript-research",
      variables: { theme: "win-loss", use_case: "battlecards" },
    });
    const two = await renderPromptTemplate({
      templateKey: "branch-b-transcript-research",
      variables: { theme: "win-loss", use_case: "battlecards" },
    });

    expect(one.renderedBody).toBe("Analyze win-loss for battlecards");
    expect(one.renderHash).toBe(two.renderHash);
  });

  it("fails integrity checks for missing variables", async () => {
    await registerTemplateVersion({
      templateKey: "branch-a-competitor-functionality",
      version: "1.0.0",
      body: "Compare {{competitor}} against {{theme}}",
      variables: ["competitor", "theme"],
      active: true,
    });

    await expect(
      renderPromptTemplate({
        templateKey: "branch-a-competitor-functionality",
        variables: { competitor: "Acme" },
      })
    ).rejects.toBeInstanceOf(PromptIntegrityError);
    await expect(
      renderPromptTemplate({
        templateKey: "branch-a-competitor-functionality",
        variables: { competitor: "Acme", theme: "" },
      })
    ).rejects.toThrow("missing or empty");
  });

  it("fails integrity checks for unresolved placeholders", async () => {
    await registerTemplateVersion({
      templateKey: "branch-a-transcript-research",
      version: "1.0.0",
      body: "Theme: {{theme}}, Unknown: {{unknown_key}}",
      variables: ["theme", "unknown_key"],
      active: true,
    });

    await expect(
      renderPromptTemplate({
        templateKey: "branch-a-transcript-research",
        variables: { theme: "pricing", unknown_key: "" },
      })
    ).rejects.toThrow("missing or empty");
  });

  it("builds prompt artifact names using roadmap convention", () => {
    const name = buildPromptArtifactName({
      branch: "functionality",
      contextSlug: "Battle Card Refresh",
      templateVersion: "1.2.0",
      runId: "12345678-9999-aaaa-bbbb-cccccccccccc",
    });
    expect(name).toBe("pillar-research.functionality.battle-card-refresh.v1.2.0.12345678");
  });

  it("persists prompt_rendered artifact with metadata and lineage", async () => {
    await registerTemplateVersion({
      templateKey: "branch-c-market-research",
      version: "1.0.0",
      body: "Market brief for {{theme}}",
      variables: ["theme"],
      active: true,
    });

    const first = await persistRenderedPromptArtifact({
      runId: "run-market-1",
      branchId: "branch-c",
      stepId: "C1",
      templateKey: "branch-c-market-research",
      variables: { theme: "value realization" },
      namingConventionKey: "pillar-research",
      branch: "market",
      contextSlug: "value realization",
      parentArtifactIds: ["seed-artifact-1"],
    });
    const second = await persistRenderedPromptArtifact({
      runId: "run-market-1",
      branchId: "branch-c",
      stepId: "C1",
      templateKey: "branch-c-market-research",
      variables: { theme: "value realization" },
      namingConventionKey: "pillar-research",
      branch: "market",
      contextSlug: "value realization",
      parentArtifactIds: [first.id],
    });

    expect(first.artifactType).toBe("prompt_rendered");
    expect(first.payload.templateKey).toBe("branch-c-market-research");
    expect(first.payload.templateVersion).toBe("1.0.0");
    expect(first.payload.namingConventionKey).toBe("pillar-research");
    expect(first.lineage.parentArtifactIds).toEqual(["seed-artifact-1"]);
    expect(second.version).toBe(2);
    expect(second.previousArtifactId).toBe(first.id);
  });

  it("can fetch an explicit template version", async () => {
    await registerTemplateVersion({
      templateKey: "branch-b-competitor-persona-messaging",
      version: "2.0.0",
      body: "Persona notes for {{competitor}} in {{theme}}",
      variables: ["competitor", "theme"],
      active: true,
    });

    const template = await getTemplateVersion(
      "branch-b-competitor-persona-messaging",
      "2.0.0"
    );
    expect(template?.version).toBe("2.0.0");
  });
});
