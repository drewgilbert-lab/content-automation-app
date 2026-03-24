"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SkillDetail, SkillKnowledgeLink } from "@/lib/skill-types";
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
  const searchParams = useSearchParams();

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

  const [links, setLinks] = useState<SkillKnowledgeLink[]>(
    init?.sourceKnowledgeObjects ?? []
  );

  useEffect(() => {
    if (mode !== "create" || !searchParams.get("imported")) return;
    try {
      const raw = sessionStorage.getItem("importedSkill");
      if (!raw) return;
      sessionStorage.removeItem("importedSkill");
      const imported = JSON.parse(raw);
      if (imported.name) setName(imported.name);
      if (imported.description) setDescription(imported.description);
      if (imported.content) setContent(imported.content);
      if (Array.isArray(imported.contentType)) setContentType(imported.contentType);
      if (imported.category) setCategory(imported.category);
      if (Array.isArray(imported.tags)) setTagsInput(imported.tags.join(", "));
      if (imported.outputFormat) setOutputFormat(imported.outputFormat);
      if (imported.author) setAuthor(imported.author);
      if (imported.parameters) setParameters(imported.parameters);
      if (Array.isArray(imported.sourceKnowledgeObjects)) {
        setLinks(imported.sourceKnowledgeObjects);
      }
    } catch {
      // ignore bad sessionStorage data
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [linkSearch, setLinkSearch] = useState("");
  const [linkSearchResults, setLinkSearchResults] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [linkSearching, setLinkSearching] = useState(false);

  const [versionBump, setVersionBump] = useState<"patch" | "minor" | "major">("patch");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prefill = searchParams.get("prefillLink");
    if (prefill) {
      try {
        const parsed = JSON.parse(decodeURIComponent(prefill));
        if (parsed.id && !links.some((l) => l.id === parsed.id)) {
          setLinks((prev) => [...prev, {
            id: parsed.id,
            collection: parsed.collection ?? "",
            name: parsed.name ?? "",
            integrationPrompt: "",
          }]);
        }
      } catch {
        // ignore bad prefill
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleLinkSearch = useCallback(async () => {
    if (!linkSearch.trim()) {
      setLinkSearchResults([]);
      return;
    }
    setLinkSearching(true);
    try {
      const res = await fetch("/api/knowledge");
      if (res.ok) {
        const data = await res.json();
        const term = linkSearch.trim().toLowerCase();
        const results = (data.objects ?? [])
          .filter((o: { id: string; name: string; type: string }) =>
            o.name.toLowerCase().includes(term) && !links.some((l) => l.id === o.id)
          )
          .slice(0, 10);
        setLinkSearchResults(results);
      }
    } catch {
      // ignore
    } finally {
      setLinkSearching(false);
    }
  }, [linkSearch, links]);

  function addLink(obj: { id: string; name: string; type: string }) {
    setLinks((prev) => [...prev, { id: obj.id, collection: obj.type, name: obj.name, integrationPrompt: "" }]);
    setLinkSearch("");
    setLinkSearchResults([]);
  }

  function removeLink(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  function updateLinkPrompt(id: string, prompt: string) {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, integrationPrompt: prompt } : l))
    );
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
      if (links.some((l) => !l.integrationPrompt.trim())) {
        setError("All linked knowledge objects must have an integration prompt");
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
          sourceKnowledgeObjects: links.length > 0 ? links : undefined,
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
      links,
      versionBump,
      router,
    ]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-status-danger/30 bg-status-danger-bg px-4 py-3 text-body text-status-danger">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-body font-medium text-text-secondary mb-1.5">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Campaign Brief Generator"
          className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-body font-medium text-text-secondary mb-1.5">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short summary of what this skill does..."
          className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none"
        />
      </div>

      {/* Content with preview toggle */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-body font-medium text-text-secondary">
            Instruction Content
          </label>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-caption text-text-secondary hover:text-text-primary transition-colors"
          >
            {showPreview ? "Edit" : "Preview"}
          </button>
        </div>
        {showPreview ? (
          <div className="rounded-lg border border-border-default bg-surface-input px-4 py-3 min-h-[200px]">
            {content.trim() ? (
              <MarkdownRenderer content={content} />
            ) : (
              <p className="text-text-muted text-body italic">Nothing to preview</p>
            )}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Step-by-step instructions in markdown..."
            rows={12}
            className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none font-mono text-sm resize-y"
          />
        )}
      </div>

      {/* Content Types (multi-select) */}
      <div>
        <label className="block text-body font-medium text-text-secondary mb-1.5">
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
                  ? "border-border-focus bg-action-primary/20 text-hg-blue-bright"
                  : "border-border-default bg-surface-input text-text-secondary hover:border-border-default/80"
              }`}
            >
              {getContentTypeLabel(ct)}
            </button>
          ))}
        </div>
        <p className="mt-1 text-caption text-text-muted">
          Select which content types trigger this skill
        </p>
      </div>

      {/* Category */}
      <div>
        <label className="block text-body font-medium text-text-secondary mb-1.5">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary focus:border-border-focus focus:outline-none"
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
        <label className="block text-body font-medium text-text-secondary mb-1.5">
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

      {/* Output Format */}
      <div>
        <label className="block text-body font-medium text-text-secondary mb-1.5">
          Output Format
        </label>
        <input
          type="text"
          value={outputFormat}
          onChange={(e) => setOutputFormat(e.target.value)}
          placeholder="Describe the expected output structure..."
          className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none"
        />
      </div>

      {/* Author */}
      <div>
        <label className="block text-body font-medium text-text-secondary mb-1.5">
          Author
        </label>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Who created this skill..."
          className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none"
        />
      </div>

      {/* Parameters (JSON) */}
      <div>
        <label className="block text-body font-medium text-text-secondary mb-1.5">
          Parameters (JSON)
        </label>
        <textarea
          value={parameters}
          onChange={(e) => setParameters(e.target.value)}
          placeholder='[{"name": "tone", "type": "select", "description": "Output tone", "required": false, "options": ["formal", "casual"]}]'
          rows={3}
          className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none font-mono text-sm resize-y"
        />
        <p className="mt-1 text-caption text-text-muted">
          Optional JSON array of SkillParameter objects
        </p>
      </div>

      {/* Knowledge Links */}
      <div>
        <label className="block text-body font-medium text-text-secondary mb-1.5">
          Linked Knowledge Objects
        </label>

        {links.length > 0 && (
          <div className="space-y-3 mb-4">
            {links.map((link) => (
              <div key={link.id} className="rounded-lg border border-border-default bg-surface-input p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-text-primary">{link.name || link.id}</span>
                    <span className="rounded bg-surface-active px-2 py-0.5 text-caption text-text-secondary">{link.collection}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLink(link.id)}
                    className="text-caption text-status-danger hover:text-status-danger/80"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={link.integrationPrompt}
                  onChange={(e) => updateLinkPrompt(link.id, e.target.value)}
                  placeholder="How should this object's content be incorporated into the skill? e.g. 'Update references to job titles, pain points, and language patterns to reflect any changes in the linked persona.'"
                  rows={2}
                  className="w-full rounded-lg border border-border-default bg-surface-card px-3 py-2 text-body text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none resize-y"
                />
                {!link.integrationPrompt.trim() && (
                  <p className="mt-1 text-caption text-status-warning">Integration prompt is required</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={linkSearch}
            onChange={(e) => setLinkSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLinkSearch(); } }}
            placeholder="Search knowledge objects to link..."
            className="flex-1 rounded-lg border border-border-default bg-surface-input px-4 py-2 text-body text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none"
          />
          <button
            type="button"
            onClick={handleLinkSearch}
            disabled={linkSearching || !linkSearch.trim()}
            className="rounded-lg border border-border-default px-4 py-2 text-body font-medium text-text-secondary hover:border-border-default/80 disabled:opacity-50"
          >
            {linkSearching ? "Searching..." : "Search"}
          </button>
        </div>

        {linkSearchResults.length > 0 && (
          <div className="mt-2 rounded-lg border border-border-default bg-surface-input divide-y divide-border-default">
            {linkSearchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => addLink(result)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-body text-text-secondary hover:bg-surface-active"
              >
                <span>{result.name}</span>
                <span className="rounded bg-surface-active px-1.5 py-0.5 text-caption text-text-secondary">{result.type}</span>
              </button>
            ))}
          </div>
        )}

        <p className="mt-1 text-caption text-text-muted">
          Link knowledge objects that this skill depends on. Each link requires an integration prompt.
        </p>
      </div>

      {/* Version bump (edit only) */}
      {mode === "edit" && (
        <div>
          <label className="block text-body font-medium text-text-secondary mb-1.5">
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
                    ? "border-border-focus bg-action-primary/20 text-hg-blue-bright"
                    : "border-border-default bg-surface-input text-text-secondary hover:border-border-default/80"
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
          className="rounded-lg bg-action-primary px-5 py-2.5 text-body font-medium text-text-primary hover:bg-action-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving..." : mode === "create" ? "Create Skill" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-border-default px-5 py-2.5 text-body font-medium text-text-secondary hover:border-border-default/80 hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
