"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SkillDetail } from "@/lib/skill-types";
import {
  CONTENT_TYPES,
  SKILL_CATEGORIES,
  getContentTypeLabel,
  getCategoryLabel,
} from "@/lib/skill-types";
import { MarkdownRenderer } from "@/app/knowledge/components/markdown-renderer";

interface SkillFormProps {
  mode: "create" | "edit";
  initialData?: SkillDetail;
}

export function SkillForm({ mode, initialData }: SkillFormProps) {
  const router = useRouter();

  const init = mode === "edit" && initialData ? initialData : null;
  const [name, setName] = useState(init?.name ?? "");
  const [description, setDescription] = useState(init?.description ?? "");
  const [content, setContent] = useState(init?.content ?? "");
  const [contentType, setContentType] = useState<string[]>(
    init?.contentType ?? []
  );
  const [category, setCategory] = useState(init?.category ?? "");
  const [tagsInput, setTagsInput] = useState(
    init?.tags ? init.tags.join(", ") : ""
  );
  const [outputFormat, setOutputFormat] = useState(init?.outputFormat ?? "");
  const [author, setAuthor] = useState(init?.author ?? "");
  const [parameters, setParameters] = useState(init?.parameters ?? "");

  const [versionBump, setVersionBump] = useState<"patch" | "minor" | "major">("patch");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleContentType(ct: string) {
    setContentType((prev) =>
      prev.includes(ct) ? prev.filter((t) => t !== ct) : [...prev, ct]
    );
  }

  function bumpVersion(
    current: string,
    bump: "patch" | "minor" | "major"
  ): string {
    const parts = current.split(".").map(Number);
    if (parts.length !== 3) return "1.0.1";
    if (bump === "major") return `${parts[0] + 1}.0.0`;
    if (bump === "minor") return `${parts[0]}.${parts[1] + 1}.0`;
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!name.trim()) {
        setError("Name is required");
        return;
      }
      if (!description.trim()) {
        setError("Description is required");
        return;
      }
      if (!content.trim()) {
        setError("Content is required");
        return;
      }
      if (contentType.length === 0) {
        setError("At least one content type is required");
        return;
      }

      setSaving(true);

      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      try {
        const url =
          mode === "create"
            ? "/api/skills"
            : `/api/skills/${initialData!.id}`;

        const method = mode === "create" ? "POST" : "PUT";

        const body: Record<string, unknown> = {
          name: name.trim(),
          description: description.trim(),
          content,
          contentType,
          tags,
          category: category || undefined,
          outputFormat: outputFormat || undefined,
          author: author || undefined,
          parameters: parameters || undefined,
        };

        if (mode === "edit") {
          body.version = bumpVersion(initialData!.version, versionBump);
        }

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to save");
          setSaving(false);
          return;
        }

        const data = await res.json();
        const skillId = mode === "create" ? data.id : initialData!.id;
        router.push(`/skills/${skillId}`);
        router.refresh();
      } catch {
        setError("Network error. Please try again.");
        setSaving(false);
      }
    },
    [
      mode,
      initialData,
      name,
      description,
      content,
      contentType,
      tagsInput,
      category,
      outputFormat,
      author,
      parameters,
      versionBump,
      router,
    ]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Campaign Brief Generator"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short summary of what this skill does..."
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
        />
      </div>

      {/* Content with preview toggle */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-gray-300">
            Instruction Content
          </label>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs font-medium text-gray-400 hover:text-gray-300 transition-colors"
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
        </div>
        {showPreview ? (
          <div className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 min-h-[200px]">
            {content.trim() ? (
              <MarkdownRenderer content={content} />
            ) : (
              <p className="text-gray-500 text-sm italic">Nothing to preview</p>
            )}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Step-by-step instructions in markdown..."
            rows={12}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none font-mono text-sm resize-y"
          />
        )}
      </div>

      {/* Content Types (multi-select) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Content Types
        </label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((ct) => (
            <button
              key={ct}
              type="button"
              onClick={() => toggleContentType(ct)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                contentType.includes(ct)
                  ? "border-blue-600 bg-blue-600/20 text-blue-400"
                  : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
              }`}
            >
              {getContentTypeLabel(ct)}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Select which content types trigger this skill
        </p>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-gray-600 focus:outline-none"
        >
          <option value="">Select category...</option>
          {SKILL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {getCategoryLabel(cat)}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Tags
        </label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="Comma-separated tags..."
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          Separate multiple tags with commas
        </p>
      </div>

      {/* Output Format */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Output Format
        </label>
        <input
          type="text"
          value={outputFormat}
          onChange={(e) => setOutputFormat(e.target.value)}
          placeholder="Describe the expected output structure..."
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
        />
      </div>

      {/* Author */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Author
        </label>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Who created this skill..."
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
        />
      </div>

      {/* Parameters (JSON) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Parameters (JSON)
        </label>
        <textarea
          value={parameters}
          onChange={(e) => setParameters(e.target.value)}
          placeholder='[{"name": "tone", "type": "select", "description": "Output tone", "required": false, "options": ["formal", "casual"]}]'
          rows={3}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none font-mono text-sm resize-y"
        />
        <p className="mt-1 text-xs text-gray-500">
          Optional JSON array of SkillParameter objects
        </p>
      </div>

      {/* Version bump (edit only) */}
      {mode === "edit" && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Version Bump (current: v{initialData!.version})
          </label>
          <div className="flex gap-2">
            {(["patch", "minor", "major"] as const).map((bump) => (
              <button
                key={bump}
                type="button"
                onClick={() => setVersionBump(bump)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  versionBump === bump
                    ? "border-blue-600 bg-blue-600/20 text-blue-400"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                }`}
              >
                {bump} ({bumpVersion(initialData!.version, bump)})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving..." : mode === "create" ? "Create Skill" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-300 hover:border-gray-600 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
