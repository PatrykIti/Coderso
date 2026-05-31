# TASK-290: Testimonials Widget Playwright Product Followups

# FileName: TASK-290_Testimonials_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Testimonials + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256, TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-06-03, TASK-256-08
**Status:** Done (2026-05-22)

---

## Overview

Create the widget-specific Testimonials follow-up family for
`_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md`.

This family owns only product and UX improvements that belong to the standalone
`testimonials` widget. Shared widget-contract repairs stay in TASK-256. Do not
use TASK-290 to duplicate shared fixes for editor atomic updates, clear/none
semantics, baseline accessibility, scroll-snap truthfulness, or shared media
accessibility.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md`

Live owners inspected while drafting:

- `core/widgets/core/testimonials.tsx`
- `core/admin/ui/widgets/editors/TestimonialsEditors.tsx`
- `tests/vitest/widgets/testimonials.test.tsx`
- `tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `tests/vitest/widgets/renderer.test.tsx`
- `tests/vitest/widgets/styleNoneTokens.test.tsx`
- `tests/unit/widgets/validator.test.ts`
- `tests/unit/widgets/registry.test.ts`
- `_docs/_WIDGETS/TESTIMONIALS.md`
- `_docs/WIDGETS.md`
- `core/widgets/modulePackMatrix.ts`

## TASK-256 Exclusion Matrix

The following report findings are intentionally excluded from TASK-290 because
TASK-256 already owns them as shared widget-contract drift.

| Report finding | Evidence | Owner task | Reason |
|---|---|---|---|
| BUG-01 slider-static snap points without container snap | `REPORT_TESTIMONIALS_WIDGET.md:135-141,199-204,276-277,293` | TASK-256-06-03 / TASK-256-04 | Shared truthful static-vs-interactive runtime contract for widget variants. |
| BUG-02 Wizard variant change does not update count | `REPORT_TESTIMONIALS_WIDGET.md:143-146,302-304` | TASK-256-01 / TASK-256-06-03 | Shared atomic editor update and truthful control baseline. |
| BUG-03 / BF-12 hardcoded heading level | `REPORT_TESTIMONIALS_WIDGET.md:148-153,248-250,260,294` | TASK-256-06-03 / TASK-256-04 | Shared runtime heading/ARIA baseline. TASK-290 may add typography controls but not baseline hierarchy repair. |
| BUG-04 section and article accessible names | `REPORT_TESTIMONIALS_WIDGET.md:155-158,257-259,295` | TASK-256-06-03 / TASK-256-04 | Shared public runtime accessibility baseline. |
| UX-02 text/accent clear controls | `REPORT_TESTIMONIALS_WIDGET.md:169-171,301-304` | TASK-256-02 / TASK-256-06-03 | Shared clear-control semantics and design token behavior. |
| UX-08 duplicated spacing token in Visual and Advanced | `REPORT_TESTIMONIALS_WIDGET.md:191-193` | TASK-334 | Shared editor-mode ownership residual was closed on 2026-05-23; TASK-290 keeps the truthful split instead of retroactively claiming the shared policy. |
| BF-05 / A4 avatar `loading="lazy"` and A5 avatar alt context | `REPORT_TESTIMONIALS_WIDGET.md:219-222,261-262` | TASK-335 | Shared media accessibility residual was closed on 2026-05-23; lazy-loading remains present and contextual avatar alt naming now uses the shared owner outcome. |

If a TASK-290 implementation leaf discovers that a desired Testimonials product
feature requires a shared editor helper, generic runtime script policy, global
media behavior, or cross-widget accessibility contract, split that shared piece
back to TASK-256 instead of hiding it inside this family.

## TASK-290 Scope Matrix

