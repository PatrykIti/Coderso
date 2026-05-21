# TASK-282: Rich Text Section Widget Playwright Product Followups

# FileName: TASK-282_Rich_Text_Section_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Content + Admin UI + Runtime Render + Accessibility + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-213-06-03, TASK-252-06-10, TASK-256-07
**Status:** To Do

---

## Overview

Create the Rich Text Section-specific follow-up family for
`_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md`.

TASK-256 owns shared widget-contract drift from the Playwright report wave. This
family deliberately keeps only `rich-text-section` product, editor, runtime, and
documentation scope:

- `core/widgets/core/richTextSection.tsx`
- `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx`
- existing Bun-free post rich-text editor helpers only when they can adapt into
  `RichTextSectionData` without importing runtime/server dependencies
- `tests/vitest/widgets/richTextSection.test.tsx`
- `tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
- `tests/unit/widgets/validator.test.ts` when schema changes
- `_docs/_WIDGETS/RICH_TEXT_SECTION.md`

The current widget already ships a safe HTML sanitizer, structured fallback
blocks, TOC generation, dropcap, variant rendering, and typography controls.
The report shows remaining Rich Text Section-only gaps around authoring UX,
source ownership, rich block content, article layout truthfulness, content
semantics, inline media, and closure evidence.

## Scope Boundary Against TASK-256

In scope for TASK-282:

- Rich Text Section output-mode truthfulness and Wizard/Visual/Advanced source
  ownership.
- Rich Text Section body authoring, sanitizer feedback, structured block rich
  content, safe inline image/attachment/embed authoring, and report-specific
  editor IA.
- Rich Text Section runtime layout/semantic/accessibility defects in
  `richTextSection.tsx`, including `article` width, title heading level, section
  label, and TOC focus style.
- Rich Text Section report, widget docs, changelog, task-board, and validation
  closure after implementation leaves land.

Out of scope for TASK-282:

- Shared editor atomic update helpers, owned by TASK-256-01.
- Generic `Clear`, `none`, token picker, CSS-variable preservation, and shared
  color-picker semantics, owned by TASK-256-02. Rich Text Section-specific
  adoption of that shared clear behavior for `textColor` is owned by
  TASK-282-09 so KOD-10 has a physical owner if TASK-256 closure does not name
  `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` plus focused tests.
- Generic slot placeholder gating, owned by TASK-256-03.
- Shared interactive runtime binding helpers outside this widget, owned by
  TASK-256-04.
- Cross-report fixed/deferred classification for TASK-256, owned by TASK-256-08.

If a TASK-282 leaf discovers that a desired Rich Text Section fix requires a
generic editor control, sanitizer policy, media picker, or runtime helper, route
that shared piece back to TASK-256 or a new shared task before continuing with
Rich Text Section-only work.

## Source Report Coverage

| Report finding | Route |
|---|---|
| KOD-01, KOD-02; report lines 95-101, 265, 273, 409-413 | TASK-282-01 |
| KOD-11, KOD-12, KOD-14; report lines 197-225, 309, 427, 447-458 | TASK-282-02 |
| KOD-03, KOD-04, KOD-06, KOD-15, KOD-16; report lines 105-145, 229-241, 274-279, 391-395, 443-448, 456 | TASK-282-03 |
| KOD-08, KOD-09, A11Y-01, section label; report lines 157-181, 321-328, 365-376, 435, 445, 449 | TASK-282-04 |
| KOD-13 image/media-picker slice; report lines 213-217, 436 | TASK-282-05 |
| KOD-13 attachments and safe video/embed policy; report lines 213-217, 436 | TASK-282-08 |
| KOD-05, KOD-07, KOD-WIZ, KOD-DUP; report lines 125-153, 286-299, 385-399, 455, 457, 459-460 | TASK-282-06 |
| KOD-10 | TASK-282-09 after TASK-256-02 shared clear helper behavior is available, or direct local adoption if the shared helper already supports it |
| Final screenshot/report/docs/changelog/board evidence | TASK-282-07 |

## Current Owner and Test Matrix

| Area | Current owners | Current tests | New or changed tests |
|---|---|---|---|
| Schema/defaults/normalizer/runtime | `core/widgets/core/richTextSection.tsx` | `tests/vitest/widgets/richTextSection.test.tsx`, `tests/unit/widgets/validator.test.ts` | Add SSR, sanitizer, heading-level, article-width, media, rich block, TOC focus marker, and schema rejection assertions. |
| Editors | `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` | `tests/vitest/ui/rich-text-section-editor-wave.test.tsx` | Add mode ownership, WYSIWYG/sanitizer feedback, destructive block, scalable block, mode IA, and reader guidance assertions. |
| Reused rich-text authoring helpers | `core/admin/ui/posts/editor/richtext/*`, `core/services/posts/editor/*` only if Bun-free imports remain clean | `tests/vitest/ui/post-richtext-adapter-wave.test.tsx`, `tests/vitest/posts/post-richtext-serializer.test.ts` | Run only the helper lanes touched by integration. Do not persist post-editor documents in widget JSON. |
| Media and embeds | `core/admin/ui/media/MediaPicker.tsx`, `core/admin/services/mediaClient.ts`, existing safe href/media utilities if reused | `tests/vitest/ui/media-picker.test.tsx`, `tests/vitest/admin/mediaClient.test.ts`, `tests/unit/media/mediaUsageService.test.ts` | Run only when those existing owners change. Rich Text Section render remains sync-safe and stores no private/signed media URLs. |
| Widget registry/validation | `core/widgets/registry.ts`, `core/widgets/validator.ts` | `tests/unit/widgets/registry.test.ts`, `tests/unit/widgets/validator.test.ts` | Run when definition metadata, schema fields, or validation fixtures change. |
| Docs/report | `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md`, `_docs/_WIDGETS/RICH_TEXT_SECTION.md`, `_docs/WIDGETS.md`, `_docs/WIDGET_PACK_MATRIX.md` if readiness changes | docs diff checks | Update fixed/deferred evidence after implementation leaves land. |

## Sub-Tasks

- [ ] TASK-282-01: Rich Text Output Mode and Wizard Ownership
- [ ] TASK-282-02: Rich Text WYSIWYG HTML Body and Sanitizer Feedback
- [ ] TASK-282-03: Rich Text Structured Blocks Rich Content and Scale UX
- [ ] TASK-282-04: Rich Text Article Width Title and TOC Accessibility
- [ ] TASK-282-05: Rich Text Inline Media and Safe Content Model
- [ ] TASK-282-06: Rich Text Editor Mode IA and Reader Guidance
- [ ] TASK-282-07: Rich Text Report Docs Changelog and Closure
- [ ] TASK-282-08: Rich Text Attachments and Safe Embed Policy
- [ ] TASK-282-09: Rich Text Text Color Clear Adoption

## Implementation Order

1. Complete TASK-282-01 first so every editor mode has truthful output-source
   semantics before richer authoring controls are added.
2. Complete TASK-282-02 before TASK-282-03 so structured block rich content can
   reuse the same safe authoring and serializer decisions.
3. Complete TASK-282-03 after the WYSIWYG/sanitizer model is stable.
4. Complete TASK-282-04 once content source behavior is stable, because heading
   and TOC assertions depend on the final rendered HTML/block output.
5. Complete TASK-282-05 after sanitizer and semantic rules settle, so image
   output does not duplicate unsafe HTML paths.
6. Complete TASK-282-08 after TASK-282-05 so attachments and safe embeds reuse
   the same public media URL and sanitizer policy.
7. Complete TASK-282-09 after TASK-256-02 shared clear helper behavior is
   available, or earlier only if the local editor can adopt an existing helper
   without implementing generic clear semantics.
8. Complete TASK-282-06 after TASK-282-04 so editor-mode guidance can rely on
   final source, block, and heading semantics. TASK-282-06 does not need to
   wait for attachment/embed or text-color-clear closure when those surfaces do
   not change the mode-ownership contract.
9. Complete TASK-282-07 last with report evidence, widget docs, changelog, board,
   and validation results.

## Git Scope Safeguards

- Use a dedicated worktree for implementation because several active agents
  touch `_docs/_TASKS/README.md`.
- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Stage only `TASK-282*`, Rich Text Section owners, explicitly required rich
  text helper tests, Rich Text Section docs/report files, changelog, and board
  files.
- Do not stage unrelated TASK-256, TASK-278, TASK-279, TASK-280, TASK-281, or
  other widget report edits.
- `_docs/_TASKS/README.md` is shared by active agents. Keep edits row-scoped and
  count-scoped; before commit, rerun `git diff -- _docs/_TASKS/README.md` and
  preserve any other already-landed task-family rows.

## Security Contract

This umbrella does not add API routes.

- Endpoint visibility: internal admin editing and public runtime rendering stay
  on existing page/widget routes.
- Auth/RBAC/CSRF: unchanged page/template/widget editing permissions.
- Rate-limit bucket: unchanged because no new public write route is introduced.
- Reject-unknown validation: every new persisted field must be added to
  `richTextSectionSchema` with `additionalProperties: false` preserved and
  validator tests updated.
- Input bounds: rich text, media, link, heading, block, and generated DOM output
  must be length/count bounded before persistence and render.
- Anti-abuse: no user-authored scripts, inline event handlers, unsafe hrefs,
  arbitrary iframes, unbounded embeds, or remote executable payloads in widget
  JSON or public output.
- Secret handling: no secrets, private media URLs, provider tokens, nonce values,
  or privileged settings in widget JSON, browser cache, diagnostics, Playwright
  evidence, or changelog notes.

## Testing Requirements

- Docs-only task creation: `git diff --check`.
- Implementation leaves:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
  - `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change
  - `bun test tests/unit/widgets/registry.test.ts` if widget definition metadata
    changes
  - touched post-richtext Vitest lanes when existing rich-text helpers are reused
  - `bun run gates:coderso`, `bun run scan:security:strict`, and
    `bun run precommit` before final family closure
  - If a leaf is implemented, marked `Done`, or committed independently before
    TASK-282-07, run `bun run gates:coderso` for that leaf as well, or keep the
    leaf `To Do/In Progress` and explicitly defer closure to TASK-282-07.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md`
- `_docs/_WIDGETS/RICH_TEXT_SECTION.md`
- `_docs/WIDGETS.md` only if this family changes user-facing shared widget
  wording.
- `_docs/WIDGET_PACK_MATRIX.md` only if Rich Text Section readiness/completeness
  changes.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when leaves or umbrella
  move to `Done`.

## Changelog Policy

- This task must not move to `Done` until a changelog entry lists TASK-282 and
  `_docs/_CHANGELOG/README.md` is updated.
- Leaves may share one final TASK-282 changelog entry if the implementation is
  landed as one family; otherwise each completed leaf must be listed.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md` is
  fixed, explicitly excluded as TASK-256 shared scope, classified as
  `not-a-bug`, `accepted limitation`, or `documented only` with evidence, or
  deferred to a named future task with a reason.
- TASK-282 leaves do not duplicate implementation already owned by TASK-256.
- Rich Text Section schema, defaults, normalizer, render, editor, tests, docs,
  and report evidence move together for every new user-facing option.
- Public runtime output remains sanitized, accessible, deterministic, and free
  of user-authored script execution.
- Widget docs, Playwright report evidence, task board, changelog, and targeted
  validation evidence are synchronized before closure.
