export interface WorkflowEvent {
  id: string;
  runId: string;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

const MAX_EVENTS_PER_RUN = 500;

const g = globalThis as unknown as {
  __contentWorkflowEvents?: Map<string, WorkflowEvent[]>;
};

if (!g.__contentWorkflowEvents) {
  g.__contentWorkflowEvents = new Map<string, WorkflowEvent[]>();
}

const fallback = g.__contentWorkflowEvents;

export function publishWorkflowEvent(
  runId: string,
  type: string,
  payload: Record<string, unknown> = {}
): WorkflowEvent {
  const event: WorkflowEvent = {
    id: crypto.randomUUID(),
    runId,
    type,
    timestamp: new Date().toISOString(),
    payload,
  };

  const existing = fallback.get(runId) ?? [];
  const next = [...existing, event].slice(-MAX_EVENTS_PER_RUN);
  fallback.set(runId, next);

  return event;
}

export function listWorkflowEvents(
  runId: string,
  afterEventId?: string
): WorkflowEvent[] {
  const events = fallback.get(runId) ?? [];
  if (!afterEventId) {
    return events;
  }

  const idx = events.findIndex((event) => event.id === afterEventId);
  if (idx < 0) {
    return events;
  }
  return events.slice(idx + 1);
}

export function _clearWorkflowEvents(): void {
  fallback.clear();
}
