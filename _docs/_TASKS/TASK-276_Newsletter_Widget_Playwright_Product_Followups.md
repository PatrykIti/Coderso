# TASK-276: Newsletter Widget Playwright Product Followups

# FileName: TASK-276_Newsletter_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Forms + Admin UI + Runtime Render + Public Write Security + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252-07-09, TASK-256-07
**Status:** To Do

---

## Overview

Create the Newsletter-only follow-up family for
`_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md`.

TASK-256 owns shared widget-contract repairs from the Playwright wave. This
family owns only Newsletter product/runtime/editor work in the current widget
owners:

- `core/widgets/core/newsletter.tsx`
- `core/admin/ui/widgets/editors/NewsletterEditors.tsx`
- `tests/vitest/widgets/newsletter.test.tsx`
- `tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `tests/vitest/widgets/renderer.test.tsx`
- `tests/vitest/widgets/styleNoneTokens.test.tsx` when clear/token adjacency changes
- `tests/unit/widgets/validator.test.ts` when schema/defaults change
- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/_WIDGETS/tmp/newsletter/MATRIX.md` as research evidence, not a rewrite target

The report confirms that the current Newsletter renderer is a presentational
signup form with missing email `name`, consent outside the `<form>`, always
visible success copy, no accessible email label, shallow integration validation,
and limited product controls. TASK-276 turns those findings into execution-ready
leaves without widening the shared TASK-256 program.

## Scope Boundary Against TASK-256

In scope for TASK-276:

- Newsletter email field metadata, stable IDs, `name`, labels, autocomplete,
  consent containment, and browser validation.
- Newsletter-specific runtime submit states, loading/error/success copy,
  safe non-submitting fallback, webhook/action integration behavior, redirect
  copy, analytics metadata, and anti-abuse bridge.
- Newsletter integration URL/method validation and Advanced-mode integration
  diagnostics.
- Newsletter editor guidance for minimal descriptions, mobile variant behavior,
  consent-required meaning, success-state preview, and visual owner consistency.
- Newsletter field expansion such as first-name/custom bounded fields when the
  schema/defaults/normalizer/render/editor/tests move together.
- Newsletter text/button color, width, background picker clarity, contrast
  diagnostics, and explicit local resolver cleanup.
- Final Newsletter Playwright report/docs/changelog/board closure.

Out of scope for TASK-276:

- Shared atomic block patch infrastructure, owned by TASK-256-01.
- Generic `Clear`, `none`, design-token, and CSS-variable preservation helpers,
  owned by TASK-256-02.
- Generic slot/nested-content placeholder gating, owned by TASK-256-03.
- Generic interactive runtime instance-ID/script helper work for unrelated
  widgets, owned by TASK-256-04.
- Cross-widget form/public-write policy redesign. Newsletter can reuse existing
  Forms nonce/CAPTCHA/rate-limit owners or add a dedicated route only through a
  physical security-reviewed leaf; it must not hide a generic public-write
  framework inside a widget task.
- Provider secrets, audience API keys, CAPTCHA secrets, private webhook
  credentials, arbitrary scripts, or privileged provider settings in widget JSON
  or browser-visible editor state.

If a TASK-276 implementation leaf discovers a missing shared helper, route that
helper through TASK-256 or a new shared physical task before continuing with
Newsletter-specific wiring.

## TASK-256 Exclusion Matrix

| Report finding | Evidence | Excluded shared owner | TASK-276 policy |
|---|---|---|---|
| Generic editor atomic update races | TASK-256-01 drift class | TASK-256-01 | Use the shared helper if it exists; do not implement the generic panel contract here. |
| Generic clear/none token behavior | TASK-256-02 drift class | TASK-256-02 | Only wire Newsletter-specific style fields after the shared clear semantics exist or remain backward-compatible. |
| Generic runtime instance IDs/scripts | TASK-256-04 drift class | TASK-256-04 | TASK-276 may add Newsletter-local IDs for email/consent labels, but not a cross-widget helper. |
| Cross-report closure classification | `TASK-256-07` and `TASK-256-08` | TASK-256-07, TASK-256-08 | TASK-276 updates only `REPORT_NEWSLETTER_WIDGET.md` final evidence for this widget. |

## Source Report Coverage

