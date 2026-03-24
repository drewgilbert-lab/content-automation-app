export const dynamic = "force-dynamic";

import { listSubmissions } from "@/lib/submissions";
import { SubmissionList } from "./components/submission-list";

export default async function QueuePage() {
  const submissions = await listSubmissions();

  return (
    <div>
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-display tracking-tight text-text-primary">
              Review Queue
            </h1>
            <p className="mt-2 text-text-secondary">
              Review and approve pending knowledge base submissions.
            </p>
          </div>
        </div>

        {/* Submission list */}
        <SubmissionList submissions={submissions} />
      </div>
    </div>
  );
}
