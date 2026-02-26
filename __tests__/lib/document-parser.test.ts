import { describe, it, expect, vi } from "vitest";
import {
  detectFormat,
  parseDocument,
  parseDocuments,
} from "@/lib/document-parser";
import { readFileSync } from "fs";
import { join } from "path";

function makeFile(
  name: string,
  content: string,
  type: string
): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

function fixtureFile(filename: string, type: string): File {
  const buf = readFileSync(join(__dirname, "../fixtures", filename));
  const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  return new File([uint8], filename, { type });
}

// ── MIME / Format Detection ─────────────────────────────────────────────────

describe("detectFormat", () => {
  it("detects markdown by MIME type", () => {
    const file = makeFile("doc.md", "# hello", "text/markdown");
    expect(detectFormat(file)).toBe("md");
  });

  it("detects markdown by x-markdown MIME", () => {
    const file = makeFile("doc.md", "# hello", "text/x-markdown");
    expect(detectFormat(file)).toBe("md");
  });

  it("detects PDF by MIME type", () => {
    const file = makeFile("doc.pdf", "", "application/pdf");
    expect(detectFormat(file)).toBe("pdf");
  });

  it("detects DOCX by MIME type", () => {
    const file = makeFile(
      "doc.docx",
      "",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(detectFormat(file)).toBe("docx");
  });

  it("detects plain text by MIME type", () => {
    const file = makeFile("doc.txt", "hello", "text/plain");
    expect(detectFormat(file)).toBe("txt");
  });

  it("falls back to extension when MIME is empty", () => {
    const file = makeFile("notes.md", "# notes", "");
    expect(detectFormat(file)).toBe("md");
  });

  it("falls back to extension for .txt with octet-stream MIME", () => {
    const file = makeFile("notes.txt", "hello", "application/octet-stream");
    expect(detectFormat(file)).toBe("txt");
  });

  it("returns null for unsupported types", () => {
    const file = makeFile("image.png", "", "image/png");
    expect(detectFormat(file)).toBeNull();
  });

  it("returns null for unknown extension with no MIME", () => {
    const file = makeFile("data.csv", "a,b,c", "");
    expect(detectFormat(file)).toBeNull();
  });
});

// ── parseDocument ───────────────────────────────────────────────────────────

describe("parseDocument", () => {
  it("parses a markdown file from fixture", async () => {
    const file = fixtureFile("sample.md", "text/markdown");
    const result = await parseDocument(file);

    expect(result.filename).toBe("sample.md");
    expect(result.format).toBe("md");
    expect(result.content).toContain("Sales Engineering Persona");
    expect(result.content).toContain("Key Pain Points");
    expect(result.wordCount).toBeGreaterThan(30);
    expect(result.errors).toHaveLength(0);
  });

  it("parses a plain text file from fixture", async () => {
    const file = fixtureFile("sample.txt", "text/plain");
    const result = await parseDocument(file);

    expect(result.filename).toBe("sample.txt");
    expect(result.format).toBe("txt");
    expect(result.content).toContain("Enterprise Account Segment");
    expect(result.wordCount).toBeGreaterThan(10);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects unsupported file types", async () => {
    const file = makeFile("image.png", "binary data", "image/png");
    const result = await parseDocument(file);

    expect(result.content).toBe("");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Unsupported file type");
  });

  it("enforces per-file size limit", async () => {
    const bigContent = "x".repeat(11 * 1024 * 1024);
    const file = makeFile("big.txt", bigContent, "text/plain");
    const result = await parseDocument(file);

    expect(result.content).toBe("");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("exceeds the 10 MB size limit");
  });

  it("handles empty files", async () => {
    const file = makeFile("empty.txt", "", "text/plain");
    const result = await parseDocument(file);

    expect(result.content).toBe("");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("is empty");
  });

  it("sanitizes filenames with path separators", async () => {
    const file = makeFile("../../etc/passwd.txt", "test", "text/plain");
    const result = await parseDocument(file);

    expect(result.filename).not.toContain("/");
    expect(result.filename).not.toContain("\\");
  });

  it("respects a custom file size limit", async () => {
    const content = "x".repeat(2 * 1024 * 1024);
    const file = makeFile("medium.txt", content, "text/plain");
    const result = await parseDocument(file, 1);

    expect(result.content).toBe("");
    expect(result.errors[0]).toContain("exceeds the 1 MB size limit");
  });
});

// ── parseDocuments (batch) ──────────────────────────────────────────────────

describe("parseDocuments", () => {
  it("parses multiple files in a batch", async () => {
    const files = [
      fixtureFile("sample.md", "text/markdown"),
      fixtureFile("sample.txt", "text/plain"),
    ];

    const result = await parseDocuments(files);
    expect(result.documents).toHaveLength(2);
    expect(result.documents[0].format).toBe("md");
    expect(result.documents[1].format).toBe("txt");
    expect(result.errors).toHaveLength(0);
  });

  it("enforces batch file count limit", async () => {
    const files = Array.from({ length: 51 }, (_, i) =>
      makeFile(`file${i}.txt`, "content", "text/plain")
    );

    const result = await parseDocuments(files);
    expect(result.documents).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].error).toContain("exceeding the limit of 50");
  });

  it("enforces batch total size limit", async () => {
    const bigContent = "x".repeat(60 * 1024 * 1024);
    const files = [
      makeFile("big1.txt", bigContent, "text/plain"),
      makeFile("big2.txt", bigContent, "text/plain"),
    ];

    const result = await parseDocuments(files, { maxBatchSizeMB: 100 });
    expect(result.documents).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].error).toContain("exceeds the limit of 100 MB");
  });

  it("collects per-file errors while continuing batch", async () => {
    const files = [
      fixtureFile("sample.md", "text/markdown"),
      makeFile("bad.png", "binary", "image/png"),
      fixtureFile("sample.txt", "text/plain"),
    ];

    const result = await parseDocuments(files);
    expect(result.documents).toHaveLength(3);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].filename).toBe("bad.png");
  });

  it("respects custom batch options", async () => {
    const files = Array.from({ length: 3 }, (_, i) =>
      makeFile(`f${i}.txt`, "content", "text/plain")
    );

    const result = await parseDocuments(files, { maxBatchCount: 2 });
    expect(result.documents).toHaveLength(0);
    expect(result.errors[0].error).toContain("exceeding the limit of 2");
  });
});

// ── PDF extraction (mocked) ────────────────────────────────────────────────

describe("parseDocument — PDF", () => {
  it("handles PDF parse errors gracefully", async () => {
    const file = makeFile("broken.pdf", "not a real pdf", "application/pdf");
    const result = await parseDocument(file);

    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ── DOCX extraction (mocked) ───────────────────────────────────────────────

describe("parseDocument — DOCX", () => {
  it("handles DOCX parse errors gracefully", async () => {
    const file = makeFile(
      "broken.docx",
      "not a real docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    const result = await parseDocument(file);

    expect(result.errors.length).toBeGreaterThan(0);
  });
});
