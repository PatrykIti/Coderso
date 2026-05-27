# TASK-339: Widget Hero Parity and Contract Truthfulness Program

# FileName: TASK-339_Widget_Hero_Parity_and_Contract_Truthfulness_Program.md

**Priority:** High
**Category:** Widgets + Page Builder + Admin UI + UX Contract + Playwright
**Estimated Effort:** Very Large
**Dependencies:** TASK-317, TASK-336-11, TASK-336-19, TASK-338
**Status:** In Progress (2026-05-27)
**Owners:** Codex implementation/tests/docs; Claude headless Playwright review after each widget leaf

---

## Overview

Realign the page-builder widget program around the `hero` baseline.

The current repo is close, but the audit shows three different drift classes:

- shared shell drift: `BlockSettings` still renders the shared live preview row
  below daily `Visual` / `Advanced` tabs,
- shared color drift: `hero` is swatch-first, while some widgets still expose
  raw daily color value inputs,
- contract truthfulness drift: multiple widgets render a richer sectioned UI
  than the declared `editorContract`, or still keep coarse `Visual` /
  `Advanced` surfaces compared with the `hero` standard.

This family must first fix the shared shell seam, then execute widget leaves one
by one, with targeted tests plus a Claude Playwright-only UX review after each
widget slice. Claude is explicitly not allowed to read repo code for the
post-fix UI review stage; it must judge only what it sees in the admin UI and
frontend via Playwright.

## Current Evidence

- `core/admin/ui/pages/builder/BlockSettings.tsx` still renders
  `WidgetEditorLivePreview` in unfinished Wizard mode and again after the daily
  `Visual` / `Advanced` tabs when `editorContext.surface === "page-builder"`.
- `core/admin/ui/widgets/editors/SharedColorControl.tsx` still defaults to the
  older text-plus-swatch contract. `NavigationEditors.tsx` and
  `ContactEditors.tsx` currently consume it without `showValueInput={false}`,
  leaving raw daily value inputs visible.
- `bun --eval 'import { listRegisteredPageWidgets } from "./admin/ui/widgets/registry"; ...'`
  confirms the `hero` baseline is `Visual=10`, `Advanced=6`.
- `bun core/.tmp/widget_audit_all.tsx` confirms the real rendered UI is richer
  than the contract for several widgets; examples:
  - `testimonials`: rendered `Visual=7`, `Advanced=3`, contract `Visual=2`,
    `Advanced=1`,
  - `pricing-plans`: rendered `Visual=6`, `Advanced=3`, contract `Visual=2`,
    `Advanced=1`,
  - `gallery-mosaic`: rendered `Visual=7`, `Advanced=4`, contract `Visual=2`,
    `Advanced=1`,
  - `entry-teaser`: rendered `Visual=8`, contract `Visual=2`,
  - `timeline`: rendered `Visual=6`, `Advanced=3`, contract `Visual=2`,
    `Advanced=1`.
- `bun core/.tmp/widget_contract_diff.ts` records `22` widgets with at least one
  contract-vs-render mismatch. Some are minor wording/order drift, but the
  widgets promoted to dedicated leaves below all have user-visible or
  automation-visible truthfulness drift that should not be left to a final
  cleanup pass.

## Audit Matrix

### Dedicated Execution Leaves

| Widget / Surface | Audit result | Planned leaf |
|---|---|---|
| shared `BlockSettings` shell | Daily `Visual` / `Advanced` still show the shared live preview row; keep preview seam, remove it from daily tabs only | `TASK-339-01` |
| `navigation` | Real UI is still coarse (`Visual=2`, `Advanced=1`) and daily color authoring still exposes raw value inputs | `TASK-339-02` |
| `contact` | Section IA is acceptable, but daily color authoring still exposes raw value inputs | `TASK-339-03` |
| `cta-banner` | Real UI is still coarse (`Visual=2`, `Advanced=1`) compared with the `hero` baseline | `TASK-339-04` |
| `testimonials` | Real UI is richer than the contract; section ids/titles/roles must become truthful and stable | `TASK-339-05` |
| `pricing-plans` | Real UI is richer than the contract; section ids/titles/roles must become truthful and stable | `TASK-339-06` |
| `faq-accordion` | Real UI is richer than the contract; section ids/titles/roles must become truthful and stable | `TASK-339-07` |
| `gallery-mosaic` | Real UI is richer than the contract; section ids/titles/roles must become truthful and stable | `TASK-339-08` |
| `team` | Real UI is richer than the contract; section ids/titles/roles must become truthful and stable | `TASK-339-09` |
| `rich-text-section` | Real UI is richer than the contract; section ids/titles/roles must become truthful and stable | `TASK-339-10` |
| `entry-teaser` | Real UI is richer than the contract; section ids/titles/roles must become truthful and stable | `TASK-339-11` |
| `product-gallery` | Wizard/Visual/Advanced all drift from the declared contract; truthfulness must match the current richer UI | `TASK-339-12` |
| `product-compare` | Wizard/Visual/Advanced all drift from the declared contract; truthfulness must match the current richer UI | `TASK-339-13` |
| `timeline` | Wizard metadata is missing, and the rendered `Visual` / `Advanced` IA is much richer than the declared contract | `TASK-339-14` |

