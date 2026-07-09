# TASK-534-05-L01: Behavioral Runtime Tests (IIFE exec + click/keyboard/scroll/pointer)

# FileName: TASK-534-05-L01-Behavioral-Runtime-Tests.md

**Parent Task:** TASK-534
**Parent Subtask:** TASK-534-05
**Priority:** High
**Category:** Tests / Accessibility / Security
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Authors the BEHAVIORAL tests that EXECUTE
`PAGE_EFFECTS_RUNTIME_SOURCE` (the ONE runtime string with the 534 clauses) against
a jsdom DOM fixture matching the renderer's data-attribute contract, then simulate
real events to assert the switcher toggle, filter show/hide, and magnetic transform
behave — AND that reduced-motion / coarse-pointer suppress motion while
toggles stay functional. This is the runtime-lane counterpart to the model/render
static lanes.

## Test lane (rationale)

**Vitest `tests/vitest/content*`** (jsdom, DOM kernel + event simulation) — per
parent 521-01-L04's ruling that IIFE-exec tests live in the Vitest `content` lane
(NOT the pure-string `tests/vitest/pages/` lane, NOT the Bun `tests/unit` lane).
Behavioral because it runs the actual runtime and asserts DOM STATE after events,
matching the owner mandate that runtime behavior be verified by executing the IIFE
and simulating interaction (not just string-shape).

## Grounded anchors

- `PAGE_EFFECTS_RUNTIME_SOURCE` (`pageEffectsRuntime.ts:49`) with the 534 clauses
  (534-01-L03). Execute via `new Function(PAGE_EFFECTS_RUNTIME_SOURCE)()` (or
  `eval`) after building the fixture DOM — mirror any existing behavioral runtime
  test (grep `tests/vitest/content*` for the 521 reveal/parallax exec test as the
  harness precedent; `matchMedia` is stubbed there).
- DOM contract (from 534-02): `[data-switcher] > [role=tablist] >
  [data-switcher-tab]` + `[data-switcher-panel][hidden]`; `[data-gallery] >
  [data-gallery-filter] > [data-filter]` + `[data-filter-item][data-category]`;
  `[data-magnetic]`.
- `matchMedia` stub: toggle `(prefers-reduced-motion: reduce)` and
  `(pointer:fine)` matches to exercise the guards.

## Implementation pseudocode

```ts
// tests/vitest/content/task-534-interactivity-runtime.test.ts
function run(dom) { document.body.innerHTML = dom; new Function(PAGE_EFFECTS_RUNTIME_SOURCE)(); }

describe("switcher runtime", () => {
  it("click tab 2 → panel 1 hidden, panel 2 shown, aria-selected moves", () => {
    stubMatchMedia({ reduce: false, fine: true }); run(SWITCHER_DOM);
    tabs[1].click();
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(panels[0].hidden).toBe(true); expect(panels[1].hidden).toBe(false);
  });
  it("ArrowRight roves selection + tabindex", () => { … keydown ArrowRight … });
  it("reduced-motion: toggle STILL works (panels swap), no crossfade asserted", () => {
    stubMatchMedia({ reduce: true, fine: true }); run(SWITCHER_DOM);
    tabs[1].click();
    expect(panels[1].hidden).toBe(false);   // toggle runs for reduce users
    // 534-01-L03 places the switcher + filter TOGGLE clauses BEFORE the unconditional
    // reduced-motion whole-IIFE early-return (:53), so they run for reduce users; only
    // the magnetic MOTION clause sits after the return and is suppressed. This assertion
    // is the regression guard: if a future edit moves the toggles below the early-return,
    // reduce users lose tabs and this test FAILS.
  });
});

describe("gallery filter runtime", () => {
  it("click 'eco' chip → non-eco items get .is-hidden + hidden; 'all' restores");
  it("data-category matched via token split (no substring false-positive)");
  it("multi-category item (data-category='modern eco') matches BOTH the 'modern' and 'eco' chips");
  // Grammar-consistency guard: a category is a single space-free token (534-01-L01
  // GALLERY_CATEGORY_PATTERN = /^[\w-]{1,48}$/); data-category holds a space-separated
  // SET, and cat.split(" ").indexOf(f) matches each token exactly. A space-containing
  // value can never reach data-category (dropped/split at write+render), so there is no
  // "whole phrase never matches its own chip" mismatch.
});

describe("magnetic runtime", () => {
  it("pointer:fine + no-reduce: pointermove sets clamped translate transform");
  it("pointerleave resets transform");
  it("coarse pointer OR reduced-motion: NO transform bound");
});
```

**Reduced-motion contract check (important):** 534-01-L03 places the switcher /
filter TOGGLE clauses BEFORE the reduced-motion first-statement early-return (`:53`, an
unconditional whole-IIFE return) so they run for reduce users (accessibility — the visual
crossfade is CSS-guarded), and places the magnetic MOTION clause AFTER it so it is
suppressed. This leaf ASSERTS both: with `reduce:true`, tab/filter toggles STILL change
DOM state, while the magnetic clause binds NOTHING. If a future edit moves the toggles
below the early-return (which would kill them for reduce users), this test FAILS — that
is the intended structural guard.

## Security note

The behavioral tests double as the runtime-security regression: they confirm the
runtime reads config ONLY from `data-*` (never `innerHTML`/`eval` of stored data),
that `data-category` matching is token-split (no injection via crafted category),
and that a label containing markup stays inert text (the render already escaped it;
the runtime never re-parses it as HTML). They also pin the reduced-motion +
`pointer:fine` gates so a future edit cannot silently arm motion for reduce/touch
users.

## Regression / owned-breaking-test notes

- Complements (does NOT duplicate) the static-shape assertions in
  534-01-L04's extension of `pageEffectsRuntime.test.ts`. If a shared `matchMedia`
  jsdom stub helper exists in the content lane, reuse it; do not fork a second stub.

## Hard Invariants

1. Behavioral (jsdom exec + event simulation), Vitest `content` lane.
2. Asserts toggles work for reduce users; motion (crossfade/magnetic) suppressed
   for reduce/touch.
3. Confirms no `innerHTML`/`eval` sink and token-split category matching.
