# TASK-265: Entry Teaser Widget Playwright Product Followups

# FileName: TASK-265_Entry_Teaser_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Dynamic Content + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252-07-03, TASK-256-07
**Status:** To Do

---

## Overview

Create the Entry Teaser-only follow-up family from
`_docs/PLAYWRIGHT/REPORT_ENTRY_TEASER_WIDGET.md`.

TASK-256 owns shared widget-contract drift from the Playwright report wave. This
family owns only `entry-teaser` product, renderer, resolver, editor, and docs
work that belongs to the current widget owners:

- `core/widgets/core/entryTeaser.tsx`
- `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx`
- `core/services/content/entryTeaserResolver.ts`
- `core/server/publicSite.tsx` only for Entry Teaser resolver injection
- admin preview API/client seams only if required for resolved editor preview
- `tests/vitest/widgets/entryTeaser.test.tsx` for Bun-free schema, normalizer,
  and render mapping coverage
- `tests/unit/widgets/entryTeaser.test.tsx` only as a temporary comparison smoke
  or for any remaining Bun-coupled resolver/runtime case that cannot be moved
- `tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
- `tests/vitest/site/publicRenderer.test.tsx`
- `_docs/_WIDGETS/ENTRY_TEASER.md`

This family must not hide shared widget-contract repairs inside an
Entry Teaser patch. If implementation discovers a missing shared editor update
helper, generic design-token picker, generic clear/none behavior, or reusable
runtime accessibility primitive, route that work through TASK-256 first and keep
only the Entry Teaser hook here.

## Scope Boundary Against TASK-256

In scope for TASK-265:

- Entry Teaser admin preview parity for resolved content, source picker error
  recovery, content-type deduplication, manual picker status visibility, and
  listing-mode source semantics.
- Entry Teaser editor IA: friendly source labels, one clear owner for source
  mode controls, visual variant thumbnails, grouped fallback copy/behavior,
  field-toggle preview hints, Auto URL help, and runtime snapshot copy action.
- Entry Teaser CTA behavior: custom URL empty-state editing, live validation,
  optional new-tab behavior, safe `rel`, and local CTA style options through
  the shared safe-link helper once TASK-256-06-02 provides it.
- Entry Teaser renderer/product controls: section heading, heading level,
  media sizing/aspect/object-fit, optional icon/logo media mode, tag limit,
  max-width, image dimensions, and explicit enum hardening.
- Entry Teaser adoption of the shared color-control hook for surface/border
  fields after TASK-256-02 defines the generic color-picker contract.
- Entry Teaser report/docs/changelog/board closure after implementation.

Out of scope for TASK-265:

- Cross-widget editor atomic update helpers, owned by TASK-256-01.
- Generic `Clear`, `none`, color-token, and shared color-picker behavior,
  owned by TASK-256-02. TASK-265-06 may only adopt the resulting shared
  color-control hook for Entry Teaser surface/border fields.
- Generic slot/nested-content placeholder gating, owned by TASK-256-03.
- Generic instance-safe IDs, shared ARIA helpers, and shared runtime binding
  infrastructure, owned by TASK-256-04.
- Broad Content List/listing query redesign beyond the one-item Entry Teaser
  resolver behavior needed by this widget.

## Source Report Coverage

| Report finding | Route |
|---|---|
| E-05, E-06, E-07, E-13, T-05, T-07, B-06 | TASK-265-01 |
| E-01, E-02, E-03, E-04, E-09, E-10, E-12 | TASK-265-02 |
| E-08, E-11, B-04, B-05, T-04 | TASK-265-03 |
| B-01, B-02, B-03, B-07, B-08, T-01, T-02, T-03, T-06 | TASK-265-04 |
| E-14 | TASK-265-06 after TASK-256-02 defines the shared color-control hook |
| Final fixed/routed/deferred evidence, docs/changelog/board closure | TASK-265-05 |

## Current Owner and Test Matrix

| Leaf | Current drift evidence | Owner files | Required test lanes |
|---|---|---|---|
| TASK-265-01 | Report sections 3.2 E-05/E-06/E-07/E-13, 3.3 T-05/T-07, 3.1 B-06, admin/frontend parity table | `entryTeaserResolver.ts:84-186`, `EntryTeaserEditors.tsx:151-230,353-575`, optional admin preview route/client, `publicSite.tsx:301-303` | Vitest editor wave, Vitest widget schema/render suite, Bun route tests if an internal preview endpoint is added, Bun resolver tests, Bun runtime hydration when `publicSite.tsx` resolver injection changes, public renderer smoke |
| TASK-265-02 | Report sections 3.2 E-01/E-02/E-03/E-04/E-09/E-10/E-12 | `EntryTeaserEditors.tsx:68-76,117-149,577-974`, `entryTeaser.tsx` only for schema fields needed by fallback/source ownership | Vitest editor wave, Vitest widget render/normalizer smoke when preview data changes |
| TASK-265-03 | Report sections 3.1 B-04/B-05, 3.2 E-08/E-11, 3.3 T-04 | `entryTeaser.tsx:43-47,239-249,372-379,455-568`, `EntryTeaserEditors.tsx:781-821`, shared `resolveWidgetLinkAttrs` from TASK-256-06-02 | Vitest widget schema/render suite, Vitest editor wave, security gate only if scanner-relevant href handling changes |
| TASK-265-04 | Report sections 3.1 B-01/B-02/B-03/B-07/B-08, 3.3 T-01/T-02/T-03/T-06 | `entryTeaser.tsx:7-162,164-201,251-312,431-583`, `EntryTeaserEditors.tsx:745-779,889-948`, docs | Vitest widget schema/render suite, public renderer, Vitest editor wave for new controls |
| TASK-265-06 | Report section 3.2 E-14 | `EntryTeaserEditors.tsx:889-948`, `entryTeaser.tsx:474-478`, shared TASK-256-02 color-control hook | Vitest editor wave, Vitest widget render smoke, shared color-control tests from TASK-256-02 if touched |
| TASK-265-05 | Report section 7 plus every fixed/routed/deferred row | `_docs/PLAYWRIGHT/REPORT_ENTRY_TEASER_WIDGET.md`, `_docs/_WIDGETS/ENTRY_TEASER.md`, board/changelog/docs | `git diff --check`, targeted production lanes after implementation leaves |

## Sub-Tasks

- [ ] TASK-265-01: Entry Teaser Source Resolution and Admin Preview
- [ ] TASK-265-02: Entry Teaser Editor IA, Fallback, and Variant Preview
- [ ] TASK-265-03: Entry Teaser CTA Link and URL Feedback
- [ ] TASK-265-04: Entry Teaser Layout, Media, Tags, and Heading Controls
- [ ] TASK-265-06: Entry Teaser Shared Color Control Adoption
- [ ] TASK-265-05: Entry Teaser Report, Docs, and Closure

## Implementation Order

1. Complete TASK-256-07 classification first so shared-contract rows stay out of
   this family.
2. Complete TASK-265-01 before editor polish because resolved preview and source
   errors define what the editor can truthfully display.
3. Complete TASK-265-02 after source preview behavior is stable so editor IA can
   group real states instead of fallback-only states.
4. Complete TASK-256-06-02 before TASK-265-03 if new-tab/safe-link work needs
   the shared `resolveWidgetLinkAttrs()` helper; TASK-265-03 then wires only the
   Entry Teaser schema/editor/render contract.
5. Complete TASK-265-04 after the CTA and source contracts land, then add
   renderer/media/layout controls with schema/default/normalizer coverage.
6. Complete TASK-265-06 after TASK-256-02 lands the shared color-control
   contract; only adopt it for Entry Teaser surface/border fields.
7. Complete TASK-265-05 last with report evidence, docs, changelog, board sync,
   and final validation.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Use a dedicated worktree for implementation because `_docs/_TASKS/README.md`
  is a shared hotspot while multiple agents are creating report-derived task
  families.
- Re-read `_docs/_TASKS/README.md` immediately before patching board rows, then
  edit only the TASK-265 rows and the visible statistics.
- Stage only selected `TASK-265*` files plus required Entry Teaser owners,
  targeted tests, report/docs/changelog, and board rows.
- Do not stage unrelated TASK-256, TASK-261, TASK-262, TASK-263, TASK-264, or
  other Playwright report changes.

## Security Contract

TASK-265 must not add a public write endpoint.

- Endpoint visibility: public runtime rendering is unchanged; admin editing and
  any resolved-preview endpoint are internal under `/admin/api/*`.
- Auth model: public pages remain anonymous reads; internal preview reads
  require an authenticated admin session or API key with `content:read`.
- RBAC: page/template/widget-template write permissions remain unchanged; any
  preview resolver route uses `content:read` only.
- CSRF: admin writes keep existing CSRF handling. If the resolved-preview seam is
  implemented as `POST` with a JSON widget payload, use the existing admin API
  CSRF behavior for unsafe methods even though the operation is read-only.
- Rate-limit bucket: internal admin read/default bucket only; no public write or
  weaker unauthenticated bucket.
- Reject-unknown validation: every new persisted field must be listed in
  `entryTeaserSchema`, normalized in `normalizeEntryTeaserData()`, and covered
  by validator tests. Preview payload schemas must reject unknown keys before
  calling the resolver.
- Anti-abuse: CTA custom URLs must use existing safe-href normalization, and no
  raw HTML/script/class-name passthrough, unbounded external fetch, nonce,
  CAPTCHA secret, or privileged token may enter widget JSON.
- Secret handling: no secrets in widget data, browser cache, debug snapshot,
  Playwright report evidence, changelog, or DOM attributes.

## Testing Requirements

- Docs-only task planning: `git diff --check`.
- Implementation leaves:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/entryTeaser.test.tsx`
  - migrate or split `tests/unit/widgets/entryTeaser.test.tsx` so Bun-free
    Entry Teaser schema, normalizer, and render mapping assertions no longer
    remain Bun-owned; run the legacy Bun suite only as comparison smoke or when
    a retained case truly depends on Bun/runtime seams
  - focused `tests/integration/routes/*` coverage when an internal preview route
    is added or changed
  - focused Bun runtime/public-site coverage when `publicSite.tsx` resolver
    injection changes, because `publicRenderer.test.tsx` only proves already
    resolved payload rendering.
  - `bun run gates:coderso` plus targeted accessibility/security/reliability
    lanes when a leaf changes release-gated behavior
  - `bun run scan:security:strict` and `bun run precommit` before final family
    closure

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_ENTRY_TEASER_WIDGET.md`
- `_docs/_WIDGETS/ENTRY_TEASER.md`
- `_docs/WIDGETS.md` only if a general widget contract changes; do not change it
  for Entry Teaser-only fields.
- `_docs/WIDGET_PACK_MATRIX.md` only if Entry Teaser readiness/completeness
  affects the Listings pack.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when leaves or umbrella
  move to `Done`.

## Changelog Policy

- This task must not move to `Done` until a changelog entry lists TASK-265 and
  `_docs/_CHANGELOG/README.md` is updated.
- Leaves may share one final TASK-265 changelog entry if the implementation is
  landed as one family; otherwise each completed leaf must be listed.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_ENTRY_TEASER_WIDGET.md` is fixed,
  explicitly routed to TASK-256 shared-contract scope, or deferred to a named
  future task with a reason.
- Entry Teaser admin preview and public frontend agree on resolved, empty, and
  missing-source states without requiring publication to inspect final teaser
  content.
- Entry Teaser schema/defaults/normalizer/render/editor/tests move together for
  every new persisted option.
- Listing-mode behavior remains compatible with the Content List resolver while
  exposing only Entry Teaser-owned one-item semantics.
- Public CTA output remains safe for internal, relative, hash, and allowed HTTP
  links, and new-tab behavior always emits safe `rel` attributes.
- Widget docs, Playwright report evidence, task board, changelog, and targeted
  validation evidence are synchronized before closure.
