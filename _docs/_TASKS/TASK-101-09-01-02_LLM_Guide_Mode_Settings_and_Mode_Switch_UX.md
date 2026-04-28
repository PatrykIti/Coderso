# TASK-101-09-01-02: LLM Guide Mode Settings and Mode Switch UX
# FileName: TASK-101-09-01-02_LLM_Guide_Mode_Settings_and_Mode_Switch_UX.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-101-09-01-01  
**Status:** Done (2026-04-11)

---

## Overview

Przemianowac UI i settings z `LLM + RAG` na `LLM Guide`, tak aby user widzial rozdzial:
`Docs assistant` vs `LLM guide`.

## Files to Change

- `core/admin/ui/assistant/AssistantModeSwitch.tsx` (update, ~20-40 LOC)
- `core/admin/ui/settings/AssistantSettingsCard.tsx` (update, ~20-40 LOC)
- `core/admin/services/assistantClient.ts` (update, ~20-40 LOC)
- `tests/vitest/ui/assistant-mode-switch.test.tsx` (new/update, ~100-160 LOC)

## Pseudocode

```tsx
<SelectItem value="docs-only">Docs Assistant</SelectItem>
<SelectItem value="llm-guide">LLM Guide</SelectItem>
```

## Sub-Tasks

1. Update labels and helper copy.
2. Keep transport value mapping backward-compatible.
3. Cover disabled and fallback states in UI tests.

## Testing Requirements

- Vitest UI for switch labels and disabled state.
- Vitest unit for request payload normalization.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`

## Completion Notes (2026-04-11)

- Assistant UI and settings copy now use `LLM Guide` user-facing language.
- At that point transport remained backward-compatible as `llm-rag`; TASK-101-09-01 later migrated canonical transport/settings to `llm-guide`.
- Covered through assistant panel/settings UI tests.