### Residual Minor Truthfulness Sweep

| Widget | Intake result | Planned leaf |
|---|---|---|
| `section`, `split-layout`, `toggle-block`, `spacer`, `divider`, `stack` | Mostly title/order/summary wording drift against the rendered UI | `TASK-339-15` |
| `content-list`, `posts-feed`, `listing-filters` | Mostly contract order/title/runtime-summary truthfulness drift | `TASK-339-15` |
| `compare-timeline`, `booking-calendar`, `appointment-form` | Mostly Wizard/Visual title wording drift and missing summary parity | `TASK-339-15` |

### Audit Pass At Intake

| Widgets | Intake result |
|---|---|
| `hero` | Baseline reference widget for section IA and swatch-first color authoring |
| `template-section`, `grid-columns`, `tabs`, `accordion`, `feature-grid`, `logo-cloud`, `stats-kpi`, `product-table`, `search-box`, `newsletter`, `form-embed`, `footer` | No dedicated intake leaf required; re-audit after each neighboring slice in case shared shell or shared color work exposes fresh drift |

## Sub-Tasks

- [ ] TASK-339-01: Shared Block Settings Daily Live Preview Surface
- [ ] TASK-339-02: Navigation Hero Parity and Contract Truthfulness
- [ ] TASK-339-03: Contact Hero Color Parity
- [ ] TASK-339-04: CTA Banner Hero Section Parity
- [ ] TASK-339-05: Testimonials Contract Truthfulness
- [ ] TASK-339-06: Pricing Plans Contract Truthfulness
- [ ] TASK-339-07: FAQ Accordion Contract Truthfulness
- [ ] TASK-339-08: Gallery Mosaic Contract Truthfulness
- [ ] TASK-339-09: Team Contract Truthfulness
- [ ] TASK-339-10: Rich Text Section Contract Truthfulness
- [ ] TASK-339-11: Entry Teaser Contract Truthfulness
- [ ] TASK-339-12: Product Gallery Contract Truthfulness
- [ ] TASK-339-13: Product Compare Contract Truthfulness
- [ ] TASK-339-14: Timeline Contract Truthfulness
- [ ] TASK-339-15: Residual Minor Contract Truthfulness Sweep
- [ ] TASK-339-16: Report Docs Changelog and Closure

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/builder/BlockSettings.tsx` | Keep the shared live preview seam in code, but remove it from daily `Visual` / `Advanced` rendering while preserving unfinished Wizard support. |
| `core/admin/ui/widgets/editors/SharedColorControl.tsx` | Align the shared color surface with the `hero` swatch-first authoring model while preserving saved custom-token compatibility. |
| `core/admin/ui/widgets/editors/*Editors.tsx` | Align section ids/titles/roles, color controls, and hero-parity daily IA widget by widget. |
| `core/widgets/core/*.tsx` | Keep `editorContract` truthful to the real UI: stable ids, real section counts, correct roles, and no stale runtime-summary claims. |
| `tests/vitest/pageBuilder/*` | Cover the shared shell live-preview removal and keep Wizard behavior intact. |
| `tests/vitest/ui/*editor*.test.tsx` | Cover section metadata, daily IA, and color-control parity for the affected widgets. |
| `tests/vitest/widgets/*.test.tsx` | Keep widget-local editor and runtime behavior green for the touched widgets. |
| `_docs/_WIDGETS/*` | Refresh per-widget docs where the shipped mode responsibilities or section IA change. |
| `_docs/_TASKS/README.md` | Keep the board and statistics synchronized. |
| `_docs/_CHANGELOG/*` | Add closure entries when leaves move to Done. |

## Implementation Order

1. Land `TASK-339-01` first so the shared shell no longer contradicts the new
   daily-tab contract.
2. Land `TASK-339-02` and `TASK-339-03` next to close the remaining raw daily
   color-value inputs.
3. Land `TASK-339-04` through `TASK-339-14` widget by widget, in the listed
   order, with tests and Claude Playwright review after each widget slice.
4. Land `TASK-339-15` only after the larger widgets stop moving, so the minor
   contract truthfulness pass does not churn repeatedly.
5. Land `TASK-339-16` last with docs, board, changelog, final audit evidence,
   and residual risk notes.

## Implementation Pseudocode

```ts
// Shared shell: keep preview infra, remove daily-tab rendering.
const showLivePreviewInWizard =
  resolvedEditorContext?.surface === "page-builder" && !editorState.wizardCompleted;

if (!editorState.wizardCompleted) {
  return (
    <>
      <WizardPanel ... />
      {showLivePreviewInWizard ? <WidgetEditorLivePreview ... /> : null}
    </>
  );
}

// Contract truthfulness: do not collapse the current richer UI back into a
// stale two-section contract. Promote the rendered section metadata instead.
const renderedSections = [
  { id: "testimonials.visual.variant-layout", title: "Variant and layout structure", role: "visual" },
  { id: "testimonials.visual.header-copy", title: "Header copy", role: "content" },
  // ...
];

export const testimonialsEditorContract = {
  version: 2,
  sections: [
    // wizard sections
    // visual sections copied from the real UI
    // advanced diagnostic sections copied from the real UI
  ],
};
```

Data flow:

- `core/widgets/core/*` remains the owner of contract metadata.
- Editor components must render section ids/titles/roles that match that owner.
- Shared color controls must follow the `hero` daily-authoring contract:
  swatch-first, clearable, and compatible with saved custom/token values
  without visible raw CSS/token typing.
- Claude review happens after Codex lands code and tests, and it may only use
  Playwright-observed UI, not repo code, to compare the fixed widget against
  `hero`.

Error handling:

- Do not downgrade rich rendered section IA back to stale coarse contracts.
- Do not reintroduce raw daily color textboxes to make old tests pass.
- If Claude's Playwright review finds a genuine UX regression, reopen the leaf
  before moving on; if it only requests style preference that contradicts repo
  contracts, record the rejection in the leaf notes instead of widening scope.

## Claude Playwright Review Contract

For every widget leaf from `TASK-339-02` through `TASK-339-14`:

- Claude logs into the admin UI through Playwright tooling only.
- Claude creates or opens a test page, inserts the fixed widget, inspects
  Wizard / Visual / Advanced, and compares the daily UX against `hero`.
- Claude validates the frontend result for the fixed widget.
- Claude must not read repo code, task files, or source diffs for this review.
- Accepted/rejected findings are recorded in the owning task before the leaf
  moves to Done.

## Security Contract

No API routes are added by the parent task.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: existing widget schemas remain strict.
- Anti-abuse: no new public write surfaces are introduced.
- Secret handling: Claude Playwright evidence must not capture privileged
  tokens, secrets, or redacted runtime values.

## Testing Requirements

Parent docs-only validation:

- `git diff --check`

Family implementation baseline per executed leaf:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- The targeted Vitest suites named in the leaf.
- The widget-local Claude headless Playwright review required by this parent.

User-requested validation boundary:

- broader security/perf scans remain deferred until the full widget family is
  finished; the user explicitly asked to run them later, after the widget wave.

## Documentation Updates Required

- Update this umbrella with accepted audit findings and any leaf promotion.
- Keep `_docs/_TASKS/README.md` synchronized on every status move.
- Update `_docs/_WIDGETS/*` when a widget's shipped section IA or mode contract
  changes.
- Add changelog entries and update `_docs/_CHANGELOG/README.md` when leaves or
  closure tasks move to Done.

## Acceptance Criteria

- Daily `Visual` / `Advanced` tabs no longer show the shared live preview row.
- No page-builder widget still exposes raw daily color value inputs where the
  `hero` baseline is already swatch-first.
- Every touched widget has truthful `editorContract` sections that match the
  rendered UI ids, titles, and roles.
- Each executed widget leaf is backed by targeted tests, `bun --cwd core lint`,
  `bun --cwd core lint:types`, and a Claude Playwright-only UX review.
