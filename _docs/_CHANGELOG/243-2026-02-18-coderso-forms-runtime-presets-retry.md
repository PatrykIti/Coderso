# 243-2026-02-18 - Coderso forms runtime presets, multi-step UX, and retry policy

Date: 2026-02-18
Version: Unreleased
Tasks: TASK-054-09

## Key Changes
- DB/Schema:
  - Added `forms.settings` JSONB column via migration `0040_forms_runtime_settings.sql`.
  - Settings contract now stores layout/runtime behavior and automation retry policy per form.

- Forms settings model:
  - Added normalized contract (`formSettings`) for:
    - `layoutMode` (`single` / `multi_step`),
    - `saveProgress`,
    - `stepTitles`,
    - `preset` (`custom`, `contact`, `lead_capture`, `service_intake`),
    - `automationRetry` (`enabled`, `maxAttempts`, `baseDelayMs`, `maxDelayMs`).
  - Added field-level `settings.step` normalization for multi-step grouping.

- Automation runner:
  - Added per-form automatic retry with bounded exponential backoff.
  - Failed attempts are logged in `form_action_runs` with retry scheduling metadata.
  - Manual retry endpoint keeps working and now respects form retry policy defaults.

- Form Builder UI:
  - Expanded `Form Settings` panel with:
    - presets,
    - layout mode + step titles,
    - save-progress toggle,
    - automation retry controls.
  - Added preset catalog + apply flow (`contact`, `lead_capture`, `service_intake`) with field replacement confirmation.
  - Canvas now previews multi-step grouping.

- Runtime form embed:
  - Added runtime client script for inline submission (`fetch` JSON API) with in-place success/error handling.
  - Added multi-step runtime navigation (`Next`/`Back`/`Submit`) driven by form settings and field step assignment.
  - Added optional local progress persistence/restore using `localStorage` when `saveProgress=true`.
  - Runtime continues to honor fallback success message / redirect URL.

- Docs and tests:
  - Updated forms API and architecture docs for `forms.settings`, runtime behavior, and retry semantics.
  - Added unit coverage for settings normalization, presets catalog/clone, retry policy execution, and multi-step runtime rendering.
  - Full quality checks passed (`lint`, `lint:types`, full `bun test`).
