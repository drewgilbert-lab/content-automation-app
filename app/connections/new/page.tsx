import Link from "next/link";
import { ConnectionForm } from "../components/connection-form";

export default function NewConnectionPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/connections"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300"
        >
          &larr; Back to Connected Systems
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          New Connection
        </h1>
        <p className="mt-2 text-gray-400">
          Register an external application and generate an API key for access.
        </p>

        <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <ConnectionForm mode="create" />
        </div>
      </div>
    </main>
  );
}
