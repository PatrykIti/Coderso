# 1133 - TASK-410 Assistant widget capability sync docs

Date: 2026-06-07
Version: unreleased
Tasks: TASK-410

## Key Changes

### Assistant Capability Sync
- Added a dedicated checklist in `docs/develop/assistant.md` for keeping the
  assistant aligned when widget fields, variants, layout behavior, media
  settings, solution-kit starters, content engines, custom screens, or
  user-facing docs change.
- Documented when the assistant can automatically absorb a widget change and
  when contributors must update backend-owned assistant registries, site-kit
  mappings, strict action schemas, admin UI controls, solution-kit starters, or
  `docs/guide` corpus content.
- Made the no-inference rule explicit: unsupported CMS capabilities must return
  `needs_input` or `gated` with no executable actions instead of being guessed
  from prompt text.

### Widget Docs
- Linked the widget authoring checklist in `docs/develop/content-and-widgets.md`
  to the assistant compatibility checklist.
- Added an architecture-facing note in `_docs/ASSISTANT_SITE_BUILDER.md` that
  shared ids must have one owner and that Navigation's shared variant/mobile-mode
  contract is the reference pattern.

## Validation

- `git diff --check`
  - Passed.
- `bun --cwd core lint`
  - Passed.
- `bun --cwd core lint:types`
  - Passed.
- `bun run precommit`
  - Passed.
