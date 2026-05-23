# TASK-336: Widget Editor Contract V2 and One-Time Wizard Program

# FileName: TASK-336_Widget_Editor_Contract_V2_and_One_Time_Wizard_Program.md

**Priority:** High
**Category:** Widgets + Page Builder + Admin UI + UX Contract + Playwright
**Estimated Effort:** Very Large
**Dependencies:** TASK-256, TASK-287, TASK-288, TASK-334
**Status:** To Do

---

## Overview

Define and ship a machine-readable `wizard / visual / advanced` editor
contract for all 38 page-builder widgets before changing the user-facing mode
model.

The current state is better than the first Playwright audit, but it is still
not stable enough to move to a one-time Wizard UX. Several widgets still mix old
and new editor surfaces, duplicate writable controls between `Visual` and
`Advanced`, or use local section primitives that cannot be reliably tested with
Playwright. The one-time Wizard flow must therefore be a later migration, not
the first fix.

Execution rule: fix ownership and enforceability first, remove per-widget
duplication second, then introduce the one-time Wizard and daily-work tabs.

## Current Evidence

- `_docs/PLAYWRIGHT/REPORT_WIDGET_CONTRACT_REAUDIT_2026_05_23.md` records the
  latest 38-widget audit and separates P0, P1, P2, public CSS, and fixture
  gaps.
- `core/widgets/types.ts` defines `WidgetDefinition.editor` with
  `wizard`, `visual`, and `advanced`, but there is no explicit section/control
  ownership contract.
- `core/widgets/registry.ts` registers widgets without validating editor-mode
  semantics.
- `core/admin/ui/widgets/editors/WidgetEditorControls.tsx` contains shared
  editor primitives, but not every widget uses them consistently.
- `tests/README.md` states that Bun owns runtime-kernel validation and Vitest
  owns Bun-free tests, including admin/UI tests.

## External UX Research Notes

These references do not dictate Coderso's exact UX, but they clarify the common
patterns and failure modes in mature builders:

- Elementor control tabs are wrappers for sections and controls, and every tab
  and inner tab has an explicit code-level name. Coderso should keep explicit
  stable section/control ids instead of deriving ids from user-facing titles.
  Source: https://developers.elementor.com/docs/editor-controls/control-tabs/
- WordPress Block Supports let a block declare support for shared features such
  as color, dimensions, layout, spacing, and typography; the editor then adds
  the corresponding attributes and UI. Coderso should move common style
  ownership into shared primitives and contracts instead of per-widget ad hoc
  duplicates. Source:
  https://developer.wordpress.org/block-editor/reference-guides/block-api/block-supports/
- Sanity Studio field groups change how and where fields appear in Studio
  without changing document structure, and groups have explicit unique names.
  Coderso should model `Wizard`, `Visual`, and `Advanced` as UI/view contracts
  over one persisted widget schema, not three competing schemas. Source:
  https://www.sanity.io/docs/studio/field-groups
- Framer Property Controls expose component props through an explicit
  author-defined interface. Coderso should follow the same principle by making
  writable paths, read-only paths, and section roles explicit per widget.
  Source: https://www.framer.com/developers/property-controls
- Builder input types define the editing interface for custom components and
  data models, and an `advanced` option can move rarely used inputs under a
  "Show More" area. Coderso should use Advanced for rare/technical visibility,
  but still prevent it from becoming a second writable Visual editor. Source:
  https://www.builder.io/c/docs/input-types

## Target Contract

Every widget must declare an editor contract that answers these questions:

- Which sections appear in `wizard`, `visual`, and `advanced`.
- Which persisted widget paths are writable in each section.
- Which paths are visible only as read-only summaries or diagnostics.
- Which section ids are stable, explicit, and safe for Playwright selectors.
- Which duplicate writable paths are intentionally allowed, with a written
  reason and an expiry or follow-up owner.
- Which mode owns first-time setup, daily work, visual styling, source binding,
  runtime diagnostics, and technical ids.

Recommended semantic split:

- `Wizard`: first-time setup only, including source choice, variant choice,
  required content seed, and clear onboarding defaults.
- `Visual`: daily authoring and design, including content that users edit after
  setup, layout variants, copy, typography, colors, spacing, cards, media,
  responsive presentation, and public-facing affordances.
- `Advanced`: technical controls, resolved runtime summaries, diagnostics,
  internal ids, source payload previews, accessibility/debug summaries, and
  intentionally read-only mirrors where visibility is useful but ownership stays
  elsewhere.

## Scope

- Add a typed editor-mode contract to widget definitions and the registry path.
- Add DOM metadata and shared primitives that Playwright can inspect reliably.
- Build a Playwright CLI smoke harness for all 38 widgets across admin editor
  modes and public CSS/overflow checks.
