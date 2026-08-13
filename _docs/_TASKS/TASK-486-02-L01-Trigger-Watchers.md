# TASK-486-02-L01: Trigger Watchers (time / scroll / exit-intent / cta)
# FileName: TASK-486-02-L01-Trigger-Watchers.md

**Parent Subtask:** TASK-486-02
**Priority:** High
**Category:** Engagement / Popups / Public Site
**Estimated Effort:** Medium
**Dependencies:** TASK-486-01-L01 (trigger types/DTO)
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Implement `watchTrigger(trigger, env, onFire)` — a pure,
  dependency-free function that arms the right detector for each
  `PopupTrigger` variant and invokes `onFire()` **once**, returning a
  `dispose()` cleanup. All browser globals (`setTimeout`, `addEventListener`,
  `scrollY`/`innerHeight`/`scrollHeight`) are injected via an `env` adapter so
  the function runs headless under Vitest.
- **Owning module(s) to create-or-extend:** create
  `core/services/popups/runtime/triggerWatchers.ts` (self-contained, no imports
  except the trigger types — so it can be serialized into the runtime IIFE by
  TASK-486-03-L02).
- **Source-of-truth docs:** `_docs/ARCHITECTURE.md` (`Bun.*`/DOM globals stay in
  thin adapters; domain logic stays runtime-agnostic). Browser-runtime authoring
  precedent: `core/widgets/core/listingRuntimeScript.ts`.
- **Out of scope:** fetching popups (L03), frequency gating (L02), DOM rendering
  (TASK-486-03), `<script>` assembly (TASK-486-03-L02).

---

## Security Contract

No endpoint or permission model changes. Client-only logic.

- **CTA selector safety:** `cta_click` uses the authored `selector` with
  `env.querySelectorAll` (or delegated `matches`) — wrap in `try/catch` so an
  invalid selector throws no uncaught error and simply never fires. The selector
  is author-controlled (already length-bounded ≤240 by admin validation), not
  visitor input.
- **No secrets/PII:** watchers receive only the public DTO `trigger`; nothing is
  logged or persisted here.

---

## Implementation Pseudocode

```ts
// core/services/popups/runtime/triggerWatchers.ts
import type { PopupTrigger } from "../popupTypes";

export type TriggerEnv = {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (h: unknown) => void;
  addEventListener: (t: string, fn: (e: unknown) => void, opts?: unknown) => void;
  removeEventListener: (t: string, fn: (e: unknown) => void) => void;
  scrollMetrics: () => { y: number; viewport: number; full: number };
  matches: (el: unknown, selector: string) => boolean; // delegated cta match
};

export type Dispose = () => void;

export const scrollDepthPercent = (m: { y: number; viewport: number; full: number }) => {
  const scrollable = Math.max(1, m.full - m.viewport);
  return Math.min(100, Math.max(0, Math.round(((m.y) / scrollable) * 100)));
};

export function watchTrigger(
  trigger: PopupTrigger, env: TriggerEnv, onFire: () => void
): Dispose {
  let fired = false;
  const fire = () => { if (!fired) { fired = true; onFire(); } };

  switch (trigger.type) {
    case "time_delay": {
      const h = env.setTimeout(fire, trigger.delaySeconds * 1000);
      return () => env.clearTimeout(h);
    }
    case "scroll_depth": {
      const handler = () => {
        if (scrollDepthPercent(env.scrollMetrics()) >= trigger.percent) {
          fire(); env.removeEventListener("scroll", handler);
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
            if (env.matches(el, trigger.selector)) { fire(); break; }
            el = el.parentElement;
          }
        } catch { /* invalid selector ⇒ never fires */ }
      };
      env.addEventListener("click", handler, true);
      return () => env.removeEventListener("click", handler);
    }
  }
}
```

**Data flow:** orchestrator (L03) builds a real `env` from `window`/`document`
in the browser and a fake `env` in tests; `watchTrigger` arms once and fires
once, returning cleanup so the orchestrator can dispose after the popup shows.

**Error handling:** `fired` latch guarantees single fire; invalid CSS selectors
are swallowed; no throw escapes the watcher. `scrollDepthPercent` clamps 0–100
and guards divide-by-zero.

**Regression-test shape (Vitest):**

- `time_delay`: advancing the fake clock fires exactly once at the boundary.
- `scroll_depth`: fires when computed percent ≥ threshold; never below; single
  fire; `scrollDepthPercent` boundary math (0, exact, ≥100, zero-scrollable).
- `exit_intent`: fires on `clientY <= 0` with no relatedTarget; not on inner
  moves.
- `cta_click`: fires on matching target/ancestor; invalid selector no-throw;
  non-match no fire.
- `dispose()` removes listeners / clears timeout.

---

## Testing Requirements

- **Vitest** (`tests/vitest/popups/trigger-watchers.test.ts`) with injected
  clock + event-target fakes; no real `window`.
- Gates: `bun run lint`, `bun --cwd core lint:types`, `bun run test:vitest`.
