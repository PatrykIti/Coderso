# TASK-107-06: Avatar-Backed Assistant Launcher Surface
# FileName: TASK-107-06_Avatar_Backed_Assistant_Launcher_Surface.md

**Priority:** Medium  
**Category:** Admin/UI + Assistant Preferences  
**Estimated Effort:** Small  
**Dependencies:** TASK-107-05, TASK-101-06  
**Status:** Done (2026-03-20)

---

## Overview

Rozszerzyc floating launcher tak, aby domyslna chmurka wiadomosci mogla byc zastapiona przez avatar asystenta, jezeli avatar jest skonfigurowany.

---

## Scope

1. Gdy avatar nie jest ustawiony:
   - launcher pokazuje standardowa ikonke/chmurke wiadomosci.
2. Gdy avatar jest ustawiony:
   - launcher uzywa avatara jako powierzchni triggera.
3. Fallback:
   - brak poprawnego assetu nie moze psuc launchera; wraca bezpieczny wariant message-bubble/default avatar.

---

## Sub-Tasks

1. Zdefiniowac priorytet danych launchera: avatar vs default bubble.
2. Upewnic sie, ze fallback zachowuje klik/drag semantics.
3. Dolozyc testy na oba warianty.

---

## Files

- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/ui/assistant/AssistantAvatar.tsx`
- `core/admin/ui/assistant/*launcher*` (new helper/component if needed)
- `tests/vitest/ui/assistant-avatar.test.tsx`
- `tests/vitest/ui/assistant-panel.test.tsx`

---

## Testing Requirements

- Targeted avatar/launcher UI tests.
- Verify fallback behavior when avatar asset is missing or unsupported.

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`

---

## Completion Notes (2026-03-20)

- Added global launcher avatar settings and used them to swap the default message bubble for an avatar-backed launcher surface.
- Preserved safe fallback behavior when the configured asset cannot be rendered directly by the launcher.
