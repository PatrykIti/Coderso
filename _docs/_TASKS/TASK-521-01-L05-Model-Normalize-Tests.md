# TASK-521-01-L05: Model + Normalize Round-Trip Tests

# FileName: TASK-521-01-L05-Model-Normalize-Tests.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-01
**Priority:** High
**Category:** Tests
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Adds the model/normalize regression tests for L01 (section
scroll effect), L02 (page-settings effects), L03 (the animated-icon **`icon`
block** — NO new type), and the static-shape test for L04 (runtime source).
These are pure TypeScript normalize/serialize round-trips (no DB, no runtime
contract), so per `_docs/TESTING_STRATEGY.md` (line 14 "Vitest for pure
TypeScript…"; line 225 "pure domain and admin/UI unit suites → Vitest") they
belong in the **Vitest** lane, extending the existing page-document suites —
NOT a new Bun `tests/unit/pages/*` file. (Bun `tests/unit/pages/` holds DB/
service integration + the narrow Ajv `validation.test.ts`, not the model
round-trip anchor.)

## Grounded anchors

The canonical `normalizePageDocument` round-trip / JSON-schema / block
round-trip suites live in Vitest: `tests/vitest/pages/page-document-v2.test.ts`
and `tests/vitest/pages/page-document-v2-block-roundtrip.test.ts`. Units:
`normalizePageDocument` / `createPageBlockV2` / `createPageSectionV2`
(`pageDocumentV2.ts:3098`/`:3118`), `pageBlockCapabilities` (`:778`),
`pageBlockTypes` (`:50-72`, contains `"icon"` at `:67`, **no `animatedIcon`**),
`PageDocumentError` (`:500`). `normalizeEnum` (`:1554-1566`) is fail-CLOSED
(throws in write mode).

## Test shape

Extend `tests/vitest/pages/page-document-v2.test.ts` (Vitest) with the effect
model round-trips, and `page-document-v2-block-roundtrip.test.ts` with the icon
block cases:

```ts
describe("section scroll effect (521-01-L01)", () => {
  it("round-trips reveal-up + parallaxIntensity", () => { /* normalize→JSON→normalize eq */ });
  it("omits scrollEffect:'none' (present-only)", () => { /* not in output */ });
  it("clamps parallaxIntensity to [0,40]", () => { /* 9999 → 40 (fail-soft) */ });
  it("rejects invalid scrollEffect value (throws PageDocumentError)", () => { /* 'drop-table' → throw */ });
  it("rejects unknown style key", () => { /* expect throws PageDocumentError */ });
  it("legacy section (no effect keys) is byte-identical", () => { /* deep eq */ });
});
describe("page settings effects (521-01-L02)", () => {
  it("round-trips { cursorSpotlight, spotlightColor(alpha), spotlightSize }", () => {});
  it("omits empty effects:{} (present-only)", () => {});
  it("falls back spotlightColor 'url(x)' → var(--primary)", () => {});
  it("clamps spotlightSize to [120,900]", () => {});
  it("rejects unknown settings.effects key", () => {});
});
describe("icon block prop model (521-01-L03 — prop model only, NO animatedIcon type, NO capability flip)", () => {
  it("pageBlockTypes still contains 'icon' and NO 'animatedIcon' member", () => {
    // expect(pageBlockTypes).toContain("icon");
    // expect(pageBlockTypes).not.toContain("animatedIcon");
  });
  it("pageBlockCapabilities.icon STAYS placeholder/non-insertable after 521-01 (flip is 521-04)", () => {
    // expect(pageBlockCapabilities.icon).toMatchObject({
    //   runtimeRenderer: "placeholder", editorInsertable: false, insertable: false,
    //   reason: "icon-runtime-renderer-pending",
    // });
    // The capability-FLIP assertion lives in 521-04-L04 (with the frozen-test edits).
  });
  it("createPageBlockV2('icon') yields extended default props {name,label,animation,size,color,speed} + round-trips", () => {});
  it("resolves bad icon name ('../../x' / 'not-in-set') → 'sparkles' (fail-soft)", () => {});
  it("rejects invalid animation value (throws PageDocumentError, fail-closed enum)", () => { /* 'explode' → throw */ });
  it("clamps size/speed (fail-soft); readSafeColor coerces color 'expression(1)' → var(--primary)", () => {});
  it("rejects unknown icon prop (icon.props.wobble → throws)", () => {});
});
```

(There is NO `createPageBlockV2("animatedIcon")` — that type does not exist and
would fail typecheck; and `icon` is no longer "pending", so there is no
"pending icon unchanged" assertion.)

`tests/vitest/pages/pageEffectsRuntime.test.ts` (NEW, Vitest — pure string
assertions on the runtime SOURCE from 521-01-L04): reduced-motion guard appears
first, `IntersectionObserver` referenced, clamp `40` present, no
interpolation/sink markers (the source is a static literal).

## Definition of done

All new Vitest cases pass (`bun --cwd core test:vitest` / project vitest glob for
the pages suites green); the tests fail if any allowlist entry / clamp /
present-only omission / enum fail-closed behavior regresses. **The icon capability
is asserted UNCHANGED (still placeholder/non-insertable) by these 521-01 tests** —
the capability FLIP and its frozen-test edits are owned by 521-04-L04, so 521-01
lands green in isolation.
