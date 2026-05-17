# TASK-268: Footer Widget Playwright Product Followups

# FileName: TASK-268_Footer_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Navigation/Shell + Admin UI + Runtime Render + Accessibility + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252-07-15, TASK-256-07
**Status:** To Do

---

## Overview

Create the Footer-only follow-up family for
`_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md`.

TASK-256 owns the general widget-contract repair wave. TASK-268 deliberately
keeps only the Footer widget product/runtime/editor scope: the Footer schema,
defaults, normalizers, renderer, editors, focused tests, Footer widget docs, and
the Footer Playwright report closure. It must not become another shared widget
contract umbrella.

The current Footer is a useful composite baseline with columns, legal strip,
social links, nested slots, and mode-specific editors. The report identifies
Footer-specific gaps that are visible in public output and admin editing:
text-rendered social links, hardcoded legal labels, missing brand area, weak
landmark/heading semantics, minimal-variant mismatch, local editor label and
layout-token drift, and missing Footer-owned layout/style/link options.

## Scope Boundary Against TASK-256

In scope for TASK-268:

- Footer social output: icon rendering, platform allowlist/custom handling,
  social accessible names, and safe external-link attributes.
- Footer legal and brand output: configurable legal labels, brand logo/text,
  tagline, section placement, and backward-compatible legal defaults.
- Footer runtime semantics: `<footer>` accessible name, column heading levels,
  minimal variant output, and optional legal/social strip visibility.
- Footer editor IA that lives only in `FooterEditors.tsx`: labeled Advanced
  controls, labeled Footer Visual fields, removal of Footer-local duplicate
  layout controls, Wizard quick-link disclosure, local adoption of already
  landed shared clear/reset helpers where Footer still misses them, and Footer
  link/social management.
- Footer-owned layout/style options: horizontal padding, responsive column
  breakpoint, link hover/underline/typography, link target controls, and local
  adoption of already landed shared color-picker patterns for Footer style
  fields.
- Final Footer report/docs/changelog/board closure.

Out of scope for TASK-268:

- Shared editor atomic update helpers, mode tab discovery, and page-builder
  first-open mode navigation, owned by TASK-256-01 only where that task already
  applies, or by the existing builder transition contract in TASK-194-04-02 for
  the first-open Wizard handoff behavior.
- Generic `Clear`, `none`, color-token, CSS-variable preservation, and reusable
  color-picker primitives, owned by TASK-256-02. TASK-268 must only wire Footer
  fields to already-approved shared helpers/patterns where Footer still lacks
  adoption; it must not redefine their semantics or invent a second primitive.
- Generic slot placeholder/public runtime gating, owned by TASK-256-03.
- Generic interactive widget instance ID helpers, owned by TASK-256-04.
- Login/admin rate limiting from the report environment note. That is not a
  Footer widget concern.
- New public write endpoints. If a future Footer newsletter area is needed, it
  must compose an existing newsletter/form widget or route through an approved
  public-write task.

If a TASK-268 leaf discovers that a required primitive is still missing at the
shared layer, stop that slice and route the primitive through TASK-256 or a new
shared task before continuing with the Footer-only implementation.

## Source Report Coverage

| Report finding | Route |
|---|---|
| Social text output, missing social icons, social accessible names, safe `target`/`rel`, modern platforms | TASK-268-01 |
| Hardcoded Privacy/Terms labels, missing brand/logo/tagline, Footer landmark label, column headings | TASK-268-02 |
| Minimal variant is just one column, legal strip always renders, social/legal empty-state visibility | TASK-268-03 |
| Wizard first-link limitations/disclosure, Advanced unlabeled selects, Footer-local `sectionPaddingY` duplication, link/social reordering and editor IA | TASK-268-04 |
| Footer horizontal padding, responsive breakpoint, link hover/active/underline, link typography, open-in-new-tab controls, local shared color-picker adoption, and market-only utility backlog such as newsletter/address/contact/back-to-top | TASK-268-05, with TASK-268-06 required to name a physical future task before closure for any deferred Footer-owned backlog row |
| Fixed/deferred evidence, docs, changelog, board, Playwright report refresh, final validation | TASK-268-06 |
| Generic clear/color-token/color-picker semantics | Shared primitive ownership stays in TASK-256-02; Footer-local adoption of the landed clear/reset helper lives in TASK-268-04 and Footer-local color-picker adoption lives in TASK-268-05 |
| First-open Wizard/Visual/Advanced tab discovery outside Footer editor files | Existing shared builder transition contract in TASK-194-04-02, not TASK-268; TASK-268-06 should mark this row shared/not-footer-scope unless a fresh repro proves a new regression |
| Login 429/rate-limit environment note | Out of scope for Footer |

