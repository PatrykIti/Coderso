# TASK-423: Page Runtime Responsive Delivery
# FileName: TASK-423_Page_Runtime_Responsive_Delivery.md

**Priority:** High
**Category:** Pages / Public Runtime / Rendering
**Estimated Effort:** Large
**Dependencies:** None (TASK-425-02 responsive-panel toggles will consume this work)
**Status:** ⏳ To Do

---

## Overview

Deliver the responsive breakpoint cascade to real public visitors. The editor
model works (desktop = base, tablet/mobile store only overrides, mobile
inherits desktop, per-field reset restores inheritance — all verified live),
but the server flattens rendering to ONE breakpoint, so the cascade is
editor/preview-only. Source audit:
`_docs/AUDIT/_cross-responsive-2026-06-10.md` §3 step 6 (verdict BROKEN/high)
and `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §3.2 (HIGH) / §7 item 3.

Audit findings this family fixes:

- `core/server/publicSite.tsx:802` →
  `breakpoint: (options?.previewDevice ?? "desktop") as PageBreakpoint`. A
  real public visit has no `previewDevice`, so the document always resolves to
  desktop before render.
- `core/services/pages/pageRendererV2.tsx:143` emits a single inline value
  (`maxWidth: template.variant === "full-width" ? "none" :
  \`${section.layout.maxWidth}px\``) and `resolvePageRenderTree(document,
  breakpoint)` (pageRendererV2.tsx ~971, delegating to
  `resolvePageDocumentForBreakpoint`) flattens the whole document to that one
  breakpoint. Zero `@media` rules are generated from `responsive[bp]` deltas.
- Live proof: with tablet `maxWidth=640` and mobile `maxWidth=360` overrides
  published, the front at a 390px viewport still computes
  `max-width: 1080px` — the overrides never apply.

Target behavior:

- The public runtime emits **desktop-resolved markup PLUS deterministic
  scoped `@media` CSS** generated from the stored `responsive[bp]` deltas
  (section `layout`/`style`/`spacing`/`visibility`, block
  `style`/`visibility`), scoped per existing `data-section-id` /
  `data-block-id` attributes (pageRendererV2.tsx ~255 and ~294).
- `previewDevice` keeps working exactly as today for admin preview/editor
  parity: an explicit device still flattens to that breakpoint so the preview
  shows the chosen device truthfully.
- Breakpoint widths come from a single owned constant/token source shared
  with the editor canvas widths (`PageEditor.tsx` 238–240: 1080/744/390).
- One cached HTML now serves all viewports (media queries are
  device-agnostic), so site cache semantics stay simple.

Known model limitation to record explicitly: block `responsive[bp].props`
overrides (content deltas) cannot be expressed as CSS; the contract child
(TASK-423-01) decides and documents the policy for them.

---

## Security Contract

- **Endpoint visibility:** no new endpoints; existing public read-only GET
  page routes and the existing preview-token route only.
- **Auth model:** unchanged (public pages are anonymous; preview keeps its
  token gate).
- **RBAC:** unchanged.
- **CSRF:** not applicable (GET-only surface).
- **Rate-limit bucket:** unchanged public-site bucket.
- **Validation:** emitted CSS is built exclusively from values that already
  passed `normalizePageDocumentV2` clamping (numbers, enum tokens, schema
  color strings). Section/block ids are not format-guaranteed
  (`normalizeId` accepts any non-empty string, pageDocumentV2.ts ~934), so
  every id interpolated into a selector MUST be CSS-escaped. No raw user
  strings may reach the emitted stylesheet.
- **Anti-abuse controls:** not applicable beyond the validation rule above.

---

## Sub-Tasks

- [ ] TASK-423-01: Responsive CSS emission contract.
- [ ] TASK-423-02: Public runtime integration and preview compat.
- [ ] TASK-423-03: Validation viewport smoke and closure.

---

## Implementation Pseudocode

```ts
// core/services/pages/pageResponsiveCss.ts (new, Bun-free — Vitest lane)
export const pageBreakpointMediaMaxWidths = {
  tablet: /* decided in TASK-423-01, single owned source */ 1023,
  mobile: 639,
} as const;

export function buildResponsiveCss(document: PageDocumentV2): string {
  const rules: string[] = [];
  for (const bp of ["tablet", "mobile"] as const) {
    const declsBySelector = collectBreakpointDeltas(document, bp);
    if (declsBySelector.size === 0) continue;
    rules.push(
      `@media (max-width: ${pageBreakpointMediaMaxWidths[bp]}px){` +
        renderSortedSelectors(declsBySelector) + // stable ordering, escaped ids
      `}`
    );
  }
  return rules.join("\n");
}
```

```tsx
// core/server/publicSite.tsx renderPublicPageHtmlInternal (~764–824)
const flattenDevice = options?.previewDevice; // explicit preview only
const preparedRuntime = await preparePageRuntimeDocument(document, {
  breakpoint: (flattenDevice ?? "desktop") as PageBreakpoint, // base markup
  /* … */
});
const responsiveCss = flattenDevice
  ? "" // preview: flatten to the chosen device, no media queries
  : buildResponsiveCss(pageTemplateInput.document);
// renderPublicPageV2RuntimeHtml (core/site/renderPublicPage.tsx:298) injects
// responsiveCss as a dedicated <style data-page-responsive> via renderDocument.
```

Expected data flow:

- Save/publish: unchanged — `responsive[bp]` deltas are already stored and
  normalized by `pageDocumentV2.ts`.
- Public GET: document → desktop-resolved render tree (markup as today) +
  `buildResponsiveCss(document)` over the **unflattened** document → single
  HTML payload with scoped `@media` rules → browser applies overrides at
  real viewports.
- Admin preview / editor canvas: explicit `previewDevice` keeps the current
  flatten-to-one-breakpoint behavior, so canvas==preview==front parity holds
  per device.

Error handling:

- Sections/blocks without overrides emit nothing (no empty `@media` shells).
- Unknown/unmappable override keys are skipped, never guessed (fail closed).
- An id that cannot be safely escaped causes that scope to be skipped, not a
  broken stylesheet.

Regression-test shape:

- Vitest (Bun-free): `buildResponsiveCss` determinism, mapping coverage,
  escaping, empty-input behavior (TASK-423-01/-03).
- Bun runtime: published page HTML contains the scoped `@media` rules;
  `previewDevice` responses stay flattened; cache serves one entry for all
  viewports (TASK-423-02/-03).
- Live `playwright-cli` replay of the audit method: tablet 640 / mobile 360
  overrides → publish → 390px viewport computes `max-width: 360px`
  (TASK-423-03).

---

## Testing Requirements

- New Vitest suite for the CSS builder (Bun-free lane, per
  `_docs/TESTING_STRATEGY.md`: Vitest owns pure domain logic).
- New/extended Bun runtime suite under `tests/integration/runtime/` (Bun owns
  `Bun.serve`/public route behavior).
- `bun run test:bun` (runtime lanes) and `bun run test:vitest`.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Real browser smoke through `coderso-dev-core-host` and `playwright-cli`.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`: responsive delivery contract (base markup + scoped
  `@media` emission, props-override limitation).
- `_docs/ARCHITECTURE.md` if the public render pipeline description changes.
- `_docs/_TASKS/README.md` board sync, `_docs/_CHANGELOG/` entry on
  completion.