| Report finding | TASK-290 owner | Notes |
|---|---|---|
| UX-04 Wizard lacks rating, role, and source fields | TASK-290-01 | Testimonials Wizard social-proof authoring, excluding avatar source controls. |
| UX-04 Wizard lacks avatar authoring | TASK-290-03 | Wizard avatar authoring is implemented with the same Media Library and URL validation model as Visual avatar controls. |
| UX-05 Wizard lacks eyebrow and description | TASK-290-01 | Testimonials header onboarding. |
| UX-01 remove testimonial has no confirmation/undo | TASK-290-02 | Destructive repeated-item editing. |
| BF-04 spotlight always uses first item | TASK-290-02 | Testimonials-only spotlight pinning. |
| UX-06 Avatar URL lacks Media Library picker | TASK-290-03 | Keep persisted `avatar` as the public URL contract; editor-local media IDs resolve through existing media picker seams. |
| UX-07 invalid avatar URL has no validation feedback | TASK-290-03 | Testimonials-local URL validation and fallback preview. |
| BF-01 slider-static lacks product navigation | TASK-290-04 | Keep backward-compatible `slider-static` but add SSR dot navigation and explicit rating-display behavior without generic carousel runtime. |
| UX-03 rating `0` renders as five empty stars | TASK-290-04 | Testimonials rating semantics, labels, and optional hidden-state behavior. |
| BF-02 section background controls | TASK-290-05 | Testimonials section surface styling. |
| BF-03 header typography align/size controls | TASK-290-05 | Product typography controls, not shared heading hierarchy. |
| BF-06 contrast validator | TASK-290-05 | Non-blocking Testimonials-local contrast warnings only; no shared validator is created in this family. |
| BF-08 card radius and border-width controls | TASK-290-05 | Bounded card style fields. |
| BF-07 CTA below testimonials | TASK-290-06 | Section CTA normalized through shared safe-href helpers with explicit target/style tokens. |
| BF-11 rich text for quote | TASK-290-06 | Bounded sanitized `quoteHtml` with legacy plain-quote fallback; no unsanitized HTML. |
| BF-09 limit 8 without pagination/load more | TASK-290-07 | Raise the local cap to 24 and add SSR `load-more` expansion with bounded page size. |
| BF-10 export/import testimonials | TASK-290-07 | Local JSON/CSV import/export with strict field rejection; external provider connectors need a separate shared integration task. |
| Report fixed/deferred notes, widget docs, changelog, board closure | TASK-290-08 | Final evidence pass after implementation leaves land. |

## No-Action Report Findings

| Report finding | Decision | Reason |
|---|---|---|
| Existing grid/spotlight/static layout parity | No TASK-290 task | Report marks admin canvas and frontend rendering as aligned. Preserve with existing tests unless a leaf changes rendering. |
| Existing add/move/minimum count controls | No TASK-290 task | Current behavior is valid; TASK-290-02 only adds safer removal and clearer spotlight ownership. |
| Existing header conditional DOM removal | No TASK-290 task | Report marks it as correct; keep it when adding header style fields. |
| Existing rating `aria-label` for non-zero ratings | No TASK-290 task | Report marks it OK. TASK-290-04 must preserve or improve it while changing rating-zero semantics. |

## Sub-Tasks

- [x] TASK-290-01: Testimonials Wizard Header and Social Proof Authoring
- [x] TASK-290-02: Testimonials Destructive Item Management and Spotlight Pin
- [x] TASK-290-03: Testimonials Avatar Media Picker and URL Validation
- [x] TASK-290-04: Testimonials Slider Navigation and Rating Semantics
- [x] TASK-290-05: Testimonials Section Surface Typography and Card Styles
- [x] TASK-290-06: Testimonials CTA and Rich Quote Content
- [x] TASK-290-07: Testimonials Large Set Import Export and Pagination
- [x] TASK-290-08: Testimonials Report Docs Changelog and Closure

## Implementation Order

1. Rebase over TASK-256 shared fixes first. TASK-290 leaves must build on the
   final shared variant/update, clear-control, runtime-accessibility, and media
   baselines instead of duplicating them.
2. Complete TASK-290-01 before adding more repeated-item fields elsewhere so
   Wizard onboarding stays synchronized with the normalized model.
3. Complete TASK-290-02 before larger list/import work so destructive-edit and
   spotlight ownership are stable for every list size.
4. Complete TASK-290-03 before any rich card or import work that references
   avatar data.
5. Complete TASK-290-04 after TASK-256 resolves the static slider baseline.
6. Complete TASK-290-05 after the shared clear/token rules are stable.
7. Complete TASK-290-06 after safe href behavior from TASK-256 is available.
8. Complete TASK-290-07 last among implementation leaves because pagination and
   import/export can stress the repeated-item data model.
