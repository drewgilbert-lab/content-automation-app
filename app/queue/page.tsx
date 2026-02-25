import Link from "next/link";
import { listSubmissions } from "@/lib/submissions";
import { SubmissionList } from "./components/submission-list";

export default async function QueuePage() {
  const submissions = await listSubmissions();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-gray-400 hover:text-gray-300 transition-colors"
        >
          &larr; Back to Home
        </Link>

        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Review Queue
            </h1>
            <p className="mt-2 text-gray-400">
              Review and approve pending knowledge base submissions.
            </p>
          </div>
        </div>

        {/* Submission list */}
        <SubmissionList submissions={submissions} />
      </div>
    </main>
  );
}
