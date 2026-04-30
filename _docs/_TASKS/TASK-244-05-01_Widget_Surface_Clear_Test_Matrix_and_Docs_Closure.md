# TASK-244-05-01: Widget Surface Clear Test Matrix and Docs Closure

# FileName: TASK-244-05-01_Widget_Surface_Clear_Test_Matrix_and_Docs_Closure.md

**Priority:** Medium
**Category:** Widgets + QA + Docs
**Estimated Effort:** Small
**Dependencies:** TASK-244-02-01, TASK-244-02-02, TASK-244-02-03, TASK-244-03-01, TASK-244-03-02, TASK-244-04-01, TASK-244-04-02
**Status:** Done (2026-04-30)

---

## Overview

Create and execute the final TASK-244 validation matrix. The implementer must
not close the task based only on broad lint/type success; every real surface
problem needs targeted proof.

## Sub-Tasks

- None. This is an execution leaf.

## Required Matrix

| Group | Runtime proof | Editor proof | Docs proof |
|---|---|---|---|
| Hero/shared controls | `tests/vitest/widgets/hero.test.tsx` and `tests/vitest/widgets/heroEditors.test.tsx` prove cleared gradient/background/overlay/button backgrounds omit output; `tests/vitest/widgets/section.test.tsx` proves Section background-color clear plus empty-gradient/zero-overlay no-regression | `tests/vitest/ui/hero-editor-wave.test.tsx` proves `Clear` removes nested `background`/`style` keys; `tests/vitest/ui/section-editor-wave.test.tsx` proves Section `Clear` removes `style.backgroundColor` without writing `"transparent"` or an empty string | `_docs/_WIDGETS/HERO.md`, `_docs/_WIDGETS/SECTION.md`, `_docs/WIDGETS.md` |
| Screen widgets | `tests/vitest/widgets/screenWidgets.test.tsx` proves cleared screen frame surfaces omit background classes/styles; `tests/vitest/admin/custom-screen-schemas.test.ts` proves configured and cleared screen widget style payloads survive `normalizeCustomScreenBlocks()` without schema bypasses | `tests/vitest/ui/screen-widgets-editor-wave.test.tsx` must be created or extended to import `ScreenEditors.tsx` and prove removed style keys; `tests/vitest/ui/custom-screen-binding-panel.test.tsx` is only required if binding panel behavior changes | `_docs/WIDGETS.md`, `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md` where two-column docs change |
| Operational widgets | `tests/vitest/widgets/bookingCalendar.test.tsx`, `tests/vitest/widgets/appointmentForm.test.tsx`, `tests/vitest/widgets/listingFilters.test.tsx`, `tests/vitest/widgets/searchBox.test.tsx`, `tests/vitest/widgets/productGallery.test.tsx`, `tests/vitest/widgets/productTable.test.tsx`, `tests/vitest/widgets/productCompare.test.tsx` prove cleared shells/tables/cards omit forced backgrounds | The seven operational editor-wave tests listed in TASK-244-03-02 prove `Clear` removes keys | `_docs/WIDGETS.md`; exact new `_docs/_WIDGETS/*.md` files only if introduced |
| Composite/content widgets | `tests/vitest/widgets/gridColumns.test.tsx`, marketing/content Vitest widget suites, and Bun-owned `tests/unit/widgets/contentList.test.tsx`, `tests/unit/widgets/postsFeedWidget.test.tsx`, `tests/unit/widgets/entryTeaser.test.tsx` prove cleared surfaces/overlays omit output | The sixteen editor-wave tests listed in TASK-244-04-01 prove `Clear` removes keys | Exact docs listed in TASK-244-04-01 |
| Form/shell/panel widgets | `tests/vitest/widgets/contact.test.tsx`, `tests/vitest/widgets/newsletter.test.tsx`, `tests/vitest/widgets/formEmbed.test.tsx`, `tests/vitest/widgets/navigation.test.tsx`, `tests/vitest/widgets/footer.test.tsx`, `tests/vitest/widgets/accordionWidget.test.tsx`, `tests/vitest/widgets/tabs.test.tsx`, `tests/vitest/widgets/toggleBlock.test.tsx` prove cleared backgrounds omit output | The eight editor-wave tests listed in TASK-244-04-02 prove `Clear` removes keys | `_docs/_WIDGETS/CONTACT.md`, `_docs/_WIDGETS/NEWSLETTER.md`, `_docs/_WIDGETS/FORM_EMBED.md`, `_docs/_WIDGETS/NAVIGATION.md`, `_docs/_WIDGETS/FOOTER.md`, `_docs/WIDGETS.md` |

