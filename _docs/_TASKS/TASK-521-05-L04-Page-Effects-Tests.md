# TASK-521-05-L04: Page-Effects Tests

# FileName: TASK-521-05-L04-Page-Effects-Tests.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-05
**Priority:** High
**Category:** Tests
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Executable leaf. Regression tests for the compact panel (L01), Effects persistence
(L02), and page-shell render + spotlight (L03). Per `_docs/TESTING_STRATEGY.md` and
the live layout, page-shell `renderToString` assertions live in **Vitest**
(`tests/vitest/pages/page-renderer-v2.test.tsx`, the established render suite —
`tests/unit/pages/` is reserved for Bun DB/service + the Ajv `validation.test.ts`,
NOT `PageDocumentRender` SSR); the admin panel + jsdom spotlight go in the Vitest
`tests/vitest/admin` / `tests/vitest/content*` lanes.

## Test shape

**Vitest — `tests/vitest/pages/page-renderer-v2.test.tsx`** (extend;
`renderToString`):

```ts
it("cursorSpotlight ⇒ data-page-spotlight + data-page-motion + overlay + custom props + one script", () => {});
it("section scrollEffect only ⇒ data-page-motion + <style data-page-motion-css> (__html === PAGE_REVEAL_MOTION_CSS) + <noscript> + script, no spotlight overlay", () => {});
it("no effects ⇒ byte-identical <Root> (no marker/overlay/script/style)", () => {});
it("spotlight script __html === PAGE_EFFECTS_RUNTIME_SOURCE", () => {});
it("spotlightSize clamped in render; spotlightColor re-sanitized at render (sanitizeAuthoringCssColor) ⇒ bad color → var(--primary)", () => {});
```

**Vitest — `tests/vitest/admin/pageSettingsPanel.test.tsx`** (RTL — **line 1 MUST be
`// @vitest-environment happy-dom`**; `vitest.config.ts` sets `environment:"node"`
globally, DOM/RTL files opt in per-file, matching `tests/vitest/admin/
adminApp.test.tsx:1`, else `document`/`window` is undefined):

```ts
// @vitest-environment happy-dom
it("Page settings open in the compact rail panel, not a Sheet", () => {});
it("Title + Slug edits persist through the explicit Save (handleSettingsSave/updatePage)", () => {});
it("Show-in-nav + Revision-retention persist through the explicit Save", () => {});
it("Effects toggle + color + size edit the draft and persist on save", () => {});
it("disabling spotlight drops settings.effects (present-only)", () => {});
it("reload rehydrates Effects controls from saved settings.effects", () => {});
```

**Vitest — `tests/vitest/content/cursorSpotlight.test.tsx`** (**line 1 MUST be
`// @vitest-environment happy-dom`** — the file mocks `matchMedia`/pointer events and
runs `PAGE_EFFECTS_RUNTIME_SOURCE` via `new Function()`, all of which need a DOM):

```ts
// @vitest-environment happy-dom
it("pointermove updates --spotlight-x/y (pointer:fine)", () => {}); // run runtime via new Function()
it("reduce ⇒ runtime no-ops; coarse pointer ⇒ no spotlight", () => {});
```

## Definition of done

Vitest page-effects tests pass; regressions to present-only byte-identity,
the compact-panel relocation, the front/preview-path motion marker, the
render-time color sanitize, or the reduced-motion/pointer guards fail a test.