| Report finding | TASK-276 route | Notes |
|---|---|---|
| BUG-01, BF-01, A1, A3, A6 | TASK-276-01 | Email field `name`, stable ID/label, autocomplete, validator coverage. |
| BUG-02, A2, UX-05 | TASK-276-01 | Consent checkbox inside the form with required behavior and editor help text. |
| Form current-URL submit drift | TASK-276-01, TASK-276-02 | Safe no-action behavior and active integration behavior must be explicit. |
| BUG-03, A4, BF-11, BF-12 | TASK-276-02 | Runtime-visible loading/success/error states and status-region behavior. |
| BF-07, BF-08, BF-14 | TASK-276-02 | Redirect, anti-abuse, and analytics/tracking integration through safe owners. |
| UX-03, UX-04, BF-10, BF-13 | TASK-276-03 | Integration mode/method/URL validation and Advanced diagnostics. |
| BUG-04, UX-02, UX-06, UX-07 | TASK-276-04 | Newsletter-specific editor mode clarity and preview guidance. |
| BF-04, BF-05, BF-09 | TASK-276-05 | Field name/custom-field expansion and double opt-in configuration. |
| UX-01, BUG-05, BF-02, BF-03, BF-06, BF-15, A5 | TASK-276-06 | Style/layout/breakpoint/contrast controls and explicit spacing resolver. |
| Final fixed/deferred evidence, report refresh, docs/changelog/board closure | TASK-276-07 | Final source-report and docs closure. |

## Current Owner and Test Matrix

| Leaf | Current drift evidence | Owner files | Required test lanes |
|---|---|---|---|
| TASK-276-01 | Report lines 67-69, 122-124, 140-146, 172-181, 234-235, 285-290, 300-302 | `newsletter.tsx`, `NewsletterEditors.tsx`, validator tests, Newsletter docs | Vitest widget render, editor wave, renderer, Bun validator when schema changes |
| TASK-276-02 | Report lines 70, 125, 142, 147, 183-186, 222-224, 252-256, 264-268, 273-274, 300-322 | `newsletter.tsx`, optional Forms/public-write runtime owners if reused, security tests | Vitest widget/render/script coverage; Bun Forms/security routes if public writes change |
| TASK-276-03 | Report lines 67, 74, 113-115, 210-216, 261-274, 328 | `newsletter.tsx`, `NewsletterEditors.tsx`, validator tests, docs | Vitest widget/editor, validator, security scan for URL/analytics sanitization |
| TASK-276-04 | Report lines 57-61, 87-91, 97-99, 127, 188-191, 206-228, 304-311 | `NewsletterEditors.tsx`, page-builder panel tests only if shared mode helpers are consumed | Vitest editor wave and page-builder panel smoke when mode ownership changes |
| TASK-276-05 | Report lines 243-247, 258-259, 319-326 | `newsletter.tsx`, `NewsletterEditors.tsx`, validator tests, docs | Vitest widget/editor, Bun validator, public-write/security lanes if new payload fields submit |
| TASK-276-06 | Report lines 71-75, 105, 193-204, 237-241, 249-250, 276-277, 289, 317-329 | `newsletter.tsx`, `NewsletterEditors.tsx`, style none token suite, docs/pack matrix if readiness changes | Vitest widget/editor/style suites, validator when schema changes |
| TASK-276-07 | Report lines 294-365 and every fixed/deferred row | `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md`, `_docs/_WIDGETS/NEWSLETTER.md`, board/changelog/docs | `git diff --check`, targeted production lanes after implementation leaves |

## Sub-Tasks

- [ ] TASK-276-01: Newsletter Form Semantics, Consent, and Accessibility
- [ ] TASK-276-02: Newsletter Submission States and Public Write Hardening
- [ ] TASK-276-03: Newsletter Integration Validation and Transport Diagnostics
- [ ] TASK-276-04: Newsletter Editor Mode Ownership and Variant Guidance
- [ ] TASK-276-05: Newsletter Field Expansion and Double Opt-In Model
- [ ] TASK-276-06: Newsletter Visual Style, Width, and Contrast Controls
- [ ] TASK-276-07: Newsletter Report, Docs, Changelog, and Closure

## Implementation Order

1. Complete TASK-276-01 first because form field/consent semantics are the
   critical renderer baseline for any later submit behavior.
2. Complete TASK-276-02 after the semantic form shape is stable so runtime
   submit states and anti-abuse attach to the final DOM contract.
3. Complete TASK-276-03 before broad field expansion so transport validation,
   method choices, and diagnostics are not duplicated by later leaves.
4. Complete TASK-276-04 after renderer/integration behavior is known so editor
   guidance and preview affordances describe the real contract.
5. Complete TASK-276-05 after the form and transport model are stable because
   extra fields and double opt-in affect submitted payload semantics.