## Current Owner and Test Matrix

| Leaf | Current drift evidence | Owner files | Required test lanes |
|---|---|---|---|
| TASK-268-01 | Social rows only: report lines 67-71, 91-95, 99-103, 181, 191, 193, 207-208, 217, 220-221, 271, 318, 321, 383, 386, 403, 427, social-link portion of 433, and 446. | `core/widgets/core/footer.tsx`, `core/admin/ui/widgets/editors/FooterEditors.tsx`, `tests/vitest/widgets/footer.test.tsx`, `tests/vitest/ui/footer-editor-wave.test.tsx` | Vitest widget render, UI editor wave, renderer smoke when public output changes, validator test when schema changes |
| TASK-268-02 | Legal/brand/semantic rows only: report lines 73-89, 173-175, 183, 192, 194-206, 218-219, 317-320, 384-385, 392-394, 429-432, Footer `aria-label` portion of 433, and 445. Clear/color rows stay TASK-256-02. | `footer.tsx`, `FooterEditors.tsx`, Footer docs, validator tests when schema changes | Vitest widget render/schema/editor, renderer smoke for nested slots if brand affects layout |
| TASK-268-03 | Minimal/visibility rows only: report lines 155-163, 184, 197, 301-305, 334, and 411. | `footer.tsx`, `FooterEditors.tsx`, Footer docs | Vitest widget render for variants/visibility, editor wave for toggles, renderer smoke when slots/legal row behavior changes |
| TASK-268-04 | Footer-editor rows only: report lines 112-116, 129-137, 177, 179-180, 182, 260-261, 264, 267, 269-270, 272-276, 332-333, and 401. Shared clear/reset primitive ownership stays TASK-256-02, but local Footer adoption for rows 176, 178, and 268 lands here; modern social platform rows 181 and 271 stay TASK-268-01; first-open tab discovery at line 331 is classified through TASK-194-04-02 shared builder behavior, not Footer code. | `FooterEditors.tsx`, `tests/vitest/ui/footer-editor-wave.test.tsx`, `tests/vitest/widgets/footer.test.tsx` | Vitest UI editor wave; widget render only when editor changes require schema/default changes |
| TASK-268-05 | Footer layout/style/link rows only: report lines 105-110, 139-153, 196, 222, 404, 410, 414, 416-417, and 447. Shared color-picker primitive ownership stays TASK-256-02, but local Footer adoption for line 402 lands here; market-only newsletter/address/contact/back-to-top rows 225-226, 230, 413, and 415 must end with a named physical future task before TASK-268 closes if they stay deferred. | `footer.tsx`, `FooterEditors.tsx`, Footer docs, pack matrix only if readiness changes | Vitest widget render/editor, validator when schema changes, renderer smoke for link target/styling output |
| TASK-268-06 | Report artifact rows 339-357 and admin/frontend parity rows 361-373, plus all final fixed/deferred/not-scope evidence from lines 377-452. | `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md`, `_docs/_WIDGETS/FOOTER.md`, `_docs/WIDGETS.md` if shared wording changes, board/changelog/docs | `git diff --check`, targeted production lanes after implementation leaves, final precommit/security gate |

## Sub-Tasks

- [ ] TASK-268-01: Footer Social Icons and External Link Safety
- [ ] TASK-268-02: Footer Legal, Brand, and Landmark Semantics
- [ ] TASK-268-03: Footer Minimal Variant and Visibility Controls
- [ ] TASK-268-04: Footer Editor Mode IA and Link Management
- [ ] TASK-268-05: Footer Layout, Typography, and Interactive Style Controls
- [ ] TASK-268-06: Footer Report, Docs, Changelog, and Closure

