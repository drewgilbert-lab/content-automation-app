"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type InputType = "use_case" | "topic_theme";

interface JsonState {
  create?: unknown;
  status?: unknown;
  detail?: unknown;
  package?: unknown;
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function WorkflowsPage() {
  const [inputType, setInputType] = useState<InputType>("use_case");
  const [inputValue, setInputValue] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [runId, setRunId] = useState("");
  const [json, setJson] = useState<JsonState>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const hasRunId = useMemo(() => runId.trim().length > 0, [runId]);
  const isValidRunId = useMemo(() => {
    const value = runId.trim();
    return value.length > 0 && /^[a-f0-9-]+$/i.test(value);
  }, [runId]);

  useEffect(() => {
    setJson((prev) => ({
      ...prev,
      status: undefined,
      detail: undefined,
      package: undefined,
    }));
    setErrorMessage(null);
  }, [runId]);

  async function parseResponse(res: Response): Promise<unknown> {
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      throw new Error(body.error ?? `Request failed (${res.status})`);
    }
    return body;
  }

  async function handleCreateRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("create");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/content-workflow/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputType,
          inputValue,
          createdBy,
          idempotencyKey: idempotencyKey.trim() || undefined,
        }),
      });
      const body = (await parseResponse(res)) as {
        run?: { id?: string };
      };
      setJson((prev) => ({ ...prev, create: body }));
      if (body.run?.id) {
        setRunId(body.run.id);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create run");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleStartRun() {
    if (!isValidRunId) return;
    setBusyAction("start");
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/content-workflow/runs/${runId}/start`, {
        method: "POST",
      });
      const body = await parseResponse(res);
      setJson((prev) => ({ ...prev, status: body }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to start run");
      setJson((prev) => ({ ...prev, status: undefined }));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRefreshStatus() {
    if (!isValidRunId) return;
    setBusyAction("status");
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/content-workflow/runs/${runId}/status`);
      const body = await parseResponse(res);
      setJson((prev) => ({ ...prev, status: body }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load status");
      setJson((prev) => ({ ...prev, status: undefined }));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLoadRunDetail() {
    if (!isValidRunId) return;
    setBusyAction("detail");
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/content-workflow/runs/${runId}`);
      const body = await parseResponse(res);
      setJson((prev) => ({ ...prev, detail: body }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load run detail");
      setJson((prev) => ({ ...prev, detail: undefined }));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLoadPackage() {
    if (!isValidRunId) return;
    setBusyAction("package");
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/content-workflow/runs/${runId}/package`);
      const body = await parseResponse(res);
      setJson((prev) => ({ ...prev, package: body }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load package";
      setErrorMessage(
        message.includes("Final package not found")
          ? "Package not ready yet. Wait for run completion, then retry."
          : message
      );
      setJson((prev) => ({ ...prev, package: undefined }));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Link href="/" className="text-sm text-gray-400 hover:text-white">
          ← Back to home
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Workflows</h1>
        <p className="mt-2 text-gray-400">
          Minimal test harness for content workflow runs.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-lg font-medium text-white">Create Run</h2>
            <form className="mt-4 space-y-4" onSubmit={handleCreateRun}>
              <label className="block text-sm text-gray-300">
                Input Type
                <select
                  value={inputType}
                  onChange={(event) => setInputType(event.target.value as InputType)}
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                >
                  <option value="use_case">use_case</option>
                  <option value="topic_theme">topic_theme</option>
                </select>
              </label>

              <label className="block text-sm text-gray-300">
                Input Value
                <input
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder="competitive positioning"
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  required
                />
              </label>

              <label className="block text-sm text-gray-300">
                Created By
                <input
                  value={createdBy}
                  onChange={(event) => setCreatedBy(event.target.value)}
                  placeholder="drew"
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                  required
                />
              </label>

              <label className="block text-sm text-gray-300">
                Idempotency Key (optional)
                <input
                  value={idempotencyKey}
                  onChange={(event) => setIdempotencyKey(event.target.value)}
                  placeholder="workflow-run-001"
                  className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
                />
              </label>

              <button
                type="submit"
                disabled={busyAction === "create"}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 disabled:opacity-50"
              >
                {busyAction === "create" ? "Creating..." : "Create Run"}
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-lg font-medium text-white">Run Controls</h2>
            <label className="mt-4 block text-sm text-gray-300">
              Run ID
              <input
                value={runId}
                onChange={(event) => setRunId(event.target.value)}
                placeholder="paste run id"
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!isValidRunId || busyAction === "start"}
                onClick={handleStartRun}
                className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busyAction === "start" ? "Starting..." : "Start Run"}
              </button>
              <button
                type="button"
                disabled={!isValidRunId || busyAction === "status"}
                onClick={handleRefreshStatus}
                className="rounded-lg bg-gray-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busyAction === "status" ? "Loading..." : "Refresh Status"}
              </button>
              <button
                type="button"
                disabled={!isValidRunId || busyAction === "detail"}
                onClick={handleLoadRunDetail}
                className="rounded-lg bg-gray-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busyAction === "detail" ? "Loading..." : "Load Run Detail"}
              </button>
              <button
                type="button"
                disabled={!isValidRunId || busyAction === "package"}
                onClick={handleLoadPackage}
                className="rounded-lg bg-gray-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busyAction === "package" ? "Loading..." : "Load Package"}
              </button>
            </div>

            {hasRunId && !isValidRunId ? (
              <p className="mt-2 text-xs text-amber-300">
                Run ID should look like a UUID (hex characters and dashes).
              </p>
            ) : null}

            {errorMessage ? (
              <p className="mt-4 rounded-lg border border-red-700 bg-red-950 p-3 text-sm text-red-300">
                {errorMessage}
              </p>
            ) : null}
          </section>
        </div>

        <div className="mt-6 grid gap-6">
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-gray-400">
              Create Response
            </h3>
            <pre className="mt-3 overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-200">
              {json.create ? prettyJson(json.create) : "No create response yet."}
            </pre>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-gray-400">
              Status Response
            </h3>
            <pre className="mt-3 overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-200">
              {busyAction === "status"
                ? "Loading..."
                : json.status
                  ? prettyJson(json.status)
                  : "No status response yet."}
            </pre>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-gray-400">
              Run Detail Response
            </h3>
            <pre className="mt-3 overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-200">
              {busyAction === "detail"
                ? "Loading..."
                : json.detail
                  ? prettyJson(json.detail)
                  : "No run detail response yet."}
            </pre>
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-sm font-medium uppercase tracking-wider text-gray-400">
              Package Response
            </h3>
            <pre className="mt-3 overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-200">
              {busyAction === "package"
                ? "Loading..."
                : json.package
                  ? prettyJson(json.package)
                  : "No package response yet."}
            </pre>
          </section>
        </div>
      </div>
    </main>
  );
}
