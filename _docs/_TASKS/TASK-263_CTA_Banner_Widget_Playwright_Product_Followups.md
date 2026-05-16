# TASK-263: CTA Banner Widget Playwright Product Followups

# FileName: TASK-263_CTA_Banner_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Content + Admin UI + Runtime Render + Accessibility + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252-06-05, TASK-256-07
**Status:** To Do

---

## Overview

Create the CTA Banner-only follow-up family for
`_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md`.

TASK-256 owns shared widget-contract repairs from the Playwright report wave.
TASK-263 deliberately keeps only the CTA Banner product/runtime/editor scope:

- `core/widgets/core/ctaBanner.tsx`
- `core/admin/ui/widgets/editors/CtaBannerEditors.tsx`
- `tests/vitest/widgets/ctaBanner.test.tsx`
- `tests/vitest/ui/cta-banner-editor-wave.test.tsx`
- `tests/vitest/widgets/renderer.test.tsx` when shared renderer assertions need
  updated CTA output coverage
- `tests/unit/widgets/validator.test.ts` when the CTA schema changes
- CTA Banner source docs and report evidence

This family must not hide generic widget-contract fixes inside a CTA patch. If a
leaf needs a shared editor update helper, generic Clear/none behavior, a shared
safe-link helper, or a global accessibility/runtime ID primitive, route that work
through TASK-256 or a new shared task first and then return to the CTA-only leaf.

## Scope Boundary Against TASK-256

In scope for TASK-263:

- CTA Banner renderer truthfulness: empty badge suppression, description color,
  border class consistency, explicit resolver defaults, section labelling,
  action accessible names, and CTA-local focus-visible styling.
- CTA Banner Wizard and Actions UX: primary URL in Wizard, secondary CTA
  controls, variant cards in Wizard, explicit action field labels, invalid URL
  feedback, and a clear secondary CTA enablement toggle.
- CTA Banner style and button controls: Visual exposure for CTA-owned button
  border fields, CTA-local button radius/size options, and CTA-specific Clear
  wiring after shared Clear semantics exist.
- CTA Banner conversion options: target/new-tab policy, safe rel generation,
  button icon enums, optional tertiary text CTA, and description visibility.
- CTA Banner layout/media/motion options: full-width mode, gradient background,
  background media, and bounded entrance effects when they stay inside CTA data.
- Final CTA report/docs/changelog/board closure.

Out of scope for TASK-263:

- Shared editor atomic update helpers and mode-switch data races, owned by
  TASK-256-01.
- Generic Clear versus `none` semantics, token-picker state, and CSS-variable
  preservation helpers, owned by TASK-256-02. TASK-263 may only wire CTA fields
  into the shared helper after the helper exists.
- Generic slot/nested-content placeholder rules, owned by TASK-256-03.
- Generic runtime instance ID, scoped script binding, and global accessibility
  helper contracts, owned by TASK-256-04. CTA may use the final shared helper,
  but must not invent a competing one.
- Logo Cloud and Gallery Mosaic scope from TASK-256-06-02.
- Any arbitrary user-authored HTML, SVG, script, event handler, class-name, or
  raw rel/target string field in CTA widget JSON.

## Source Report Coverage

| Report finding | Route |
|---|---|
| BUG-01, BUG-02, BUG-03, BUG-04, A1, A2, A3, A4, A5 | TASK-263-01, using TASK-256-04 only for any shared helper that already exists |
| UX-03, UX-04, UX-05, UX-06, UX-07, UX-08 | TASK-263-02 |
| UX-01, UX-02, BF-01, BF-07 | TASK-263-03, with shared Clear semantics delegated to TASK-256-02 |
| BF-02, BF-03, BF-08, BF-09 | TASK-263-04 |
| BF-04, BF-05, BF-06, BF-10 | TASK-263-05 |
| Final fixed/deferred evidence, report refresh, docs/changelog/board closure | TASK-263-06 |
| Shared helper behavior, cross-widget Clear/link/a11y contracts, Logo Cloud/Gallery Mosaic rows | TASK-256, not TASK-263 |

## Current Owner and Test Matrix

| Leaf | Current drift evidence | Owner files | Required test lanes |
|---|---|---|---|
| TASK-263-01 | Report lines 66-71, 123-131, 139-158, 230-236, 244-248 | `ctaBanner.tsx`, CTA docs | `tests/vitest/widgets/ctaBanner.test.tsx`, `tests/vitest/widgets/renderer.test.tsx` if shared renderer assertions change |
| TASK-263-02 | Report lines 62-64, 89-91, 108-113, 170-192, 254-258, 292-294 | `CtaBannerEditors.tsx`, `ctaBanner.tsx` for schema fields needed by editor UX | `tests/vitest/ui/cta-banner-editor-wave.test.tsx`, `tests/vitest/widgets/ctaBanner.test.tsx`, validator tests when schema changes |
| TASK-263-03 | Report lines 97-99, 125, 162-168, 196-198, 214-215, 254-255, 265, 267 | `CtaBannerEditors.tsx`, `ctaBanner.tsx`, shared Clear helper only after TASK-256-02 lands | `tests/vitest/ui/cta-banner-editor-wave.test.tsx`, `tests/vitest/widgets/ctaBanner.test.tsx`, `tests/vitest/widgets/styleNoneTokens.test.tsx` only when shared style semantics are touched |
| TASK-263-04 | Report lines 186-192, 199-203, 217-221, 264, 268, 270 | `ctaBanner.tsx`, `CtaBannerEditors.tsx`, `widgetSafeHref.ts` only if a shared helper already owns target/rel attrs | CTA widget/editor tests, `tests/vitest/widgets/widgetSafeHref.test.ts` if shared link attrs change, validator tests when schema changes |
| TASK-263-05 | Report lines 68, 205-212, 223-224, 266, 269 | `ctaBanner.tsx`, `CtaBannerEditors.tsx`, media picker owners only if existing picker components are reused | CTA widget/editor tests, validator tests, media-picker UI test only when a media control is introduced |
| TASK-263-06 | Report lines 274-303 and every fixed/deferred row | `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md`, `_docs/_WIDGETS/CTA_BANNER.md`, board/changelog/docs | `git diff --check`, targeted production lanes after implementation leaves |

