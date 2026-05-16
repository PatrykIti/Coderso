# TASK-272: Hero Widget Playwright Product Followups

# FileName: TASK-272_Hero_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Hero + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256, TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-06-03, TASK-256-08
**Status:** To Do

---

## Overview

Create the Hero-only follow-up family for
`_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md`.

This family owns product, editor, and runtime improvements that apply only to
the `hero` widget. Shared widget-contract repairs stay in TASK-256, and
page-shell findings found during the Hero replay stay out of this widget family.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md`

Live owners inspected while drafting:

- `core/widgets/core/hero.tsx`
- `core/admin/ui/widgets/editors/HeroEditors.tsx`
- `tests/vitest/widgets/hero.test.tsx`
- `tests/vitest/widgets/heroEditors.test.tsx`
- `tests/vitest/ui/hero-editor-wave.test.tsx`
- `_docs/_WIDGETS/HERO.md`
- `_docs/_WIDGETS/tmp/hero/README.md`
- `_docs/_WIDGETS/tmp/hero/MATRIX.md`
- `_docs/WIDGETS.md`
- `_docs/_TASKS/TASK-256-06-03_Hero_Timeline_Pricing_FAQ_and_Testimonials_Accessibility.md`
- `_docs/_TASKS/TASK-244-02-01_Hero_Gradient_Background_and_Media_Overlay_Clear.md`

## TASK-256 And Page-Shell Exclusion Matrix

The following findings are intentionally excluded from TASK-272 because they are
shared widget-contract or page-editor shell work.

| Report finding | Evidence | Owner task | Reason |
|---|---|---|---|
| BUG-02 / UX-07 gradient active-vs-default state | `REPORT_HERO_WIDGET.md:131-135,197-199,271-283` | TASK-256-02, TASK-256-06-03 | Shared clear/default/overridden control semantics. TASK-272 may depend on the final control state but must not duplicate it. |
| UX-01 / UX-02 dual color inputs and overridden-state clarity | `REPORT_HERO_WIDGET.md:166-175,284` | TASK-256-02 | Shared color-field contract across widget editors. |
| BUG-06 / A3 required image alt baseline | `REPORT_HERO_WIDGET.md:152-155,258` | TASK-256-04, TASK-256-06-03 | Shared accessibility validation baseline. TASK-272 can add Hero-specific video metadata and UX, but the cross-widget required-alt rule stays in TASK-256. |
| A4 external CTA/badge `rel` safety | `REPORT_HERO_WIDGET.md:259` | TASK-256-06-03 | Shared safe-link renderer behavior. |
| BUG-03 page history auth failure | `REPORT_HERO_WIDGET.md:137-140,273,330` | TASK-256-08 page-shell follow-up | Page editor/history owner, not Hero widget. |
| BUG-05 / A1 toolbar icon accessible names | `REPORT_HERO_WIDGET.md:147-150,256,331` | TASK-256-08 page-shell follow-up | Page editor toolbar owner, not Hero widget. |
| UX-05 viewport switcher | `REPORT_HERO_WIDGET.md:189-191,281` | TASK-256-08 page-shell follow-up | Shared page-preview toolbar/canvas owner. |
| UX-06 discard changes action | `REPORT_HERO_WIDGET.md:193-195,282` | TASK-256-08 page-shell follow-up | Page editor dirty-state/history owner. |

TASK-256-06-03 uses broad "Hero media/gradient/alt/link drift" wording because
it covers shared baseline repairs across several marketing widgets. TASK-272
carves out video-poster and video title/description metadata as Hero product
expansion. TASK-256 keeps ownership of shared media safety, image-alt baseline,
safe-link behavior, clear/default state, and cross-widget accessibility.

## TASK-272 Scope Matrix

| Report finding | TASK-272 owner | Notes |
|---|---|---|
| BUG-01 centered variant still shows inline-media border controls | TASK-272-01 | Hero-specific Visual editor control visibility. |
| UX-08 CTA URL placeholder mismatch | TASK-272-01 | Hero-specific copy/placeholder polish. |
| BUG-04 / BUG-07 / BF-01 video poster and video metadata | TASK-272-02 | Extend Hero media schema/editor/runtime without taking over shared image-alt policy or TASK-256 shared media safety. |
| UX-03 preset delete has no confirmation | TASK-272-03 | Hero preset manager destructive action. |
| BF-09 / BF-10 preset export/import/search/organization | TASK-272-03 | Hero preset manager usability. |
| UX-04 padding explanation, BF-03 full-height/full-bleed, BF-13 media-center variant | TASK-272-04 | Hero layout product expansion. |
| BF-02 shadows, BF-06 font family/weight, BF-12 motion controls | TASK-272-05 | Hero visual styling expansion with bounded enums only. |
| BF-05 palette presets and BF-08 / A2 Hero contrast guidance | TASK-272-06 | Hero-owned palette/contrast UX after shared color-field state lands. |
| BF-04 rich text for headline/body and BF-14 social proof row | TASK-272-07 | Hero composition/content expansion using safe rich-text patterns. |
| BF-07 responsive images, A5 image loading policy, BF-11/A6 LCP fetch priority | TASK-272-08 | Hero-specific media performance policy. |
| Report fixed/deferred notes, widget docs, changelog, board closure | TASK-272-09 | Final evidence and synchronization. |

## Sub-Tasks

- [ ] TASK-272-01: Hero Centered Media Control and CTA Placeholder Polish
- [ ] TASK-272-02: Hero Video Poster and Media Metadata
- [ ] TASK-272-03: Hero Preset Delete Confirmation and Library Management
- [ ] TASK-272-04: Hero Layout Height Full Bleed and Media Center Variant
- [ ] TASK-272-05: Hero Shadow, Typography, Font, and Motion Controls
- [ ] TASK-272-06: Hero Color Palettes and Contrast Guidance
- [ ] TASK-272-07: Hero Rich Copy and Social Proof Composition
- [ ] TASK-272-08: Hero Responsive Images and LCP Priority
- [ ] TASK-272-09: Hero Report, Docs, Changelog, and Closure

## Implementation Order

1. Finish or rebase over TASK-256 shared color, alt, safe-link, and page-shell
   classification first. TASK-272 leaves must not patch those shared contracts.
2. Complete TASK-272-01 first because centered/split media visibility affects
   later media and style leaves.
3. Complete TASK-272-02 before responsive media work so the media schema handles
   image and video metadata in one compatible shape.
4. Complete TASK-272-03 independently from renderer work; it is editor/settings
   state only.
5. Complete TASK-272-04 before visual styling/motion because layout variants and
   height/full-bleed options affect preview expectations.
6. Complete TASK-272-05 and TASK-272-06 after layout is stable; both touch Hero
   style schema/editor/runtime and should have one merge owner if parallelized.
7. Complete TASK-272-07 after rich text safety is decided against the existing
   post/rich-text sanitizer patterns.
8. Complete TASK-272-08 after final media schema fields are settled.
9. Complete TASK-272-09 last after code, tests, report evidence, docs,
   changelog, and board status are synchronized.

## Git Scope Safeguards

- Work in a dedicated branch/worktree for implementation.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-272*` files, Hero owner files, Hero tests, Hero docs/report
  files, and required changelog/board files.
