# TASK-101-06: Assistant Avatar Rendering and Preferences
# FileName: TASK-101-06_Assistant_Avatar_Rendering_and_Preferences.md

**Priority:** Medium  
**Category:** Admin/UI + Media  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-05, TASK-005  
**Status:** Done (2026-02-09)

---

## Overview

Opcjonalna warstwa wizualna asystenta:
- avatar 3D (`.glb`) lub lekki fallback 2D,
- stany animacji (`idle`, `thinking`, `answer`),
- per-user preference: wlaczony/wylaczony.

Avatar nie moze byc wymagany do korzystania z chatu.

---

## Technical Decisions

1. Preferowany format: `glTF 2.0 (.glb)`.
2. Fallback: statyczny placeholder gdy WebGL niedostepny.
3. Lazy-load assetow, aby nie blokowac startu panelu.
4. Asset path przez Media library lub konfigurowalny URL.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/assistant/AssistantAvatar.tsx` | new | avatar renderer shell |
| `core/admin/ui/assistant/avatarStates.ts` | new | state-to-animation mapping |
| `core/admin/ui/assistant/AssistantPanel.tsx` | update | mount optional avatar |
| `core/services/settings/userSettingsService.ts` | no-op | avatar keys already available from TASK-101-01 |
| `core/admin/services/userSettingsClient.ts` | update | avatar preference API typing |
| `tests/unit/ui/assistant-avatar.test.tsx` | new | render fallback + asset mode coverage |

---

## Performance Targets

- Avatar assets loaded async after panel interactive.
- No regression in panel first paint > 100ms.
- WebGL errors never break chat interaction.

---

## Testing Requirements

- UI: avatar hidden when preference off.
- UI: avatar fallback renders when WebGL unavailable.
- UI: state class changes on request lifecycle.

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` (avatar optional layer)
- `_docs/MEDIA_SPEC.md` (allowed avatar asset formats)

---

## Changelog Entry

- `_docs/_CHANGELOG/203-2026-02-09-assistant-avatar-rendering-and-preferences.md`

---

## Implementation Notes (Done)

- Added avatar runtime state map in `core/admin/ui/assistant/avatarStates.ts`.
- Added optional avatar renderer in `core/admin/ui/assistant/AssistantAvatar.tsx`:
  - supports `image`, `video`, and `glb/gltf` asset URL detection
  - uses safe 2D fallback placeholder when no asset or unsupported runtime
  - never blocks chat flow on asset/runtime issues
- Updated `core/admin/ui/assistant/AssistantPanel.tsx`:
  - user toggle for `assistant.ui.avatarEnabled`
  - asset URL field persisted to `assistant.ui.avatarAsset`
  - avatar state transitions (`idle` / `thinking` / `answer`) from chat lifecycle
- Updated `core/admin/services/userSettingsClient.ts` type map with assistant avatar keys.
- Added tests in `tests/unit/ui/assistant-avatar.test.tsx` for disabled/fallback/image/glb modes.
- Updated docs:
  - `_docs/ARCHITECTURE.md` (assistant optional avatar layer)
  - `_docs/MEDIA_SPEC.md` (assistant avatar asset formats and fallback)