- Fix P0 widgets where one editor is reused in all three modes.
- Fix P1 widgets where `Advanced` still repeats `Visual` controls.
- Fix P2 widgets where local primitives, title-derived ids, or style/source
  ownership drift make the contract untestable.
- Add public fixture and CSS checks for widgets that currently pass in admin but
  fail or drift on the frontend.
- Introduce the one-time Wizard only after the contract is enforced and the
  daily-work tabs are unambiguous.

## Out of Scope

- Replacing the page-builder data model with a new persistence format.
- Adding arbitrary CSS, raw script fields, or unsafe escape hatches to satisfy
  advanced users.
- Shipping the one-time Wizard before every widget has a tested mode contract.
- Treating Claude or any external builder as the source of truth. Claude may be
  used for UI/UX review, but code, tests, reports, and repo docs are decisive.

## Sub-Tasks

- [ ] TASK-336-01: Editor Contract Type and Registry Validator
- [ ] TASK-336-02: Editor DOM Metadata and Control Ownership Enforcement
- [ ] TASK-336-03: Playwright 38 Widget Fixture and Smoke Harness
- [ ] TASK-336-04: Template Section Mode Ownership
- [ ] TASK-336-05: Search Box Mode Ownership
- [ ] TASK-336-06: Listing Filters Mode Ownership
- [ ] TASK-336-07: Tabs Mode Ownership
- [ ] TASK-336-08: Accordion Mode Ownership
- [ ] TASK-336-09: Posts Feed Mode Ownership
- [ ] TASK-336-10: Form Embed Mode Ownership
- [ ] TASK-336-11: Hero Mode Ownership and Legacy Control Migration
- [ ] TASK-336-12: Stats KPI Mode Ownership
- [ ] TASK-336-13: P2 Source Style and Diagnostics Cleanup
- [ ] TASK-336-14: Layout Widget Advanced Technical Token Policy
- [ ] TASK-336-15: Renderer Fixture Overflow and Team UX Contract
- [ ] TASK-336-16: Existing One-Time Wizard Lifecycle and Daily Work Tabs
- [ ] TASK-336-17: Report Docs Changelog and Closure
- [ ] TASK-336-18: Remaining Page Builder Widget Contract Coverage

