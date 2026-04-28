# TASK-054-23-04: Record Workflow Gating and Copy Clarification
# FileName: TASK-054-23-04_Record_Workflow_Gating_and_Copy_Clarification.md

**Priority:** High  
**Category:** Admin/UI + CMS/Content  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-23-01, TASK-054-23-03  
**Status:** Done (2026-03-18)

---

## Overview

Aktualny record workflow ma mylace copy:
- `No field bindings yet`
- `This screen can already open records...`
- `Preview unavailable`

To sa techniczne komunikaty, ale nie odpowiadaja na pytanie usera:
"czy ten ekran ma byc tylko lista, dashboardem, czy faktycznym edytorem rekordu?".

Ten task porzadkuje routing, CTA i copy dla wejscia w rekord zalezne od capability mode.

## Scope

1. Zmienic komunikaty w `CustomScreenEntriesPage` i `CustomScreenEntryEditor`.
2. Zmienic link target po kliknieciu rekordu zgodnie z mode ekranu.
3. Dla `collection-only`:
   - records list zostaje legalnym workflow,
   - wejscie w rekord kieruje do classic editor albo jawnego CTA.
4. Dla `dashboard`:
   - record screen moze byc read-only preview + `Edit in classic editor`.
5. Dla `editor`:
   - record screen pokazuje bound fields i preview bez technicznego straszenia.

## Sub-Tasks

1. Wprowadzic mode-based CTA i breadcrumbs/list actions dla rekordow.
2. Zamienic alert copy na produktowe komunikaty dla `collection-only`, `dashboard`, `editor`.
3. Ustalic finalny fallback do classic editor tam, gdzie screen nie ma editor capability.
4. Dopisac regression coverage dla entries list, record open flow i classic fallback.

## Proposed UX Copy

1. `Collection-only screen`
   - `This shortcut narrows the records list for this content type. Add screen widgets and writable bindings if you want a dedicated record editor.`
2. `Read-only dashboard`
   - `This screen can preview mapped data for each record, but edits still happen in the classic editor until writable bindings are added.`
3. `Editable screen`
   - brak alertu ostrzegawczego; zwykly helper text o bound fields.

## Files to Create / Change

- `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`
- `core/admin/ui/custom-screens/CustomScreenListPage.tsx`
- `core/admin/ui/navigation/sidebarConfig.ts` (jesli shortcut behavior zalezy od mode)
- `tests/vitest/ui/custom-screen-records.test.tsx`
- `tests/vitest/ui/custom-screens-page.test.tsx`
- `tests/vitest/admin/coderso-modules.test.ts`

## Pseudocode

```ts
if (screen.mode === "collection-only") {
  navigate(classicEditorHref);
}

if (screen.mode === "dashboard") {
  renderReadOnlyScreen(entry);
  showClassicEditCta();
}

renderBoundEditor(entry);
```

## Acceptance Criteria

1. User nie widzi mylacego `Preview unavailable` dla legalnego `collection-only` flow.
2. Klikniecie rekordu idzie do odpowiedniego ekranu zależnie od mode/capabilities.
3. Copy tlumaczy produktowy stan ekranu, a nie tylko techniczny brak bindingow.
4. Classic editor pozostaje jawnie dostepny jako fallback tam, gdzie screen nie jest jeszcze edytorem.

## Testing Requirements

- Vitest UI dla `collection-only`, `dashboard`, `editor`
- Vitest admin nav/shortcut coverage jesli CTA/hrefy zaleza od mode

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_MODULES.md`

## Completion Notes (2026-03-18)

- Records list now routes `collection-only` screens to the classic editor.
- `dashboard` screens remain preview-first and `editor` screens remain editable.
- Confusing `No field bindings yet` / `Preview unavailable` copy was replaced with product-level workflow messaging.
