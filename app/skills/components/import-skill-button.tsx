"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

export function ImportSkillButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/skills/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Import failed");
        setLoading(false);
        return;
      }

      const data = await res.json();
      sessionStorage.setItem("importedSkill", JSON.stringify(data.skill));
      router.push("/skills/new?imported=true");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept=".skill,.md,.zip"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-card border border-border-default px-4 py-2.5 text-body font-medium text-text-secondary transition-colors hover:border-border-focus hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Upload className="h-4 w-4" />
        {loading ? "Importing..." : "Import"}
      </button>
      {error && (
        <div className="absolute right-0 top-full z-10 mt-2 w-64 rounded-lg border border-status-danger/30 bg-status-danger-bg px-3 py-2 text-caption text-status-danger shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
