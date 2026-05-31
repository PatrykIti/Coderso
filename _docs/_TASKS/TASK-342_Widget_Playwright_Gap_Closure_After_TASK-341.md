# TASK-342: Widget Playwright Gap Closure After TASK-341

# FileName: TASK-342_Widget_Playwright_Gap_Closure_After_TASK-341.md

**Priority:** High
**Category:** Widgets + Admin UI + Commerce + Playwright + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-339, TASK-341
**Status:** Done (2026-05-28)
**Owners:** Codex implementation/tests/docs; Claude headless consult when root cause stays ambiguous after a local fix; agent refinement before implementation batches

---

## Overview

Close the seven current-state outliers from the 2026-05-27 Playwright report
wave without reopening the full 38-widget program.

The report set in `_docs/PLAYWRIGHT/27-05-2026/` does **not** show a broad
functional regression across the widget surface. It shows two smaller, distinct
drift classes:

1. **Admin metadata-gap** in four widgets where live Visual controls are
   missing strict `data-widget-control-path` ownership metadata even though the
   authoring UI still loads and the public route still renders correctly.
2. **Public fixture-gap** in three commerce widgets where the runtime returns a
   stable empty state on the published fixture page, so the populated-card /
   populated-row runtime cannot be re-proven from the current local fixture
   data.

This family must keep those failure modes separate. A single flat wave would
create a false closure signal because metadata ownership fixes and commerce
fixture determinism have different definitions of done, different likely owner
files, and different rerun evidence.

## Current Evidence

- `_docs/PLAYWRIGHT/27-05-2026/README.md` records the clean rerun:
  - `Passed: 31`
  - `Metadata gap: 4`
  - `Fixture gap: 3`
  - `Failed: 0`
- Metadata-gap widgets:
  - `pricing-plans`
  - `faq-accordion`
  - `cta-banner`
  - `contact`
- Fixture-gap widgets:
  - `product-gallery`
  - `product-compare`
  - `product-table`
- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-full-rerun-2026-05-26-final5.md`
  previously recorded `fixtureGaps=0` and `metadataGaps=0`, so this family
  must first reconcile whether the new outliers are:
  - a real repo regression,
  - a harness classification drift,
  - or a local fixture/data drift.
- Drafting evidence from current owners:
  - `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` contains local
    `WidgetControlRow`/`ColorField` usage in Visual sections that currently
    render without strict persisted-path ownership metadata for the flagged
    controls.
  - `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` already tags most
    color controls, but the flagged radius/border-width rows still need
    explicit path ownership.
  - `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` and
    `core/admin/ui/widgets/editors/ContactEditors.tsx` still rely on local
    color-row wrappers rather than the shared path-aware color-control seam.
  - `tests/vitest/widgets/productGallery.test.tsx`,
    `tests/vitest/widgets/productCompare.test.tsx`, and
    `tests/vitest/widgets/productTable.test.tsx` already prove non-empty runtime
    rendering paths in code, which strongly suggests that the current commerce
    smoke issue is fixture/bootstrap determinism rather than a basic renderer
    crash.

## Reconciled Status Notes

- 2026-05-28:
  - Metadata-gap branch classification is no longer ambiguous. The four admin
    outliers were real current-tree editor metadata regressions and have
    targeted smoke proof with `metadataGaps=0` after the local wrapper/path
    fixes.
  - Commerce branch classification is now narrowed to fixture-data drift first:
    the local environment currently has zero commerce products, while the public
    smoke routes remain published and therefore truthfully render empty states.
  - The next implementation step is deterministic commerce fixture/bootstrap
    recovery, not more admin metadata work.

## Widget Matrix

| Wave | Widgets | Target task(s) | Primary done signal |
|---|---|---|---|
| Reconciliation | `pricing-plans`, `faq-accordion`, `cta-banner`, `contact`, `product-gallery`, `product-compare`, `product-table` | `TASK-342-01` | Exact classification matrix plus owner/test plan |
| Metadata-gap | `pricing-plans`, `faq-accordion`, `cta-banner`, `contact` | `TASK-342-02-*` | `metadataGaps=0` for these widgets in clean targeted reruns |
| Fixture-gap | `product-gallery`, `product-compare`, `product-table` | `TASK-342-03-*` | Populated public runtime replay or explicit deterministic fixture/bootstrap closure |
| Closure | all 7 | `TASK-342-04` | Updated reports, board, changelog, and a final rerun with supersession notes |

## Live Owner Matrix

| Area | Primary files (LOC at draft time) | Main tests already in repo |
|---|---|---|
| Shared metadata/harness seam | `core/admin/ui/widgets/editors/SharedColorControl.tsx` (118), `ClearableFields.tsx` (352), `WidgetEditorControls.tsx` (205), `scripts/playwright-widget-contract-smoke.ts` (1326), `tests/unit/playwright-widget-contract-smoke.test.ts` (452), `_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json` (408) | `tests/unit/playwright-widget-contract-smoke.test.ts` |
| Pricing Plans | `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` (1867), `core/widgets/core/pricingPlans.tsx` (1756) | `tests/vitest/ui/pricing-plans-editor-wave.test.tsx`, `tests/vitest/widgets/pricingPlans.test.tsx` |
| FAQ Accordion | `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` (1581), `core/widgets/core/faqAccordion.tsx` (1247) | `tests/vitest/ui/faq-accordion-editor-wave.test.tsx`, `tests/vitest/widgets/faqAccordion.test.tsx` |
| CTA Banner | `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` (1507), `core/widgets/core/ctaBanner.tsx` (1029) | `tests/vitest/ui/cta-banner-editor-wave.test.tsx`, `tests/vitest/widgets/ctaBanner.test.tsx` |
| Contact | `core/admin/ui/widgets/editors/ContactEditors.tsx` (2226), `core/widgets/core/contact.tsx` (1805) | `tests/vitest/ui/contact-editor-wave.test.tsx`, `tests/vitest/widgets/contact.test.tsx` |
| Product Gallery | `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` (1074), `core/widgets/core/productGallery.tsx` (1062) | `tests/vitest/ui/product-gallery-editor-wave.test.tsx`, `tests/vitest/ui/product-gallery-admin-preview.test.tsx`, `tests/vitest/widgets/productGallery.test.tsx` |
| Product Compare | `core/admin/ui/widgets/editors/ProductCompareEditors.tsx` (1088), `core/widgets/core/productCompare.tsx` (1234) | `tests/vitest/ui/product-compare-editor-wave.test.tsx`, `tests/vitest/ui/product-compare-admin-preview.test.tsx`, `tests/vitest/widgets/productCompare.test.tsx` |
| Product Table | `core/admin/ui/widgets/editors/ProductTableEditors.tsx` (1255), `core/widgets/core/productTable.tsx` (2725) | `tests/vitest/ui/product-table-editor-wave.test.tsx`, `tests/vitest/widgets/productTable.test.tsx` |

## Out Of Scope

- The remaining 31 widgets that already passed the clean 2026-05-27 rerun.
- Reopening the old TASK-336 full-surface contract wave.
- Broad new widget UX expansion unrelated to the seven current outliers.
- Shared commerce feature work outside the deterministic fixture/bootstrap
  contract needed to re-prove the three public widget pages.

## Sub-Tasks

- [ ] TASK-342-01: Evidence Reconciliation for the 27-05-2026 Report Wave
- [ ] TASK-342-02: Metadata-Gap Admin Contract Wave
- [ ] TASK-342-02-01: Pricing Plans Visual Control Path Ownership
- [ ] TASK-342-02-02: FAQ Accordion Visual Control Path Ownership
- [ ] TASK-342-02-03: CTA Banner Visual Control Path Ownership
- [ ] TASK-342-02-04: Contact Visual Control Path Ownership
- [ ] TASK-342-03: Commerce Populated Fixture Wave
- [ ] TASK-342-03-01: Product Gallery Populated Fixture and Runtime Replay
- [ ] TASK-342-03-02: Product Compare Populated Fixture and Runtime Replay
- [ ] TASK-342-03-03: Product Table Populated Fixture and Runtime Replay
- [ ] TASK-342-04: Report Docs Changelog and Closure

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | Fix persisted-path ownership metadata for the flagged Visual controls or migrate them to a shared path-aware color/control seam. |
| `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | Add strict persisted-path ownership for the flagged Visual rows and keep existing color metadata truthful. |
| `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` | Fix the flagged Visual controls so they emit strict persisted-path ownership metadata without weakening the current swatch-first UX. |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Fix the flagged Visual controls so they emit strict persisted-path ownership metadata without regressing current theme-default / transparent affordances. |
| `core/admin/ui/widgets/editors/SharedColorControl.tsx` | Touch only if the safest metadata repair is to centralize local swatch-summary wrappers into the shared control seam. |
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | Touch only if metadata repair needs a shared clear/swatch helper extension rather than widget-local duplication. |
| `core/admin/ui/widgets/editors/WidgetEditorControls.tsx` | Touch only if the strict control-row contract itself needs a shared path/ownership extension. |
| `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` | Touch only if populated fixture replay exposes editor/runtime-preview drift specific to Product Gallery. |
| `core/admin/ui/widgets/editors/ProductCompareEditors.tsx` | Touch only if populated fixture replay exposes editor/runtime-preview drift specific to Product Compare. |
| `core/admin/ui/widgets/editors/ProductTableEditors.tsx` | Touch only if populated fixture replay exposes editor/runtime-preview drift specific to Product Table. |
| `core/widgets/core/productGallery.tsx` | Touch only if populated fixture replay exposes widget-local runtime empty-state/query drift. |
| `core/widgets/core/productCompare.tsx` | Touch only if populated fixture replay exposes widget-local runtime empty-state/query drift. |
| `core/widgets/core/productTable.tsx` | Touch only if populated fixture replay exposes widget-local runtime empty-state/query drift. |
| `scripts/playwright-widget-contract-smoke.ts` | Reconcile current classification and, if needed, add deterministic fixture/bootstrap or stricter evidence handling for the commerce trio. |
| `_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json` | Update widget inventory only if the fixture/bootstrap owner or expectation policy changes. |
| `tests/unit/playwright-widget-contract-smoke.test.ts` | Cover any harness/inventory classifier or fixture-bootstrap contract changes. |
| `tests/vitest/ui/*editor-wave*.test.tsx` | Add or update widget-local control-path assertions for the metadata-gap leaves. |
| `tests/vitest/widgets/*.test.tsx` | Keep widget-local runtime and editor contract behavior green when data paths, empty-state handling, or runtime summaries change. |
| `_docs/PLAYWRIGHT/27-05-2026/*.md` | Refresh the current-state reports when a leaf closes or is explicitly superseded. |
| `_docs/_TASKS/README.md` | Keep task board counts and tables synchronized. |
| `_docs/_CHANGELOG/*` | Add closure entries when leaves move to Done. |

