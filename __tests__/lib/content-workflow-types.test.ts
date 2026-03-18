import { describe, expect, it } from "vitest";
import {
  canTransitionBranchStatus,
  canTransitionRunStatus,
  canTransitionStepStatus,
  isTerminalRunStatus,
  validateArtifactFields,
  validateCreateRunInput,
} from "@/lib/content-workflow-types";

describe("content workflow type validation", () => {
  it("accepts valid create run input", () => {
    const result = validateCreateRunInput({
      inputType: "topic_theme",
      inputValue: "Battlecard refresh",
      createdBy: "drew",
      idempotencyKey: "abc123",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects missing run input fields", () => {
    const result = validateCreateRunInput({
      inputType: "topic_theme",
      inputValue: "",
      createdBy: "",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("inputValue is required");
    expect(result.errors.join(" ")).toContain("createdBy is required");
  });

  it("enforces run status transition rails", () => {
    expect(canTransitionRunStatus("created", "branches_running")).toBe(true);
    expect(canTransitionRunStatus("branches_running", "completed")).toBe(false);
    expect(canTransitionRunStatus("completed", "failed")).toBe(false);
    expect(isTerminalRunStatus("cancelled")).toBe(true);
  });

  it("enforces branch and step transition rails", () => {
    expect(canTransitionBranchStatus("pending", "running")).toBe(true);
    expect(canTransitionBranchStatus("completed", "running")).toBe(false);

    expect(canTransitionStepStatus("pending", "running")).toBe(true);
    expect(canTransitionStepStatus("completed", "retrying")).toBe(false);
  });

  it("validates required artifact fields", () => {
    const result = validateArtifactFields({
      artifactType: "prompt_rendered",
      name: "prompt-a",
      version: 1,
      contentRef: "weaviate://artifact/123",
      lineage: {
        parentArtifactIds: [],
        producedByRunId: "run-1",
      },
    });

    expect(result.valid).toBe(true);
  });

  it("rejects invalid artifact metadata", () => {
    const result = validateArtifactFields({
      artifactType: "prompt_rendered",
      name: "",
      version: 0,
      contentRef: "",
      lineage: {
        parentArtifactIds: [],
        producedByRunId: "",
      },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
