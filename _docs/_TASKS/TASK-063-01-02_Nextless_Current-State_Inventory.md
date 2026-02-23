# TASK-063-01-02: Nextless Current-State Inventory
# FileName: TASK-063-01-02_Nextless_Current-State_Inventory.md

**Priority:** High  
**Category:** Analysis/Architecture  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-01-01  
**Status:** To Do

---

## Overview
Udokumentowac aktualny stan posts editora w Nextless (komponenty, hooki, przeplywy danych).

---

## Scope
1. Spisac glowny tree komponentow i hookow (`PostBlockEditorShell`, `usePostEditorState`, side panels).
2. Zmapowac miejsca ze stanem lokalnym vs globalnym.
3. Wykryc miejsca z duplikacja logiki i couplingiem.

---

## Files to Create / Change
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md` (new)
- `core/admin/ui/posts/editor/*` (analiza)

---

## Pseudocode
```ts
collect component graph from posts editor folder
label each node: layout/state/render/service
flag duplicated responsibilities
```

---

## Acceptance Criteria
1. Powstaje mapa aktualnej architektury posts editora.
2. Wskazane sa hotspoty do refaktoru.

---

## Testing Requirements
- N/A (analysis).

---

## Documentation Updates Required
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md`
