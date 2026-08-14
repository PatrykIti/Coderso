# TASK-486-02: Client Runtime Engine (Triggers, Targeting, Frequency)
# FileName: TASK-486-02-Client-Runtime-Engine.md

**Parent Task:** TASK-486
**Priority:** High
**Category:** Engagement / Popups / Public Site
**Estimated Effort:** Medium
**Dependencies:** TASK-486-01 (consumes the public DTO shape)
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** `<YYYY-MM-DD>`

---

## Overview

Build the browser-side engine that decides **when** a targeted popup is shown.
It is authored as **pure, dependency-free TS** (each exported function is
self-contained so it can be both unit-tested in Vitest **and** serialized into
the injected runtime IIFE by TASK-486-03). Three concerns:

- **L01 Trigger watchers** — `time_delay`, `scroll_depth`, `exit_intent`,
  `cta_click`, with injectable environment deps so they run headless in Vitest.
- **L02 Frequency/cooldown store** — `always` / `session_once` / `daily_once`
  plus `cooldownMinutes`, persisted in `sessionStorage`/`localStorage` via an
  injectable storage adapter.
- **L03 Runtime orchestrator** — fetches the endpoint DTO (targeting/audience is
  server-authoritative; the DTO omits `targeting`, so there is no client-side
  re-filter), wires each popup's trigger through the frequency gate, and calls a
  `render` callback once. On SPA nav it re-fetches `/api/popups` for the new path
  via `stop()`/`start()`.

No DOM rendering happens here (that is TASK-486-03); this subtask emits decisions
("show popup X now") only.

---

## Sub-Tasks

| ID | Title | Lane | Status |
| --- | --- | --- | --- |
| TASK-486-02-L01 | Trigger watchers (time/scroll/exit-intent/cta) | Vitest | ⏳ To Do |
| TASK-486-02-L02 | Frequency/cooldown storage gate | Vitest | ⏳ To Do |
| TASK-486-02-L03 | Runtime orchestrator (server-authoritative targeting) | Vitest | ⏳ To Do |

---

## Dependencies

- Public DTO + trigger/frequency/targeting types from TASK-486-01-L01.
- Repo precedent for browser runtime authoring:
  `core/widgets/core/listingRuntimeScript.ts` (String.raw IIFE),
  `core/widgets/runtimeScripts.tsx`.

---

## Testing Requirements

- All three leaves → **Vitest** (`tests/vitest/popups/*`). Use injectable
  clock/storage/event-target fakes — no real `window` dependency in the unit
  tests. Cover trigger thresholds, gate strategies, cooldown boundaries, and
  orchestrator start/stop semantics.
