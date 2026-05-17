# TASK-256-02: Clear, None Token, and Design Token Controls

# FileName: TASK-256-02_Clear_None_Token_and_Design_Token_Controls.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256
**Status:** To Do

---

## Overview

Normalize `Clear`, `none`, `0`, custom token, and color-picker behavior across
widget editors.

The reports show repeated drift from the documented contract:

- `Clear` should remove the configured field from the payload.
- `none` should be a literal token only for approved off-capable visual fields.
- numeric zero tokens should remain backward compatible but should not create
  duplicate confusing editor choices next to `None`.
- color picker swatches must not overwrite CSS variable tokens just because the
  picker can only represent hex values.

## Drift Evidence

- `_docs/WIDGETS.md:185-227` defines `none` and `Clear` semantics.
- `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md:71-72,96,142-143` reports a
  dead `Custom px` path and duplicate `None`/`0` spacing.
- `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md:150-171,193-211,264-274` reports
  duplicate height zero tokens, no-op custom selection, and variant-unaware
  Advanced controls.
- `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md:121-125,190` reports
  duplicate `None` and `Gap 0`.
- `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md:63,117-138,300-310` reports missing
  Visual control for `inactiveTextColor`.
- `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md:113,163` and
  `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md:126-127,183-185,310-311`
  report missing clear controls for border/divider-like fields and
  CSS-variable color-picker fallback drift.
- `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md:81,269-280` reports a
  missing `textColor` clear control and its closure priority.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:179-183` reports missing
  `highlightRing` clear.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:275-276` reports missing
  `borderColor` clear.
- `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md:162-164` reports missing clear
  controls for CTA banner text/button color fields. TASK-256-02 owns only the
  shared Clear semantics; broader CTA product rows remain TASK-263-owned.
- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:43-52,149,165-166`
  reports helper-text clear drift and missing clear controls for `borderColor`
  and `accentColor`.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:76-79,140-141,272-275,322,359,378` reports
  overlay alpha loss through the hex-only picker.
- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md:94-100,112-116` reports
  duplicated Advanced token controls and hover/height token truthfulness.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:82-89,100-116,192-204`
  reports duplicated Advanced tokens and CSS-variable color picker drift.

## Sub-Tasks

- [ ] Extend shared clearable field helpers to expose configured vs fallback
  state clearly.
- [ ] Add missing `onClear` support to every style field called out in reports.
- [ ] Add a toggle-block helper-text visibility/clear decision so an editor can
  intentionally hide helper copy without the normalizer restoring defaults.
- [ ] Prevent color inputs from overwriting CSS variable values when only the
  swatch changes accidentally.
- [ ] Rework token dropdowns so `None`, `0`, and `Custom px` are not ambiguous.
- [ ] Add runtime tests proving omitted fields produce omitted inline styles.

## Files to Change

| File | Lines | Required change |
|---|---:|---|
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | 4-61 | Add shared field state helpers for `configured`, `fallback`, and `empty`; keep `Clear` disabled only when there is no configured value. |
| `core/widgets/core/clearableStyle.ts` | shared helper | Own the runtime clearable-style contract used by `tests/vitest/widgets/clearableStyle.test.ts`; normalize omitted style fields through `resolveClearableStyleValue` and `compactStyle` here before per-widget renderers adopt the helper. |
| `core/admin/ui/widgets/editors/DividerEditors.tsx` | 61-69,179-217 | Preserve CSS var text input values, re-label/remove no-op `Custom px`, and avoid duplicated zero-token UX. |
| `core/admin/ui/widgets/editors/SpacerEditors.tsx` | 46-52,157-197 | Apply the same token/custom behavior for height fields. |
| `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` | gap token options | Re-label or collapse duplicate `None`/`Gap 0` controls while preserving runtime compatibility. |
| `core/admin/ui/widgets/editors/TabsEditors.tsx` | 370-430 | Add `inactiveTextColor` Visual control with clear behavior if the field is clearable. |
| `core/admin/ui/widgets/editors/AccordionEditors.tsx` | 415-430 | Add clear controls for border/summary style fields called out by the report. |
| `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | color/style controls | Add clear controls for `border` and `divider`. |
| `core/admin/ui/widgets/editors/ContentListEditors.tsx` | style controls | Add clear control for `textColor` and hide token controls with no runtime effect. |
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | 965-971 | Add `onClear` for `highlightRing`. |
| `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` | 668-683 | Add `onClear` for `borderColor` if the normalizer/render contract supports omission. |
| `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` | 413-486 | Use only as shared Clear evidence if TASK-256-02 introduces a reusable clearable-field hook consumed across widgets; route CTA-specific field adoption, action labels, badge behavior, and focus styling to TASK-263-03. |
| `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx` | 102-114, 209-219, 262-302 | Add clear/visibility handling for helper text and use existing clear helpers for `borderColor` and `accentColor`. |
| `core/widgets/core/toggleBlock.tsx` | 91-104, 298-345 | Preserve an intentional hidden helper state separately from missing legacy data; keep omitted style fields falling back through defaults. |
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | 92-98, 178, 720-832 | Preserve `rgba(...)`/CSS variable overlay values and make duplicated Advanced style controls explicitly technical or read-only. |
| `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` | 510-594, 616-694 | Gate hoverColor when grayscale is inactive, keep logo-height `none` truthful, and make duplicated Advanced token controls explicit. |
| `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` | 570-713 | Preserve CSS variable color values and make duplicated Advanced spacing/alignment/color tokens explicit. |
| `core/widgets/core/divider.tsx` | style render | Keep omitted spacing/color values falling back through defaults without serializing fake clear sentinels. |
| `core/widgets/core/spacer.tsx` | style render | Keep omitted height/custom values falling back through defaults while preserving `0` token compatibility. |
| `core/widgets/core/splitLayout.tsx` | style render | Keep omitted gap values and explicit zero/off tokens distinguishable in runtime output. |
| `core/widgets/core/tabs.tsx` | style render | Normalize omitted inactive/active style fields through shared clearable style helpers where needed. |
| `core/widgets/core/accordion.tsx` | style render | Normalize omitted border/summary style fields through shared clearable style helpers where needed. |
| `core/widgets/core/faqAccordion.tsx` | style render | Normalize omitted border/divider style fields through shared clearable style helpers where needed. |
| `core/widgets/core/contentList.tsx` | style render | Keep omitted `textColor` falling back through defaults and avoid inline styles for cleared values. |
| `core/widgets/core/pricingPlans.tsx` | style render | Keep omitted `highlightRing` falling back through defaults and avoid inline styles for cleared values. |
| `core/widgets/core/featureGrid.tsx` | style render | Keep omitted `borderColor` falling back through defaults and avoid inline styles for cleared values. |
| `core/widgets/core/ctaBanner.tsx` | shared Clear compatibility | Keep as compatibility proof for generic Clear fallback behavior; CTA-specific action, badge, focus, and layout product rows stay in TASK-263. |
| `core/widgets/core/toggleBlock.tsx` | 91-104, 298-345 | Preserve an intentional hidden helper state separately from missing legacy data; keep omitted style fields falling back through defaults. |
| `core/widgets/core/galleryMosaic.tsx` | overlay/style render | Preserve alpha/CSS variable overlay values and avoid hex-only clear sentinels. |
| `core/widgets/core/logoCloud.tsx` | hover/style render | Keep hover and height token output truthful when editor controls are gated. |
| `core/widgets/core/statsKpi.tsx` | style render | Preserve omitted/CSS variable style values and avoid duplicated inline style fallbacks. |

## Implementation Pseudocode

```tsx
type ClearableFieldState = {
  displayValue: string;
  configured: boolean;
  fallbackValue?: string;
};

