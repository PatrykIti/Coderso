# TASK-038-02: Forms Service and Validation
# FileName: TASK-038-02_Forms_Service_and_Validation.md

**Priority:** Medium  
**Category:** CMS/Forms  
**Estimated Effort:** Medium  
**Dependencies:** TASK-038-01  
**Status:** Done (2026-01-31)

---

## Overview

Implement service layer for form CRUD and submission validation.

## Service API

Create `core/services/forms/formsService.ts`:
- `listForms()`
- `getForm(id)`
- `createForm(input)`
- `updateForm(id, input)`
- `deleteForm(id)`
- `listFormFields(formId)`
- `setFormFields(formId, fields[])`

Create `core/services/forms/submissionService.ts`:
- `listSubmissions(formId)`
- `submitForm(formId, payload, meta)`
- `getSubmission(id)`

Create validation in `core/services/forms/validation.ts`:
- validate definition (fields schema)
- validate submission payload (required + field type coercion)

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/services/forms/formsService.ts` | CRUD + fields |
| `core/services/forms/submissionService.ts` | submit + list |
| `core/services/forms/validation.ts` | field + payload validation |
| `tests/unit/forms/formsService.test.ts` | create/update/delete |
| `tests/unit/forms/submissionService.test.ts` | submit validation |

## Notes

- Use strict field types: text, email, select, checkbox, textarea, phone.
- Store normalized payload (trim strings, cast booleans).

## Documentation Updates Required

- `_docs/CMS_API.md` (forms payload spec).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-forms-service.md`
