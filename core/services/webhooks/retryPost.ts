/**
 * Shared retry-POST transport (TASK-491-02-L01).
 *
 * Extracted verbatim from the delivery loop previously inlined in
 * `deliveryService.ts` (attempts 3, timeout 8000ms, base delay 400ms, backoff
 * `baseDelay * 2^(n-1)`). `deliverWebhook` now builds its headers/signature
 * once and delegates the retry loop here, preserving per-attempt behavior via
 * the `onAttempt` hook and the per-attempt `X-Coderso-Attempt` /
 * `X-Nextless-Attempt` headers.
 *
 * The module is IO-only (uses global `fetch`); it carries no secrets — the
 * destination URL is a caller concern and is never logged here.
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type RetryAttemptState = {
  attempt: number;
  ok: boolean;
  responseCode: number | null;
  lastError: string | null;
  finalAttempt: boolean;
};

export type RetryPostInput = {
  url: string;
  body: string;
  /** Base headers applied to every attempt. The attempt header is added by the transport. */
  headers?: Record<string, string>;
  attempts?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
  /** Invoked after each attempt (success or failure) so callers can record delivery logs. */
  onAttempt?: (state: RetryAttemptState) => void | Promise<void>;
};

export type RetryPostResult = {
  ok: boolean;
  attempts: number;
  responseCode: number | null;
  lastError: string | null;
};

const setAttemptHeader = (headers: Headers, attempt: number) => {
  const value = String(attempt);
  headers.set("X-Coderso-Attempt", value);
  headers.set("X-Nextless-Attempt", value);
};

export async function postWithRetry(input: RetryPostInput): Promise<RetryPostResult> {
  const maxAttempts = input.attempts ?? 3;
  const timeoutMs = input.timeoutMs ?? 8000;
  const baseDelayMs = input.baseDelayMs ?? 400;

  let attempts = 0;
  let lastError: string | null = null;
  let responseCode: number | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt;
    const headers = new Headers({ "Content-Type": "application/json", ...(input.headers ?? {}) });
    setAttemptHeader(headers, attempt);

    let ok = false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(input.url, {
        method: "POST",
        headers,
        body: input.body,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      responseCode = response.status;
      ok = response.ok;
      if (!ok) {
        lastError = `HTTP ${response.status}`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "delivery_failed";
    }

    const finalAttempt = attempt >= maxAttempts;
    await input.onAttempt?.({ attempt, ok, responseCode, lastError, finalAttempt });

    if (ok) {
      return { ok: true, attempts, responseCode, lastError: null };
    }

    if (!finalAttempt) {
      await sleep(baseDelayMs * Math.pow(2, attempt - 1));
    }
  }

  return { ok: false, attempts, responseCode, lastError };
}
