import type { PillarResearchStep } from "./content-workflow-types";

export type WorkflowErrorClass = "retryable" | "deterministic";

export interface StepExecutionContext {
  runId: string;
  branchId: string;
  step: PillarResearchStep;
  attempt: number;
}

export interface WorkflowExecutionPolicy {
  timeoutMs: number;
  maxRetries: number;
  baseDelayMs: number;
}

export interface ExecutionResult {
  success: boolean;
  attempts: number;
  errorClass?: WorkflowErrorClass;
  errorMessage?: string;
}

export interface StepExecutionError extends Error {
  retryable?: boolean;
  code?: string;
}

export function classifyExecutionError(error: unknown): WorkflowErrorClass {
  if (
    error &&
    typeof error === "object" &&
    "retryable" in error &&
    (error as { retryable?: unknown }).retryable === true
  ) {
    return "retryable";
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (
    message.includes("timeout") ||
    message.includes("rate limit") ||
    message.includes("network")
  ) {
    return "retryable";
  }

  return "deterministic";
}

export async function runWithTimeout<T>(
  timeoutMs: number,
  work: () => Promise<T>
): Promise<T> {
  return await Promise.race([
    work(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Step execution timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeWithPolicy(
  context: Omit<StepExecutionContext, "attempt">,
  policy: WorkflowExecutionPolicy,
  execute: (ctx: StepExecutionContext) => Promise<void>
): Promise<ExecutionResult> {
  let attempt = 1;
  let lastError: unknown = null;

  while (attempt <= policy.maxRetries + 1) {
    try {
      await runWithTimeout(policy.timeoutMs, () =>
        execute({
          ...context,
          attempt,
        })
      );
      return {
        success: true,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error;
      const errorClass = classifyExecutionError(error);
      if (errorClass !== "retryable" || attempt > policy.maxRetries) {
        return {
          success: false,
          attempts: attempt,
          errorClass,
          errorMessage: error instanceof Error ? error.message : "Step execution failed",
        };
      }

      const waitMs = policy.baseDelayMs * 2 ** (attempt - 1);
      await delay(waitMs);
      attempt += 1;
    }
  }

  return {
    success: false,
    attempts: policy.maxRetries + 1,
    errorClass: classifyExecutionError(lastError),
    errorMessage: lastError instanceof Error ? lastError.message : "Step execution failed",
  };
}
