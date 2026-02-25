"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  KnowledgeType,
  CrossReference,
  RelationshipConfig,
  KnowledgeListItem,
} from "@/lib/knowledge-types";
import { getTypeLabel } from "@/lib/knowledge-types";

const TYPE_COLORS: Record<KnowledgeType, string> = {
  persona: "bg-blue-500/15 text-blue-400",
  segment: "bg-emerald-500/15 text-emerald-400",
  use_case: "bg-amber-500/15 text-amber-400",
  business_rule: "bg-purple-500/15 text-purple-400",
  icp: "bg-rose-500/15 text-rose-400",
};

interface ManageRelationshipsProps {
  objectId: string;
  objectType: KnowledgeType;
  crossReferences: Record<string, CrossReference[]>;
  compatibleRelationships: RelationshipConfig[];
}

export function ManageRelationships({
  objectId,
  objectType,
  crossReferences,
  compatibleRelationships,
}: ManageRelationshipsProps) {
  const router = useRouter();
  const [localRefs, setLocalRefs] =
    useState<Record<string, CrossReference[]>>(crossReferences);
  const [error, setError] = useState<string | null>(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<KnowledgeListItem[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalRefs(crossReferences);
  }, [crossReferences]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(timer);
  }, [error]);

  const hasCompatible = compatibleRelationships.length > 0;
  const refEntries = Object.entries(localRefs).filter(
    ([, refs]) => refs.length > 0
  );
  const hasAnyRefs = refEntries.length > 0;

  const allLinkedIds = new Set(
    Object.values(localRefs).flatMap((refs) => refs.map((r) => r.id))
  );

  const fetchAllCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      const targetTypes = [
        ...new Set(compatibleRelationships.map((c) => c.targetType)),
      ];
      const fetches = targetTypes.map(async (t) => {
        const res = await fetch(`/api/knowledge?type=${t}`);
        if (!res.ok) throw new Error("Failed to load options");
        const json = await res.json();
        return (json.objects ?? []) as KnowledgeListItem[];
      });
      const results = await Promise.all(fetches);
      const all = results
        .flat()
        .filter((d) => !d.deprecated)
        .sort((a, b) => a.name.localeCompare(b.name));
      setCandidates(all);
    } catch {
      setError("Failed to load options");
    } finally {
      setLoadingCandidates(false);
    }
  }, [compatibleRelationships]);

  function openDropdown() {
    setDropdownOpen(true);
    setSearch("");
    fetchAllCandidates();
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const filtered = candidates
    .filter((c) => !allLinkedIds.has(c.id))
    .filter(
      (c) =>
        search === "" ||
        c.name.toLowerCase().startsWith(search.toLowerCase())
    );

  const displayed = filtered;

  function getRelationshipProperty(candidateType: KnowledgeType): string | null {
    const config = compatibleRelationships.find(
      (c) => c.targetType === candidateType
    );
    return config?.property ?? null;
  }

  function getLabelForType(candidateType: KnowledgeType): string | null {
    const config = compatibleRelationships.find(
      (c) => c.targetType === candidateType
    );
    return config?.label ?? null;
  }

  async function handleAdd(candidate: KnowledgeListItem) {
    const property = getRelationshipProperty(candidate.type);
    if (!property) return;

    setAddingId(candidate.id);
    try {
      const res = await fetch(`/api/knowledge/${objectId}/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: candidate.id,
          relationshipType: property,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to add relationship");
      }

      const label = getLabelForType(candidate.type);
      if (label) {
        setLocalRefs((prev) => {
          const existing = prev[label] ?? [];
          const config = compatibleRelationships.find(
            (c) => c.targetType === candidate.type
          );
          if (config?.single) {
            return { ...prev, [label]: [{ id: candidate.id, name: candidate.name, type: candidate.type }] };
          }
          return { ...prev, [label]: [...existing, { id: candidate.id, name: candidate.name, type: candidate.type }] };
        });
      }

      setDropdownOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add relationship");
    } finally {
      setAddingId(null);
    }
  }

  async function handleRemove(refId: string, label: string) {
    const config = compatibleRelationships.find((c) => c.label === label);
    if (!config) return;

    setRemovingId(refId);
    try {
      const res = await fetch(`/api/knowledge/${objectId}/relationships`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: refId,
          relationshipType: config.property,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to remove relationship");
      }

      setLocalRefs((prev) => ({
        ...prev,
        [label]: (prev[label] ?? []).filter((r) => r.id !== refId),
      }));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove relationship");
    } finally {
      setRemovingId(null);
    }
  }

  if (!hasCompatible && !hasAnyRefs) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
          Relationships
        </p>
        <p className="mt-3 text-sm text-gray-500">
          No relationships available for this type.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
          Relationships
        </p>
        {hasCompatible && (
          <button
            onClick={openDropdown}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            + Add
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {dropdownOpen && (
        <div ref={dropdownRef} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all content..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
          />
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 shadow-lg">
            {loadingCandidates ? (
              <p className="px-3 py-2 text-xs text-gray-500">Loading...</p>
            ) : displayed.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-500">
                No matches found
              </p>
            ) : (
              displayed.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleAdd(c)}
                  disabled={addingId === c.id}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  <span>{addingId === c.id ? "Adding..." : c.name}</span>
                  <span
                    className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_COLORS[c.type]}`}
                  >
                    {getTypeLabel(c.type)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {compatibleRelationships.map((config) => {
        const refs = localRefs[config.label] ?? [];
        if (refs.length === 0) return null;
        return (
          <div key={config.property}>
            <p className="text-xs font-medium text-gray-500">{config.label}</p>
            <div className="mt-1.5 space-y-1">
              {refs.map((ref) => (
                <div
                  key={ref.id}
                  className="group flex items-center justify-between rounded px-1 -mx-1 hover:bg-gray-800/50"
                >
                  <Link
                    href={`/knowledge/${ref.id}`}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    {ref.name}
                  </Link>
                  {removingId === ref.id ? (
                    <span className="text-xs text-gray-500">Removing...</span>
                  ) : (
                    <button
                      onClick={() => handleRemove(ref.id, config.label)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-sm px-1 transition-opacity"
                      aria-label={`Remove ${ref.name}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Read-only refs for labels not in compatibleRelationships */}
      {Object.entries(localRefs)
        .filter(
          ([label, refs]) =>
            refs.length > 0 &&
            !compatibleRelationships.some((c) => c.label === label)
        )
        .map(([label, refs]) => (
          <div key={label}>
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <div className="mt-1.5 space-y-1">
              {refs.map((ref) => (
                <div key={ref.id}>
                  <Link
                    href={`/knowledge/${ref.id}`}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    {ref.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}

      {!hasAnyRefs && hasCompatible && (
        <p className="text-sm text-gray-600">No relationships yet</p>
      )}
    </div>
  );
}
