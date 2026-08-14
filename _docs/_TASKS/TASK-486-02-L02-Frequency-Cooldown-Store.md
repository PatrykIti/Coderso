# TASK-486-02-L02: Frequency / Cooldown Storage Gate
# FileName: TASK-486-02-L02-Frequency-Cooldown-Store.md

**Parent Subtask:** TASK-486-02
**Priority:** High
**Category:** Engagement / Popups / Public Site
**Estimated Effort:** Medium
**Dependencies:** TASK-486-01-L01 (frequency type/DTO)
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Implement a pure frequency/cooldown gate: `shouldShowPopup(popup,
  record, now)` decides whether a popup may show given its last-shown record, and
  `recordPopupShown(...)` persists the new record. Strategies map to:
  `always` (cooldown only), `session_once` (once per browser session),
  `daily_once` (once per calendar UTC day). `cooldownMinutes` adds a minimum gap
  on top of any strategy. Storage is injected through a single `FrequencyEnv`
  adapter; the orchestrator's real adapter dual-writes every record to both
  `sessionStorage` and `localStorage` (session id in sessionStorage,
  last-shown in both) so the gate survives reloads and works in private mode —
  the gate itself stays storage-agnostic and fully testable.
- **Owning module(s) to create-or-extend:** create
  `core/services/popups/runtime/frequencyGate.ts` (self-contained, no imports
  except the frequency type — serializable into the runtime IIFE).
- **Source-of-truth docs:** `_docs/ARCHITECTURE.md` (DOM/storage globals behind
  adapters), `_docs/SECURITY_SPEC.md` (no PII written to client storage).
- **Out of scope:** trigger detection (L01), fetch/orchestration (L03), DOM
  (TASK-486-03). No server-side impression persistence (explicitly out of scope
  for TASK-486).

---

## Security Contract

No endpoint or permission model changes. Client-only logic.

- **Storage keys:** namespaced, opaque (`nl.popup.<popupId>`); store ONLY a
  timestamp + session marker. **No PII**, no popup content, no visitor identity.
- **Strategy split:** `session_once` uses session-scoped storage;
  `daily_once`/cooldown use persistent storage. A missing/blocked storage
  (private mode) MUST degrade safely (treat as "no record" but never throw).
- **No secrets:** nothing sensitive is ever written or logged.

---

## Implementation Pseudocode

```ts
// core/services/popups/runtime/frequencyGate.ts
import type { PopupFrequency } from "../popupTypes";

export type ShownRecord = { lastShownMs: number; sessionId: string } | null;

export type FrequencyEnv = {
  now: () => number;
  sessionId: string;                 // per-tab/session id (stable within session)
  getRecord: (popupId: string) => ShownRecord;
  setRecord: (popupId: string, rec: { lastShownMs: number; sessionId: string }) => void;
};

export const sameUtcDay = (a: number, b: number) =>
  new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);

export function shouldShowPopup(
  popupId: string, frequency: PopupFrequency, env: FrequencyEnv
): boolean {
  let rec: ShownRecord = null;
  try { rec = env.getRecord(popupId); } catch { rec = null; } // private mode safe

  const now = env.now();
  if (rec) {
    // cooldown gap applies under every strategy
    if (frequency.cooldownMinutes != null) {
      if (now - rec.lastShownMs < frequency.cooldownMinutes * 60_000) return false;
    }
    if (frequency.strategy === "session_once" && rec.sessionId === env.sessionId) return false;
    if (frequency.strategy === "daily_once" && sameUtcDay(rec.lastShownMs, now)) return false;
  }
  return true;
}

export function recordPopupShown(popupId: string, env: FrequencyEnv): void {
  try {
    env.setRecord(popupId, { lastShownMs: env.now(), sessionId: env.sessionId });
  } catch { /* storage blocked ⇒ no-op (popup may re-show; acceptable) */ }
}
```

**Data flow:** orchestrator (L03) builds `FrequencyEnv` from
`sessionStorage`/`localStorage` + a session id; before arming a popup's trigger
it calls `shouldShowPopup`; on actual display it calls `recordPopupShown`.

**Error handling:** every storage access is `try/catch`-guarded — a throwing or
absent storage degrades to "allow" (never blocks the page, never throws). All
time math is integer-safe.

**Regression-test shape (Vitest):**

- `always` + no cooldown ⇒ always true.
- `always` + cooldown ⇒ false within window, true after.
- `session_once` ⇒ false with same `sessionId`, true with a new session.
- `daily_once` ⇒ false same UTC day, true next day (advance clock).
- cooldown stacks on top of `session_once`/`daily_once`.
- blocked storage (getter throws) ⇒ `shouldShowPopup` true, `recordPopupShown`
  no-throw.

---

## Testing Requirements

- **Vitest** (`tests/vitest/popups/frequency-gate.test.ts`) with injected clock
  + in-memory/throwing storage fakes.
- Gates: `bun run lint`, `bun --cwd core lint:types`, `bun run test:vitest`.