## Implementation Order

1. Land `TASK-342-01` first and do not start the commerce widget fixes until
   the 2026-05-26 vs 2026-05-27 evidence conflict is classified.
2. Land the metadata-gap wave next because it is small, editor-local, and
   should quickly remove false negatives from the smoke harness.
3. Land the commerce fixture wave only after the reconciliation step proves
   whether the fix belongs to shared fixture/bootstrap owners or the individual
   widget runtime owners.
4. Land `TASK-342-04` last with a fresh rerun, report supersession notes, task
   board sync, and changelog closure.

Commit batching expectation:

- Batch 1: task/reconciliation docs and owner matrix
- Batch 2: metadata-gap wave in small commits
- Batch 3: commerce fixture/bootstrap wave in small commits
- Batch 4: closure docs and final rerun evidence

## Claude And Agent Review Contract

- Before implementation starts, run at least two review passes over the task
  docs with fresh agents and a fresh `claude` headless prompt.
- Close every spawned agent after each review pass before starting the next one.
- During implementation, consult `claude` again only when the local fix still
  leaves behavior ambiguous or when CSS/DOM ordering suspicion remains after a
  direct code read and targeted replay.
- Claude or agent review does not replace local code reading, targeted tests,
  or Playwright proof.

## Security Contract

No product API routes are added by the umbrella itself.

- Endpoint visibility: none by default.
- Auth/RBAC/CSRF/rate-limit: unchanged unless a leaf explicitly proves that a
  fixture/bootstrap owner needs a new internal admin helper route. Any such
  route must be documented in that leaf's own Security Contract.
- Reject-unknown validation: unchanged widget schemas remain strict.
- Anti-abuse: no new public write surface may be introduced as part of fixture
  bootstrap or replay work.
- Secret handling: Playwright evidence, bootstrap helpers, and reports must not
  commit credentials, session cookies, or privileged payloads.

## Testing Requirements

Parent planning/closure baseline:

- `git diff --check`

Family execution baseline:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest or Bun suites named by the executing leaf
- Clean targeted `playwright-cli` replay for the touched widget(s)
- A final clean `bun scripts/playwright-widget-contract-smoke.ts --session <new-session> --admin http://localhost:5173/admin --front http://localhost:3000` rerun before closure

## Documentation Updates Required

- Keep this umbrella updated with the accepted reconciliation result and any
  leaf promotion/de-scope decisions.
- Update `_docs/PLAYWRIGHT/27-05-2026/README.md` and the affected per-widget
  reports when the current-state truth changes.
- Add final closure notes to `TASK-341` or create a dated supersession note if
  the new wave replaces `TASK-341` as the current report-of-record.
- Keep `_docs/_TASKS/README.md` synchronized on every status move.
- Add changelog entries and update `_docs/_CHANGELOG/README.md` when leaves or
  closure move to Done.

## Acceptance Criteria

- The family closes all seven current outliers without reopening the full
  38-widget wave.
- Metadata-gap widgets finish with strict persisted-path ownership metadata in
  the affected Visual controls and no user-facing authoring regression.
- Commerce fixture-gap widgets finish with either:
  - deterministic populated runtime proof on the public fixture pages, or
  - an explicit, documented fixture/bootstrap closure that explains why the
    issue was data/harness drift rather than widget runtime failure.
- Closure documentation makes it explicit whether the 2026-05-26 or
  2026-05-27 evidence is now superseded.

## Completion Notes (2026-05-28)

- The metadata-gap wave was closed in code for `pricing-plans`,
  `faq-accordion`, `cta-banner`, and `contact`.
- The commerce wave was closed by deterministic fixture bootstrap for
  `product-gallery`, `product-compare`, and `product-table`.
- Final full rerun evidence:
  - `_docs/PLAYWRIGHT/widget-contract-smoke-task-342-final-2026-05-28.md`
  - `_docs/PLAYWRIGHT/widget-contract-smoke-task-342-final-2026-05-28.json`
- Final summary:
  - `adminFailures: 0`
  - `publicFailures: 0`
  - `fixtureGaps: 0`
  - `metadataGaps: 0`
- External note: local `claude` CLI remained unavailable in this environment
  (`Not logged in`), so widget-by-widget verification was executed with the
  repo-owned Playwright harness and direct public replay instead.
