# 952 - Tabs Editor Drift Cleanup

Date: 2026-05-25
Version: Unreleased
Tasks: TASK-336-19, TASK-336-07

## Key Changes

### Widgets/Admin UI

- Tabs Visual colors now use swatch-only controls instead of raw CSS/token text
  fields.
- Tabs Advanced now shows read-only human behavior, saved-tabs, display, and
  contract summaries instead of raw JSON payloads, technical IDs, or
  implementation suffixes.
- Tabs no longer expose the unapproved horizontal-scroll option; saved legacy
  scroll settings normalize back to wrapping.
- Shared block layout and device visibility controls now live in Visual with
  ownership metadata; Advanced shows those block-level settings as read-only
  summaries.

### Contracts/QA/Docs

- Added wildcard repeatable path support for safe editor contract paths such as
  `items.*.label`.
- Updated Tabs focused Vitest coverage, widget docs, task notes, and shared
  task-board status for the stricter contract.
