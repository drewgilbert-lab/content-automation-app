import { BulkUploadWizard } from "./components/bulk-upload-wizard";

export default function BulkUploadPage() {
  return (
    <div>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
            Bulk Upload
          </h1>
          <p className="mt-2 text-text-secondary">
            Upload multiple documents, classify them with AI, and submit to the review queue.
          </p>
        </div>
        <BulkUploadWizard />
      </div>
    </div>
  );
}
