import { notFound } from "next/navigation";
import { getContent } from "@/lib/content";
import { ContentForm } from "../../components/content-form";

export default async function EditContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const content = await getContent(id);
  if (!content) {
    notFound();
  }

  const showStatusWarning =
    content.status === "approved" || content.status === "published";

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-display tracking-tight text-text-primary">
        Edit Content
      </h1>
      <p className="mt-2 text-text-secondary">{content.title}</p>
      {showStatusWarning ? (
        <div className="mt-4 rounded-lg border border-status-warning/30 bg-status-warning-bg px-4 py-3 text-body text-status-warning">
          This content is currently {content.status}. Saving changes will reset
          it to draft status.
        </div>
      ) : null}
      <div className="mt-8">
        <ContentForm mode="edit" initialData={content} />
      </div>
    </div>
  );
}
