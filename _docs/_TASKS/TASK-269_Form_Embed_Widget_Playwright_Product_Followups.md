# TASK-269: Form Embed Widget Playwright Product Followups

# FileName: TASK-269_Form_Embed_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Forms + Admin UI + Runtime Render + Public Write Security + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252-07-12, TASK-256-07, TASK-310
**Status:** Done (2026-05-18)

---

## Overview

Create the Form Embed-only follow-up family for
`_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md`.

TASK-256 owns the shared widget contract from the Playwright report wave. This
family owns only the Form Embed product/runtime/editor scope:
`core/widgets/core/formEmbed.tsx`,
`core/admin/ui/widgets/editors/FormEmbedEditors.tsx`,
`core/widgets/core/formRuntimeScript.ts`, the existing Forms runtime resolver
projection when Form Embed needs more resolved metadata, focused tests, and
Form Embed source-of-truth docs.

The current Form Embed widget already resolves a Forms record at public runtime,
renders saved form fields, embeds the Forms nonce, supports conditional field
logic, supports multi-step forms, and posts JSON to the existing Forms
submission route. The report shows that the Form Embed-specific contract is
still incomplete around form selection diagnostics, field type rendering,
documented variants, multi-step controls, runtime submit feedback, and final
report closure.

## Scope Boundary Against TASK-256

In scope for TASK-269:

- Form Embed form selection diagnostics, resolved error/status visibility, field
  count/type preview, no-form CTA state, empty-string normalization feedback,
  and Form Embed-specific Wizard/Visual/Advanced mode content.
- Form Embed field type rendering for the currently supported Forms field model,
  field-level accessible names/IDs/descriptions, checkbox semantics, and
  truthful unsupported-field diagnostics for report-only types that the current
  Forms model rejects.
- Form Embed `card` and `inline` variants documented in
  `_docs/_WIDGETS/FORM_EMBED.md`, Form Embed section layout controls, title and
  field typography controls, and submit button style controls.
- Form Embed multi-step navigation labels, progress indicator, and saved
  progress expiry policy.
- Form Embed runtime submit feedback, success/redirect projection, busy state,
  success/error live regions, and projection of existing safe Forms anti-abuse
  metadata.
- Final Form Embed Playwright report/docs/changelog/board closure.

Out of scope for TASK-269:

- Cross-widget editor atomic update helpers, owned by TASK-256-01.
- Generic `Clear`, `none`, color-picker, token-picker, and CSS-variable
  preservation helpers. Report rows U3 and U4 are routed through TASK-310
  shared scope, not TASK-269 widget-local implementation.
- Generic slot/nested-content placeholder gating, owned by TASK-256-03.
- Shared instance-ID/runtime-binding helpers for unrelated widgets, owned by
  TASK-256-04. TASK-269 may add Form Embed-owned field IDs and ARIA links, but
  must not redesign the shared runtime binding model.
- New public submission endpoints or a standalone bot-protection policy.
  Form Embed must continue to use the existing Forms runtime submission route
  and backend-owned nonce/CAPTCHA/honeypot policy. If the Forms endpoint lacks a
  required backend contract, open a separate Forms/public-write task instead of
  hiding that work in a Form Embed styling or editor leaf.

If a TASK-269 leaf discovers a missing shared helper, stop and route that helper
through TASK-256 or a new shared task before continuing with Form Embed-specific
work.

## Source Report Coverage

| Report finding | Route |
|---|---|
| C3, C4, U1, U2, U5, U6, U9, U10, W12 | TASK-269-01 |
| W17, A3, A4, A5, A6, A7 | TASK-269-02 |
| A10 | TASK-269-02 only if the current Forms model exposes grouped checkbox/radio semantics during this family; otherwise record it as not applicable for the current single-checkbox contract in TASK-269-06 |
| C2, W1 | TASK-269-02 for current supported-field diagnostics only; adding `radio`, `number`, `time`, `hidden`, `file`, `range`, or `rating` to the Forms model routes to TASK-311 outside TASK-269 |
| C1, W4, W5, W6, W7, W8, W9, W10, A1, A2 | TASK-269-03 |
| W13, W14, W16, U7, U8 | TASK-269-04 |
| W2, W3, A8, A9 | TASK-269-05 |
| W15 | TASK-269-05 as verification-first scope only; the current submit route already maps `successRedirectUrl -> runtime.redirectUrl`, so code changes are required only if that live owner proof fails |
| W11 | TASK-269-05 for the existing backend-owned captcha + nonce bridge; any remaining honeypot or broader backend policy gaps are future Forms/public-write scope outside TASK-269 |
| U3, U4 | TASK-310 shared scope, not TASK-269 |
| Final fixed/deferred evidence, report refresh, docs/changelog/board closure | TASK-269-06 |