Every group must also include a negative payload assertion: `Clear` must not
write `"transparent"` or an empty string solely as an off-state sentinel.
Because TASK-244 depends on TASK-242 and edits adjacent style/default/token
contracts, final closure must also rerun `tests/vitest/widgets/styleNoneTokens.test.tsx`
to prove existing `None` token behavior did not regress.

Section background color is clear-required through TASK-244-02-03. Closure must
count missing Section background `Clear` controls as an implementation gap.
Section gradient and overlay behavior remain no-regression proof unless a later
leaf separately promotes those fields.

## Closure Workflow Pseudocode

```ts
type Task244ValidationRow = {
  group: string;
  clearRequiredSurfaces: string[];
  runtimeProof: string[];
  editorProof: string[];
  schemaProof: string[];
  docsProof: string[];
  skippedReason?: string;
};

function closeTask244() {
  const inventory = readInventory("TASK-244-01-01");
  const rows = buildRowsFromImplementationLeaves(inventory);

  for (const row of rows) {
    assertEveryClearRequiredSurfaceIsFixedOrExcluded(row);
    assertRuntimeProofShowsOmittedStyleOutput(row.runtimeProof);
    assertEditorProofShowsKeyRemoval(row.editorProof);
    assertSchemaProofRejectsUnknownStyleKeys(row.schemaProof);
    assertNoTransparentOrEmptyStringSentinel(row);
    assertDocsUpdatedForChangedWidgets(row.docsProof);
  }

  recordCommandResults(EXACT_VALIDATION_COMMANDS);
  recordAnySkippedSuitesWithReason(rows);
  updateWidgetDocsWithClearVsNoneSemantics();
  updateChangelogAndBoardAfterAllProofIsGreen();
}
```

The closure note must include the final changelog number, exact command output
summary, any skipped-suite reason, remaining audited exclusions, and explicit
evidence that clear handlers remove keys instead of writing `"transparent"` or
empty-string off-state sentinels.

## Security Contract

- Visibility:
  - validation covers internal admin editor controls and public widget runtime
    output.
- Auth model:
  - no new endpoint is introduced;
  - test evidence must preserve existing authenticated admin save flow behavior.
  - existing admin writes remain session-authenticated; API-key scope is not
    applicable because closure does not introduce an internal API-key mode.
- RBAC:
  - unchanged existing page/template/custom-screen/widget-template permissions.
- CSRF:
  - unchanged existing admin save calls and CSRF handling; no test should bypass
    this by adding production-only fallbacks.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - every validation group must include strict schema coverage for configured
    values, cleared omission, and rejected unknown keys where payload contracts
    changed.
- Anti-abuse:
  - no public write surface is added;
  - nonce, signature/HMAC, and reCAPTCHA are not applicable because no public
    write endpoint is added.
  - validation must prove no clear handler writes `"transparent"` or empty strings
    as off-state sentinels and no renderer emits user-controlled class fragments.

## Exact Validation Commands

Run the exact commands below unless the implementation narrows the touched
surface and records why a listed suite is intentionally skipped.

`tests/vitest/ui/screen-widgets-editor-wave.test.tsx` is not existing proof in
the current checkout. TASK-244-03-01 must create that suite before closure runs
the screen widgets command below; do not count the missing file as a skipped
validation lane.

