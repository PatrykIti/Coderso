# TASK-285: Split Layout Widget Playwright Product Followups

# FileName: TASK-285_Split_Layout_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Layout + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252-05-04, TASK-256-01, TASK-256-02, TASK-256-03, TASK-256-05-02
**Status:** Done (2026-05-21)

---

## Overview

Create the Split Layout-specific follow-up backlog from
`_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md`.

TASK-256 owns the shared widget-contract repairs from the Playwright report
wave. TASK-285 owns only product, editor, and runtime polish that belongs to the
`split-layout` widget itself:

- `core/widgets/core/splitLayout.tsx`;
- `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx`;
- `tests/vitest/widgets/splitLayout.test.tsx`;
- `tests/vitest/ui/split-layout-editor-wave.test.tsx`;
- `_docs/_WIDGETS/SPLIT_LAYOUT.md`;
- `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md`.

Shared prerequisites from TASK-256-01, TASK-256-02, TASK-256-03, and
TASK-256-05-02 landed on 2026-05-17. TASK-285 should consume those shipped
contracts and must not wait for or reimplement them.

This family must not hide shared contract work inside Split Layout-only leaves.
If a leaf needs a reusable editor atomic update helper, generic `Clear`/`none`
token behavior, public placeholder gating, or cross-widget mode ownership, split
that piece back to TASK-256 before continuing.

## Scope Boundary Against TASK-256

TASK-285 implements only Split Layout product behavior and UX. It explicitly
excludes these shared-contract rows:

- BUG-01 and the core of ISSUE-01: variant card/preset changes must update
  persisted ratio data through the shared atomic update contract in
  TASK-256-05-02 and TASK-256-01. TASK-285 may improve Split Layout card
  previews and active-ratio disclosure only after that helper exists.
- BUG-02: duplicate `none` and `0` gap-token semantics stay in TASK-256-02.
  TASK-285 may improve Split Layout gap labels after consuming that shared
  token decision.
- Public empty-slot placeholder gating stays in TASK-256-03. TASK-285 may add
  Split Layout admin/editor guidance only through the final preview-context
  contract.
- Any generic Wizard/Visual/Advanced mode reassignment stays in TASK-256-01.
  TASK-256-08 may record final routed/deferred status, but it is not the
  implementation owner. TASK-285 may make Split Layout Advanced diagnostics
  useful without moving shared ownership rules.

## Report Classification Matrix

| Report finding | Owner | TASK-285 action |
|---|---|---|
| BUG-01 | TASK-256-05-02 / TASK-256-01 | Excluded. Atomic variant+ratio persistence is shared editor contract repair. |
| BUG-02 | TASK-256-02 | Excluded. Duplicate zero/off token semantics are shared token-contract repair. |
| BUG-03 | TASK-285-01 | Add Split Layout-only mobile ratio/product copy so `keep` mode is explicit and not silently coupled to tablet ratio. |
| BUG-04 | TASK-285-01 | Add contextual reverse-on-mobile behavior, labels, and preview feedback without changing shared editor mode ownership. |
| ISSUE-01 | TASK-256-05-02 plus TASK-285-02 | Shared data sync stays TASK-256; TASK-285 adds Split Layout-specific variant miniatures and current-ratio disclosure after sync lands. |
| ISSUE-02 | TASK-285-03 | Replace redundant Pane slots copy with actionable Split Layout editor guidance that does not duplicate shared slot metadata. |
| ISSUE-03 | TASK-285-04 | Make Advanced mode useful through Split Layout diagnostics and responsive token explanation, or explicitly narrow it to diagnostics. |
| ISSUE-04 | TASK-285-05 | Add Split Layout-specific gap scale labels/help once shared `none`/`0` semantics are settled. |
| ISSUE-05 | TASK-285-02 | Add graphical Split Layout variant miniatures/cards. |
| ISSUE-06 | TASK-285-03 | Improve empty-pane admin preview guidance through the shared preview-context gate; public output stays TASK-256-03-owned. |

## Current Owner and Test Matrix

| Area | Current owners | Current tests | New or changed tests |
|---|---|---|---|
| Schema, defaults, normalizer, renderer | `core/widgets/core/splitLayout.tsx` | `tests/vitest/widgets/splitLayout.test.tsx`, `tests/vitest/widgets/renderer.test.tsx`, `tests/vitest/widgets/styleNoneTokens.test.tsx` | Add schema/runtime assertions for optional mobile ratio, contextual empty-state rendering, gap labels when tied to normalized tokens, and backward compatibility. |
| Wizard/Visual/Advanced editors | `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` | `tests/vitest/ui/split-layout-editor-wave.test.tsx`, `tests/vitest/pageBuilder/visualPanel.test.tsx` when mode ownership changes | Add editor-flow assertions for mobile ratio/reverse guidance, variant miniatures, slot guidance, Advanced diagnostics, and gap helper copy. |
| Shared contract adjacency | TASK-256 leaves | `tests/vitest/widgets/styleNoneTokens.test.tsx`, shared page-builder/editor tests | Do not duplicate. Run only when a TASK-285 leaf consumes already-landed shared helpers. |
| Widget docs and source report | `_docs/_WIDGETS/SPLIT_LAYOUT.md`, `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md` | docs diff checks | Update fixed/deferred/routed status and final usage contract after implementation leaves finish. |

## Sub-Tasks

