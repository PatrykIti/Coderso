# TASK-486-02-L03: Runtime Orchestrator (Server-Authoritative Targeting)
# FileName: TASK-486-02-L03-Runtime-Orchestrator.md

**Parent Subtask:** TASK-486-02
**Priority:** High
**Category:** Engagement / Popups / Public Site
**Estimated Effort:** Medium
**Dependencies:** TASK-486-01-L01, TASK-486-02-L01, TASK-486-02-L02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Implement `createPopupRuntime(deps)` — the engine that, given a
  `fetchPopups()` source (the L03 endpoint) and the env adapters from L01/L02,
  resolves the popups for the current location, arms each popup's trigger through
  the frequency gate, and calls `deps.render(popup)` exactly once per popup, then
  records the show and disposes that popup's watcher. Targeting/audience is
  server-authoritative (the `PublicPopup` DTO omits `targeting`, so the client
  cannot and does not re-filter); on SPA navigation the host calls `stop()` then
  `start()`, which re-fetches `/api/popups?path=<new path>` for the new location.
- **Owning module(s) to create-or-extend:** create
  `core/services/popups/runtime/popupRuntime.ts` (self-contained, imports only
  the sibling runtime modules + types — serializable into the IIFE).
- **Source-of-truth docs:** `_docs/ARCHITECTURE.md`, `_docs/CMS_API.md`
  (consumes `GET /api/popups`).
- **Out of scope:** the actual DOM (TASK-486-03-L01), the `<script>` build +
  injection (TASK-486-03-L02), server targeting (already done in L01/L02 of 01).

---

## Security Contract

No endpoint or permission model changes. Client-only orchestration.

- **Audience is server-authoritative:** the runtime does NOT send an audience
  claim to the endpoint; it only sends `path`. The server already filtered by
  session-derived audience AND path targeting, and the `PublicPopup` DTO omits
  `targeting`, so there is no client-side path/audience guard to re-filter with.
  Path changes are handled by re-fetching: on SPA navigation the host calls
  `stop()` then `start()`, which re-fetches `/api/popups` for the new path.
- **Single fetch, no credentials leakage:** `fetch("/api/popups?path=" +
  encodeURIComponent(location.pathname))` — same-origin, no auth header; the
  endpoint is anonymous-read. Never log the response.
- **No PII:** consumes only `PublicPopup` DTOs.

---

## Implementation Pseudocode

```ts
// core/services/popups/runtime/popupRuntime.ts
import type { PublicPopup } from "../popupPublicContract";
import { watchTrigger, type TriggerEnv } from "./triggerWatchers";
import { shouldShowPopup, recordPopupShown, type FrequencyEnv } from "./frequencyGate";

export type PopupRuntimeDeps = {
  currentPath: () => string;
  fetchPopups: (path: string) => Promise<PublicPopup[]>;
  triggerEnv: TriggerEnv;
  frequencyEnv: FrequencyEnv;
  render: (popup: PublicPopup) => void;     // TASK-486-03-L01
};

export function createPopupRuntime(deps: PopupRuntimeDeps) {
  let disposers: Array<() => void> = [];
  let started = false;

  const stop = () => { disposers.forEach((d) => d()); disposers = []; started = false; };

  const start = async () => {
    if (started) return; started = true;
    let popups: PublicPopup[] = [];
    try { popups = await deps.fetchPopups(deps.currentPath()); } catch { started = false; return; }

    for (const popup of popups) {
      // server already targeted by path + audience; the DTO carries no
      // `targeting`, so there is nothing to re-filter here. SPA nav re-fetches
      // `/api/popups` (via stop()/start()) to re-target for the new path.
      if (!shouldShowPopup(popup.id, popup.frequency, deps.frequencyEnv)) continue;
      const dispose = watchTrigger(popup.trigger, deps.triggerEnv, () => {
        // re-check at fire time (cooldown may have elapsed/another popup shown)
        if (!shouldShowPopup(popup.id, popup.frequency, deps.frequencyEnv)) return;
        deps.render(popup);
        recordPopupShown(popup.id, deps.frequencyEnv);
        dispose();
      });
      disposers.push(dispose);
    }
  };

  return { start, stop };
}
```

**Data flow:** `start()` → fetch DTOs for `currentPath` → per popup: frequency
pre-gate → arm trigger watcher → on fire: re-gate → render once → record →
dispose. `stop()` tears down all watchers (used on SPA navigation before
re-`start`).

**Error handling:** a failed fetch silently no-ops (page never breaks); each
watcher is independent; the frequency re-check at fire-time prevents double-show
races; all storage/selector failures are already swallowed by L01/L02.

**Regression-test shape (Vitest):**

- `fetchPopups` resolving 2 popups arms 2 watchers; firing one calls `render`
  once + records + disposes only that one.
- A popup already within cooldown/session/day is never armed (`render` not
  called).
- Fetch rejection ⇒ no throw, `render` never called.
- `stop()` disposes all watchers.

---

## Testing Requirements

- **Vitest** (`tests/vitest/popups/popup-runtime.test.ts`) with fake
  `fetchPopups` + injected trigger/frequency envs + a spy `render`.
- Gates: `bun run lint`, `bun --cwd core lint:types`, `bun run test:vitest`.
