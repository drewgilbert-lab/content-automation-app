"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import type { ClassificationResult } from "@/lib/classification-types";
import type { SerializedSessionDocument } from "@/lib/upload-session-types";
import { DEFAULT_LIMITS } from "@/lib/document-parser-types";
import { FileDropZone } from "./file-drop-zone";
import { ClassificationProgress } from "./classification-progress";
import { DocumentReviewCard } from "./document-review-card";

interface ParsedDocMeta {
  index: number;
  filename: string;
  format: string;
  wordCount: number;
  parseErrors: string[];
}

type FileUploadStatus = "pending" | "uploading" | "parsed" | "failed";

interface FileUploadState {
  status: FileUploadStatus;
  error?: string;
  sessionIndex?: number;
}

const UPLOAD_CONCURRENCY = 3;
const MAX_FILE_BYTES = DEFAULT_LIMITS.maxFileSizeMB * 1024 * 1024;
const MAX_BATCH_BYTES = DEFAULT_LIMITS.maxBatchSizeMB * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFormat(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = { md: "Markdown", pdf: "PDF", docx: "DOCX", txt: "Text" };
  return map[ext] ?? ext;
}

function statusLabel(status: FileUploadStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "uploading":
      return "Uploading…";
    case "parsed":
      return "Parsed";
    case "failed":
      return "Failed";
  }
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let next = 0;
  async function runNext(): Promise<void> {
    while (next < items.length) {
      const current = next++;
      await worker(items[current]);
    }
  }
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runNext()
  );
  await Promise.all(runners);
}

