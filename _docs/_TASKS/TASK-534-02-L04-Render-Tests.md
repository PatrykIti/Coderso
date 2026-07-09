# TASK-534-02-L04: Render Tests (switcher / gallery-filter / scrollHint / noise / emit-gate)

# FileName: TASK-534-02-L04-Render-Tests.md

**Parent Task:** TASK-534
**Parent Subtask:** TASK-534-02
**Priority:** High
**Category:** Tests
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Authors the `renderToString` render coverage for 534-02
(switcher tablist/panels, gallery filter bar + `data-category`, scrollHint glyph,
page/section noise overlays, and the `anyMotion` `<script>` emit gate). Owns its
test file; imports the renderer read-only. Behavioral IIFE-exec (click/scroll/
pointer) is 534-05-L01.

## Test lane (rationale)

**Vitest `tests/vitest/pages/`** — the page renderer suite (`renderToString`, no
DB) is Vitest, matching the `case "icon"`/gallery/`PageDocumentRender` precedents.
NOT the Bun `tests/unit/pages/*` lane.

## Grounded anchors

Mirror the existing render suites: `tests/vitest/pages/*` page-renderer + gallery +
`PageDocumentRender` emit tests (521/522 precedent). Render via the same
`renderToString(<PageDocumentRender document={…} />)` / `renderPageBlockContent`
harness those suites use.

## Implementation pseudocode

```ts
// tests/vitest/pages/task-534-interactivity-render.test.tsx
it("switcher renders role=tablist + N tabs (first selected/tabindex0) + N panels (first visible, rest hidden) + data-switcher");
it("switcher malicious label renders as escaped text (no markup)");
it("filterable gallery renders [data-gallery] + [data-gallery-filter] chips (All+cats) + data-category on items");
it("gallery WITHOUT filterable is byte-identical to today (no bar/wrapper/data-filter-item)");
it("gallery bad category dropped at render (no data-category breakout)");
it("scrollHint renders [data-scroll-hint] aria-hidden + glyph + bob keyframe CSS");
it("page effects.noiseOverlay renders [data-noise-overlay] + noise CSS");
it("section style.noiseOverlay renders section overlay");
it("switcher/magnetic/filterable-gallery emits the SINGLE effects <script> (deduped id) via widened anyMotion");
it("scrollHint/noise-ONLY page emits NO <script>");
it("page with none of the 534 surfaces = byte-identical HTML (pre-534)");
```

## Security note

The render tests are the defence-in-depth boundary check: they assert the escaped
TEXT rendering of labels (no `<img onerror>` execution), the dropped/bounded
`data-category` token (no attribute breakout), and that no stored string reaches a
`style`/`dangerouslySetInnerHTML` sink through the new cases.

## Regression / owned-breaking-test notes

- Do NOT mutate the existing un-filtered gallery / no-effect `PageDocumentRender`
  assertions — the present-only invariant means they must stay green byte-for-byte;
  ADD new cases. After merge run the named files (full vitest glob has timeout
  flakes) + root `tsc -p tsconfig.json --noEmit`.

## Hard Invariants

1. Vitest render lane; behavioral exec is 534-05-L01.
2. Byte-identity assertions for the no-534 / un-filtered paths.
3. Emit-gate assertions prove ONE `<script>`, widened only by runtime-bearing
   surfaces.
