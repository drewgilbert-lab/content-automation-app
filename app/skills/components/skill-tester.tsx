"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getContentTypeLabel } from "@/lib/skill-types";
import { MarkdownRenderer } from "@/app/knowledge/components/markdown-renderer";

interface ContextOption {
  id: string;
  name: string;
}

interface SkillTesterProps {
  skillId: string;
  skillName: string;
  skillContentTypes: string[];
}

export function SkillTester({
  skillId,
  skillContentTypes,
}: SkillTesterProps) {
  const [contentType, setContentType] = useState(
    skillContentTypes[0] ?? "",
  );
  const [prompt, setPrompt] = useState("");
  const [pinnedPersonaId, setPinnedPersonaId] = useState("");
  const [pinnedSegmentId, setPinnedSegmentId] = useState("");
  const [pinnedUseCaseId, setPinnedUseCaseId] = useState("");

  const [personas, setPersonas] = useState<ContextOption[]>([]);
  const [segments, setSegments] = useState<ContextOption[]>([]);
  const [useCases, setUseCases] = useState<ContextOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [withOutput, setWithOutput] = useState("");
  const [withoutOutput, setWithoutOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamComplete, setStreamComplete] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  const [systemPrompt, setSystemPrompt] = useState("");
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const withAccRef = useRef("");
  const withoutAccRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      try {
        const res = await fetch(`/api/skills/${skillId}/test/context`);
        if (!res.ok) throw new Error("Failed to load context options");
        const data = await res.json();
        if (cancelled) return;
        setPersonas(data.personas ?? []);
        setSegments(data.segments ?? []);
        setUseCases(data.useCases ?? []);
      } catch {
        if (!cancelled) setError("Failed to load context options");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadContext();
    return () => {
      cancelled = true;
    };
  }, [skillId]);

  const streamResponse = useCallback(
    async (
      body: Record<string, unknown>,
      onChunk: (accumulated: string) => void,
      accRef: React.RefObject<string>,
    ): Promise<string | null> => {
      const res = await fetch(`/api/skills/${skillId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error ?? `Test failed (${res.status})`,
        );
      }

      const spHeader = res.headers.get("X-System-Prompt");
      const decodedPrompt = spHeader ? atob(spHeader) : null;

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      accRef.current = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accRef.current += chunk;
        onChunk(accRef.current);
      }

      return decodedPrompt;
    },
    [skillId],
  );

  const runTest = useCallback(async () => {
    setStreaming(true);
    setStreamComplete(false);
    setError(null);
    setWithOutput("");
    setWithoutOutput("");
    setSystemPrompt("");

    const body = {
      contentType,
      prompt,
      pinnedPersonaId: pinnedPersonaId || undefined,
      pinnedSegmentId: pinnedSegmentId || undefined,
      pinnedUseCaseId: pinnedUseCaseId || undefined,
    };

    try {
      const decoded = await streamResponse(
        body,
        (acc) => setWithOutput(acc),
        withAccRef,
      );
      if (decoded) setSystemPrompt(decoded);

      if (compareMode) {
        await streamResponse(
          { ...body, withoutSkill: true },
          (acc) => setWithoutOutput(acc),
          withoutAccRef,
        );
      }

      setStreamComplete(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Test failed",
      );
    } finally {
      setStreaming(false);
    }
  }, [
    contentType,
    prompt,
    pinnedPersonaId,
    pinnedSegmentId,
    pinnedUseCaseId,
    compareMode,
    streamResponse,
  ]);

  return (
    <div className="space-y-6">
      {/* Config Panel */}
      <div className="rounded-card border border-border-default bg-surface-card p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-label uppercase tracking-widest text-text-muted">
              Content Type
            </label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary focus:border-border-focus focus:outline-none"
            >
              {skillContentTypes.map((ct) => (
                <option key={ct} value={ct}>
                  {getContentTypeLabel(ct)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-label uppercase tracking-widest text-text-muted">
              Persona
            </label>
            <select
              value={pinnedPersonaId}
              onChange={(e) => setPinnedPersonaId(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary focus:border-border-focus focus:outline-none disabled:opacity-50"
            >
              <option value="">Any</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-label uppercase tracking-widest text-text-muted">
              Segment
            </label>
            <select
              value={pinnedSegmentId}
              onChange={(e) => setPinnedSegmentId(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary focus:border-border-focus focus:outline-none disabled:opacity-50"
            >
              <option value="">Any</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-label uppercase tracking-widest text-text-muted">
              Use Case
            </label>
            <select
              value={pinnedUseCaseId}
              onChange={(e) => setPinnedUseCaseId(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary focus:border-border-focus focus:outline-none disabled:opacity-50"
            >
              <option value="">Any</option>
              {useCases.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-label uppercase tracking-widest text-text-muted">
            Test Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Enter a test prompt to generate content with this skill..."
            className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={runTest}
            disabled={streaming || !prompt.trim()}
            className="rounded-lg bg-action-primary px-5 py-2.5 text-body font-medium text-text-primary hover:bg-action-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {streaming ? "Running..." : "Run Test"}
          </button>

          <label className="flex items-center gap-2 text-body text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={compareMode}
              onChange={(e) => setCompareMode(e.target.checked)}
              disabled={streaming}
              className="rounded border-border-default"
            />
            Compare without skill
          </label>
        </div>

        {systemPrompt && (
          <div>
            <button
              onClick={() => setShowSystemPrompt(!showSystemPrompt)}
              className="flex items-center gap-1.5 text-body text-text-secondary hover:text-text-primary"
            >
              <span className="text-sm">
                {showSystemPrompt ? "▾" : "▸"}
              </span>
              {showSystemPrompt
                ? "Hide System Prompt"
                : "Show System Prompt"}
            </button>
            {showSystemPrompt && (
              <div className="mt-2 max-h-96 overflow-y-auto rounded-lg border border-border-default bg-surface-input p-4 font-mono text-sm text-text-secondary whitespace-pre-wrap">
                {systemPrompt}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-status-danger/30 bg-status-danger-bg px-4 py-3 text-body text-status-danger">
          {error}
        </div>
      )}

      {/* Output */}
      {(withOutput || withoutOutput || streaming) && (
        <div
          className={
            compareMode ? "grid grid-cols-2 gap-4" : "grid grid-cols-1"
          }
        >
          <div className="rounded-card border border-border-default bg-surface-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-label uppercase tracking-widest text-text-muted">
                With Skill
              </h3>
              {streaming && !streamComplete && (
                <div className="flex items-center gap-2 text-body text-text-secondary">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-hg-blue" />
                  Streaming
                </div>
              )}
            </div>
            {withOutput ? (
              <MarkdownRenderer content={withOutput} />
            ) : (
              <p className="text-body text-text-muted">
                {streaming
                  ? "Waiting for output..."
                  : "No output yet"}
              </p>
            )}
          </div>

          {compareMode && (
            <div className="rounded-card border border-border-default bg-surface-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-label uppercase tracking-widest text-text-muted">
                  Without Skill
                </h3>
                {streaming && !withoutOutput && (
                  <div className="flex items-center gap-2 text-body text-text-secondary">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-hg-blue" />
                    Streaming
                  </div>
                )}
              </div>
              {withoutOutput ? (
                <MarkdownRenderer content={withoutOutput} />
              ) : (
                <p className="text-body text-text-muted">
                  {streaming
                    ? "Waiting for comparison..."
                    : "No output yet"}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