- [x] TASK-285-01: Split Layout Mobile Ratio and Reverse Behavior
- [x] TASK-285-02: Split Layout Variant Card Preview and Ratio Disclosure
- [x] TASK-285-03: Split Layout Pane Slot Guidance and Empty State
- [x] TASK-285-04: Split Layout Advanced Diagnostics and Mode Ownership
- [x] TASK-285-05: Split Layout Gap Labels and Spacing Context
- [x] TASK-285-06: Split Layout Report Docs and Closure

## Implementation Order

1. Consume the landed TASK-256-05-02 shared variant+ratio atomic update path;
   do not reimplement it inside TASK-285 leaves.
2. Complete TASK-285-01 before UI preview polish because mobile behavior decides
   what ratio previews must show.
3. Complete TASK-285-02 on top of the landed variant/data sync contract.
4. Complete TASK-285-03 on top of the landed TASK-256-03 public-vs-preview
   placeholder gate.
5. Complete TASK-285-04 after mobile and slot guidance are stable so Advanced
   diagnostics can report the final responsive behavior.
6. Complete TASK-285-05 on top of the landed TASK-256-02 `none`/zero token
   semantics.
7. Complete TASK-285-06 last with report evidence, widget docs, changelog, board
   sync, and final validation.

## Git Scope Safeguards

- Use a dedicated worktree for implementation because several active agents
  touch `_docs/_TASKS/README.md`.
- Re-read `_docs/_TASKS/README.md` immediately before editing it and add only
  the TASK-285 rows/stat change.
- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Stage only `TASK-285*`, Split Layout owners/tests/docs/report files, and
  required changelog/board files.
- Verify `git diff --cached --name-only` before every commit so TASK-256,
  TASK-279 through TASK-284, or unrelated Playwright work does not enter this
  scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged admin UI and public runtime widget rendering.
- RBAC: unchanged page/template/widget-template write permissions.
- CSRF: unchanged because no write routes are introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: every new persisted Split Layout field must be
  added to `splitLayoutSchema`, normalized in `normalizeSplitLayoutData()`, and
  covered by validator/runtime tests.
- Anti-abuse: fields must remain bounded enum/boolean values only; do not add
  raw HTML, unbounded class names, scripts, inline event handlers, public write
  behavior, or privileged diagnostics.
- Secret handling: no secrets in widget data, diagnostics, Playwright evidence,
  DOM markers, browser storage, or changelog notes.

## Testing Requirements

- For docs-only task planning: run `git diff --check`.
- For implementation leaves:
  - `bun run test:vitest -- tests/vitest/widgets/splitLayout.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/split-layout-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when shared
    SSR renderer output or slot rendering changes
  - `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` only
    when a leaf consumes final TASK-256 token semantics
  - `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change
  - `bun test tests/unit/widgets/registry.test.ts` if widget definition metadata
    changes
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso` plus targeted release-gate suites when a leaf
    changes accessibility or public runtime output
  - `bun run scan:security:strict` and `bun run precommit` before final closure

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md` with fixed,
  deferred, or TASK-256-routed status for every Split Layout finding.
- Update `_docs/_WIDGETS/SPLIT_LAYOUT.md` when data, editor, runtime, or
  user-facing behavior changes.
- Update `_docs/WIDGETS.md` only if the source-of-truth shared widget contract
  changes; most TASK-285 work should stay Split Layout-only.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if pack readiness/completeness
  changes.
- Add a final changelog entry and update `_docs/_CHANGELOG/README.md` when this
  family is completed.
- Keep `_docs/_TASKS/README.md` synchronized on every status transition.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and
  `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-285-06 may create the final
  umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Every finding in `REPORT_SPLIT_LAYOUT_WIDGET.md` is implemented by a TASK-285
  leaf, routed to an exact TASK-256 physical owner, or explicitly deferred with
  a reason in TASK-285-06.
- Split Layout schema, defaults, normalizer, renderer, editors, tests, docs, and
  report evidence stay synchronized for every new product field.
- TASK-285 leaves do not weaken or duplicate TASK-256 shared-contract repairs.
- Admin preview and frontend rendering have textual Playwright evidence after
  implementation closure.

## Outcome

- Split Layout now owns an optional mobile ratio with tablet fallback, truthful phone-order copy, and an explicit `data-split-ratio-mobile` runtime marker.
- Variant cards now show bounded previews plus effective desktop/tablet/mobile ratio disclosure while consuming the landed shared atomic preset sync contract.
- Visual now uses actionable pane guidance, Advanced is read-only diagnostics, and gap labels explain both scale context and the legacy `Gap 0` compatibility path.
- Preview-only empty-pane help remains gated out of public runtime, so the TASK-256 placeholder contract stays intact.

## Validation Notes (2026-05-21)

- `bun run test:vitest -- tests/vitest/widgets/splitLayout.test.tsx tests/vitest/ui/split-layout-editor-wave.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx` - passed (`4` files, `51` tests)
- `bun test tests/unit/widgets/validator.test.ts` - passed
- `bun --cwd core lint` - passed
- `bun --cwd core lint:types` - passed
- `bun run gates:coderso` - passed
- Family-wide `git diff --check` and `bun run precommit` passed; the strict scan tooling limitation is recorded in `TASK-285-06`.

## Completion Notes (2026-05-21)

- The TASK-285 family is closed end-to-end in the dedicated Split Layout worktree.
- Shared TASK-256 prerequisites were consumed instead of reimplemented, and all report findings now have explicit owners and closure evidence.