## Current Owner and Test Matrix

| Leaf | Current drift evidence | Owner files | Required test lanes |
|---|---|---|---|
| TASK-269-01 | Report lines 131-140, 160-161, 178, 189-198, 296, 302-303 | `FormEmbedEditors.tsx`, `core/admin/services/formsClient.ts` for `getFormDetailCached` / `listFormFields` diagnostics, `formEmbed.tsx` only when normalized editor-visible defaults change | Vitest Form Embed editor wave, widget render smoke when defaults/normalizer change |
| TASK-269-02 | Report lines 183, 206-210, 213, 300 plus C2/W1 unsupported-field classification from lines 90-105, 159, 167, 295, 309 | `formEmbed.tsx`, `formRuntimeScript.ts` for value collection only when a currently supported control needs runtime handling, validator when schema changes | Vitest widget render, runtime script DOM/value tests if added, validator when schema changes |
| TASK-269-03 | Report lines 16, 84-88, 107-123, 158, 170-176, 204-205, 294, 299 | `formEmbed.tsx`, `FormEmbedEditors.tsx`, widget registry/docs, pack matrix only if readiness changes | Vitest widget render, editor wave, validator when schema/variants change, style adjacency tests if shared style semantics are touched |
| TASK-269-04 | Report lines 143-148, 179-182, 194-196, 306, 308 | `formEmbed.tsx`, `formRuntimeScript.ts`, `FormEmbedEditors.tsx` | Vitest widget render, editor wave, runtime script DOM/localStorage tests |
| TASK-269-05 | Report lines 168-169, 177, 181, 211-212, 297-298, 301 plus W11 public-write bridge evidence | `formEmbed.tsx`, `formRuntimeScript.ts`, `publicSite.tsx` / Forms runtime resolver when safe captcha-site-key, redirect, or nonce projection changes, existing Forms public route/security owners when payload policy changes | Vitest widget/runtime script, resolved-data consumer tests, and Bun Forms route/runtime/security tests when public payload/nonce/CAPTCHA changes |
| TASK-269-06 | Report lines 217-319 and every fixed/deferred row | `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md`, `_docs/_WIDGETS/FORM_EMBED.md`, board/changelog/docs | `git diff --check`, targeted production lanes after implementation leaves |

## Sub-Tasks

- [ ] TASK-269-01: Form Selection, Editor Modes, and Admin Diagnostics
- [ ] TASK-269-02: Field Type Rendering and Field Accessibility
- [ ] TASK-269-03: Variants, Layout, and Form Surface Styling
- [ ] TASK-269-04: Multi-Step Controls and Stored Progress
- [ ] TASK-269-05: Submission Runtime Feedback and Public Write Projection
- [ ] TASK-269-06: Form Embed Report, Docs, and Closure

## Implementation Order

1. Complete TASK-269-01 first because editor diagnostics and selected-form
   metadata determine which controls are visible in later leaves.
2. Complete TASK-269-02 next because field rendering and field IDs are the base
   for multi-step progress, runtime value collection, and accessibility
   assertions.
3. Complete TASK-269-03 after field semantics are stable so variant/layout/style
   changes do not churn field render markup repeatedly.
4. Complete TASK-269-04 after field rendering because progress indicators,
   button labels, and stored progress need stable step/field identifiers.
5. Complete TASK-269-05 after the field and multi-step model is stable, then
   wire submit feedback and backend-owned anti-abuse projection.
6. Complete TASK-269-06 last after code, tests, docs, Playwright report
   evidence, changelog, and board rows are synchronized.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Use a dedicated worktree for implementation because many active agents touch
  `_docs/_TASKS/README.md` and nearby Playwright task families.
- Stage only `TASK-269*`, Form Embed owners, explicitly required Forms
  resolver/API owners, tests, docs, report, changelog, and board files.
