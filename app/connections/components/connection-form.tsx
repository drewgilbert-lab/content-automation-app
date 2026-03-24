"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ConnectedSystemDetail } from "@/lib/connection-types";
import {
  PERMISSIONS,
  getPermissionLabel,
  RATE_LIMIT_TIERS,
  getRateLimitTierLabel,
} from "@/lib/connection-types";
import { Button } from "@/app/components/ui/button";
import { FormField } from "@/app/components/ui/form-field";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/lib/utils";

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
  const [permissions, setPermissions] = useState<string[]>(
    init?.permissions ?? ["read"]
  );
  const [rateLimitTier, setRateLimitTier] = useState(
    init?.rateLimitTier ?? "standard"
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<{ id: string; apiKey: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);

  function togglePermission(perm: string) {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }

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
          permissions,
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
    [mode, initialData, name, description, permissions, allTypes, subscribedTypes, rateLimitTier, router]
  );

  if (createdKey) {
    const hasMcpPermission =
      permissions.includes("mcp-read") || permissions.includes("mcp-write");
    const mcpServerUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL;

    const mcpPermissionSummary = [
      permissions.includes("mcp-read") && "Read",
      permissions.includes("mcp-write") && "Write",
    ]
      .filter(Boolean)
      .join(" + ");

    const configSnippet = JSON.stringify(
      {
        mcpServers: {
          "content-engine": {
            url: `${mcpServerUrl || "https://your-mcp-server.example.com"}/mcp`,
            headers: {
              Authorization: `Bearer ${createdKey.apiKey}`,
            },
          },
        },
      },
      null,
      2
    );

    async function copyConfig() {
      await navigator.clipboard.writeText(configSnippet);
      setCopiedConfig(true);
      setTimeout(() => setCopiedConfig(false), 2000);
    }

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
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={copyKey}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="mt-3 text-xs text-yellow-400">
              ⚠ Save this key now. It cannot be shown again.
            </p>
          </div>
        </div>

        {hasMcpPermission && (
          <div className="rounded-lg border border-violet-800 bg-violet-950/30 p-6 space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-violet-300">
                MCP Setup
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                This key has MCP {mcpPermissionSummary} access. Use the
                configuration below to connect MCP clients.
              </p>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                Server URL
              </p>
              {mcpServerUrl ? (
                <code className="block break-all rounded bg-gray-800 px-3 py-2 font-mono text-sm text-gray-300">
                  {mcpServerUrl}/mcp
                </code>
              ) : (
                <p className="text-sm text-yellow-400">
                  Set <code className="font-mono text-xs">NEXT_PUBLIC_MCP_SERVER_URL</code> in
                  your environment to display the server URL here.
                </p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Claude Desktop / Cursor Config
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={copyConfig}
                >
                  {copiedConfig ? "Copied!" : "Copy"}
                </Button>
              </div>
              <pre className="overflow-x-auto rounded bg-gray-800 px-3 py-2.5 font-mono text-xs text-gray-300 leading-relaxed">
                {configSnippet}
              </pre>
            </div>

            <p className="text-xs text-gray-500">
              For local development (stdio transport), no API key is needed. See{" "}
              <code className="font-mono text-xs text-gray-400">mcp-server/README.md</code>{" "}
              for stdio setup instructions.
            </p>
          </div>
        )}

        <Button
          type="button"
          onClick={() => {
            router.push(`/connections/${createdKey.id}`);
            router.refresh();
          }}
        >
          I&apos;ve saved the key — Continue
        </Button>
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

      <FormField label="Name">
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Marketing Hub, CRM Sync"
        />
      </FormField>

      <FormField label="Description">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this connected system does and why it needs access..."
          rows={3}
          className="resize-y"
        />
      </FormField>

      <FormField
        label="Permissions"
        helpText="REST API Read is for external REST API access. MCP Read/Write control MCP server tool access."
      >
        <div className="flex flex-wrap gap-2">
          {PERMISSIONS.map((perm) => (
            <button
              key={perm}
              type="button"
              onClick={() => togglePermission(perm)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                permissions.includes(perm)
                  ? "border-blue-600 bg-blue-600/20 text-blue-400"
                  : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
              )}
            >
              {getPermissionLabel(perm)}
            </button>
          ))}
        </div>
      </FormField>

      <FormField
        label="Subscribed Types"
        helpText="Which knowledge types this system can access via the API"
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleAllTypesToggle}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              allTypes
                ? "border-blue-600 bg-blue-600/20 text-blue-400"
                : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
            )}
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
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  allTypes
                    ? "border-gray-800 bg-gray-800/50 text-gray-600 cursor-not-allowed"
                    : subscribedTypes.includes(kt.value)
                      ? "border-blue-600 bg-blue-600/20 text-blue-400"
                      : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                )}
              >
                {kt.label}
              </button>
            ))}
          </div>
        </div>
      </FormField>

      <FormField label="Rate Limit Tier">
        <Select
          value={rateLimitTier}
          onChange={(e) => setRateLimitTier(e.target.value)}
        >
          {RATE_LIMIT_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {getRateLimitTierLabel(tier)}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" variant="primary" loading={saving}>
          {saving
            ? "Saving..."
            : mode === "create"
              ? "Create Connection"
              : "Save Changes"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
