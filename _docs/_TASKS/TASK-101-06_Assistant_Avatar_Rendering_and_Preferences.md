# TASK-101-06: Assistant Avatar Rendering and Preferences
# FileName: TASK-101-06_Assistant_Avatar_Rendering_and_Preferences.md

**Priority:** Medium  
**Category:** Admin/UI + Media  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-05, TASK-005  
**Status:** To Do

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
| `core/services/settings/userSettingsService.ts` | update | avatar preference keys |
| `core/admin/services/userSettingsClient.ts` | update | avatar preference API |
| `tests/integration/ui/assistant-avatar.test.tsx` | new | render fallback + toggle |

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

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-assistant-avatar-rendering-and-preferences.md`
