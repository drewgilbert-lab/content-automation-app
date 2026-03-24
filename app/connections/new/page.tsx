import { ConnectionForm } from "../components/connection-form";

export default function NewConnectionPage() {
  return (
    <div>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          New Connection
        </h1>
        <p className="mt-2 text-text-secondary">
          Register an external application and generate an API key for access.
        </p>

        <div className="mt-8 rounded-xl border border-border-default bg-surface-card p-6">
          <ConnectionForm mode="create" />
        </div>
      </div>
    </div>
  );
}
