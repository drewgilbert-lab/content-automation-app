"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ConnectedSystemDetail } from "@/lib/connection-types";
import { RATE_LIMIT_TIERS, getRateLimitTierLabel } from "@/lib/connection-types";

interface ConnectionFormProps {
  mode: "create" | "edit";
  initialData?: ConnectedSystemDetail;
}

const KNOWLEDGE_TYPES = [
  { value: "persona", label: "Persona" },
  { value: "segment", label: "Segment" },
  { value: "use_case", label: "Use Case" },
  { value: "business_rule", label: "Business Rule" },
  { value: "icp", label: "ICP" },
  { value: "competitor", label: "Competitor" },
  { value: "customer_evidence", label: "Customer Evidence" },
];

export function ConnectionForm({ mode, initialData }: ConnectionFormProps) {
  const router = useRouter();

  const init = mode === "edit" && initialData ? initialData : null;
  const isAllTypes = init?.subscribedTypes?.length === 1 && init.subscribedTypes[0] === "*";

  const [name, setName] = useState(init?.name ?? "");
  const [description, setDescription] = useState(init?.description ?? "");
  const [allTypes, setAllTypes] = useState(isAllTypes ?? true);
  const [subscribedTypes, setSubscribedTypes] = useState<string[]>(
    isAllTypes || !init?.subscribedTypes ? [] : init.subscribedTypes
  );
  const [rateLimitTier, setRateLimitTier] = useState(
    init?.rateLimitTier ?? "standard"
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<{ id: string; apiKey: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleType(type: string) {
    setSubscribedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function handleAllTypesToggle() {
    setAllTypes((prev) => {
      if (!prev) {
        setSubscribedTypes([]);
      }
      return !prev;
    });
  }

  async function copyKey() {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      if (!allTypes && subscribedTypes.length === 0) {
        setError("Select at least one subscribed type, or choose All Types");
        return;
      }

      setSaving(true);

      const resolvedTypes = allTypes ? ["*"] : subscribedTypes;

      try {
        const url =
          mode === "create"
            ? "/api/connections"
            : `/api/connections/${initialData!.id}`;

        const method = mode === "create" ? "POST" : "PUT";

        const body = {
          name: name.trim(),
          description: description.trim(),
          subscribedTypes: resolvedTypes,
          rateLimitTier,
        };

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

        if (mode === "create") {
          const data = await res.json();
          setCreatedKey({ id: data.id, apiKey: data.apiKey });
          setSaving(false);
        } else {
          router.push(`/connections/${initialData!.id}`);
          router.refresh();
        }
      } catch {
        setError("Network error. Please try again.");
        setSaving(false);
      }
    },
    [mode, initialData, name, description, allTypes, subscribedTypes, rateLimitTier, router]
  );

  if (createdKey) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-green-800 bg-green-950/30 p-6">
          <h3 className="text-lg font-semibold text-green-300">
            Connection Created
          </h3>
          <p className="mt-2 text-sm text-gray-300">
            Your API key has been generated. Copy it now — it cannot be shown
            again.
          </p>

          <div className="mt-4 rounded-lg border border-yellow-700 bg-yellow-950/30 p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-yellow-400">
              API Key
            </p>
            <div className="flex items-center gap-3">
              <code className="flex-1 break-all rounded bg-gray-800 px-3 py-2 font-mono text-sm text-white">
                {createdKey.apiKey}
              </code>
              <button
                onClick={copyKey}
                className="shrink-0 rounded-lg border border-gray-700 px-3.5 py-2 text-sm font-medium text-gray-300 hover:border-gray-600 hover:text-white transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="mt-3 text-xs text-yellow-400">
              ⚠ Save this key now. It cannot be shown again.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            router.push(`/connections/${createdKey.id}`);
            router.refresh();
          }}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          I&apos;ve saved the key — Continue
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Marketing Hub, CRM Sync"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this connected system does and why it needs access..."
          rows={3}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none resize-y"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Subscribed Types
        </label>
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleAllTypesToggle}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              allTypes
                ? "border-blue-600 bg-blue-600/20 text-blue-400"
                : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
            }`}
          >
            All Types
          </button>
          <div className="flex flex-wrap gap-2">
            {KNOWLEDGE_TYPES.map((kt) => (
              <button
                key={kt.value}
                type="button"
                disabled={allTypes}
                onClick={() => toggleType(kt.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  allTypes
                    ? "border-gray-800 bg-gray-800/50 text-gray-600 cursor-not-allowed"
                    : subscribedTypes.includes(kt.value)
                      ? "border-blue-600 bg-blue-600/20 text-blue-400"
                      : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                }`}
              >
                {kt.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Which knowledge types this system can access via the API
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Rate Limit Tier
        </label>
        <select
          value={rateLimitTier}
          onChange={(e) => setRateLimitTier(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-gray-600 focus:outline-none"
        >
          {RATE_LIMIT_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {getRateLimitTierLabel(tier)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving
            ? "Saving..."
            : mode === "create"
              ? "Create Connection"
              : "Save Changes"}
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
