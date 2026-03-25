import { describe, expect, it } from "vitest";
import {
  getContentSourceChannelLabel,
  getContentStatusLabel,
  isEditableStatus,
  VALID_CONTENT_SOURCE_CHANNELS,
  VALID_CONTENT_STATUSES,
} from "@/lib/content-types";

describe("VALID_CONTENT_STATUSES", () => {
  it("contains all six statuses", () => {
    expect(VALID_CONTENT_STATUSES).toEqual(
      expect.arrayContaining([
        "draft",
        "submitted",
        "in_review",
        "approved",
        "rejected",
        "published",
      ]),
    );
  });

  it("has exactly six entries", () => {
    expect(VALID_CONTENT_STATUSES).toHaveLength(6);
  });
});

describe("VALID_CONTENT_SOURCE_CHANNELS", () => {
  it("contains all five channels", () => {
    expect(VALID_CONTENT_SOURCE_CHANNELS).toEqual(
      expect.arrayContaining([
        "generate_ui",
        "direct_upload",
        "mcp",
        "api",
        "bulk_import",
      ]),
    );
  });

  it("has exactly five entries", () => {
    expect(VALID_CONTENT_SOURCE_CHANNELS).toHaveLength(5);
  });
});

describe("getContentStatusLabel", () => {
  it("returns correct label for each status", () => {
    expect(getContentStatusLabel("draft")).toBe("Draft");
    expect(getContentStatusLabel("submitted")).toBe("Submitted");
    expect(getContentStatusLabel("in_review")).toBe("In Review");
    expect(getContentStatusLabel("approved")).toBe("Approved");
    expect(getContentStatusLabel("rejected")).toBe("Rejected");
    expect(getContentStatusLabel("published")).toBe("Published");
  });
});

describe("getContentSourceChannelLabel", () => {
  it("returns correct label for each channel", () => {
    expect(getContentSourceChannelLabel("generate_ui")).toBe("Generate UI");
    expect(getContentSourceChannelLabel("direct_upload")).toBe(
      "Direct Upload",
    );
    expect(getContentSourceChannelLabel("mcp")).toBe("MCP");
    expect(getContentSourceChannelLabel("api")).toBe("API");
    expect(getContentSourceChannelLabel("bulk_import")).toBe("Bulk Import");
  });
});

describe("isEditableStatus", () => {
  it('returns true for "draft"', () => {
    expect(isEditableStatus("draft")).toBe(true);
  });

  it("returns false for non-draft statuses", () => {
    expect(isEditableStatus("submitted")).toBe(false);
    expect(isEditableStatus("in_review")).toBe(false);
    expect(isEditableStatus("approved")).toBe(false);
    expect(isEditableStatus("rejected")).toBe(false);
    expect(isEditableStatus("published")).toBe(false);
  });
});