9. Complete TASK-290-08 last with report evidence, widget docs, task board, and
   changelog updates.

## Git Scope Safeguards

- Work in a dedicated branch/worktree for implementation.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-290*` files, Testimonials owner files, Testimonials tests,
  Testimonials docs/report files, and required changelog/board files.
- Because `_docs/_TASKS/README.md` is a shared board touched by parallel agents,
  re-read it immediately before staging and verify the cached diff contains only
  the TASK-290 rows/counts owned by the current commit.
- Use `git diff --cached --name-only` and `git diff --cached --check` before
  every commit.

## Security Contract

This planning family does not add API routes.

- Endpoint visibility: none.
- Auth model: unchanged authenticated admin page/template editing and public
  runtime rendering.
- RBAC: unchanged page/template/widget write permissions.
- CSRF: unchanged because no write routes are introduced by the planning docs.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: any new Testimonials schema fields must keep
  `additionalProperties: false`, normalize legacy payloads, and add validator
  tests when schema/defaults change.
- Anti-abuse: CTA links, avatar URLs, rich quote formatting, and import/export
  payloads must stay schema-bound and must not accept raw HTML, script, inline
  event handlers, unbounded class names, or browser-stored secrets.
- Secret handling: no secrets, private media credentials, provider tokens, or
  privileged settings in widget JSON, diagnostics, Playwright evidence, or
  changelog notes.

## Testing Requirements

Docs-only task creation:

- `git diff --check`
- `bun run precommit` before the manual commit, unless the configured hook runs
  it automatically and the committer records that proof.

Implementation leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run test:vitest -- tests/vitest/widgets/testimonials.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when renderer
  output markers, variant rendering, or shared widget rendering changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  spacing/radius/clear adjacency changes.
- `bun run test:vitest -- tests/vitest/ui/media-picker.test.tsx` when Media
  Picker integration changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer
  fields change.
- `bun test tests/unit/widgets/registry.test.ts` if variant registration or
  widget definition metadata changes.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` with textual
  fixed/deferred evidence for each implemented leaf. Do not commit PNG files.
- Update `_docs/_WIDGETS/TESTIMONIALS.md` when schema, editor modes, runtime
  variants, import/export, or CTA behavior changes.
- Update `_docs/WIDGETS.md` only if this family intentionally changes the
  shared widget contract. Prefer TASK-256 for shared contract text.
- Update `_docs/WIDGET_PACK_MATRIX.md` if Testimonials pack readiness or
  completeness changes.
- Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md` when the family is completed.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and
  `_docs/_CHANGELOG/README.md` is updated.
- Leaves may share one final TASK-290 changelog entry if the implementation is
  landed as one family; otherwise each completed leaf must be listed.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` is either
  owned by TASK-256, covered by a TASK-290 physical leaf, explicitly no-action,
  or deferred by TASK-290-08 with a reason.
- TASK-290 task docs do not duplicate TASK-256 shared-contract implementation
  scope.
- Each implementation leaf names concrete files, data flow, error handling,
  regression tests, documentation updates, and validation commands.
- Runtime changes preserve backward compatibility for existing `testimonials`
  payloads unless the leaf documents and tests a migration/normalizer path.
- Final closure records report evidence, task status updates, changelog, and the
  exact validation output.

## Completion Notes (2026-05-22)

- TASK-290 closed every Testimonials-local report owner through the shipped
  leaf sequence while preserving the explicit TASK-256 exclusions for shared
  editor, accessibility, scroll-snap, and hierarchy contracts.
- The current branch now keeps runtime schema ownership, Wizard/Visual/Advanced
  authoring parity, safe media and CTA handling, rich quote sanitization, and
  local import/export plus SSR load-more behavior synchronized with focused
  widget/editor regression coverage, including the follow-up hardening for
  `quoteHtml` import rows, Visual media-picker draft sync, and the last local
  coverage gaps called out during the post-closure drift audit.
- Report evidence, widget docs, board rows, and changelog entry `924` now match
  the completed implementation family, while the later shared follow-ups `TASK-333`, `TASK-334`, and `TASK-335` are now also closed and the final local closure evidence stays recorded in `TASK-290-08`.
