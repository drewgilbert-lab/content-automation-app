export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
import { listContent } from "@/lib/content";
import { ContentList } from "./components/content-list";

export default async function ContentPage() {
  const items = await listContent();

  return (
    <div>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h1 className="text-display tracking-tight text-text-primary">
              Content Library
            </h1>
            <p className="mt-2 text-text-secondary">
              Browse and manage content pieces
            </p>
          </div>
          <Link
            href="/content/new"
            className="flex items-center gap-1.5 rounded-card bg-action-primary px-4 py-2.5 text-body font-medium text-text-primary transition-colors hover:bg-action-primary-hover"
          >
            <Plus className="h-4 w-4" /> Submit Content
          </Link>
        </div>

        <ContentList items={items} />
      </div>
    </div>
  );
}
