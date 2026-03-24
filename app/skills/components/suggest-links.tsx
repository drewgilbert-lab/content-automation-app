"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Suggestion {
  id: string;
  name: string;
  type: string;
  collection: string;
  score: number;
}

export function SuggestLinks({ skillId }: { skillId: string }) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const handleSuggest = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/skills/${skillId}/suggest-links`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [skillId]);

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  }, []);

  const handleAccept = useCallback((suggestion: Suggestion) => {
    const prefill = encodeURIComponent(JSON.stringify({
      id: suggestion.id,
      collection: suggestion.collection,
      name: suggestion.name,
    }));
    router.push(`/skills/${skillId}/edit?prefillLink=${prefill}`);
  }, [skillId, router]);

  const visible = suggestions.filter((s) => !dismissed.has(s.id));

  if (!loaded) {
    return (
      <button
        onClick={handleSuggest}
        disabled={loading}
        className="rounded-lg border border-status-info/30 bg-status-info-bg px-4 py-2 text-body font-medium text-status-info hover:bg-status-info-bg/80 disabled:opacity-50 transition-colors"
      >
        {loading ? "Analyzing..." : "Suggest Links"}
      </button>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="rounded-card border border-border-default bg-surface-card p-6">
        <p className="text-body text-text-muted">No suggestions found.</p>
        <button
          onClick={handleSuggest}
          disabled={loading}
          className="mt-3 text-body text-text-secondary hover:text-text-primary"
        >
          {loading ? "Analyzing..." : "Try again"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border-default bg-surface-card p-6">
      <h3 className="text-label uppercase tracking-widest text-text-muted mb-4">
        Suggested Links
      </h3>
      <div className="space-y-3">
        {visible.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-lg border border-border-default bg-surface-page p-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-body font-medium text-text-primary truncate">{s.name}</span>
              <span className="shrink-0 rounded bg-surface-input px-2 py-0.5 text-caption text-text-secondary">
                {s.type}
              </span>
              <span className="shrink-0 text-caption text-text-muted">
                {(s.score * 100).toFixed(0)}% match
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <button
                onClick={() => handleAccept(s)}
                className="rounded bg-status-info-bg px-3 py-1 text-caption text-status-info hover:bg-status-info-bg/80"
              >
                Accept
              </button>
              <button
                onClick={() => handleDismiss(s.id)}
                className="rounded px-3 py-1 text-caption text-text-secondary hover:text-text-primary"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={handleSuggest}
        disabled={loading}
        className="mt-4 text-body text-text-secondary hover:text-text-primary"
      >
        {loading ? "Analyzing..." : "Refresh suggestions"}
      </button>
    </div>
  );
}