function resolveClearableFieldState(value: string | undefined, fallback: string): ClearableFieldState {
  return {
    displayValue: value ?? fallback,
    configured: typeof value === "string" && value.trim().length > 0,
    fallbackValue: fallback,
  };
}

function clearStyleField<TData, TKey extends string>(
  value: TData,
  key: TKey,
  updateStyle: (nextStyle: Record<string, unknown>) => void
) {
  const nextStyle = { ...(value as Record<string, unknown>) };
  delete nextStyle[key];
  updateStyle(nextStyle);
}

function handleColorTextChange(next: string) {
  updateStyleField(next.trim().length > 0 ? next : undefined);
}

function handleColorSwatchChange(nextHex: string) {
  updateStyleField(nextHex);
}
```

Token selector shape:

```tsx
const visibleSpacingOptions = spacingTokens
  .filter((token) => token !== "0" || !spacingTokens.includes("none"))
  .map(toEditorOption);

function handleTokenChange(next: string) {
  if (next === "__custom__") {
    focusCustomInput();
    return;
  }
  onChange(next);
}
```

Error handling:

- Unknown token values remain visible as custom text so legacy payloads are not
  destroyed.
- `Clear` deletes the owner key and lets the renderer fall back through
  normalizer/defaults.
- Empty strings are not saved as clear sentinels.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and before closure.
- For non-trivial or parallel leaf work, prefer a dedicated branch or worktree.
- Stage only the owner files listed in this task plus required docs/reports/changelog files.
- Verify `git diff --name-only --cached` before every commit so unrelated report or code edits stay out of scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged admin UI.
- Reject-unknown validation: schema-owned style fields must still reject
  unknown properties.
- Anti-abuse: no public write paths.
- Secret handling: no style values may contain secrets; do not add debug payload
  logging for field values.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/clearable-fields.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/clearableStyle.test.ts`
- `bun run test:vitest -- tests/vitest/ui/divider-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/spacer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/split-layout-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/tabs-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/accordion-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx` only
  if the generic Clear helper is adopted in the CTA editor; CTA-only editor
  regressions stay with TASK-263.
- `bun run test:vitest -- tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/divider.test.tsx tests/vitest/widgets/spacer.test.tsx tests/vitest/widgets/splitLayout.test.tsx tests/vitest/widgets/tabs.test.tsx tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/widgets/featureGrid.test.tsx tests/vitest/widgets/toggleBlock.test.tsx tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/widgets/logoCloud.test.tsx tests/vitest/widgets/statsKpi.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/ctaBanner.test.tsx` as
  compatibility coverage when TASK-256-02 changes shared Clear fallback
  behavior consumed by CTA Banner; CTA-only runtime regressions stay with
  TASK-263.
- `bun test tests/unit/widgets/validator.test.ts` if schemas/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/WIDGETS.md` only if helper behavior changes the shared
  contract wording.
- Update touched widget docs under `_docs/_WIDGETS/*.md` where visible editor
  behavior changes.
- Update Playwright reports with fixed evidence.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Every clearable field called out by the reports has consistent `Clear`
  behavior or a documented reason why it is not clearable.
- `Clear` removes the payload key; it does not serialize empty strings,
  `transparent`, or test-only sentinels.
- `None`, numeric zero, and custom token controls no longer create dead-end UI.
- Color swatches do not silently destroy CSS variable text values.
- Runtime tests prove omitted clearable fields do not force inline styles.
