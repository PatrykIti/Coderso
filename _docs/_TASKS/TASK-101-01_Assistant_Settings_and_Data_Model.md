# TASK-101-01: Assistant Settings and Data Model
# FileName: TASK-101-01_Assistant_Settings_and_Data_Model.md

**Priority:** High  
**Category:** Core/Settings + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-007, TASK-100  
**Status:** Done (2026-02-09)

---

## Overview

Dodanie ustawien globalnych i per-user dla asystenta, tak aby mozna bylo:
- wlaczac/wylaczac asystenta,
- ustawic domyslny tryb (`docs-only` / `llm-rag`),
- skonfigurowac providera, model i limity tokenow,
- trzymac preferencje UI (np. avatar on/off) per user.

---

## Settings Contract

### Global settings (`settings`)

```ts
type AssistantGlobalSettings = {
  "assistant.enabled": boolean;
  "assistant.defaultMode": "docs-only" | "llm-rag";
  "assistant.docs.paths": string[]; // np. ["_docs"]
  "assistant.docs.reindexOnBoot": boolean;
  "assistant.llm.enabled": boolean;
  "assistant.llm.provider": "openrouter" | "none";
  "assistant.llm.model": string; // np. gemma-3n-2b
  "assistant.llm.maxInputTokens": number; // np. 8192
  "assistant.llm.maxOutputTokens": number; // np. 2048
  "assistant.llm.timeoutMs": number;
  "assistant.quotas.requestsPerMinute": number;
  "assistant.quotas.requestsPerDay": number;
};
```

### User settings (`user_settings`)

```ts
type AssistantUserSettings = {
  "assistant.mode"?: "docs-only" | "llm-rag";
  "assistant.ui.enabled"?: boolean;
  "assistant.ui.avatarEnabled"?: boolean;
  "assistant.ui.avatarAsset"?: string; // asset id/url
};
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/settings/settingsService.ts` | update | add assistant global keys + defaults + validation |
| `core/services/settings/settingsService.test.ts` | update | validation + fallback tests |
| `core/services/settings/userSettingsService.ts` | update | assistant user keys schema |
| `core/services/settings/userSettingsService.test.ts` | update | per-user key validation |
| `core/admin/ui/settings/GeneralSettingsPage.tsx` | update | Assistant settings section |
| `core/admin/services/settingsClient.ts` | update | typings for new keys |

---

## Validation Rules

- `assistant.defaultMode = llm-rag` wymaga `assistant.llm.enabled=true`.
- `maxInputTokens`, `maxOutputTokens`, `timeoutMs` musza byc > 0.
- `assistant.docs.paths` nie moze byc puste gdy `assistant.enabled=true`.
- Gdy provider = `none`, system wymusza runtime fallback do `docs-only`.

---

## Testing Requirements

- Unit: rejects invalid token limits.
- Unit: rejects unknown mode/provider values.
- Unit: user settings accept only whitelisted keys and values.
- UI: settings form renders and persists assistant section.

---

## Documentation Updates Required

- `_docs/CMS_API.md` (new settings keys)
- `_docs/SETTINGS.md` (assistant settings matrix)
- `_docs/SECURITY_SPEC.md` (provider key handling)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-assistant-settings-and-data-model.md`
