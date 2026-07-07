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
scroll effect), L02 (page-settings effects), L03 (animated-icon block), and the
static-shape test for L04 (runtime source). Bun lane
(`tests/unit/pages/*`, `bun:test`) per `_docs/TESTING_STRATEGY.md` — these are
pure normalize/serialize round-trips (no DOM), so they belong in the Bun unit lane
alongside the existing page-document normalize tests.

## Grounded anchors

Existing page-document normalize tests live in the Bun lane (e.g.
`tests/unit/pages/pageService.test.ts`, `tests/unit/pages/validation.test.ts`).
`normalizePageDocument` / `createPageBlockV2` / `createPageSectionV2`
(`pageDocumentV2.ts:3098`/`:3118`) + `PageDocumentError` (`:500`) are the units.

## Test shape

`tests/unit/pages/pageEffectsModel.test.ts` (NEW, `bun:test`):

```ts
describe("section scroll effect (521-01-L01)", () => {
  it("round-trips reveal-up + parallaxIntensity", () => { /* normalize→JSON→normalize eq */ });
  it("omits scrollEffect:'none' (present-only)", () => { /* not in output */ });
  it("clamps parallaxIntensity to [0,40]", () => { /* 9999 → 40 */ });
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
describe("animatedIcon block (521-01-L03)", () => {
  it("pageBlockTypes includes 'animatedIcon'", () => {});
  it("createPageBlockV2('animatedIcon') has default props + round-trips", () => {});
  it("resolves bad icon name → 'sparkles'", () => {});
  it("clamps size/speed, enum-guards animation, readSafeColor for color", () => {});
  it("rejects unknown animatedIcon prop", () => {});
  it("pending 'icon' block behavior unchanged", () => {});
});
```

`tests/unit/pages/pageEffectsRuntime.test.ts` (NEW, `bun:test`): the static-shape
assertions from 521-01-L04 (reduced-motion guard first, IntersectionObserver
present, clamp 40, no interpolation/sink markers).

## Definition of done

All new Bun tests pass; `bun test` green for the page unit suite; the tests fail
if any allowlist entry / clamp / present-only omission from L01-L03 regresses.
