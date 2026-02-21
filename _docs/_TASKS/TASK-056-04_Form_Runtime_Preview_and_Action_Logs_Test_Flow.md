# TASK-056-04: Form Runtime Preview and Action Logs Test Flow
# FileName: TASK-056-04_Form_Runtime_Preview_and_Action_Logs_Test_Flow.md

**Priority:** High  
**Category:** UX/Testability  
**Estimated Effort:** Medium  
**Dependencies:** TASK-056-03  
**Status:** Done (2026-02-21)

---

## Goal
Dodac interaktywny runtime preview/test submit bezposrednio w Form Builder, aby latwo generowac Action Logs.

## Files
- `core/admin/ui/forms/FormBuilderPage.tsx`
- `core/admin/ui/forms/FormRuntimePreviewDialog.tsx` (new)
- `core/admin/services/formsClient.ts`
- `tests/integration/ui/forms.test.tsx`

## Pseudocode
```tsx
RuntimePreviewDialog:
  render controls from saved form fields
  submit -> POST /forms/:id/submissions
  show runtime success/error
  CTA: open Action Logs
```

## Acceptance Criteria
1. Uzytkownik moze testowo wyslac formularz z poziomu edytora.
2. Udane submit tworzy wpisy w Action Logs.
3. UI komunikuje, gdy formularz ma unsaved changes i wymaga save przed testem.

## Completion Notes (2026-02-21)
- Dodano `FormRuntimePreviewDialog` z interaktywnym submit flow.
- `FormBuilderPage` ma przycisk `Runtime preview` obok `Action logs`.
- Empty state w `FormActionLogsPage` jasno instruuje o test submit z runtime preview.