## Sub-Tasks

- [ ] TASK-263-01: CTA Banner Runtime Semantics and Accessibility
- [ ] TASK-263-02: CTA Banner Wizard and Action Editing UX
- [ ] TASK-263-03: CTA Banner Visual Style and Button Controls
- [ ] TASK-263-04: CTA Banner Link Target and Conversion Options
- [ ] TASK-263-05: CTA Banner Layout Media and Motion Options
- [ ] TASK-263-06: CTA Banner Report Docs and Closure

## Implementation Order

1. Complete TASK-256-07 classification first so shared rows are not widened into
   this CTA-only family.
2. Complete TASK-263-01 before adding product controls, because renderer
   semantics and accessible names define what later editor controls can promise.
3. Complete TASK-263-02 after renderer URL/action behavior is clear.
4. Complete TASK-263-03 after TASK-256-02 shared Clear semantics land where
   needed; do not implement a CTA-only Clear model.
5. Complete TASK-263-04 after the action editor contract is stable.
6. Complete TASK-263-05 after layout/action/schema fields are stable.
7. Complete TASK-263-06 last with report evidence, widget docs, changelog,
   board rows, and validation synchronized.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Prefer a dedicated worktree for implementation because `_docs/_TASKS/README.md`
  is a shared hotspot while multiple agents are creating task families.
- Re-read `_docs/_TASKS/README.md` immediately before patching board rows.
  Keep edits row-scoped and statistic-scoped; do not rewrite unrelated task
  rows from other agents.
- Stage only `TASK-263*`, CTA Banner owners, explicitly required shared helper
  owners, focused tests, CTA docs, CTA report, changelog, and board files.
- Do not stage unrelated TASK-256 implementation files, TASK-262 files, other
  widget reports, or local Playwright PNG screenshots.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged admin UI and public runtime widget rendering.
- RBAC: unchanged page/template/widget-template write permissions.
- CSRF: unchanged because no write routes are introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: every new persisted CTA field must be added to
  `ctaBannerSchema`, normalized by `normalizeCtaBannerData()`, and covered by
  validator/widget tests.
- Anti-abuse: CTA URLs must keep safe-href normalization; target/rel must be
  derived from allowlisted fields or a shared helper, not arbitrary raw attrs.
  Icon, motion, gradient, and media fields must be fixed enums or sanitized
  plain values. No scripts, HTML, event handlers, private media URLs, or
  unbounded class names may enter widget data.
- Secret handling: no provider keys, upload credentials, nonce values, raw
  tokens, private URLs, or privileged security config in widget JSON, browser
  cache, diagnostics, Playwright evidence, or changelog notes.

## Testing Requirements

- Docs-only task planning: `git diff --check`.
- Implementation leaves:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/widgets/ctaBanner.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when shared
    renderer output coverage changes.
  - `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` when
    target/rel or link attribute helper behavior changes.
  - `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` only
    when a leaf touches shared Clear/none-adjacent style semantics.
  - `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change.
  - `bun run gates:coderso` plus targeted accessibility/security gate suites
    when public runtime output or release-gated behavior changes.
  - `bun run scan:security:strict` and `bun run precommit` before final family
    closure.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md`
- `_docs/_WIDGETS/CTA_BANNER.md`
- `_docs/WIDGETS.md` only if this family changes general widget wording.
- `_docs/WIDGET_PACK_MATRIX.md` only if CTA Banner readiness/completeness
  changes.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when leaves or umbrella
  move to `Done`.

## Changelog Policy

- This task must not move to `Done` until a changelog entry lists TASK-263 and
  `_docs/_CHANGELOG/README.md` is updated.
- Leaves may share one final TASK-263 changelog entry if the implementation is
  landed as one family; otherwise each completed leaf must be listed.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md` is fixed,
  explicitly excluded as TASK-256 shared-contract scope, or deferred to a named
  future task with a reason.
- CTA Banner schema, defaults, normalizer, render, editor, tests, and docs move
  together for every new user-facing option.
- CTA implementation does not duplicate generic TASK-256 helpers or weaken
  shared Clear, link, mode, or accessibility contracts.
- Admin preview and frontend rendering agree on CTA Banner behavior.
- Widget docs, Playwright report evidence, task board, changelog, and targeted
  validation evidence are synchronized before closure.
