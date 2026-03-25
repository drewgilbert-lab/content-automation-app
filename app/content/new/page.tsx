import { ContentForm } from "../components/content-form";

export default function NewContentPage() {
  return (
    <div>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-display tracking-tight text-text-primary">
          Submit Content
        </h1>
        <p className="mt-2 text-text-secondary">
          Manually submit a content piece to the library
        </p>
        <div className="mt-8">
          <ContentForm mode="create" />
        </div>
      </div>
    </div>
  );
}
