import { SmokeError } from "./contracts";

export interface PollOptions<T> {
  readonly timeoutMs: number;
  readonly intervalMs?: number;
  readonly check: () => Promise<T | null | undefined | false>;
  readonly now?: () => number;
  readonly schedule?: (callback: () => void, delayMs: number) => unknown;
}

export async function pollUntil<T>(options: PollOptions<T>): Promise<T> {
  const { timeoutMs, check } = options;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new SmokeError("smoke_argument_invalid", "poll timeout must be positive");
  }
  const intervalMs = options.intervalMs ?? 50;
  if (!Number.isFinite(intervalMs) || intervalMs < 0 || intervalMs > timeoutMs) {
    throw new SmokeError("smoke_argument_invalid", "poll interval is invalid");
  }
  const now = options.now ?? performance.now.bind(performance);
  const schedule = options.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  const deadline = now() + timeoutMs;
  while (true) {
    const result = await check();
    if (result !== null && result !== undefined && result !== false) return result;
    const remaining = deadline - now();
    if (remaining <= 0) throw new SmokeError("smoke_poll_timeout", "poll deadline expired");
    await new Promise<void>((resolve) => schedule(resolve, Math.min(intervalMs, remaining)));
  }
}