```sh
bun run test:vitest -- tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx
bun run test:vitest -- tests/vitest/widgets/section.test.tsx tests/vitest/ui/section-editor-wave.test.tsx
bun run test:vitest -- tests/vitest/widgets/screenWidgets.test.tsx tests/vitest/admin/custom-screen-schemas.test.ts tests/vitest/ui/screen-widgets-editor-wave.test.tsx
bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/widgets/listingFilters.test.tsx tests/vitest/widgets/searchBox.test.tsx tests/vitest/widgets/productGallery.test.tsx tests/vitest/widgets/productTable.test.tsx tests/vitest/widgets/productCompare.test.tsx
bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx tests/vitest/ui/appointment-form-editor-wave.test.tsx tests/vitest/ui/listing-filters-editor-wave.test.tsx tests/vitest/ui/search-box-editor-wave.test.tsx tests/vitest/ui/product-gallery-editor-wave.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx tests/vitest/ui/product-compare-editor-wave.test.tsx
bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/widgets/featureGrid.test.tsx tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/widgets/testimonials.test.tsx tests/vitest/widgets/team.test.tsx tests/vitest/widgets/statsKpi.test.tsx tests/vitest/widgets/ctaBanner.test.tsx tests/vitest/widgets/logoCloud.test.tsx tests/vitest/widgets/richTextSection.test.tsx tests/vitest/widgets/timeline.test.tsx tests/vitest/widgets/compareTimeline.test.tsx
bun test tests/unit/widgets/contentList.test.tsx tests/unit/widgets/postsFeedWidget.test.tsx tests/unit/widgets/entryTeaser.test.tsx
bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx tests/vitest/ui/feature-grid-editor-wave.test.tsx tests/vitest/ui/faq-accordion-editor-wave.test.tsx tests/vitest/ui/pricing-plans-editor-wave.test.tsx tests/vitest/ui/testimonials-editor-wave.test.tsx tests/vitest/ui/team-editor-wave.test.tsx tests/vitest/ui/stats-kpi-editor-wave.test.tsx tests/vitest/ui/content-list-editor-wave.test.tsx tests/vitest/ui/posts-feed-editor-wave.test.tsx tests/vitest/ui/entry-teaser-editor-wave.test.tsx tests/vitest/ui/cta-banner-editor-wave.test.tsx tests/vitest/ui/logo-cloud-editor-wave.test.tsx tests/vitest/ui/rich-text-section-editor-wave.test.tsx tests/vitest/ui/timeline-editor-wave.test.tsx tests/vitest/ui/compare-timeline-editor-wave.test.tsx
bun run test:vitest -- tests/vitest/widgets/contact.test.tsx tests/vitest/widgets/newsletter.test.tsx tests/vitest/widgets/formEmbed.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/widgets/tabs.test.tsx tests/vitest/widgets/toggleBlock.test.tsx
bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx tests/vitest/ui/newsletter-editor-wave.test.tsx tests/vitest/ui/form-embed-editor-wave.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/ui/accordion-editor-wave.test.tsx tests/vitest/ui/tabs-editor-wave.test.tsx tests/vitest/ui/toggle-block-editor-wave.test.tsx
bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx
bun --cwd core lint
bun --cwd core lint:types
bun run gates:coderso
git diff --check
bun run precommit
```

## Testing Requirements

- Run all targeted suites from implementation leaves.
- Grep/diff review after implementation:
  - no new `"transparent"` off-state writes in editor clear handlers;
  - no `backgroundColor: "transparent"` assertions used as proof of clear when
    the contract requires omitted output;
  - saved widget payload fixtures omit cleared fields.
- TASK-242 regression guard:
  - `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx`
    must pass after any TASK-244 style/default/normalizer change.
- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
- Final:
  - `bun run gates:coderso`
  - `bun run precommit` before manual commit
- DB-backed suites:
  - source `.env` first when required by the touched Bun-owned suites:
    `set -a && source .env && set +a`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- exact `_docs/_WIDGETS/*.md` files named by TASK-244 implementation leaves
