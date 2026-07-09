# TASK-534-01-L04: Model + Runtime Static-Shape Tests

# FileName: TASK-534-01-L04-Model-And-Runtime-Tests.md

**Parent Task:** TASK-534
**Parent Subtask:** TASK-534-01
**Priority:** High
**Category:** Tests
**Estimated Effort:** Medium
**Status:** ✅ Done

---

## Scope

Executable leaf. Authors the Vitest coverage for the 534-01 model + runtime
foundation (round-trip / reject-unknown / byte-identity / enum fail-closed /
category fail-soft / JSON-schema lockstep / runtime static-shape). Owns its test
files; imports the model + runtime exports read-only. Behavioral IIFE-exec tests
(simulate click/scroll/pointer) are OWNED by 534-05-L01 (the behavioral lane) —
this leaf is the PURE model + STATIC-STRING coverage.

## Test lane (correct lane rationale)

Per `_docs/TESTING_STRATEGY.md`: model normalize/round-trip and the static
runtime-string assertions are pure TypeScript (no DB, no DOM kernel) ⇒ **Vitest
`tests/vitest/pages/`** — NOT the Bun `tests/unit/pages/*` lane (reserved for
DB/service + Ajv-heavy suites). The behavioral jsdom-exec tests belong to the
Vitest `tests/vitest/content*` lane and are 534-05-L01's.

## Grounded anchors

Existing suites to mirror: `tests/vitest/pages/pageEffectsRuntime.test.ts` (521
static-shape — EXTEND, do not duplicate; see 534-01-L03 owned-breaking note),
`tests/vitest/pages/*` block-type/capability/round-trip suites (customSvg
precedent, TASK-522). Model exports: `normalizePageDocument` /
`normalizePageDocumentV2ForWrite`, `pageBlockTypes`, `pageBlockPropKeys`,
`pageBlockDefaultProps`, `PageDocumentError`, the strict JSON schema.

## Implementation pseudocode

```ts
// tests/vitest/pages/task-534-interactivity-model.test.ts
describe("TASK-534 interactivity model", () => {
  it("switcher round-trips (tabs/activeIndex/variant) + panel slots", …);
  it("scrollHint round-trips (label/glyph)", …);
  it("gallery filterable + filterCategories + item.category round-trip", …);
  it("block.style.magnetic:true present; false omitted (byte-identity)", …);
  it("section.style.noiseOverlay + settings.effects.noiseOverlay round-trip", …);
  it("bad enum VALUE throws in write mode (variant:'x', glyph:'x')", () =>
     expect(() => write({ variant: "drop-table" })).toThrow(PageDocumentError));
  it("bad filter category 'a\";b{}' is DROPPED (fail-soft)", …);
  it("activeIndex clamps to valid tab range (fail-soft)", …);
  it("unknown prop switcher.evil / unknown style.wobble throws", …);
  it("legacy doc (no 534 field) is byte-identical", …);
  it("JSON schema accepts good shapes, rejects unknown prop", …);   // Ajv lockstep
  it("adding switcher/scrollHint keeps pageBlockCapabilities exhaustive", …);
});

// EXTEND tests/vitest/pages/pageEffectsRuntime.test.ts (owned-breaking)
it("source contains data-switcher / data-gallery-filter / data-magnetic clauses");
it("reduced-motion early-return precedes the new clauses");
it("magnetic clause opens a pointer:fine gate");
it("source has no ${ interpolation and no eval/Function(/innerHTML= sink");
```

## Security note

The tests are the fail-closed READ trap for the reject-unknown allowlist (a
forgotten `pageBlockPropKeys`/schema entry silently degrades stored docs to empty
on read): each round-trip case doubles as the security regression that unknown keys
throw, enum values fail-closed on write, and category strings fail-soft-drop. The
static-string assertions guard against a future edit introducing interpolation
(`${`) or a JS sink into the runtime source.

## Regression / owned-breaking-test notes

- This leaf is where the owned-breaking updates from 534-01-L01
  (exhaustive-record/capability enumerations) and 534-01-L03
  (`pageEffectsRuntime.test.ts` snapshot) land — verify the full Vitest
  `pages` glob green after the model + runtime clauses merge (re-run named files;
  the full vitest glob has known timeout flakes — see MEMORY typecheck-scope
  gotcha; also run root `tsc -p tsconfig.json --noEmit` for test excess-prop
  errors after the prop-shape additions).

## Hard Invariants

1. Vitest lane (pure model + static string); behavioral IIFE-exec is 534-05-L01.
2. Every new key has a round-trip assertion (fail-closed read trap) + reject-unknown
   + fail-soft/closed value assertion.
3. Byte-identity assertion for a legacy/no-534 doc.
