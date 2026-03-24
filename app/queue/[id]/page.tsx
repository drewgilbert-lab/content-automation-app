import { notFound } from "next/navigation";
import { getSubmission } from "@/lib/submissions";
import { getKnowledgeObject } from "@/lib/knowledge";
import { getSkill } from "@/lib/skills";
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
  let currentSkill = null;
  if (submission.objectType === "skill" && submission.targetObjectId) {
    currentSkill = await getSkill(submission.targetObjectId);
  } else if (
    (submission.submissionType === "update" || submission.submissionType === "document_add") &&
    submission.targetObjectId
  ) {
    currentObject = await getKnowledgeObject(submission.targetObjectId);
  }

  return (
    <div>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <SubmissionReview
          submission={submission}
          currentObject={currentObject}
          currentSkill={currentSkill}
        />
      </div>
    </div>
  );
}
