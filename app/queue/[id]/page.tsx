import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubmission } from "@/lib/submissions";
import { getKnowledgeObject } from "@/lib/knowledge";
import { SubmissionReview } from "../components/submission-review";

export default async function SubmissionReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const submission = await getSubmission(id);
  if (!submission) notFound();

  let currentObject = null;
  if (
    (submission.submissionType === "update" || submission.submissionType === "document_add") &&
    submission.targetObjectId
  ) {
    currentObject = await getKnowledgeObject(submission.targetObjectId);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Link
          href="/queue"
          className="mb-8 inline-block text-sm text-gray-400 hover:text-gray-300 transition-colors"
        >
          &larr; Back to Queue
        </Link>

        <SubmissionReview
          submission={submission}
          currentObject={currentObject}
        />
      </div>
    </main>
  );
}
