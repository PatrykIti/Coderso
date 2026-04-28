# TASK-106-01: Assistant Drawer UX Contract and Render-State Matrix
# FileName: TASK-106-01_Assistant_Drawer_UX_Contract_and_Render_State_Matrix.md

**Priority:** High  
**Category:** Admin/UI + Docs/Architecture  
**Estimated Effort:** Small  
**Dependencies:** TASK-106  
**Status:** Done (2026-03-20)

---

## Overview

Zdefiniowac jednoznaczny kontrakt UX dla `AssistantPanel`, zeby implementacja i testy nie mieszaly:
- lazy-load loading state,
- ready chat state,
- disabled state,
- error state,
- oraz `docs not ready`.

To jest task kontraktowy: najpierw freeze oczekiwanego zachowania, potem implementacja.

---

## Scope

1. Spisac matrix stanow dla drawera:
   - `loading`
   - `ready + empty transcript`
   - `ready + messages`
   - `disabled`
   - `load error`
   - `docs not ready`
2. Ustalic, ktore elementy moga byc widoczne w kazdym stanie:
   - header copy,
   - prompt chips,
   - transcript area,
   - composer,
   - CTA do settings,
   - CTA refresh/reindex.
3. Ustalic kontrakt dla konfiguracji:
   - co zostaje w drawerze,
   - co ma trafic do dedykowanego settings surface,
   - jakie secondary entrypointy sa dozwolone.
4. Zsynchronizowac ten kontrakt z docs architektonicznymi.

---

## Sub-Tasks

1. Udokumentowac stany `loading`, `ready`, `disabled`, `error`, `docs not ready`.
2. Przypisac do kazdego stanu dozwolone elementy UI i CTA.
3. Zamrozic role drawera vs dedykowanych settings surfaces.

---

## Files

- `core/admin/ui/assistant/AssistantPanel.tsx`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`

---

## Testing Requirements

- No standalone runtime tests in this subtask.
- Contract must be reflected by follow-up UI assertions in `TASK-106-02` and `TASK-106-03`.

---

## Documentation Updates Required

- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`

---

## Completion Notes (2026-03-20)

- Frozen the drawer contract around explicit runtime states: `loading`, `error`, `disabled`, `ready`.
- Separated `docs-not-ready` from the normal empty transcript state.
- Synced the drawer-vs-settings responsibility split into source-of-truth docs.
