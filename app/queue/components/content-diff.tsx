import type { KnowledgeDetail } from "@/lib/knowledge-types";
import { MarkdownRenderer } from "@/app/knowledge/components/markdown-renderer";
import { getTypeLabel } from "@/lib/knowledge-types";

interface ProposedContent {
  name?: string;
  content?: string;
  tags?: string[];
  subType?: string;
  revenueRange?: string;
  employeeRange?: string;
}

interface ContentDiffProps {
  currentObject: KnowledgeDetail;
  proposedContent: ProposedContent;
}

export function ContentDiff({ currentObject, proposedContent }: ContentDiffProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-4">
          Current Version
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-300">Name</p>
            <p className="text-sm text-white">{currentObject.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">Type</p>
            <p className="text-sm text-gray-400">{getTypeLabel(currentObject.type)}</p>
          </div>
          {currentObject.subType && (
            <div>
              <p className="text-sm font-medium text-gray-300">Sub Type</p>
              <p className="text-sm text-gray-400">{currentObject.subType}</p>
            </div>
          )}
          {currentObject.revenueRange && (
            <div>
              <p className="text-sm font-medium text-gray-300">Revenue Range</p>
              <p className="text-sm text-gray-400">{currentObject.revenueRange}</p>
            </div>
          )}
          {currentObject.employeeRange && (
            <div>
              <p className="text-sm font-medium text-gray-300">Employee Range</p>
              <p className="text-sm text-gray-400">{currentObject.employeeRange}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Content</p>
            <MarkdownRenderer content={currentObject.content} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {currentObject.tags.length > 0 ? (
                currentObject.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">No tags</span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-4">
          Proposed Changes
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-300">Name</p>
            <p className="text-sm text-white">{proposedContent.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">Type</p>
            <p className="text-sm text-gray-400">{getTypeLabel(currentObject.type)}</p>
          </div>
          {proposedContent.subType && (
            <div>
              <p className="text-sm font-medium text-gray-300">Sub Type</p>
              <p className="text-sm text-gray-400">{proposedContent.subType}</p>
            </div>
          )}
          {proposedContent.revenueRange && (
            <div>
              <p className="text-sm font-medium text-gray-300">Revenue Range</p>
              <p className="text-sm text-gray-400">{proposedContent.revenueRange}</p>
            </div>
          )}
          {proposedContent.employeeRange && (
            <div>
              <p className="text-sm font-medium text-gray-300">Employee Range</p>
              <p className="text-sm text-gray-400">{proposedContent.employeeRange}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Content</p>
            <MarkdownRenderer content={proposedContent.content ?? ""} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {(proposedContent.tags?.length ?? 0) > 0 ? (
                (proposedContent.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">No tags</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
