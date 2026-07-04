# TASK-486-04-L02: Engine + Render Vitest Suite
# FileName: TASK-486-04-L02-Engine-And-Render-Vitest.md

**Parent Subtask:** TASK-486-04
**Priority:** Medium
**Category:** Engagement / Popups / Public Site
**Estimated Effort:** Small
**Dependencies:** TASK-486-02 (all leaves), TASK-486-03-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Consolidate and complete the pure-logic + render coverage for the
  engine and render component. Most unit specs are authored alongside their
  leaves (L01–L03 of 02, L01 of 03); this leaf closes gaps and adds the
  **integration-style** Vitest test that wires `createPopupRuntime` →
  `renderPopup` together against jsdom + fakes (no network, no real timers).
- **Owning module(s) to create-or-extend:** create/extend
  `tests/vitest/popups/*` and
  `tests/vitest/ui-integration/popup-runtime-render.test.tsx`.
- **Source-of-truth docs:** `_docs/ARCHITECTURE.md` (test-lane policy: pure
  TS/domain/render ⇒ Vitest).
- **Out of scope:** the served route/Bun.serve injection (TASK-486-04-L01); docs
  (TASK-486-04-L03).

---

## Security Contract

Test-only leaf, client logic. Asserts the XSS/safe-href and no-PII guarantees of
the render component (TASK-486-03-L01) and that the engine never sends an
audience claim.

---

## Implementation Pseudocode

```ts
// tests/vitest/ui-integration/popup-runtime-render.test.tsx
test("runtime fetch ⇒ trigger fire ⇒ rendered once and recorded", async () => {
  const store = new Map<string, string>();
  const env = makeFakeEnvs(store);            // clock + storage + event target
  const popups = [publicPopup({ trigger: { type: "time_delay", delaySeconds: 1 } })];
  const runtime = createPopupRuntime({
    currentPath: () => "/",
    fetchPopups: async () => popups,
    triggerEnv: env.trigger, frequencyEnv: env.frequency,
    render: (p) => renderPopup(p, { document }),
  });
  await runtime.start();
  env.clock.advance(1000);
  expect(document.querySelectorAll("[data-coderso-popup]")).toHaveLength(1);
  // frequency recorded ⇒ second start does not re-render
  await runtime.start();
  env.clock.advance(1000);
  expect(document.querySelectorAll("[data-coderso-popup]")).toHaveLength(1);
});

test("javascript: CTA href is dropped", () => {
  renderPopup(publicPopup({ content: { ctaLabel: "Go", ctaHref: "javascript:alert(1)" } }),
    { document });
  expect(document.querySelector("[data-coderso-popup] a")?.getAttribute("href")).toBeNull();
});

test("html-looking title is escaped (textContent)", () => { /* no injected <img> */ });
```

**Data flow:** fake fetch + fake envs feed the orchestrator; jsdom `document`
receives the render; assertions read the DOM.

**Error handling under test:** fetch rejection ⇒ no render/no throw; blocked
storage ⇒ popup may re-show but no throw (covered in L02 unit, re-asserted at
integration level if cheap).

**Regression-test shape:** end-to-end-on-client (no network) happy path +
safe-href + escaping + frequency suppression on re-start.

---

## Testing Requirements

- **Vitest** (`tests/vitest/popups/*`, `tests/vitest/ui-integration/*`) with
  jsdom + injected clock/storage/event fakes.
- Gates: `bun run lint`, `bun run typecheck`, `bun run test:vitest`.
