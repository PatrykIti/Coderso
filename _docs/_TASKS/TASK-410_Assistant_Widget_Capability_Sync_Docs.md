# TASK-410: Assistant Widget Capability Sync Docs
# FileName: TASK-410_Assistant_Widget_Capability_Sync_Docs.md

**Priority:** Medium
**Category:** Assistant + Widgets + Docs
**Estimated Effort:** Small
**Dependencies:** TASK-407
**Status:** ✅ Done
**Started:** 2026-06-07
**Completed:** 2026-06-07

---

## Overview

Document the operational contract for keeping the guided assistant in sync when
widget functionality, CMS capabilities, solution kits, content engines, custom
screens, or user-facing docs change.

TASK-407 proved the guided assistant flow end to end, but the implementation
rules for future widget/capability changes were spread across assistant,
widget, and corpus docs. TASK-410 adds one explicit checklist so contributors
know when a widget change is automatically covered, when assistant registries or
site-kit mappings must be updated, and when `docs/guide` reindexing is required.

## Sub-Tasks

- Add a source-of-truth assistant capability sync checklist to
  `docs/develop/assistant.md`.
- Link the widget authoring checklist in `docs/develop/content-and-widgets.md`
  to the assistant compatibility checklist.
- Add an architecture-facing note in `_docs/ASSISTANT_SITE_BUILDER.md` so
  future TASK-407 follow-up work does not infer new assistant behavior from
  prompt text.
- Add changelog and board coverage.

## Security Contract

- Endpoint visibility: no endpoint changes.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject unknown validation: documentation now reinforces strict schemas and
  unknown-option rejection for future assistant capability changes.
- Anti-abuse: documentation now reinforces that unsupported capabilities must
  return `needs_input` or `gated` with no executable actions.
- Secret handling: no secrets, provider keys, cookies, auth state, screenshots,
  raw provider output, or raw uploaded bytes are added.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`
- No targeted runtime suite is required because this task changes docs/process
  text only.

## Documentation Updates Required

- `docs/develop/assistant.md`
- `docs/develop/content-and-widgets.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New changelog entry.

## Completion Evidence

- `docs/develop/assistant.md` now defines the assistant capability sync
  checklist for widget fields/defaults, variants/modes, layout/CTA/media
  settings, new widget types, solution-kit starters, content engines, custom
  screens, docs corpus updates, and gated unsupported behavior.
- `docs/develop/content-and-widgets.md` now points widget implementers to the
  assistant compatibility checklist.
- `_docs/ASSISTANT_SITE_BUILDER.md` now records the source-of-truth rule that
  assistant behavior must be synchronized through typed owners and strict
  mappings, not inferred from prompt text.
- Validation evidence is recorded in changelog 1133.
