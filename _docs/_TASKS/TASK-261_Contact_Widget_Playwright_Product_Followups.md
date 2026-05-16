# TASK-261: Contact Widget Playwright Product Followups

# FileName: TASK-261_Contact_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Forms + Admin UI + Runtime Render + Public Write Security + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252-07-13, TASK-256-07
**Status:** To Do

---

## Overview

Create the Contact-only follow-up family for
`_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md`.

TASK-256 owns the shared widget contract from the Playwright report wave. This
family deliberately keeps only the Contact widget product/runtime/editor scope:
`core/widgets/core/contact.tsx`,
`core/admin/ui/widgets/editors/ContactEditors.tsx`, the existing Forms runtime
bridge when the contact form becomes submit-capable, focused tests, and Contact
source-of-truth docs.

The current Contact widget is a presentational contact section with hardcoded
form labels, no real submission target, no `name` attributes, text-only
phone/email details, and a shallow editor surface. TASK-261 turns the report
into execution-ready leaves without widening TASK-256.

## Scope Boundary Against TASK-256

In scope for TASK-261:

- Contact-specific title/description, panel headings, contact labels/icons,
  `tel:`/`mailto:` links, semantic contact details, and section/form labels.
- Contact form field names, IDs, autocomplete, custom labels/placeholders,
  multi-column field layout, and the submit-capable bridge to the existing
  Forms runtime.
- Contact editor mode parity, minimal-variant clarity, Wizard `hours`, better
  map/editor hints, normalization feedback, and Contact-specific editor
  organization.
- Contact map title/description, URL validation, height, fullscreen behavior,
  and fallback copy.
- Contact max width, padding, social display options, and explicit normalizer
  enum handling.
- Final Contact Playwright report/docs/changelog/board closure.

Out of scope for TASK-261:

- Shared editor atomic update helpers, owned by TASK-256-01.
- Generic `Clear`, `none`, color-token, and CSS-variable preservation helpers,
  owned by TASK-256-02. The Contact `borderColor` clear row from the report is
  classified there unless TASK-256-02 explicitly leaves a Contact-only wiring
  task after the helper lands.
- Generic slot placeholder gating, owned by TASK-256-03.
- Shared instance-ID/runtime-binding helpers for unrelated widgets, owned by
  TASK-256-04.
- Any new arbitrary public endpoint URL in widget JSON. Contact submission must
  use the existing Forms runtime contract unless a later architecture task
  explicitly approves a new endpoint family.

If a TASK-261 leaf discovers a missing shared helper, stop and route that helper
through TASK-256 or a new shared task before continuing with Contact-specific
work.

## Source Report Coverage

| Report finding | Route |
|---|---|
| C1, C2, W1, W4, W5, R1, R5, R6, R7 | TASK-261-01 |
| C3, C4, W2, W3, W11, W12, R2, R3, R4, R10 | TASK-261-02 |
| C5, U1, U3, U4, U5, U6, U7, U8, U9, U10 | TASK-261-03 |
| W9, W10, W14, W15, R8, R9 | TASK-261-04 |
| W6, W7, W13, R11, R12 | TASK-261-05 |
| U2 and CSS-variable swatch drift | TASK-256-02, not TASK-261, unless final shared helper needs a Contact-only hook |
| Final fixed/deferred evidence, report refresh, docs/changelog/board closure | TASK-261-06 |

## Current Owner and Test Matrix

| Leaf | Current drift evidence | Owner files | Required test lanes |
|---|---|---|---|
| TASK-261-01 | Report lines 57-60, 67-73, 104, 108-110, 200-203, 227-240, 294, 307, 310 | `contact.tsx`, `ContactEditors.tsx`, Contact docs | Vitest widget render, editor wave when editors expose labels/icons |
| TASK-261-02 | Report lines 61-62, 70-71, 79-80, 105-107, 113, 181-198, 248-253, 295-296, 300, 309, 320 | `contact.tsx`, `ContactEditors.tsx`, `publicSite.tsx`, Forms runtime owners when submission is active | Vitest widget/editor, validator, Forms runtime resolver/script, Bun Forms route/security tests if public submit changes |
| TASK-261-03 | Report lines 47-49, 63, 89, 91-98, 131-156, 170-175, 297, 299, 311 | `ContactEditors.tsx` plus shared editor controls only when already available | Vitest editor wave, widget render smoke for minimal behavior |
| TASK-261-04 | Report lines 77-78, 82-83, 111-112, 161-168, 301, 319 | `contact.tsx`, `ContactEditors.tsx` | Vitest widget/editor and validator when schema changes |
| TASK-261-05 | Report lines 74-75, 81, 114-115, 317-320 | `contact.tsx`, `ContactEditors.tsx`, docs, pack matrix only if readiness changes | Vitest widget/editor, validator when schema changes |
| TASK-261-06 | Report lines 288-330 and every fixed/deferred row | `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md`, `_docs/_WIDGETS/CONTACT.md`, board/changelog/docs | `git diff --check`, targeted production lanes after implementation leaves |

## Sub-Tasks