## Implementation Order

1. Complete TASK-268-01 first because social output is the highest public-facing
   defect and sets the safe-link/platform model used by later editor work.
2. Complete TASK-268-02 next so legal/brand/schema semantics are stable before
   minimal and visibility decisions depend on them.
3. Complete TASK-268-03 after legal/brand normalization lands so the minimal
   variant and optional strips reuse the final data model.
4. Complete TASK-268-04 after the public data model is stable, because editor
   IA should expose the final fields without duplicate temporary controls.
5. Complete TASK-268-05 last among implementation leaves, because layout/style
   expansion should not churn earlier semantic and editor contracts.
6. Complete TASK-268-06 only after code, tests, docs, Playwright report
   evidence, changelog, and task-board rows are synchronized.

## Git Scope Safeguards

- Use a dedicated worktree/branch for TASK-268 because many agents are editing
  nearby `_docs/_TASKS/README.md` rows.
- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Stage only `TASK-268*`, Footer owners, focused Footer tests, Footer docs,
  Footer report, changelog, and row-scoped task-board changes.
- Do not stage unrelated TASK-256, TASK-257, TASK-258, TASK-259, TASK-260,
  TASK-261, or other Playwright report changes.
- `_docs/_TASKS/README.md` is shared. Keep edits row-scoped and statistics-only;
  before commit, inspect `git diff -- _docs/_TASKS/README.md` and reconcile only
  the visible TASK-268 rows/statistics.

## Security Contract

No API routes are added by this umbrella.

- Endpoint visibility: public Footer rendering plus internal admin editing
  only through existing page/widget editing routes.
- Auth/RBAC/CSRF/rate limit: unchanged; no new admin or public route is
  introduced.
- Reject-unknown validation: Footer schema keeps `additionalProperties: false`
  and must reject unknown brand/legal/social/layout/style fields.
- Anti-abuse: all public href output must keep `normalizeWidgetSafeHref`, fixed
  platform/icon allowlists, safe target/rel handling for external links, and no
  arbitrary HTML/SVG/script payloads in widget JSON.
- Secret handling: Footer data, docs, reports, and tests must not store provider
  keys, private URLs, nonce values, CAPTCHA secrets, or privileged settings.

## Testing Requirements

- Docs-only task creation: `git diff --check`.
- Implementation leaves:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/footer-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when
    public/widget renderer output, slot placement, or registry behavior changes.
  - `bun test tests/unit/widgets/validator.test.ts` when Footer schema/defaults
    change.
  - `bun run gates:coderso`, `bun run scan:security:strict`, and
    `bun run precommit` before final family closure.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md`
- `_docs/_WIDGETS/FOOTER.md`
- `_docs/WIDGETS.md` only if this family changes general widget wording.
- `_docs/WIDGET_PACK_MATRIX.md` only if Footer readiness/completeness changes.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when leaves or umbrella
  move to `Done`.

## Changelog Policy

- This task must not move to `Done` until a changelog entry lists TASK-268 and
  `_docs/_CHANGELOG/README.md` is updated.
- Leaves may share one final TASK-268 changelog entry if implementation lands
  as one family; otherwise each completed leaf must be listed.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md` is fixed,
  explicitly excluded as TASK-256/shared scope, marked non-Footer environment
  scope, or deferred to a named future task with a reason.
- Footer schema, defaults, normalization, renderer, editor, tests, and docs move
  together for every new user-facing option.
- Public Footer output no longer exposes text-only social platform names,
  hardcoded legal labels, missing Footer landmark label, or non-heading column
  titles after the relevant leaves land.
- Footer editor controls are labeled, mode-owned, and do not duplicate the same
  Footer setting in multiple modes without a clear owner.
- Admin preview and public frontend agree on Footer runtime behavior.
- Widget docs, Playwright report evidence, task board, changelog, and targeted
  validation evidence are synchronized before closure.
