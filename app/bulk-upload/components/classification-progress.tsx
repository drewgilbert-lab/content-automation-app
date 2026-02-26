"use client";

interface ClassificationProgressProps {
  total: number;
  current: number;
  results: Map<number, { filename: string; status: "done" | "error"; error?: string }>;
  filenames: string[];
}

function StatusIcon({
  index,
  current,
  results,
}: {
  index: number;
  current: number;
  results: Map<number, { filename: string; status: "done" | "error"; error?: string }>;
}) {
  const result = results.get(index);
  if (result?.status === "done") {
    return (
      <span className="text-green-500" aria-hidden>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (result?.status === "error") {
    return (
      <span className="text-red-500" aria-hidden>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }
  if (index === current) {
    return (
      <span className="text-blue-400" aria-hidden>
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="text-gray-500" aria-hidden>
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" />
      </svg>
    </span>
  );
}

function statusText(
  index: number,
  current: number,
  results: Map<number, { filename: string; status: "done" | "error"; error?: string }>
): string {
  const result = results.get(index);
  if (result?.status === "done") return "Done";
  if (result?.status === "error") return result.error ?? "Error";
  if (index === current) return "Classifying...";
  return "Pending";
}

export function ClassificationProgress({
  total,
  current,
  results,
  filenames,
}: ClassificationProgressProps) {
  const completed = results.size;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex justify-between text-sm text-gray-400">
          <span>
            {current + 1} / {total}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <ul className="space-y-2">
        {filenames.map((filename, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <StatusIcon index={i} current={current} results={results} />
            <span className="flex-1 truncate text-white">{filename}</span>
            <span className="text-gray-400">{statusText(i, current, results)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
