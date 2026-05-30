# 1019 - TASK-343-17 Rich Text Section truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343-17, TASK-343

## Key Changes

### Widgets / Runtime

- Added plain-text rich block summaries so Wizard previews no longer mark
  `contentHtml` text blocks as empty.
- Marked TOC runtime scope as `body-headings`; body headings are anchored while
  the section title remains the section label.
- Added source-drift detection for divergent `body.html` and `body.blocks`.

### Admin UI

- Persisted bounded sanitizer diagnostics from recent rich-text edits and
  merged them into Advanced sanitizer reporting.
- Surfaced unsafe link attempts from the shared rich-text adapter while
  neutralizing the live editor command href to a safe placeholder.
- Disabled the embed aspect-ratio selector while embeds render only as link
  cards.

### QA / Docs

- Added Rich Text Section and adapter regression coverage for Wizard previews,
  TOC scope, sanitizer events, drift warnings, and inert embed ratio controls.
- Updated Rich Text Section widget docs, Playwright report notes, task board,
  and TASK-343 parent tracking.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx tests/vitest/ui/rich-text-section-editor-wave.test.tsx tests/vitest/ui/post-richtext-adapter-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-17
  drift review: no blockers)