- Do not stage unrelated TASK-256, TASK-257, TASK-258, TASK-259, TASK-260,
  TASK-261, or other Playwright report changes.
- `_docs/_TASKS/README.md` is shared by many active agents. Keep edits
  row-scoped and count-scoped; before commit, rerun
  `git diff -- _docs/_TASKS/README.md` and reconcile only visible TASK-269 rows
  and statistics. During merge back to `feature/corrections`, prefer
  cherry-picking the TASK-269 commits or resolving README conflicts by replaying
  the TASK-269 rows on top of the newest board.

## Security Contract

This umbrella may affect the existing Forms public submission flow through Form
Embed output, but it must not introduce a new public endpoint.

- Endpoint visibility: public runtime rendering and existing
  `POST /forms/:id/submissions`; admin editing remains internal.
- Auth model: public submission keeps existing Forms access evaluation;
  internal mode requires admin session or API key scope `forms.submit`.
- RBAC: unchanged admin page/template/widget-template write permissions; Forms
  writes still require existing Forms permissions.
- CSRF: admin writes keep existing CSRF handling; public Forms submission uses
  the existing nonce/HMAC contract instead of CSRF.
- Rate-limit bucket: existing public write bucket for Forms submission; no
  weaker or widget-specific bucket.
- Reject-unknown validation: Form Embed widget schema stays
  `additionalProperties: false`; public request bodies remain allowlisted
  through Forms schemas before persistence.
- Anti-abuse: nonce/CAPTCHA/honeypot remain backend-owned; widget data may
  expose copy, labels, style tokens, selected form IDs, and existing non-secret
  nonce projection fields, but not provider secrets, CAPTCHA secrets, nonce
  secrets, arbitrary scripts, or privileged security configuration.
- Secret handling: no raw submissions, nonce secrets, provider keys, private
  URLs, or secret-like settings in widget JSON, browser cache, reports, or
  changelog notes.

## Testing Requirements

- Docs-only task creation: `git diff --check`.
- Implementation leaves:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/form-embed-editor-wave.test.tsx`
  - focused runtime-script DOM tests when `formRuntimeScript.ts` behavior
    changes.
  - `bun test tests/unit/widgets/validator.test.ts` when Form Embed schema,
    defaults, variants, or registry metadata change.
  - `bun run test:vitest -- tests/vitest/forms/formRuntimeResolver.test.ts`
    when runtime resolved-data projection changes.
  - `bun test tests/integration/routes/forms.test.ts`,
    `bun test tests/unit/forms/submissionService.test.ts`, and
    `bun test tests/security/codersoSecurityGate.test.ts` when public
    submission, nonce, CAPTCHA, honeypot, or payload validation changes.
  - `bun run gates:coderso`, `bun run scan:security:strict`, and
    `bun run precommit` before final family closure.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md`
- `_docs/_WIDGETS/FORM_EMBED.md`
- `_docs/WIDGETS.md` only if this family changes general widget wording.
- `_docs/WIDGET_PACK_MATRIX.md` only if Form Embed readiness/completeness
  changes.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when leaves or umbrella
  move to `Done`.

## Changelog Policy

- This task must not move to `Done` until a changelog entry lists TASK-269 and
  `_docs/_CHANGELOG/README.md` is updated.
- Leaves may share one final TASK-269 changelog entry if the implementation is
  landed as one family; otherwise each completed leaf must be listed.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md` is fixed,
  explicitly excluded as TASK-256 shared scope, or deferred to a named future
  task with a reason.
- TASK-269 leaves do not duplicate implementation already owned by TASK-256.
- Form Embed schema, defaults, normalizer, render, editor, runtime script,
  tests, and docs move together for every new user-facing option.
- Admin preview and public frontend agree on selected form status, resolved
  errors, field rendering, multi-step behavior, submit feedback, and
  success/redirect behavior.
- Public-write hardening remains backend-owned and tested in Bun route/security
  lanes when touched.
- W11 is not fixed by adding widget-owned CAPTCHA/honeypot switches. TASK-269
  may only project existing backend-owned safe metadata; any missing backend
  policy remains a future Forms/public-write task with its own route/security
  owner files.
- Widget docs, Playwright report evidence, task board, changelog, and targeted
  validation evidence are synchronized before closure.
