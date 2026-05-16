# TASK-274: Logo Cloud Widget Playwright Product Followups

# FileName: TASK-274_Logo_Cloud_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Logo Cloud + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256, TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-06-02, TASK-256-08
**Status:** To Do

---

## Overview

Create the Logo Cloud-specific follow-up family for
`_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`.

This family owns only product and UX improvements that are local to
`logo-cloud`. Shared widget-contract repairs stay in TASK-256. Do not use
TASK-274 to duplicate shared fixes for safe href rendering, baseline ARIA and
heading semantics, hoverColor truthfulness, `logoHeight: "none"` safety,
Advanced-mode duplication, or generic URL validation feedback.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`

Live owners inspected while drafting:

- `core/widgets/core/logoCloud.tsx`
- `core/admin/ui/widgets/editors/LogoCloudEditors.tsx`
- `core/widgets/core/widgetSafeHref.ts`
- `core/admin/ui/media/MediaPicker.tsx`
- `core/admin/ui/shared/ConfirmActionDialog.tsx`
- `tests/vitest/widgets/logoCloud.test.tsx`
- `tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `tests/vitest/widgets/renderer.test.tsx`
- `tests/vitest/widgets/styleNoneTokens.test.tsx`
- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/_WIDGETS/tmp/logo-cloud/MATRIX.md`
- `_docs/WIDGETS.md`

Current live code facts:

- `LogoCloudData.header` currently owns only `title` and `description`.
- `LogoCloudData.logos[]` currently owns `id`, `name`, `image`, and `href`.
- `LogoCloudData.style` currently owns `logoHeight`, `grayscale`,
  `hoverColor`, `gap`, `alignment`, `tileBackground`, and
  `tileBorderColor`.
- Visual mode currently renders repeated logo cards with name/image/href text
  inputs plus Move up, Move down, Remove, and Add logo actions.
- Wizard currently renders variant, section title, count, and logo names only.
- Advanced currently duplicates `logoHeight`, `gap`, and `alignment` controls;
  TASK-256-01 owns that shared mode-ownership repair.

## TASK-256 Exclusion Matrix

The following report findings are intentionally excluded from TASK-274 because
TASK-256 already owns them as shared widget-contract drift.

| Report finding | Evidence | Owner task | Reason |
|---|---|---|---|
| BUG-01 base safe link rendering, `rel`, unsafe href rejection | `REPORT_LOGO_CLOUD_WIDGET.md:119-125,260-263,296` | TASK-256-06-02 | Shared marketing-widget safe href contract and `widgetSafeHref` ownership. |
| BUG-02 hardcoded heading semantics and BF-09 `headingLevel` baseline | `REPORT_LOGO_CLOUD_WIDGET.md:127-133,242-244,261,297` | TASK-256-04, TASK-256-06-02 | Shared runtime accessibility and heading hierarchy repair. |
| BUG-03 section `aria-label` / `aria-labelledby` | `REPORT_LOGO_CLOUD_WIDGET.md:135-140,260,298` | TASK-256-04, TASK-256-06-02 | Shared runtime landmark accessibility baseline. |
| BUG-04 / UX-01 `hoverColor` active without grayscale | `REPORT_LOGO_CLOUD_WIDGET.md:142-160,265,304` | TASK-256-06-02 | Shared truthful-control and output-class repair. |
| BUG-05 `logoHeight: "none"` unbounded image height | `REPORT_LOGO_CLOUD_WIDGET.md:147-150` | TASK-256-06-02 | Shared size-token safety and clear/none semantics adjacency. |
| UX-05 separate logo `alt` baseline | `REPORT_LOGO_CLOUD_WIDGET.md:180-183,264` | TASK-256-06-02 | Shared media accessibility model. TASK-274 can consume the resulting field but must not define a second alt contract. |
| UX-07 Advanced duplicates Visual controls | `REPORT_LOGO_CLOUD_WIDGET.md:190-193` | TASK-256-01 | Shared editor-mode ownership and Advanced scope. |
| BF-10 raw URL validation and safe feedback | `REPORT_LOGO_CLOUD_WIDGET.md:246-248,324` | TASK-256-06-02 | Shared media/link validation feedback; TASK-274 may add product affordances that use the shared validator. |

TASK-274 may depend on TASK-256 results, but it must not restage those repairs
inside its own implementation leaves.

## TASK-274 Scope Matrix

| Report finding | TASK-274 owner | Notes |
|---|---|---|
| UX-03 Wizard missing image field | TASK-274-02 | Logo Cloud starter-logo authoring. Link field is handled by TASK-274-05 after shared safe href. |
| UX-04 missing image thumbnail preview | TASK-274-02 | Editor-only Logo Cloud asset confidence. |
| UX-06 missing Media Library picker | TASK-274-02 | Use existing `MediaPicker` and media cache contract. |
| UX-02 remove without confirm/undo | TASK-274-03 | Repeated Logo Cloud item lifecycle UX. |
| UX-08 drag-and-drop reorder | TASK-274-03 | Logo Cloud repeated-item order flow, with Move buttons retained as keyboard fallback. |
| BF-01 missing eyebrow | TASK-274-01 | Product-level trust-section copy field, after TASK-256 heading semantics. |
| BF-02 missing section background | TASK-274-01 | Widget-local section surface control, not shared clear contract. |
| BF-07 missing header typography controls | TASK-274-01 | Bounded heading alignment/size controls; heading level remains TASK-256. |
| BF-03 dense overflow | TASK-274-04 | Logo Cloud layout product behavior at max count. |
| BF-04 strip nowrap/scroll option | TASK-274-04 | Logo Cloud strip layout product behavior. |
| BF-05 strip marquee / auto-scroll | TASK-274-04 | Optional bounded mode with reduced-motion fallback. |
| UX-09 open links in new tab option | TASK-274-05 | User-facing product toggle that must call TASK-256 safe link attrs. |
| BF-08 tile radius and border width | TASK-274-05 | Logo Cloud tile styling beyond existing background/border color. |
| BF-11 CTA below logo section | TASK-274-05 | Logo Cloud-specific trust-section CTA, through shared safe href. |
| Report fixed/deferred notes, widget docs, changelog, board closure | TASK-274-06 | Final documentation and evidence pass. |

## Sub-Tasks

- [ ] TASK-274-01: Logo Cloud Header Background and Typography
- [ ] TASK-274-02: Logo Cloud Logo Asset Authoring and Previews
- [ ] TASK-274-03: Logo Cloud Item Management and Reorder
- [ ] TASK-274-04: Logo Cloud Dense Strip and Marquee Layouts
- [ ] TASK-274-05: Logo Cloud Tile Link and CTA Controls
- [ ] TASK-274-06: Logo Cloud Report Docs and Closure

## Implementation Order

1. Finish or rebase over TASK-256 shared fixes first. TASK-274 leaves must build
   on the shared safe-href, ARIA, heading, hoverColor, alt, and Advanced-mode
   contracts instead of duplicating them.
2. Complete TASK-274-01 first because header/background/typography define the
   section shell used by later media and layout work.
3. Complete TASK-274-02 before item management so thumbnail/media-picker tests
   cover the final repeated logo card shape.
4. Complete TASK-274-03 before the dense/strip layout work so order/remove
   interactions are stable before high-count layout checks.
5. Complete TASK-274-04 before TASK-274-05 because row/marquee behavior affects
   tile sizing and CTA placement.
6. Complete TASK-274-05 after TASK-256 safe link attributes exist.
7. Complete TASK-274-06 last after code, tests, report evidence, widget docs,
   changelog, and board state are synchronized.

## Git Scope Safeguards

- Work in a dedicated branch/worktree for implementation.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-274*` files, Logo Cloud owner files, Logo Cloud tests, Logo
  Cloud docs/report files, and required changelog/board files.
