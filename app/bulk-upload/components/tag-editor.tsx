"use client";

import { useState, useCallback } from "react";

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

function normalizeTag(t: string) {
  return t.trim().toLowerCase();
}

export function TagEditor({ tags, onChange, disabled = false }: TagEditorProps) {
  const [input, setInput] = useState("");

  const addTag = useCallback(
    (raw: string) => {
      const normalized = normalizeTag(raw);
      if (!normalized || tags.some((t) => normalizeTag(t) === normalized)) return;
      onChange([...tags, raw.trim()]);
      setInput("");
    },
    [tags, onChange]
  );

  const removeTag = useCallback(
    (index: number) => {
      onChange(tags.filter((_, i) => i !== index));
    },
    [tags, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
  };

  const handleBlur = () => {
    if (input.trim()) addTag(input);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-white"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="ml-0.5 rounded p-0.5 text-gray-400 hover:bg-gray-700 hover:text-white"
              aria-label={`Remove ${tag}`}
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Add tag..."
          className="min-w-[100px] flex-1 rounded bg-gray-800 px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-600"
        />
      )}
    </div>
  );
}
