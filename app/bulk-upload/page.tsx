import { BulkUploadWizard } from "./components/bulk-upload-wizard";

export default function BulkUploadPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Bulk Upload
          </h1>
          <p className="mt-2 text-gray-400">
            Upload multiple documents, classify them with AI, and submit to the review queue.
          </p>
        </div>
        <BulkUploadWizard />
      </div>
    </main>
  );
}
