// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth: { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> } = require("mammoth");
import type {
  DocumentFormat,
  ParsedDocument,
  ParseOptions,
  ParseResult,
} from "./document-parser-types";
import {
  DEFAULT_LIMITS,
  MIME_TYPE_MAP,
  EXTENSION_MAP,
} from "./document-parser-types";

export type { DocumentFormat, ParsedDocument, ParseOptions, ParseResult };
export { DEFAULT_LIMITS, MIME_TYPE_MAP, EXTENSION_MAP };

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\]/g, "_").trim();
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function detectFormat(file: File): DocumentFormat | null {
  const byMime = MIME_TYPE_MAP[file.type];
  if (byMime) return byMime;

  const ext = file.name.lastIndexOf(".") >= 0
    ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
    : "";
  return EXTENSION_MAP[ext] ?? null;
}

async function extractText(buffer: ArrayBuffer): Promise<string> {
  return new TextDecoder("utf-8").decode(buffer);
}

async function extractMarkdown(buffer: ArrayBuffer): Promise<string> {
  return new TextDecoder("utf-8").decode(buffer);
}

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const buf = Buffer.from(new Uint8Array(buffer));
  const result = await pdfParse(buf);
  return result.text;
}

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const buf = Buffer.from(new Uint8Array(buffer));
  const result = await mammoth.extractRawText({ buffer: buf });
  return result.value;
}

const EXTRACTORS: Record<DocumentFormat, (buf: ArrayBuffer) => Promise<string>> = {
  txt: extractText,
  md: extractMarkdown,
  pdf: extractPdf,
  docx: extractDocx,
};

export async function parseDocument(
  file: File,
  maxFileSizeMB: number = DEFAULT_LIMITS.maxFileSizeMB
): Promise<ParsedDocument> {
  const filename = sanitizeFilename(file.name);
  const errors: string[] = [];

  const format = detectFormat(file);
  if (!format) {
    return {
      filename,
      format: "txt",
      content: "",
      wordCount: 0,
      errors: [
        `Unsupported file type "${file.type || "unknown"}" for "${filename}". Accepted: .md, .pdf, .docx, .txt`,
      ],
    };
  }

  const maxBytes = maxFileSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      filename,
      format,
      content: "",
      wordCount: 0,
      errors: [
        `File "${filename}" exceeds the ${maxFileSizeMB} MB size limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
      ],
    };
  }

  if (file.size === 0) {
    return {
      filename,
      format,
      content: "",
      wordCount: 0,
      errors: [`File "${filename}" is empty`],
    };
  }

  let content: string;
  try {
    const buffer = await file.arrayBuffer();
    content = await EXTRACTORS[format](buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      filename,
      format,
      content: "",
      wordCount: 0,
      errors: [`Failed to extract content from "${filename}": ${msg}`],
    };
  }

  if (!content.trim() && format === "pdf") {
    errors.push(
      `No text could be extracted from "${filename}". It may be a scanned/image-based PDF.`
    );
  }

  return {
    filename,
    format,
    content: content.trim(),
    wordCount: countWords(content),
    errors,
  };
}

export async function parseDocuments(
  files: File[],
  options?: ParseOptions
): Promise<ParseResult> {
  const maxFileSizeMB = options?.maxFileSizeMB ?? DEFAULT_LIMITS.maxFileSizeMB;
  const maxBatchSizeMB = options?.maxBatchSizeMB ?? DEFAULT_LIMITS.maxBatchSizeMB;
  const maxBatchCount = options?.maxBatchCount ?? DEFAULT_LIMITS.maxBatchCount;

  const documents: ParsedDocument[] = [];
  const batchErrors: { filename: string; error: string }[] = [];

  if (files.length > maxBatchCount) {
    batchErrors.push({
      filename: "(batch)",
      error: `Batch contains ${files.length} files, exceeding the limit of ${maxBatchCount}`,
    });
    return { documents, errors: batchErrors };
  }

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const totalMB = totalBytes / 1024 / 1024;
  if (totalMB > maxBatchSizeMB) {
    batchErrors.push({
      filename: "(batch)",
      error: `Batch total size ${totalMB.toFixed(1)} MB exceeds the limit of ${maxBatchSizeMB} MB`,
    });
    return { documents, errors: batchErrors };
  }

  for (const file of files) {
    try {
      const doc = await parseDocument(file, maxFileSizeMB);
      if (doc.errors.length > 0 && !doc.content) {
        batchErrors.push({
          filename: sanitizeFilename(file.name),
          error: doc.errors.join("; "),
        });
      }
      documents.push(doc);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      batchErrors.push({
        filename: sanitizeFilename(file.name),
        error: msg,
      });
    }
  }

  return { documents, errors: batchErrors };
}
