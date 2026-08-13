import type { PopupTrigger } from "../popupTypes";

/**
 * TriggerWatchers arms the right detector for each `PopupTrigger` variant and
 * invokes `onFire()` exactly once, returning a `dispose()` cleanup. All browser
 * globals are injected through `env` so this module stays pure, DOM-agnostic,
 * and serializable into the runtime IIFE (TASK-486-03-L02).
 */

export type TriggerEnv = {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
  addEventListener: (type: string, fn: (e: unknown) => void, opts?: unknown) => void;
  removeEventListener: (type: string, fn: (e: unknown) => void) => void;
  scrollMetrics: () => { y: number; viewport: number; full: number };
  matches: (el: unknown, selector: string) => boolean;
};

export type Dispose = () => void;

/**
 * Percentage of the page scrolled, clamped to 0-100. `scrollable` is guarded to
 * at least 1 so a zero-scrollable document never divides by zero.
 */
export const scrollDepthPercent = (metrics: { y: number; viewport: number; full: number }) => {
  const scrollable = Math.max(1, metrics.full - metrics.viewport);
  return Math.min(100, Math.max(0, Math.round((metrics.y / scrollable) * 100)));
};

export function watchTrigger(trigger: PopupTrigger, env: TriggerEnv, onFire: () => void): Dispose {
  let fired = false;
  const fire = () => {
    if (!fired) {
      fired = true;
      onFire();
    }
  };

  switch (trigger.type) {
    case "time_delay": {
      const handle = env.setTimeout(fire, trigger.delaySeconds * 1000);
      return () => env.clearTimeout(handle);
    }
    case "scroll_depth": {
      const handler = () => {
        if (scrollDepthPercent(env.scrollMetrics()) >= trigger.percent) {
          fire();
          env.removeEventListener("scroll", handler);
        }
      };
      env.addEventListener("scroll", handler, { passive: true });
      // Defer the initial-position evaluation: `fire()` can run synchronously,
      // and the caller (popupRuntime orchestrator) arms watchers before
      // assigning `dispose`. A synchronous fire would hit the TDZ
      // `ReferenceError: Cannot access 'dispose' before initialization`. The
      // 0ms timer guarantees the caller has bound `dispose` first.
      env.setTimeout(handler, 0);
      return () => env.removeEventListener("scroll", handler);
    }
    case "exit_intent": {
      const handler = (e: unknown) => {
        const event = e as MouseEvent | null;
        if ((event?.clientY ?? 1) <= 0 && !event?.relatedTarget) fire();
      };
      env.addEventListener("mouseout", handler);
      return () => env.removeEventListener("mouseout", handler);
    }
    case "cta_click": {
      const handler = (e: unknown) => {
        try {
          let el = (e as Event | null)?.target as Element | null;
          while (el) {
            if (env.matches(el, trigger.selector)) {
              fire();
              break;
            }
            el = el.parentElement;
          }
        } catch {
          // Invalid selector: never throws, simply never fires.
        }
      };
      env.addEventListener("click", handler, true);
      return () => env.removeEventListener("click", handler);
    }
  }
}
