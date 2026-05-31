# 1023 - TASK-343-12 Template Section truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343-12, TASK-343

## Key Changes

### Widgets / Runtime

- Added explicit Template Section resolution state markers so placeholders now
  distinguish no selection, admin preview unresolved, missing, draft,
  looped, empty, and ready states.
- Kept admin preview placeholder-only without pretending to render template
  blocks, and changed the selected-template placeholder copy to say runtime
  resolution is still required.
- Exposed category and version metadata on placeholder and ready states.

### Admin UI

- Replaced false-zero Advanced diagnostics with runtime-aware status copy,
  including `template_unpublished`, `template_missing`, `template_loop`,
  `template_empty`, `admin_preview_unresolved`, and ready states.
- Surfaced `metadata.category` in Advanced and `metadata.version` as read-only
  Visual metadata so ownership is no longer split invisibly.
- Updated runtime behavior copy to explain the placeholder-only admin preview
  and public resolver behavior.

### QA / Docs

- Added renderer and editor regression coverage for placeholder-only preview
  semantics, resolution-state diagnostics, category/version visibility, and
  draft-template reporting.
- Updated Template Section widget docs, Playwright report notes, task board,
  and TASK-343 parent tracking.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/templateSection.test.tsx tests/vitest/ui/template-section-editor-wave.test.tsx tests/vitest/ui/widget-editors-wave-1.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `playwright-cli -s=task-343-12-template-section run-code --filename .tmp/task-343-12-template-section-smoke.js`
  after restarting `coderso-dev-core-host` once for the known blank-page Vite
  state; admin Visual and Advanced diagnostics passed.
- `playwright-cli -s=task-343-12-template-section-public run-code --filename .tmp/task-343-12-template-section-public-smoke.js`
  against a temporary published Template Section page; public runtime returned
  `200` with placeholder resolution/category/version diagnostics present, then
  the temporary page was deleted.
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-12
  drift review)

Existing `/ctr-template-section-2305` public fixture currently has
`visibility.devices: []`, so the shared wrapper hides the block on the public
route; public runtime evidence used the temporary visible smoke page instead.