- Because `_docs/_TASKS/README.md` is a shared board touched by parallel agents,
  re-read it immediately before staging and verify the cached diff contains only
  the TASK-272 rows/counts owned by the current commit.
- Use `git diff --cached --name-only` and `git diff --cached --check` before
  every commit.

## Security Contract

This planning family does not add API routes.

- Endpoint visibility: none.
- Auth model: unchanged authenticated admin page/template editing and public
  runtime rendering.
- RBAC: unchanged page/template/widget write permissions.
- CSRF: unchanged existing admin write route protection.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: every new Hero schema field must keep
  `additionalProperties: false`, normalize legacy payloads, and add validator
  coverage when schema/defaults change.
- Anti-abuse: no raw script/class-name inputs, no browser-stored secrets, and no
  public write endpoint. Rich text, external links, media URLs, imports, and
  presets must stay bounded by existing safe-href, media, sanitizer, and user
  settings contracts.

## Testing Requirements

Docs-only task creation:

- `git diff --check`
- `bun run precommit` before the manual commit, unless the configured hook runs
  it automatically and the committer records that proof.

Implementation leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/heroEditors.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when Hero
  renderer output markers, slots, or shared widget rendering assumptions change.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  Hero token, spacing, radius, clear, or `none` semantics change.
- `bun test tests/unit/widgets/validator.test.ts` when Hero schema/defaults
  change.
- `bun test tests/unit/widgets/registry.test.ts` if variant registration or
  widget registry wiring changes.
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md` with textual fixed/deferred
  evidence for each implemented leaf. Do not commit PNG files.
- Update `_docs/_WIDGETS/HERO.md` when schema, editor modes, runtime variants,
  media behavior, presets, or performance behavior changes.
- Update `_docs/WIDGETS.md` only if a global widget contract changes. Prefer
  TASK-256 for shared contract text.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if Hero pack readiness or
  completeness changes.
- Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md` when the family is completed.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.

## Acceptance Criteria

- Every Hero report finding is either owned by TASK-256, classified as
  page-shell scope, covered by a TASK-272 physical leaf, or explicitly deferred
  by TASK-272-09 with a reason.
- TASK-272 task docs do not duplicate TASK-256 shared-contract implementation
  scope.
- Each implementation leaf names concrete files, data flow, error handling,
  regression tests, documentation updates, and validation commands.
- Runtime changes preserve backward compatibility for existing `hero` payloads
  and presets unless the leaf documents and tests a migration/normalizer path.
- Final closure records report evidence, task status updates, changelog, and the
  exact validation output.