Numbering note: `TASK-336-18` was added after the initial closure leaf during
task-family audit. It must land before `TASK-336-16` and `TASK-336-17`; closure
still remains last by dependency, not by numeric order.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/types.ts` | Add the editor contract types and attach the contract to `WidgetDefinition`. |
| `core/widgets/editorContract.ts` | New pure helpers that validate section ids, writable/read-only paths, duplicate ownership, and strict/soft modes. |
| `core/widgets/registry.ts` | Run the soft validator when widgets register, and expose a strict helper for tests/closure. |
| `core/admin/ui/widgets/editors/WidgetEditorControls.tsx` | Add shared DOM metadata and ownership markers to sections and control rows. |
| `core/admin/ui/widgets/editors/*Editors.tsx` | Migrate the 38 page-builder widget editors to the explicit owner contract in dependency order; `ScreenEditors.tsx` remains out of scope. |
| `tests/vitest/widgets/editorContract.test.ts` | New suite covering pure contract validation and all widget registry contracts. |
| `tests/vitest/ui/*editor*.test.tsx` | Cover per-widget mode ownership and DOM metadata. |
| `_docs/PLAYWRIGHT/` | Add/refresh audit reports, smoke output, local-only screenshot notes, and fixture notes. |
| `_docs/WIDGETS.md` and `_docs/_WIDGETS/*` | Document the final mode ownership and one-time Wizard behavior. |
| `_docs/_CHANGELOG/` | Add closure entry when `TASK-336-17` completes. |

## Implementation Order

1. Land `TASK-336-01` first with a soft validator so existing widgets do not
   fail before migration.
2. Land `TASK-336-02` so every editor mode and section emits stable DOM
   metadata before Playwright depends on it.
3. Land `TASK-336-03` to make the 38-widget admin/public smoke harness
   repeatable before broad widget edits begin.
4. Land P0 ownership fixes in `TASK-336-04` through `TASK-336-06`.
5. Land P1 duplicate cleanup in `TASK-336-07` through `TASK-336-12`.
6. Land P2 cleanup and layout policy in `TASK-336-13` and `TASK-336-14`.
7. Land renderer fixture/frontend CSS fixes in `TASK-336-15`.
8. Land remaining low-risk page-builder widget contracts in `TASK-336-18`
   before strict closure.
9. Land one-time Wizard UX in `TASK-336-16` only after the owner contract is
   stable and test-backed.
10. Land `TASK-336-17` last to switch the contract to strict coverage, close
   docs, update changelog, and preserve final evidence.

## Implementation Pseudocode

```ts
import type { EditorMode } from "./types";

export type WidgetEditorMode = EditorMode;

export type WidgetEditorSectionRole =
  | "setup"
  | "source"
  | "content"
  | "visual"
  | "layout"
  | "technical"
  | "diagnostics"
  | "summary";

export type WidgetEditorSectionContract = {
  mode: WidgetEditorMode;
  id: string;
  title: string;
  role: WidgetEditorSectionRole;
  writablePaths: string[];
  readOnlyPaths?: string[];
  allowedDuplicateWritablePaths?: Array<{
    path: string;
    reason: string;
    expiresWithTask: string;
  }>;
};

export type WidgetEditorContract = {
  version: 2;
  sections: WidgetEditorSectionContract[];
};

export function validateWidgetEditorContract(definition: WidgetDefinition) {
  const errors: WidgetEditorContractError[] = [];
  assertAllModesPresent(definition.editorContract, errors);
  assertStableSectionIds(definition.editorContract, errors);
  assertSingleWritableOwner(definition.type, definition.editorContract, errors);
  assertAdvancedDiagnosticsReadonly(definition.editorContract, errors);
  assertWizardHasNoStyleTokenOwners(definition.editorContract, errors);
  return { ok: errors.length === 0, errors };
}
```

Data flow:

- Widget schema/default/normalize helpers remain the persisted data source.
- The editor contract describes how that same normalized data is exposed in the
  admin UI.
- Editor components render shared sections and control rows with matching
  `data-widget-editor-*` attributes.
- Vitest validates the registry and targeted editor render output.
- Playwright validates the real admin editor and public renderer.

Error handling:

- Soft mode records contract violations without blocking registration while the
  family is in progress.
- Strict mode fails tests when a widget is missing a mode, section id, owner,
  or duplicate allowlist.
- Unknown contract roles, empty section ids, title-derived ids, and duplicate
  writable paths produce machine-readable error codes.
- Any widget needing a temporary duplicate must include a reason and the task
  that removes it.

## Claude Support Contract

Claude may be used as a UI/UX reviewer for:

- Checking whether the `Wizard / Visual / Advanced` split is understandable.
- Comparing Coderso mode labels against common builder patterns.
- Reviewing proposed section names and read-only Advanced summaries.
- Identifying likely confusion in daily authoring flows.

Claude must not be the source of truth for:

- Type definitions.
- Test assertions.
- Security policy.
- Persisted schema changes.
- Final task closure.

Every Claude consultation used during implementation must be summarized in the
owning task or closure report with the concrete decision that was accepted or
rejected.

## Security Contract

No API routes are added by the parent task.

- Endpoint visibility: none in this parent.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: widget schemas must remain strict and explicit.
- Anti-abuse: no public write endpoint changes are allowed here.
- Secret handling: do not expose secrets, provider keys, or privileged settings
  in editor diagnostics, browser cache, screenshots, or Playwright artifacts.
- Advanced mode must not become a raw HTML/script/CSS escape hatch.

## Testing Requirements

Parent docs-only validation:

- `git diff --check`

Family implementation validation:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- Focused Vitest UI suites named in each leaf.
- Existing widget runtime suites where renderer behavior changes.
- Playwright CLI admin smoke for all 38 widgets.
- Playwright CLI public frontend CSS/overflow smoke for the affected widget
  fixture pages.
- `bun run precommit` before any manual commit.

## Documentation Updates Required

- Update `_docs/WIDGETS.md` with the final shared editor-mode contract.
- Update affected `_docs/_WIDGETS/*` files with per-widget ownership.
- Update `_docs/PLAYWRIGHT/` with the final 38-widget evidence.
- Update `_docs/_TASKS/README.md` on every task status move.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when
  `TASK-336-17` closes the family.
- Unless an explicit family-level exception is approved before implementation,
  every physical leaf that moves to Done must also update changelog/index
  records according to AGENTS.md.

## Acceptance Criteria

- All 38 widgets have explicit editor contracts.
- No persisted path is writable in more than one mode unless there is a bounded
  allowlist entry with an owner and expiry task.
- `Advanced` does not duplicate daily visual editing controls.
- P0 widgets no longer render the same editor in all modes.
- Shared editor DOM metadata makes every mode and section Playwright-addressable.
- Public fixture pages cover widgets whose frontend CSS was previously
  unverified or drifting.
- One-time Wizard is introduced only after the correct ownership model exists.
- The final report, widget docs, task board, and changelog agree with code and
  tests.
