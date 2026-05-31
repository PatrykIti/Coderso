# TASK-289: Team Widget Playwright Product Followups

# FileName: TASK-289_Team_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Team + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256, TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-06-04, TASK-256-08
**Status:** Done (2026-05-22)

---

## Overview

Create the Team-only follow-up family for
`_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md`.

This family owns product and editor UX improvements that are specific to the
`team` widget. Shared widget-contract repairs stay in TASK-256, especially
atomic editor updates, safe public link/media output, section/header
accessibility baselines, clear/none token behavior, and generic mode ownership.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md`

Live owners inspected while drafting:

- `core/widgets/core/team.tsx`
- `core/admin/ui/widgets/editors/TeamEditors.tsx`
- `tests/vitest/widgets/team.test.tsx`
- `tests/vitest/ui/team-editor-wave.test.tsx`
- `tests/vitest/widgets/renderer.test.tsx`
- `tests/vitest/widgets/widgetSafeHref.test.ts`
- `tests/vitest/widgets/styleNoneTokens.test.tsx`
- `tests/unit/widgets/validator.test.ts`
- `tests/unit/widgets/registry.test.ts`
- `_docs/_WIDGETS/TEAM.md`
- `_docs/WIDGETS.md`
- `_docs/WIDGET_PACK_MATRIX.md`

## TASK-256 Exclusion Matrix

The following report findings are intentionally excluded from TASK-289 because
TASK-256 already owns them as shared widget-contract or current-control safety
work.

| Report finding | Evidence | Owner task | Reason |
|---|---|---|---|
| BUG-01 resolver default clarity | `REPORT_TEAM_WIDGET.md:156-167` | TASK-256-06-04 | Existing resolver/default cleanup in the shared Team contract leaf. |
| BUG-02 new member `photo: ""` payload | `REPORT_TEAM_WIDGET.md:169-172` | TASK-256-06-04 | Current-control normalization/safeguard cleanup, not a product expansion. |
| BUG-03 / UX-04 spotlight columns are misleading | `REPORT_TEAM_WIDGET.md:174-185,230-232,367-372` | TASK-256-06-04 | Truthful existing control behavior belongs to the shared report-repair leaf. |
| BUG-04 / A1 section accessibility label | `REPORT_TEAM_WIDGET.md:188-191,332` | TASK-256-06-04 | Shared section/header accessibility baseline. |
| BUG-05 / BF-03 / A2 heading level | `REPORT_TEAM_WIDGET.md:193-196,281-283,333` | TASK-256-06-04 | Shared heading semantics baseline. TASK-289 may later add Team-specific typography controls, but not the baseline fix. |
| BUG-06 / BF-06 / A4 social safe-link output | `REPORT_TEAM_WIDGET.md:198-201,294-296,335,371` | TASK-256-06-04 | Safe public href/rel/target behavior is shared runtime safety. |
| BUG-07 / A3 / A6 / A8 member card/avatar a11y | `REPORT_TEAM_WIDGET.md:203-206,334,337,339` | TASK-332 | TASK-289 closure audit reopened the remaining shared Team member-identity accessibility truthfulness drift after the section label, lazy image, and invalid-photo baseline had already landed. |
| BUG-08 duplicate runtime normalization | `REPORT_TEAM_WIDGET.md:208-211` | TASK-256-06-04 | Runtime cleanup without product-surface expansion. |
| UX-05 Wizard role fields | `REPORT_TEAM_WIDGET.md:234-236` | TASK-256-06-04 | Existing Wizard/profile setup drift is already scoped in the shared Team contract leaf. |
| UX-06 spotlight count normalization | `REPORT_TEAM_WIDGET.md:238-240` | TASK-256-06-04 | Existing Wizard variant/count truthfulness is already scoped there. |
| UX-10 empty social-link URL default | `REPORT_TEAM_WIDGET.md:255-258` | TASK-256-06-04 | Existing unsafe/misleading default is a shared safety fix. |
| UX-11 destructive member-count reduction | `REPORT_TEAM_WIDGET.md:260-264` | TASK-256-06-04 | Existing count selector data-loss protection is already scoped there. |
| BF-02 / A5 lazy avatar images | `REPORT_TEAM_WIDGET.md:275-279,336` | TASK-256-06-04 | Baseline media performance/safety. |
| BF-12 image alt context | `REPORT_TEAM_WIDGET.md:318-320` | TASK-256-06-04 | Baseline media accessibility. |

TASK-289 implementation leaves may depend on the TASK-256 result, but they must
not duplicate those fixes. If a leaf touches the same owner file, it must build
on the landed TASK-256 behavior and keep the diff limited to Team product
fields, editor IA, and widget-specific presentation.

## TASK-289 Scope Matrix

| Report finding | TASK-289 owner | Notes |
|---|---|---|
| UX-01 remove member without confirmation | TASK-289-01 | Member-profile destructive edit UX, separate from count-selector data loss. |
| UX-02 social links are separated from member content | TASK-289-01 | Team-specific editor IA; keep safe link rendering in TASK-256. |
| UX-08 social link remove without confirmation | TASK-289-01 | Per-member repeated-item destructive edit UX. |
| UX-09 add member button only at the bottom | TASK-289-01 | Team editor efficiency for long member lists. |
| BF-04 choose spotlight lead member | TASK-289-02 | Product expansion after TASK-256 makes spotlight columns/count truthfulness safe. |
| UX-03 spotlight lead indicator beyond baseline badge | TASK-289-02 | Team-specific spotlight authoring guidance tied to lead selection. |
| UX-07 media-library image picking | TASK-289-03 | Media authoring and preview flow. Basic URL validation remains TASK-256. |
| BF-01 section background | TASK-289-04 | Team-specific section surface control. |
| BF-05 header alignment and title size | TASK-289-04 | Team header presentation controls. Baseline heading semantics remains TASK-256. |
| BF-07 / A7 contrast validator for Team colors | TASK-289-04 | Local style feedback for Team section/card colors. |
| BF-08 header eyebrow | TASK-289-04 | Team-specific header content field. |
| BF-09 CTA below Team section | TASK-289-04 | Bounded Team section CTA; safe href helper remains TASK-256. |
| BF-10 card border width | TASK-289-04 | Team card presentation token. |
| BF-11 larger team presentation beyond 12 members | TASK-289-05 | Decide bounded pagination/load-more or explicit no-support policy. |
| BF-13 compact-list mobile bio density | TASK-289-05 | Team responsive presentation option. |
| Report fixed/deferred notes, widget docs, changelog, board closure | TASK-289-06 | Final evidence pass. |

## No-Action Report Findings

| Report finding | Decision | Reason |
|---|---|---|
| Existing admin canvas and public frontend parity | No TASK-289 task | Report confirms parity. Future leaves must preserve it through regression tests. |
| Minimum one member and max five social links per member | No TASK-289 task | Current bounds are intentional and already represented in schema/defaults/tests. |
| BF-12 wording preference for `alt="Photo of ..."` | Shared TASK-332 | Closure audit reopened the richer Team avatar identity wording as the truthful shared owner instead of extending TASK-289 product scope. |

## Sub-Tasks

- [x] TASK-289-01: Team Member Editor IA and Destructive Edit UX
- [x] TASK-289-02: Team Spotlight Lead and Variant Guidance
- [x] TASK-289-03: Team Photo Authoring and Media Picker
- [x] TASK-289-04: Team Header Surface Typography and CTA Controls
- [x] TASK-289-05: Team Large Team and Compact Mobile Presentation
- [x] TASK-289-06: Team Report Docs Changelog and Closure

## Implementation Order

1. Rebase over TASK-256 shared fixes first. TASK-289 leaves must build on the
   shared safe-link, media, accessibility, and editor-control baselines instead
   of duplicating them.
2. Complete TASK-289-01 before adding more repeated member fields so destructive
   edit behavior protects the expanded member model.
3. Complete TASK-289-02 after TASK-256 has made spotlight count/columns
   truthful. Lead selection should not mask a still-misleading columns control.
4. Complete TASK-289-03 before large visual style additions so photo picking,
   preview, and recovery have a stable editor placement.
5. Complete TASK-289-04 after the section/header accessibility baseline lands.
   Presentation fields must layer on top of the final heading/label contract.
6. Complete TASK-289-05 last among implementation leaves because it changes
   display density and may depend on the final member/card presentation model.
7. Complete TASK-289-06 only after code, tests, report evidence, widget docs,
   changelog, and board state are synchronized.

## Git Scope Safeguards

- Work in a dedicated branch/worktree for implementation.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-289*` files, Team owner files, Team tests, Team docs/report
  files, and required changelog/board files.
