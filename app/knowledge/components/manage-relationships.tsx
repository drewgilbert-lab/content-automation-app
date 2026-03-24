"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Plus } from "lucide-react";
import type {
  KnowledgeType,
  CrossReference,
  RelationshipConfig,
  KnowledgeListItem,
} from "@/lib/knowledge-types";
import { getTypeLabel } from "@/lib/knowledge-types";

const TYPE_COLORS: Record<KnowledgeType, string> = {
  persona: "bg-hg-blue/15 text-hg-blue-bright",
  segment: "bg-status-success-bg text-status-success",
  use_case: "bg-status-warning-bg text-status-warning",
  business_rule: "bg-status-info-bg text-hg-blue-muted",
  icp: "bg-status-danger-bg text-status-danger",
  competitor: "bg-status-warning-bg text-status-warning",
  customer_evidence: "bg-status-success-bg text-status-success",
};

interface ManageRelationshipsProps {
  objectId: string;
  objectType: KnowledgeType;
  crossReferences: Record<string, CrossReference[]>;
  compatibleRelationships: RelationshipConfig[];
  reverseRelationships?: RelationshipConfig[];
}

export function ManageRelationships({
  objectId,
  objectType,
  crossReferences,
  compatibleRelationships,
  reverseRelationships = [],
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

  const allConfigs = [...compatibleRelationships, ...reverseRelationships];

  useEffect(() => {
    setLocalRefs(crossReferences);
  }, [crossReferences]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(timer);
  }, [error]);

  const hasAnyRefs = Object.entries(localRefs).some(
    ([, refs]) => refs.length > 0
  );

  const allLinkedIds = new Set(
    Object.values(localRefs).flatMap((refs) => refs.map((r) => r.id))
  );

  const fetchAllCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      const targetTypes = [
        ...new Set(allConfigs.map((c) => c.targetType)),
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
  }, [allConfigs]);

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

  function findConfigForType(candidateType: KnowledgeType): RelationshipConfig | null {
    return allConfigs.find((c) => c.targetType === candidateType) ?? null;
  }

  async function handleAdd(candidate: KnowledgeListItem) {
    const config = findConfigForType(candidate.type);
    if (!config) return;

    setAddingId(candidate.id);
    try {
      const sourceId = config.reverse ? candidate.id : objectId;
      const targetId = config.reverse ? objectId : candidate.id;

      const res = await fetch(`/api/knowledge/${sourceId}/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId,
          relationshipType: config.property,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to add relationship");
      }

      setLocalRefs((prev) => {
        const existing = prev[config.label] ?? [];
        if (config.single) {
          return { ...prev, [config.label]: [{ id: candidate.id, name: candidate.name, type: candidate.type }] };
        }
        return { ...prev, [config.label]: [...existing, { id: candidate.id, name: candidate.name, type: candidate.type }] };
      });

      setDropdownOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add relationship");
    } finally {
      setAddingId(null);
    }
  }

  async function handleRemove(refId: string, label: string) {
    const config = allConfigs.find((c) => c.label === label);
    if (!config) return;

    setRemovingId(refId);
    try {
      const sourceId = config.reverse ? refId : objectId;
      const targetId = config.reverse ? objectId : refId;

      const res = await fetch(`/api/knowledge/${sourceId}/relationships`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId,
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

  return (
    <div className="rounded-card border border-border-default bg-surface-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-label uppercase tracking-widest text-text-muted">
          Relationships
        </p>
        {allConfigs.length > 0 && (
          <button
            onClick={openDropdown}
            className="flex items-center gap-1 text-caption text-hg-blue-bright hover:text-hg-blue-muted"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        )}
      </div>

      {error && <p className="text-caption text-status-danger">{error}</p>}

      {dropdownOpen && (
        <div ref={dropdownRef} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all content..."
            className="w-full rounded-lg border border-border-default bg-surface-input px-3 py-2 text-body text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none"
          />
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border-default bg-surface-input shadow-lg">
            {loadingCandidates ? (
              <p className="px-3 py-2 text-caption text-text-muted">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-2 text-caption text-text-muted">
                No matches found
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleAdd(c)}
                  disabled={addingId === c.id}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-body text-text-secondary hover:bg-surface-active disabled:opacity-50"
                >
                  <span>{addingId === c.id ? "Adding..." : c.name}</span>
                  <span
                    className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-micro ${TYPE_COLORS[c.type]}`}
                  >
                    {getTypeLabel(c.type)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {allConfigs.map((config) => {
        const refs = localRefs[config.label] ?? [];
        if (refs.length === 0) return null;
        return (
          <div key={`${config.property}-${config.label}`}>
            <p className="text-caption font-medium text-text-muted">{config.label}</p>
            <div className="mt-1.5 space-y-1">
              {refs.map((ref) => (
                <div
                  key={ref.id}
                  className="group flex items-center justify-between rounded px-1 -mx-1 hover:bg-surface-input/50"
                >
                  <Link
                    href={`/knowledge/${ref.id}`}
                    className="text-body text-hg-blue-bright hover:text-hg-blue-muted"
                  >
                    {ref.name}
                  </Link>
                  {removingId === ref.id ? (
                    <span className="text-caption text-text-muted">Removing...</span>
                  ) : (
                    <button
                      onClick={() => handleRemove(ref.id, config.label)}
                      className="opacity-0 group-hover:opacity-100 text-status-danger hover:text-status-danger/80 px-1 transition-opacity"
                      aria-label={`Remove ${ref.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Read-only refs for labels not in any config */}
      {Object.entries(localRefs)
        .filter(
          ([label, refs]) =>
            refs.length > 0 &&
            !allConfigs.some((c) => c.label === label)
        )
        .map(([label, refs]) => (
          <div key={label}>
            <p className="text-caption font-medium text-text-muted">{label}</p>
            <div className="mt-1.5 space-y-1">
              {refs.map((ref) => (
                <div key={ref.id}>
                  <Link
                    href={`/knowledge/${ref.id}`}
                    className="text-body text-hg-blue-bright hover:text-hg-blue-muted"
                  >
                    {ref.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}

      {!hasAnyRefs && (
        <p className="text-body text-text-muted">No relationships yet</p>
      )}
    </div>
  );
}
