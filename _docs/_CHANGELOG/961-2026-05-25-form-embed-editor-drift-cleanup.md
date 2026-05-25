# 961 - Form Embed editor drift cleanup

Date: 2026-05-25
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

### Widgets

- Cleaned the `form-embed` Wizard / Visual / Advanced contract after the
  TASK-336-19 re-audit.
- Converted Visual color controls to swatch-only replace/clear controls so
  nontechnical authors are not asked for CSS variables, token names, or color
  strings.
- Retagged the Visual selected-form status as an author-facing `Form preview`
  summary instead of diagnostics-only copy.
- Replaced Advanced normalized payload JSON with human read-only runtime,
  submission-security, authoring, and contract summaries.
- Removed raw endpoint, form-ID, nonce, public-site-key, API-scope, and raw
  resolver copy from ordinary editor diagnostics.

### QA

- Updated Form Embed editor-wave and widget contract coverage for swatch-only
  Visual controls, no raw payload snapshot, no technical Advanced controls, and
  summary-role Visual preview.
- Added strict Form Embed Playwright evidence with zero admin failures, public
  failures, fixture gaps, or metadata gaps.
- Added a focused Form Embed Visual / Advanced / `Run setup again` Wizard probe
  proving Visual style raw inputs `0`, Advanced writable paths `0`, Advanced
  raw technical controls `0`, and Wizard writable paths limited to `formId`.
- Verified with `bun run test:vitest -- tests/vitest/ui/form-embed-editor-wave.test.tsx tests/vitest/widgets/formEmbed.test.tsx tests/vitest/widgets/editorContract.test.ts`.

### Docs

- Updated Form Embed widget docs, TASK-336-19 status notes, the shared widget
  contract notes, historical Playwright report, and the Playwright targeted
  rerun index.