- Because `_docs/_TASKS/README.md` is a shared board touched by parallel agents,
  re-read it immediately before staging and verify the cached diff contains only
  the TASK-274 rows/counts owned by the current commit.
- Use `git diff --cached --name-only` and `git diff --cached --check` before
  every commit.

## Security Contract

This planning family does not add API routes.

- Endpoint visibility: none.
- Auth model: unchanged authenticated admin page/template/widget-template
  editing and public runtime rendering.
- RBAC: unchanged page/template/widget-template write permissions.
- CSRF: unchanged existing admin write route protection.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: any new Logo Cloud schema fields must keep
  `additionalProperties: false`, normalize legacy payloads, and add validator
  tests when schema/defaults change.
- Anti-abuse: link fields must use TASK-256 shared safe href/link-attribute
  helpers, media fields must use existing media-library/storage ownership when
  available, marquee must respect reduced-motion, and no raw HTML/script,
  unbounded class-name, provider key, private media URL, or browser-stored
  secret field may be introduced.

## Testing Requirements

Docs-only task creation:

- `git diff --check`
- `bun run precommit` before the manual commit, unless the configured hook runs
  it automatically and the committer records that proof.

Implementation leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when renderer
  markers, section rendering, CTA rendering, or variant output changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  spacing/radius/clear/none adjacency changes.
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` when
  link target/CTA behavior consumes or extends shared href helpers.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer
  fields change.
- `bun test tests/unit/widgets/registry.test.ts` if variant registration or widget
  registry wiring changes.
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md` with textual
  fixed/deferred evidence for each implemented leaf. Do not commit PNG files.
- Update `_docs/_WIDGETS/LOGO_CLOUD.md` when schema, editor modes, runtime
  variants, or behavior changes.
- Update `_docs/WIDGETS.md` only if a global widget contract changes. Prefer
  TASK-256 for shared contract text.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if Logo Cloud pack readiness or
  completeness changes.
- Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md` when the family is completed.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.

## Acceptance Criteria

- Every Logo Cloud report finding is either owned by TASK-256, covered by a
  TASK-274 physical leaf, marked already OK/not applicable, or explicitly
  deferred by TASK-274-06 with a reason.
- TASK-274 task docs do not duplicate TASK-256 shared-contract implementation
  scope.
- Each implementation leaf names concrete files, data flow, error handling,
  regression tests, documentation updates, and validation commands.
- Runtime changes preserve backward compatibility for existing `logo-cloud`
  payloads unless the leaf documents and tests a migration/normalizer path.
- Final closure records report evidence, task status updates, changelog, and the
  exact validation output.
