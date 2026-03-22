# TASK-148: Assistant Settings Admin UI Assistant Documentation Refresh
# FileName: TASK-148_Assistant_Settings_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/settings/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Assistant Settings surface
based on a real authenticated walkthrough of the local admin UI. The goal is to
split Assistant Settings out of the old combined General/Site/Assistant
settings article and replace it with a guided document that matches the shipped
assistant runtime, corpus, LLM, quota, and reindex workflow on
`/admin/settings/assistant`.

## Scope

1. Review the current combined settings assistant doc and the required `docs/`
   authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/settings/assistant`
   with an authenticated session and record actual behavior.
3. Create a dedicated Assistant Settings doc using the
   `Basic / Medium / Instruction / Advanced` structure with more guided user
   instructions.
4. Update the coverage matrix so `/settings/assistant` points to the new
   canonical doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the page shell:
   - sidebar,
   - header copy,
   - save and reindex actions,
   - auto-save toggle.
2. Capture the runtime/settings flow:
   - assistant enable toggle,
   - launcher avatar toggle and asset field,
   - default mode,
   - corpus and reindex settings.
3. Capture the LLM and quota flow:
   - LLM enable toggle,
   - provider/model,
   - token/timeouts,
   - request quotas,
   - validation behavior.
4. Rewrite the doc without keeping Assistant Settings mixed into the same
   assistant page as General Settings and Site Settings.

## Acceptance Criteria

1. Assistant Settings has its own assistant doc that describes the current
   shipped UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about enablement, corpus source expectations, LLM mode,
   reindex, and quotas.
4. The coverage matrix points `/settings/assistant` at the new canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Assistant Settings UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/settings/*`

## Documentation Updates Required

- `docs/screens/assistant-settings.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-148_Assistant_Settings_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Assistant
  Settings UI on `/admin/settings/assistant`.
- The walkthrough confirmed:
  - settings sidebar,
  - assistant enable toggle,
  - launcher avatar controls,
  - default mode and provider selectors,
  - official corpus note,
  - reindex controls,
  - LLM fields,
  - quota fields,
  - auto-save toggle and save action.
- The rewritten doc was verified against:
  - `core/admin/ui/settings/AssistantSettingsPage.tsx`
  - `core/admin/ui/settings/AssistantSettingsCard.tsx`
  - `core/admin/services/assistantClient.ts`
  - `core/admin/ui/settings/useSettingsAutoSave.ts`
- No automated lint or test commands were run because this was a docs-only
  change.