export function BulkUploadWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [fileStates, setFileStates] = useState<Map<number, FileUploadState>>(new Map());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [parsedDocs, setParsedDocs] = useState<ParsedDocMeta[]>([]);
  const [parseErrors, setParseErrors] = useState<{ filename: string; error: string }[]>([]);
  const [sessionDocuments, setSessionDocuments] = useState<SerializedSessionDocument[]>([]);
  const [classifications, setClassifications] = useState<Map<number, ClassificationResult>>(new Map());
  const [classifyProgress, setClassifyProgress] = useState<{
    current: number;
    total: number;
    results: Map<number, { filename: string; status: "done" | "error"; error?: string }>;
  }>({ current: 0, total: 0, results: new Map() });
  const [userEdits, setUserEdits] = useState<Map<number, Partial<ClassificationResult>>>(new Map());
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [reclassifyingIndexes, setReclassifyingIndexes] = useState<Set<number>>(new Set());
  const [removedIndexes, setRemovedIndexes] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [approveResult, setApproveResult] = useState<{
    submissions: { documentIndex: number; submissionId: string }[];
    errors: { documentIndex: number; error: string }[];
  } | null>(null);

  const updateFileState = useCallback((index: number, patch: Partial<FileUploadState>) => {
    setFileStates((prev) => {
      const next = new Map(prev);
      const current = next.get(index) ?? { status: "pending" as const };
      next.set(index, { ...current, ...patch });
      return next;
    });
  }, []);

  const handleFilesSelected = useCallback((newFiles: File[]) => {
    setFiles((prev) => {
      const combined = [...prev, ...newFiles];
      return combined.slice(0, DEFAULT_LIMITS.maxBatchCount);
    });
    setFileStates((prev) => {
      const next = new Map(prev);
      // New files appended after current length will start as pending once state updates;
      // clear states for a fresh selection pass by extending pending for new indexes in effect below.
      return next;
    });
    setUploadError(null);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileStates((prev) => {
      const entries = Array.from(prev.entries())
        .filter(([i]) => i !== index)
        .map(([i, state]) => [i > index ? i - 1 : i, state] as const);
      return new Map(entries);
    });
  }, []);

  const uploadOneFile = useCallback(
    async (fileIndex: number, file: File, sid: string) => {
      updateFileState(fileIndex, { status: "uploading", error: undefined });
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sessionId", sid);
        const res = await fetch("/api/bulk-upload/parse-single", {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        });
        let data: { error?: string; index?: number; filename?: string; format?: string; wordCount?: number; parseErrors?: string[] } = {};
        try {
          data = await res.json();
        } catch {
          updateFileState(fileIndex, {
            status: "failed",
            error: res.ok ? "Invalid server response" : `Upload failed (${res.status})`,
          });
          return;
        }
        if (!res.ok) {
          updateFileState(fileIndex, {
            status: "failed",
            error: data.error ?? `Upload failed (${res.status})`,
          });
          return;
        }
        updateFileState(fileIndex, {
          status: "parsed",
          sessionIndex: data.index as number,
          error: undefined,
        });
        setParsedDocs((prev) => {
          const entry: ParsedDocMeta = {
            index: data.index as number,
            filename: data.filename as string,
            format: data.format as string,
            wordCount: data.wordCount as number,
            parseErrors: (data.parseErrors as string[]) ?? [],
          };
          const without = prev.filter((d) => d.index !== entry.index);
          return [...without, entry].sort((a, b) => a.index - b.index);
        });
        const errs = (data.parseErrors as string[]) ?? [];
        if (errs.length > 0) {
          setParseErrors((prev) => [
            ...prev.filter((e) => e.filename !== data.filename),
            ...errs.map((error) => ({ filename: data.filename as string, error })),
          ]);
        }
      } catch (err) {
        updateFileState(fileIndex, {
          status: "failed",
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }
    },
    [updateFileState]
  );

  const runClassification = useCallback(
    async (sid: string, docs: SerializedSessionDocument[]) => {
      const total = docs.length;
      const results = new Map<number, { filename: string; status: "done" | "error"; error?: string }>();
      setClassifyProgress({ current: 0, total, results: new Map(results) });
      const documents = docs.map((d) => ({
        filename: d.filename,
        format: d.format,
        content: d.content,
        wordCount: d.wordCount,
        errors: d.parseErrors ?? [],
      }));
      const res = await fetch("/api/bulk-upload/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, documents }),
      });
      if (!res.ok) {
        const errData = await res.json();
        setUploadError(errData.error ?? "Classification failed");
        setStep(1);
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentIdx = 0;
      const newClassifications = new Map<number, ClassificationResult>();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const chunk of parts) {
          const eventMatch = chunk.match(/^event: (\w+)\ndata: ([\s\S]+)$/);
          if (!eventMatch) continue;
          const [, eventType, dataStr] = eventMatch;
          let data: Record<string, unknown>;
          try {
            data = JSON.parse(dataStr);
          } catch {
            continue;
          }
          switch (eventType) {
            case "progress":
              currentIdx = (data.index as number) ?? currentIdx;
              setClassifyProgress((p) => ({ ...p, current: currentIdx }));
              break;
            case "result": {
              const idx = data.index as number;
              const classification = data.classification as ClassificationResult;
              newClassifications.set(idx, classification);
              results.set(idx, { filename: data.filename as string, status: "done" });
              setClassifications(new Map(newClassifications));
              setClassifyProgress((p) => ({
                ...p,
                current: idx,
                results: new Map(results),
              }));
              break;
            }
            case "error": {
              const idx = data.index as number;
              results.set(idx, {
                filename: data.filename as string,
                status: "error",
                error: data.error as string,
              });
              setClassifyProgress((p) => ({
                ...p,
                current: idx,
                results: new Map(results),
              }));
              break;
            }
            case "done": {
              const allIndexes = Array.from(newClassifications.keys());
              setSelectedIndexes(new Set(allIndexes));
              setStep(3);
              break;
            }
          }
        }
      }
    },
    []
  );

  const advanceToClassification = useCallback(
    async (sid: string) => {
      const sessionRes = await fetch(`/api/bulk-upload/session/${sid}`);
      if (!sessionRes.ok) {
        setUploadError("Failed to load session");
        return;
      }
      const sessionData = await sessionRes.json();
      setSessionDocuments(sessionData.documents ?? []);
      setStep(2);
      setClassifications(new Map());
      setUserEdits(new Map());
      setRemovedIndexes(new Set());
      setApproveResult(null);
      const docs = sessionData.documents as SerializedSessionDocument[];
      setParsedDocs(
        docs.map((d) => ({
          index: d.index,
          filename: d.filename,
          format: d.format,
          wordCount: d.wordCount,
          parseErrors: d.parseErrors ?? [],
        }))
      );
      if (docs.length > 0) {
        await runClassification(sid, docs);
      } else {
        setClassifyProgress({ current: 0, total: 0, results: new Map() });
        setStep(3);
      }
    },
    [runClassification]
  );

  const handleUpload = useCallback(async () => {
    if (files.length === 0 || uploading) return;

    if (files.length > DEFAULT_LIMITS.maxBatchCount) {
      setUploadError(
        `Batch contains ${files.length} files, exceeding the limit of ${DEFAULT_LIMITS.maxBatchCount}`
      );
      return;
    }
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > MAX_BATCH_BYTES) {
      setUploadError(
        `Batch total size ${(totalBytes / 1024 / 1024).toFixed(1)} MB exceeds the limit of ${DEFAULT_LIMITS.maxBatchSizeMB} MB`
      );
      return;
    }

    const initialStates = new Map<number, FileUploadState>();
    const oversizeIndexes: number[] = [];
    files.forEach((file, i) => {
      if (file.size > MAX_FILE_BYTES) {
        oversizeIndexes.push(i);
        initialStates.set(i, {
          status: "failed",
          error: `File exceeds the ${DEFAULT_LIMITS.maxFileSizeMB} MB size limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
        });
      } else {
        initialStates.set(i, { status: "pending" });
      }
    });
    setFileStates(initialStates);
    setParsedDocs([]);
    setParseErrors([]);
    setUploadError(null);

    const toUpload = files
      .map((file, i) => ({ file, i }))
      .filter(({ i }) => !oversizeIndexes.includes(i));

    if (toUpload.length === 0) {
      setUploadError("No files within the size limit to upload");
      return;
    }

    setUploading(true);
    try {
      const sessionRes = await fetch("/api/bulk-upload/session", {
        method: "POST",
        credentials: "same-origin",
      });
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) {
        setUploadError(sessionData.error ?? "Failed to create upload session");
        return;
      }
      const sid = sessionData.sessionId as string;
      sessionIdRef.current = sid;
      setSessionId(sid);

      await runWithConcurrency(toUpload, UPLOAD_CONCURRENCY, async ({ file, i }) => {
        await uploadOneFile(i, file, sid);
      });

      const sessionCheck = await fetch(`/api/bulk-upload/session/${sid}`, {
        credentials: "same-origin",
      });
      if (!sessionCheck.ok) {
        const errBody = await sessionCheck.json().catch(() => ({}));
        setUploadError(
          (errBody as { error?: string }).error ??
            "Failed to load session after upload (session missing — Redis may be required)"
        );
        return;
      }
      const checkData = await sessionCheck.json();
      const docs = (checkData.documents ?? []) as SerializedSessionDocument[];
      if (docs.length === 0) {
        setUploadError(
          "No documents were parsed successfully. Check per-file errors below, fix failed files, and retry."
        );
        return;
      }

      // Auto-advance when every attempted upload landed in the session.
      // Partial success stays on Step 1 so the user can retry or Continue.
      if (docs.length === toUpload.length) {
        await advanceToClassification(sid);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [files, uploading, uploadOneFile, advanceToClassification]);

  const handleRetryFile = useCallback(
    async (fileIndex: number) => {
      const file = files[fileIndex];
      const sid = sessionIdRef.current ?? sessionId;
      if (!file || !sid || uploading) return;
      setUploading(true);
      setUploadError(null);
      try {
        await uploadOneFile(fileIndex, file, sid);
      } finally {
        setUploading(false);
      }
    },
    [files, sessionId, uploading, uploadOneFile]
  );

  const handleContinue = useCallback(async () => {
    const sid = sessionIdRef.current ?? sessionId;
    if (!sid || uploading) return;
    setUploadError(null);
    try {
      await advanceToClassification(sid);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to continue");
    }
  }, [sessionId, uploading, advanceToClassification]);

  const getEffectiveClassification = useCallback(
    (index: number): ClassificationResult | null => {
      const base = classifications.get(index);
      if (!base) return null;
      const edits = userEdits.get(index);
      if (!edits) return base;
      return { ...base, ...edits };
    },
    [classifications, userEdits]
  );

  const handleEdit = useCallback((index: number, edits: Partial<ClassificationResult>) => {
    setUserEdits((prev) => {
      const next = new Map(prev);
      const existing = next.get(index) ?? {};
      next.set(index, { ...existing, ...edits });
      return next;
    });
  }, []);

  const handleReclassify = useCallback(
    async (index: number) => {
      if (!sessionId) return;
      setReclassifyingIndexes((prev) => new Set(prev).add(index));
      try {
        const res = await fetch("/api/bulk-upload/reclassify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, documentIndex: index }),
        });
        const classification = await res.json();
        if (!res.ok) {
          return;
        }
        setClassifications((prev) => {
          const next = new Map(prev);
          next.set(index, classification);
          return next;
        });
        setUserEdits((prev) => {
          const next = new Map(prev);
          next.delete(index);
          return next;
        });
      } finally {
        setReclassifyingIndexes((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }
    },
    [sessionId]
  );

  const handleReclassifySelected = useCallback(async () => {
    const indexes = Array.from(selectedIndexes).filter((i) => !removedIndexes.has(i));
    for (const idx of indexes) {
      await handleReclassify(idx);
    }
  }, [selectedIndexes, removedIndexes, handleReclassify]);

  const handleRemoveSelected = useCallback(() => {
    setRemovedIndexes((prev) => new Set([...prev, ...selectedIndexes]));
    setSelectedIndexes(new Set());
  }, [selectedIndexes]);

  const handleApprove = useCallback(async () => {
    if (!sessionId || selectedIndexes.size === 0 || approving) return;
    const indexes = Array.from(selectedIndexes).filter((i) => !removedIndexes.has(i));
    if (indexes.length === 0) return;
    setApproving(true);
    setApproveResult(null);
    try {
      const overrides: Record<string, Partial<ClassificationResult>> = {};
      userEdits.forEach((edits, idx) => {
        if (indexes.includes(idx)) overrides[String(idx)] = edits;
      });
      const res = await fetch("/api/bulk-upload/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          documentIndexes: indexes,
          submitter: "bulk-upload",
          overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApproveResult({
          submissions: [],
          errors: [{ documentIndex: -1, error: data.error ?? "Approve failed" }],
        });
        return;
      }
      setApproveResult(data);
    } finally {
      setApproving(false);
    }
  }, [sessionId, selectedIndexes, removedIndexes, approving, userEdits]);

  const toggleSelectAll = useCallback(() => {
    const withClassification = parsedDocs.filter(
      (_, i) => classifications.has(i) && !removedIndexes.has(i)
    );
    const indexes = withClassification.map((d) => d.index);
    const allSelected = indexes.every((i) => selectedIndexes.has(i));
    if (allSelected) {
      setSelectedIndexes(new Set());
    } else {
      setSelectedIndexes(new Set(indexes));
    }
  }, [parsedDocs, classifications, removedIndexes, selectedIndexes]);

  const toggleSelect = useCallback((index: number) => {
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleRemove = useCallback((index: number) => {
    setRemovedIndexes((prev) => new Set(prev).add(index));
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  const reviewDocs = parsedDocs.filter(
    (_, i) => classifications.has(i) && !removedIndexes.has(i)
  );
  const allReviewSelected =
    reviewDocs.length > 0 &&
    reviewDocs.every((d) => selectedIndexes.has(d.index));

  const parsedCount = Array.from(fileStates.values()).filter((s) => s.status === "parsed").length;
  const failedCount = Array.from(fileStates.values()).filter((s) => s.status === "failed").length;
  const stillUploading = Array.from(fileStates.values()).some((s) => s.status === "uploading");
  const canContinue =
    step === 1 &&
    !!sessionId &&
    parsedCount > 0 &&
    !uploading &&
    !stillUploading &&
    failedCount > 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        {[
          { num: 1, label: "Upload", active: step === 1, completed: step > 1 },
          { num: 2, label: "Classify", active: step === 2, completed: step > 2 },
          { num: 3, label: "Review", active: step === 3, completed: false },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                s.active ? "bg-blue-500 text-white" : s.completed ? "bg-green-500 text-white" : "bg-gray-800 text-gray-400"
              }`}
            >
              {s.completed ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s.num
              )}
            </div>
            <span className={`ml-2 text-sm ${s.active ? "text-white" : "text-gray-400"}`}>{s.label}</span>
            {i < 2 && <div className="ml-4 h-px w-8 bg-gray-700" />}
          </div>
        ))}
      </div>

      {uploadError && (
        <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3">
          <p className="text-sm text-red-200">{uploadError}</p>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <FileDropZone onFilesSelected={handleFilesSelected} disabled={uploading} />
          <p className="text-xs text-gray-500">
            Limits: {DEFAULT_LIMITS.maxFileSizeMB} MB per file, {DEFAULT_LIMITS.maxBatchSizeMB} MB
            total, {DEFAULT_LIMITS.maxBatchCount} files. Files upload individually (up to{" "}
            {UPLOAD_CONCURRENCY} at a time).
          </p>
          {files.length > 0 && (
            <ul className="space-y-2">
              {files.map((file, i) => {
                const state = fileStates.get(i);
                const status = state?.status ?? "pending";
                return (
                  <li
                    key={`${file.name}-${i}`}
                    className="flex flex-col gap-1 rounded-lg border border-gray-800 bg-gray-900 px-4 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                        <span className="truncate text-sm text-white">{file.name}</span>
                        <span className="text-xs text-gray-400">
                          {formatFileSize(file.size)} · {getFormat(file.name)}
                        </span>
                        <span
                          className={`text-xs ${
                            status === "parsed"
                              ? "text-green-400"
                              : status === "failed"
                                ? "text-red-400"
                                : status === "uploading"
                                  ? "text-blue-400"
                                  : "text-gray-500"
                          }`}
                        >
                          {statusLabel(status)}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {status === "failed" && sessionId && (
                          <button
                            type="button"
                            onClick={() => handleRetryFile(i)}
                            disabled={uploading}
                            className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
                          >
                            Retry
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          disabled={uploading}
                          className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    {state?.error && (
                      <p className="text-xs text-red-300">{state.error}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload & Parse"}
            </button>
            {canContinue && (
              <button
                type="button"
                onClick={handleContinue}
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Continue with {parsedCount} parsed
              </button>
            )}
          </div>
          {parseErrors.length > 0 && step === 1 && (
            <div className="rounded-lg border border-amber-800 bg-amber-950/20 px-4 py-3">
              <p className="mb-1 text-sm font-medium text-amber-200">Parse warnings</p>
              <ul className="list-inside list-disc space-y-1 text-xs text-amber-100/80">
                {parseErrors.map((e, idx) => (
                  <li key={`${e.filename}-${idx}`}>
                    {e.filename}: {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-medium text-white">Classifying documents</h2>
          <ClassificationProgress
            total={classifyProgress.total}
            current={classifyProgress.current}
            results={classifyProgress.results}
            filenames={parsedDocs.map((d) => d.filename)}
          />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-sm text-gray-400 hover:text-white"
            >
              {allReviewSelected ? "Deselect All" : "Select All"}
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={selectedIndexes.size === 0 || approving}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {approving ? "Approving…" : "Approve Selected"}
            </button>
            <button
              type="button"
              onClick={handleReclassifySelected}
              disabled={selectedIndexes.size === 0}
              className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
            >
              Reclassify Selected
            </button>
            <button
              type="button"
              onClick={handleRemoveSelected}
              disabled={selectedIndexes.size === 0}
              className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 disabled:opacity-50"
            >
              Remove Selected
            </button>
            <span className="text-sm text-gray-400">
              {selectedIndexes.size} of {reviewDocs.length} selected
            </span>
          </div>

          {approveResult && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="text-sm text-white">
                Created {approveResult.submissions.length} submission(s).
                {approveResult.errors.length > 0 && (
                  <span className="text-red-400"> {approveResult.errors.length} error(s).</span>
                )}
              </p>
              {approveResult.submissions.length > 0 && (
                <Link
                  href="/queue"
                  className="mt-2 inline-block text-sm text-blue-400 hover:text-blue-300"
                >
                  View in review queue →
                </Link>
              )}
            </div>
          )}

          <div className="space-y-4">
            {reviewDocs.map((doc) => {
              const sessionDoc = sessionDocuments[doc.index];
              const effective = getEffectiveClassification(doc.index);
              if (!sessionDoc || !effective) return null;
              return (
                <DocumentReviewCard
                  key={doc.index}
                  index={doc.index}
                  filename={doc.filename}
                  content={sessionDoc.content}
                  wordCount={sessionDoc.wordCount}
                  classification={effective}
                  selected={selectedIndexes.has(doc.index)}
                  onToggleSelect={toggleSelect}
                  onEdit={handleEdit}
                  onReclassify={handleReclassify}
                  onRemove={handleRemove}
                  reclassifying={reclassifyingIndexes.has(doc.index)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
