"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CONTENT_TYPES, getContentTypeLabel } from "@/lib/skill-types";
import { MarkdownRenderer } from "@/app/knowledge/components/markdown-renderer";
import type { ContentDetail } from "@/lib/content-types";

interface ContentFormProps {
  mode: "create" | "edit";
  initialData?: ContentDetail;
}

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function ContentForm({ mode, initialData }: ContentFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(() => initialData?.title ?? "");
  const [contentType, setContentType] = useState(() =>
    mode === "edit" && initialData?.contentType
      ? initialData.contentType
      : CONTENT_TYPES[0]
  );
  const [body, setBody] = useState(() => initialData?.body ?? "");
  const [tagsInput, setTagsInput] = useState(
    () => initialData?.tags.join(", ") ?? ""
  );
  const [sourceDescription, setSourceDescription] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const trimmedTitle = title.trim();
      const trimmedBody = body.trim();
      if (!trimmedTitle || !trimmedBody) {
        setError("Title and body are required.");
        return;
      }

      const tags = parseTags(tagsInput);
      setSaving(true);
      try {
        if (mode === "create") {
          const res = await fetch("/api/content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: trimmedTitle,
              contentType,
              body: trimmedBody,
              tags,
              sourceChannel: "direct_upload",
              sourceDescription: sourceDescription.trim() || undefined,
            }),
          });
          const data = (await res.json()) as { id?: string; error?: string };
          if (!res.ok) {
            setError(data.error ?? "Failed to create content.");
            return;
          }
          if (data.id) {
            router.push(`/content/${data.id}`);
          } else {
            setError("Invalid response from server.");
          }
        } else {
          if (!initialData?.id) {
            setError("Missing content id.");
            return;
          }
          const res = await fetch(`/api/content/${initialData.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: trimmedTitle,
              body: trimmedBody,
              tags,
            }),
          });
          const data = (await res.json()) as { error?: string };
          if (!res.ok) {
            setError(data.error ?? "Failed to update content.");
            return;
          }
          router.push(`/content/${initialData.id}`);
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [
      mode,
      title,
      body,
      tagsInput,
      contentType,
      sourceDescription,
      initialData?.id,
      router,
    ]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div
          className="rounded-lg border border-status-danger/30 bg-status-danger-bg px-4 py-3 text-body text-status-danger"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div>
        <label className="mb-1.5 block text-body font-medium text-text-secondary">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-body font-medium text-text-secondary">
          Content Type
        </label>
        {mode === "create" ? (
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary focus:border-border-focus focus:outline-none"
          >
            {CONTENT_TYPES.map((ct) => (
              <option key={ct} value={ct}>
                {getContentTypeLabel(ct)}
              </option>
            ))}
          </select>
        ) : (
          <div className="rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary">
            {getContentTypeLabel(initialData?.contentType ?? contentType)}
          </div>
        )}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label className="block text-body font-medium text-text-secondary">
            Body
          </label>
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="text-caption text-text-secondary transition-colors hover:text-text-primary"
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
        </div>
        {showPreview ? (
          <div className="min-h-[200px] rounded-lg border border-border-default bg-surface-input px-4 py-3">
            <MarkdownRenderer content={body} />
          </div>
        ) : (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="w-full resize-y rounded-lg border border-border-default bg-surface-input px-4 py-2.5 font-mono text-sm text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none"
          />
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-body font-medium text-text-secondary">
          Tags
        </label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="Comma-separated tags..."
          className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none"
        />
        <p className="mt-1 text-caption text-text-muted">
          Separate multiple tags with commas
        </p>
      </div>

      {mode === "create" ? (
        <div>
          <label className="mb-1.5 block text-body font-medium text-text-secondary">
            Source Description (optional)
          </label>
          <input
            type="text"
            value={sourceDescription}
            onChange={(e) => setSourceDescription(e.target.value)}
            placeholder="Describe where this content came from..."
            className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none"
          />
        </div>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-action-primary px-5 py-2.5 text-body font-medium text-text-primary transition-colors hover:bg-action-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : mode === "create"
              ? "Create"
              : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-border-default px-5 py-2.5 text-body font-medium text-text-secondary transition-colors hover:border-border-default/80 hover:text-text-primary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