- [ ] TASK-261-01: Contact Header, Details Links, and Semantic Output
- [ ] TASK-261-02: Contact Form Field Metadata and Public Submission Bridge
- [ ] TASK-261-03: Contact Editor Mode Parity and Minimal Variant UX
- [ ] TASK-261-04: Contact Map Validation, Fallback, and Display Controls
- [ ] TASK-261-05: Contact Layout, Social Links, and Normalizer Polish
- [ ] TASK-261-06: Contact Report, Docs, Changelog, and Closure

## Implementation Order

1. Complete TASK-261-01 first so Contact has stable section/detail headings and
   accessible names before form submission work depends on them.
2. Complete TASK-261-02 next because public submit behavior is the highest-risk
   runtime/security surface.
3. Complete TASK-261-03 after the data model and runtime field contract are
   stable so editor mode copy and grouping target the final controls.
4. Complete TASK-261-04 after the editor helper patterns are stable, then wire
   map validation and display settings.
5. Complete TASK-261-05 after map/form/schema fields are settled, because
   layout/social expansion can otherwise create unnecessary schema churn.
6. Complete TASK-261-06 last after code, tests, docs, Playwright report
   evidence, changelog, and board rows are synchronized.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Prefer a dedicated worktree for implementation because this family touches
  public runtime, admin UI, Forms integration, tests, and docs.
- Stage only `TASK-261*`, Contact owners, explicitly required Forms runtime/API
  owners, tests, docs, report, changelog, and board files.
- Do not stage unrelated TASK-256, TASK-257, TASK-258, or other Playwright
  report changes.
- `_docs/_TASKS/README.md` is shared by many active agents. Keep edits
  append-only and row-scoped; before commit, rerun `git diff -- _docs/_TASKS/README.md`
  and reconcile only the visible task rows/statistics, not another agent's
  uncommitted files.

## Security Contract

This umbrella may make the Contact form submit-capable, but it must reuse the
existing Forms public-write route instead of introducing an arbitrary endpoint.

- Endpoint visibility: public runtime rendering and existing
  `POST /forms/:id/submissions` only when Contact is bound to a Forms record;
  admin editing remains internal.
- Auth model: public submission keeps existing Forms access evaluation; internal
  mode requires admin session or API key scope `forms.submit`.
- RBAC: unchanged admin page/template/widget-template write permissions; Forms
  writes still require existing Forms permissions.
- CSRF: admin writes keep existing CSRF handling; public Forms submission uses
  the existing HMAC nonce contract instead of CSRF.
- Rate-limit bucket: existing public write bucket for Forms submission; no
  weaker or widget-specific bucket.
- Reject-unknown validation: Contact widget schema stays
  `additionalProperties: false`; public request bodies remain allowlisted
  through Forms schemas before persistence.
- Anti-abuse: nonce/CAPTCHA remain backend-owned; widget data may contain copy,
  labels, placeholders, and selected form IDs, but not provider secrets,
  CAPTCHA secrets, nonce secrets, arbitrary scripts, or privileged security
  configuration.
- Secret handling: no raw submissions, nonce values, provider keys, private
  URLs, or secret-like settings in widget JSON, browser cache, reports, or
  changelog notes.

## Testing Requirements

- Docs-only task creation: `git diff --check`.
- Implementation leaves:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when
    public/widget renderer output changes.
  - `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change.
  - `bun run test:vitest -- tests/vitest/forms/formRuntimeResolver.test.ts`
    and focused runtime-script coverage when Contact reuses Forms runtime data.
  - `bun test tests/integration/routes/forms.test.ts`,
    `bun test tests/unit/forms/submissionService.test.ts`, and
    `bun test tests/security/codersoSecurityGate.test.ts` when public
    submission, nonce, CAPTCHA, or payload validation changes.
  - `bun run gates:coderso`, `bun run scan:security:strict`, and
    `bun run precommit` before final family closure.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md`
- `_docs/_WIDGETS/CONTACT.md`
- `_docs/WIDGETS.md` only if this family changes general widget wording.
- `_docs/WIDGET_PACK_MATRIX.md` only if Contact readiness/completeness changes.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when leaves or umbrella
  move to `Done`.

## Changelog Policy

- This task must not move to `Done` until a changelog entry lists TASK-261 and
  `_docs/_CHANGELOG/README.md` is updated.
- Leaves may share one final TASK-261 changelog entry if the implementation is
  landed as one family; otherwise each completed leaf must be listed.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md` is fixed,
  explicitly excluded as TASK-256 shared scope, or deferred to a named future
  task with a reason.
- Contact schema, defaults, normalizer, render, editor, tests, and docs move
  together for every new user-facing option.
- Contact form submission does not silently GET the current page. It either
  submits through the existing Forms runtime with nonce/CAPTCHA/access controls
  or clearly remains non-submitting/presentational.
- Admin preview and public frontend agree on Contact runtime behavior.
- Public-write hardening remains backend-owned and tested in Bun route/security
  lanes when touched.
- Widget docs, Playwright report evidence, task board, changelog, and targeted
  validation evidence are synchronized before closure.
