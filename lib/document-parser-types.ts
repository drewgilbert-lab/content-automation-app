export type DocumentFormat = "md" | "pdf" | "docx" | "txt";

export interface ParsedDocument {
  filename: string;
  format: DocumentFormat;
  content: string;
  wordCount: number;
  errors: string[];
}

export interface ParseOptions {
  maxFileSizeMB?: number;
  maxBatchSizeMB?: number;
  maxBatchCount?: number;
}

export interface ParseResult {
  documents: ParsedDocument[];
  errors: { filename: string; error: string }[];
}

export const DEFAULT_LIMITS = {
  maxFileSizeMB: 10,
  maxBatchSizeMB: 100,
  maxBatchCount: 50,
} as const;

export const MIME_TYPE_MAP: Record<string, DocumentFormat> = {
  "text/markdown": "md",
  "text/x-markdown": "md",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/plain": "txt",
};

export const EXTENSION_MAP: Record<string, DocumentFormat> = {
  ".md": "md",
  ".pdf": "pdf",
  ".docx": "docx",
  ".txt": "txt",
};