6. Complete TASK-276-06 after core field/state behavior is stable; layout/style
   fields otherwise create avoidable schema churn.
7. Complete TASK-276-07 last after code, tests, Playwright report evidence,
   widget docs, changelog, and task board rows are synchronized.

## Git Scope Safeguards

- Work in a dedicated branch/worktree for implementation.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-276*`, Newsletter owner files, explicitly required Forms or
  security runtime/API owners, focused tests, Newsletter docs/report files, and
  required changelog/board files.
- Do not stage unrelated TASK-256 edits or unrelated Playwright report changes.
- `_docs/_TASKS/README.md` is shared by many active agents. Keep edits
  row-scoped; immediately before staging, re-read the board, verify statistics,
  and inspect `git diff -- _docs/_TASKS/README.md` for only TASK-276 rows/counts.
- Use `git diff --cached --name-only` and `git diff --cached --check` before
  every commit.

## Security Contract

This umbrella may affect public Newsletter form submission behavior, but it
must not introduce weaker public-write handling than existing Forms/Booking
patterns.

- Endpoint visibility: public runtime rendering; public write only through an
  existing Forms route or a new explicitly reviewed Newsletter route created by
  a physical leaf with route/security tests. Admin editing remains internal.
- Auth model: public mode uses nonce + signature/HMAC and optional CAPTCHA
  when Coderso owns the submission; internal mode requires admin session or API
  key scope `forms.submit` or a future `newsletter.submit` scope.
- RBAC: unchanged page/template/widget-template write permissions; any internal
  submission or integration management requires the relevant Forms/Webhooks
  permissions.
- CSRF: admin writes keep existing CSRF handling; public writes use HMAC nonce
  rather than CSRF.
- Rate-limit bucket: existing `public_write` bucket; no widget-local weaker
  rate limit.
- Reject-unknown validation: Newsletter schema stays `additionalProperties:
  false`; public request bodies remain allowlisted before persistence or
  delivery.
- Anti-abuse: nonce/CAPTCHA/honeypot remain backend-owned; widget data may
  expose visible copy, field labels, and safe integration references, but not
  provider secrets, CAPTCHA secrets, nonce secrets, arbitrary scripts, or
  privileged security configuration.
- Secret handling: no raw submissions, nonce values, provider keys, private
  URLs, webhook secrets, or secret-like settings in widget JSON, browser cache,
  reports, or changelog notes.

## Testing Requirements

Docs-only task creation:

- `git diff --check`
- `bun run precommit` before the manual commit unless the configured hook runs
  it automatically and the committer records that proof.

Implementation leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when renderer
  output markers, forms, IDs, or shared widget rendering change.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  style clear/default adjacency changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer
  fields change.
- `bun test tests/unit/widgets/registry.test.ts` if widget variant registration
  or editor capability wiring changes.
- Forms/public-write lanes when Newsletter writes through Coderso backend:
  `bun run test:vitest -- tests/vitest/forms/formRuntimeResolver.test.ts`,
  `bun test tests/integration/routes/forms.test.ts`,
  `bun test tests/unit/forms/submissionService.test.ts`, and
  `bun test tests/security/codersoSecurityGate.test.ts`.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md`
- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/WIDGETS.md` only if this family changes general widget wording.
- `_docs/WIDGET_PACK_MATRIX.md` only if Newsletter readiness/completeness
  changes.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when leaves or umbrella
  move to `Done`.

## Changelog Policy

- This task must not move to `Done` until a changelog entry lists TASK-276 and
  `_docs/_CHANGELOG/README.md` is updated.
- When the full family closes through one final entry, its `Tasks:` field must
  include `TASK-276` and every completed leaf ID (`TASK-276-01` through
  `TASK-276-07`).
- Leaves may share one final TASK-276 changelog entry if the implementation is
  landed as one family; otherwise each completed leaf must be listed.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md` is fixed,
  explicitly excluded as TASK-256 shared scope, or deferred to a named future
  physical task with a reason.
- TASK-276 task docs do not duplicate TASK-256 shared-contract implementation
  scope.
- Newsletter schema, defaults, normalizer, render, editor, tests, and docs move
  together for every new user-facing option.
- Newsletter no longer posts empty data or silently submits to the current page
  when no active target exists.
- Admin preview and public frontend agree on Newsletter runtime behavior.
- Public-write hardening remains backend-owned and tested in Bun route/security
  lanes when touched.
- Widget docs, Playwright report evidence, task board, changelog, and targeted
  validation evidence are synchronized before closure.
