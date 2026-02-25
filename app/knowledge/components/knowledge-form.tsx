"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  KnowledgeType,
  KnowledgeDetail,
  KnowledgeListItem,
} from "@/lib/knowledge-types";
import { VALID_TYPES, SUB_TYPES, CUSTOMER_EVIDENCE_SUB_TYPES, getTypeLabel } from "@/lib/knowledge-types";
import { MarkdownRenderer } from "./markdown-renderer";
import { useRole } from "@/app/components/role-provider";

interface KnowledgeFormProps {
  mode: "create" | "edit";
  initialData?: KnowledgeDetail;
  allObjects?: KnowledgeListItem[];
}

export function KnowledgeForm({
  mode,
  initialData,
  allObjects = [],
}: KnowledgeFormProps) {
  const router = useRouter();

  const [type, setType] = useState<KnowledgeType>(
    initialData?.type ?? "persona"
  );
  const [name, setName] = useState(initialData?.name ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");
  const [tagsInput, setTagsInput] = useState(
    initialData?.tags.join(", ") ?? ""
  );
  const [subType, setSubType] = useState(initialData?.subType ?? "");
  const [revenueRange, setRevenueRange] = useState(
    initialData?.revenueRange ?? ""
  );
  const [employeeRange, setEmployeeRange] = useState(
    initialData?.employeeRange ?? ""
  );
  const [personaId, setPersonaId] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [website, setWebsite] = useState(initialData?.website ?? "");
  const [customerName, setCustomerName] = useState(initialData?.customerName ?? "");
  const [industry, setIndustry] = useState(initialData?.industry ?? "");

  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { role } = useRole();

  const personas = allObjects.filter((o) => o.type === "persona");
  const segments = allObjects.filter((o) => o.type === "segment");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!name.trim()) {
        setError("Name is required");
        return;
      }
      if (!content.trim()) {
        setError("Content is required");
        return;
      }

      setSaving(true);

      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      try {
        // Contributor: route through submission queue
        if (role === "contributor") {
          const body: Record<string, unknown> = { name: name.trim(), content, tags };
          if (mode === "create") body.type = type;
          if (type === "segment" || initialData?.type === "segment") {
            body.revenueRange = revenueRange || undefined;
            body.employeeRange = employeeRange || undefined;
          }
          if (type === "business_rule" || initialData?.type === "business_rule") {
            body.subType = subType || undefined;
          }
          if (type === "icp" && mode === "create") {
            body.personaId = personaId || undefined;
            body.segmentId = segmentId || undefined;
          }
          if (type === "competitor" || initialData?.type === "competitor") {
            body.website = website || undefined;
          }
          if (type === "customer_evidence" || initialData?.type === "customer_evidence") {
            body.subType = subType || undefined;
            body.customerName = customerName || undefined;
            body.industry = industry || undefined;
          }

          const submissionBody = {
            submitter: "contributor",
            objectType: mode === "create" ? type : initialData!.type,
            objectName: name.trim(),
            submissionType: mode === "create" ? "new" : "update",
            proposedContent: JSON.stringify(body),
            ...(mode === "edit" ? { targetObjectId: initialData!.id } : {}),
          };

          const res = await fetch("/api/submissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(submissionBody),
          });

          if (!res.ok) {
            const data = await res.json();
            setError(data.error ?? "Failed to submit");
            setSaving(false);
            return;
          }

          router.push("/queue");
          router.refresh();
          return;
        }

        const url =
          mode === "create"
            ? "/api/knowledge"
            : `/api/knowledge/${initialData!.id}`;

        const method = mode === "create" ? "POST" : "PUT";

        const body: Record<string, unknown> = { name: name.trim(), content, tags };

        if (mode === "create") {
          body.type = type;
        }

        if (type === "segment" || initialData?.type === "segment") {
          body.revenueRange = revenueRange || undefined;
          body.employeeRange = employeeRange || undefined;
        }
        if (type === "business_rule" || initialData?.type === "business_rule") {
          body.subType = subType || undefined;
        }
        if (type === "icp" && mode === "create") {
          body.personaId = personaId || undefined;
          body.segmentId = segmentId || undefined;
        }
        if (type === "competitor" || initialData?.type === "competitor") {
          body.website = website || undefined;
        }
        if (type === "customer_evidence" || initialData?.type === "customer_evidence") {
          body.subType = subType || undefined;
          body.customerName = customerName || undefined;
          body.industry = industry || undefined;
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
        const objectId = mode === "create" ? data.id : initialData!.id;
        router.push(`/knowledge/${objectId}`);
        router.refresh();
      } catch {
        setError("Network error. Please try again.");
        setSaving(false);
      }
    },
    [
      mode,
      initialData,
      type,
      name,
      content,
      tagsInput,
      subType,
      revenueRange,
      employeeRange,
      website,
      customerName,
      industry,
      personaId,
      segmentId,
      router,
      role,
    ]
  );

  const activeType = mode === "edit" ? initialData!.type : type;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Type selector (create only) */}
      {mode === "create" && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as KnowledgeType)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-gray-600 focus:outline-none"
          >
            {VALID_TYPES.map((t) => (
              <option key={t} value={t}>
                {getTypeLabel(t)}
              </option>
            ))}
          </select>
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
          placeholder="Enter name..."
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
        />
      </div>

      {/* Content with preview toggle */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-gray-300">
            Content
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
            placeholder="Markdown content..."
            rows={12}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none font-mono text-sm resize-y"
          />
        )}
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

      {/* Segment-specific fields */}
      {activeType === "segment" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Revenue Range
            </label>
            <input
              type="text"
              value={revenueRange}
              onChange={(e) => setRevenueRange(e.target.value)}
              placeholder='e.g. "$1B–$10B"'
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Employee Range
            </label>
            <input
              type="text"
              value={employeeRange}
              onChange={(e) => setEmployeeRange(e.target.value)}
              placeholder='e.g. "5,000–20,000"'
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* BusinessRule-specific fields */}
      {activeType === "business_rule" && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Sub Type
          </label>
          <select
            value={subType}
            onChange={(e) => setSubType(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-gray-600 focus:outline-none"
          >
            <option value="">Select sub type...</option>
            {SUB_TYPES.map((st) => (
              <option key={st} value={st}>
                {st.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Competitor-specific fields */}
      {activeType === "competitor" && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Website
          </label>
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="e.g. https://competitor.com"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
          />
        </div>
      )}

      {/* CustomerEvidence-specific fields */}
      {activeType === "customer_evidence" && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Sub Type
            </label>
            <select
              value={subType}
              onChange={(e) => setSubType(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-gray-600 focus:outline-none"
            >
              <option value="">Select sub type...</option>
              {CUSTOMER_EVIDENCE_SUB_TYPES.map((st) => (
                <option key={st} value={st}>
                  {st.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Industry
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Financial Services"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
              />
            </div>
          </div>
        </>
      )}

      {/* ICP-specific fields (create only) */}
      {activeType === "icp" && mode === "create" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Persona
            </label>
            <select
              value={personaId}
              onChange={(e) => setPersonaId(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-gray-600 focus:outline-none"
            >
              <option value="">Select persona...</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Segment
            </label>
            <select
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white focus:border-gray-600 focus:outline-none"
            >
              <option value="">Select segment...</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
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
          {saving
            ? "Saving..."
            : role === "contributor"
              ? "Submit for Review"
              : mode === "create"
                ? "Create"
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