- Because `_docs/_TASKS/README.md` is shared by parallel agents, re-read it
  immediately before staging and verify the cached diff contains only the
  TASK-289 rows/counts owned by the current commit.
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
- Reject-unknown validation: any new Team schema fields must keep
  `additionalProperties: false`, normalize legacy payloads, and add validator
  tests when schema/defaults change.
- Anti-abuse: photo, social, and CTA fields must reuse safe URL/media helpers
  from TASK-256, reject unsafe schemes, and must not accept raw HTML, script,
  arbitrary class names, or browser-stored secrets.
- Secret handling: implementation leaves must not place private profile data,
  media tokens, provider keys, signed/private URLs, privileged settings, or
  secret-bearing diagnostics in widget JSON, browser cache, public DOM output,
  report evidence, or changelog entries.

## Testing Requirements

Docs-only task creation:

- `git diff --check`
- `bun run precommit` before the manual commit, unless the configured hook runs
  it automatically and the committer records that proof.

Implementation leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/team.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when renderer
  output markers, public rendering, or shared widget rendering changes.
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` when
  Team social/CTA link behavior or safe-link helper use changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  Team style token adjacency changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer
  fields change.
- `bun test tests/unit/widgets/registry.test.ts` if variant registration or
  widget registry wiring changes.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md` with textual fixed/deferred
  evidence for each implemented leaf. Do not commit PNG files.
- Update `_docs/_WIDGETS/TEAM.md` when schema, editor modes, runtime variants,
  or behavior change.
- Update `_docs/WIDGETS.md` only if a global widget contract changes. Prefer
  TASK-256 for shared contract text.
- Update `_docs/WIDGET_PACK_MATRIX.md` if Team pack readiness or completeness
  changes.
- Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md` when the family is completed.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.

## Acceptance Criteria

- Every Team report finding is either owned by TASK-256, covered by a TASK-289
  physical leaf, explicitly no-actioned, or deferred by TASK-289-06 with a
  reason.
- TASK-289 task docs do not duplicate TASK-256 shared-contract implementation
  scope.
- Each implementation leaf names concrete files, data flow, error handling,
  regression tests, documentation updates, and validation commands.
- Runtime changes preserve backward compatibility for existing `team` payloads
  unless the leaf documents and tests a migration/normalizer path.
- Final closure records report evidence, task status updates, changelog, and
  the exact validation output.
