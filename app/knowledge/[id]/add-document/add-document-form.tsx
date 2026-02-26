"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileDropZone } from "@/app/bulk-upload/components/file-drop-zone";
import type { KnowledgeType } from "@/lib/knowledge-types";

interface ParsedDoc {
  filename: string;
  format: string;
  content: string;
  wordCount: number;
  errors: string[];
}

interface AddDocumentFormProps {
  objectId: string;
  objectName: string;
  objectType: KnowledgeType;
}

type Step = "upload" | "preview" | "submitting" | "success";

export function AddDocumentForm({
  objectId,
  objectName,
  objectType,
}: AddDocumentFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<ParsedDoc | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  async function handleFileSelected(files: File[]) {
    const file = files[0];
    if (!file) return;

    setParsing(true);
    setParseError(null);
    setParsed(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`/api/knowledge/${objectId}/add-document/parse`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        setParseError(data.error ?? "Failed to parse document");
        setParsing(false);
        return;
      }

      setParsed(data);
      setStep("preview");
    } catch {
      setParseError("Failed to parse document. Please try again.");
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit() {
    if (!parsed) return;

    setStep("submitting");
    setSubmitError(null);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitter: "contributor",
          objectType,
          objectName,
          submissionType: "document_add",
          targetObjectId: objectId,
          proposedContent: JSON.stringify({
            content: parsed.content,
            sourceFile: parsed.filename,
          }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "Failed to create submission");
        setStep("preview");
        return;
      }

      setSubmissionId(data.id);
      setStep("success");
    } catch {
      setSubmitError("Failed to submit. Please try again.");
      setStep("preview");
    }
  }

  function handleReset() {
    setParsed(null);
    setParseError(null);
    setSubmitError(null);
    setStep("upload");
  }

  if (step === "success") {
    return (
      <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-900/50 border border-green-700">
            <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Document submitted for review
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              The document has been submitted and will be reviewed by an admin
              before being merged into <span className="text-gray-300">{objectName}</span>.
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <Link
              href="/queue"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
            >
              View Review Queue
            </Link>
            <Link
              href={`/knowledge/${objectId}`}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:border-gray-600 hover:text-white transition-colors"
            >
              Back to Object
            </Link>
          </div>
          {submissionId && (
            <p className="text-xs text-gray-500 mt-2">
              Submission ID: {submissionId}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Upload area */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500 mb-4">
          {step === "upload" ? "Upload Document" : "Selected Document"}
        </h2>

        {step === "upload" && (
          <>
            <FileDropZone
              onFilesSelected={handleFileSelected}
              disabled={parsing}
              multiple={false}
            />
            {parsing && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Parsing document...
              </div>
            )}
            {parseError && (
              <div className="mt-4 rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                {parseError}
              </div>
            )}
          </>
        )}

        {parsed && step !== "upload" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 border border-gray-700">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{parsed.filename}</p>
                  <p className="text-xs text-gray-500">
                    {parsed.format.toUpperCase()} &middot; {parsed.wordCount.toLocaleString()} words
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                disabled={step === "submitting"}
                className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Change file
              </button>
            </div>

            {parsed.errors.length > 0 && (
              <div className="rounded-lg border border-yellow-800 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-300">
                Parse warnings: {parsed.errors.join("; ")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content preview */}
      {parsed && step !== "upload" && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500 mb-4">
            Content Preview
          </h2>
          <div className="max-h-80 overflow-y-auto rounded-lg bg-gray-950 border border-gray-800 p-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed">
              {parsed.content.length > 5000
                ? parsed.content.slice(0, 5000) + "\n\n[...truncated for preview]"
                : parsed.content}
            </pre>
          </div>
        </div>
      )}

      {/* Submit */}
      {parsed && step !== "upload" && (
        <div className="flex items-center justify-between">
          <div>
            {submitError && (
              <p className="text-sm text-red-400">{submitError}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              disabled={step === "submitting"}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:border-gray-600 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={step === "submitting"}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {step === "submitting" ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                "Submit for Review"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