- `_docs/_WIDGETS/README.md` if implementation adds any new per-widget doc files
- `_docs/_TASKS/TASK-244*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and matching changelog entry on completion

## Closure Notes

- Final changelog number: 781.
- Validation commands:
  - `bun run test:vitest -- tests/vitest/widgets/clearableStyle.test.ts tests/vitest/ui/clearable-fields.test.tsx tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/section.test.tsx tests/vitest/ui/section-editor-wave.test.tsx` - PASS, 7 files / 38 tests.
  - `bun run test:vitest -- tests/vitest/widgets/screenWidgets.test.tsx tests/vitest/admin/custom-screen-schemas.test.ts tests/vitest/ui/screen-widgets-editor-wave.test.tsx tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/widgets/listingFilters.test.tsx tests/vitest/widgets/searchBox.test.tsx tests/vitest/widgets/productGallery.test.tsx tests/vitest/widgets/productTable.test.tsx tests/vitest/widgets/productCompare.test.tsx` - PASS, 10 files / 51 tests.
  - `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/widgets/featureGrid.test.tsx tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/widgets/testimonials.test.tsx tests/vitest/widgets/team.test.tsx tests/vitest/widgets/statsKpi.test.tsx tests/vitest/widgets/ctaBanner.test.tsx tests/vitest/widgets/logoCloud.test.tsx tests/vitest/widgets/richTextSection.test.tsx tests/vitest/widgets/timeline.test.tsx tests/vitest/widgets/compareTimeline.test.tsx` - PASS, 13 files / 109 tests.
  - `set -a && source ../Nextless/.env && set +a && bun test tests/unit/widgets/contentList.test.tsx tests/unit/widgets/postsFeedWidget.test.tsx tests/unit/widgets/entryTeaser.test.tsx` - PASS, 33 tests.
  - `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx tests/vitest/widgets/newsletter.test.tsx tests/vitest/widgets/formEmbed.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/widgets/tabs.test.tsx tests/vitest/widgets/toggleBlock.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx` - PASS, 9 files / 79 tests.
  - `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx tests/vitest/ui/appointment-form-editor-wave.test.tsx tests/vitest/ui/listing-filters-editor-wave.test.tsx tests/vitest/ui/search-box-editor-wave.test.tsx tests/vitest/ui/product-gallery-editor-wave.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx tests/vitest/ui/product-compare-editor-wave.test.tsx` - PASS, 7 files / 25 tests.
  - `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx tests/vitest/ui/feature-grid-editor-wave.test.tsx tests/vitest/ui/faq-accordion-editor-wave.test.tsx tests/vitest/ui/pricing-plans-editor-wave.test.tsx tests/vitest/ui/testimonials-editor-wave.test.tsx tests/vitest/ui/team-editor-wave.test.tsx tests/vitest/ui/stats-kpi-editor-wave.test.tsx tests/vitest/ui/content-list-editor-wave.test.tsx tests/vitest/ui/posts-feed-editor-wave.test.tsx tests/vitest/ui/entry-teaser-editor-wave.test.tsx tests/vitest/ui/cta-banner-editor-wave.test.tsx tests/vitest/ui/logo-cloud-editor-wave.test.tsx tests/vitest/ui/rich-text-section-editor-wave.test.tsx tests/vitest/ui/timeline-editor-wave.test.tsx tests/vitest/ui/compare-timeline-editor-wave.test.tsx` - PASS, 16 files / 78 tests.
  - `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx tests/vitest/ui/newsletter-editor-wave.test.tsx tests/vitest/ui/form-embed-editor-wave.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/ui/accordion-editor-wave.test.tsx tests/vitest/ui/tabs-editor-wave.test.tsx tests/vitest/ui/toggle-block-editor-wave.test.tsx` - PASS, 8 files / 35 tests.
  - `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx` - PASS, 6 tests after the final root typecheck nullability fix.
  - `bun --cwd core lint` - PASS.
  - `bun --cwd core lint:types` - PASS.
  - `bun run gates:coderso` - PASS; DB-backed optional booking, kit-install, and store-revocation checks skipped because `DATABASE_URL` was not configured in the gate environment.
  - `git diff --check` - PASS.
  - `bun run precommit` - PASS.
- Known skipped suites:
  - No targeted TASK-244 suites were skipped.
  - `bun run gates:coderso` skipped only optional DB-backed checks when `DATABASE_URL` was absent from the gate environment.
  - The first Bun-owned content-widget run without env failed with `DATABASE_URL is not set`; the env-backed command above passed.
- Remaining exclusions:
  - `template-section`, `split-layout`, `spacer`, `divider`, and `stack` remain intentional/no-op exclusions from the inventory because they do not own the TASK-244 forced surface problem.
- No-transparent-sentinel evidence:
  - `rg -n 'onClear=\{[^\n]*(transparent|""|\{\})|clearStyle(Field)?\([^\n]*(transparent|"")|clear[^\n]*transparent' core/admin/ui/widgets/editors` returned no matches.
  - Runtime tests assert cleared styles omit inline output, and editor-wave tests assert clear actions remove keys instead of serializing `transparent` or empty strings.

## Acceptance Criteria

1. Matrix is complete and references real tests.
2. TASK-244 task files are marked Done only after implementation validates.
3. Board counts and changelog index are synchronized.
4. Any skipped tests or compatibility exceptions are explicit.
5. Closure notes include explicit no-transparent-sentinel evidence for every
   implemented clear path.
