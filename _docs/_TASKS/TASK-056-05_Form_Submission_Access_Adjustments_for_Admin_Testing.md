# TASK-056-05: Form Submission Access Adjustments for Admin Testing
# FileName: TASK-056-05_Form_Submission_Access_Adjustments_for_Admin_Testing.md

**Priority:** Medium  
**Category:** Security/Access  
**Estimated Effort:** Small  
**Dependencies:** TASK-056-04  
**Status:** Done (2026-02-21)

---

## Goal
Dopasowac `evaluateSubmissionAccess` tak, aby test submit z zalogowanej sesji admina byl mozliwy bez wymuszonego captcha/nonce dla trybu `public`.

## Security Contract
- Publiczny runtime (niezalogowany): dalej wymaga nonce + bot protection policy.
- Zalogowany admin session: dozwolony test submit bez captcha (tylko na potrzeby wewnetrznego testowania).
- Internal mode: bez zmian (session/API key).

## Files
- `core/services/forms/submissionAccess.ts`
- `tests/unit/forms/submissionAccess.test.ts`

## Pseudocode
```ts
if (mode === "public" && isAuthenticated) {
  return { allow: true, requireCaptcha: false };
}
```

## Acceptance Criteria
1. Public submit z frontend bez sesji nadal ma protection gate.
2. Admin test submit przechodzi bez captcha friction.
3. Testy jednostkowe potwierdzaja oba scenariusze.

## Completion Notes (2026-02-21)
- `evaluateSubmissionAccess` omija captcha dla zalogowanego admina w trybie `public`.
- Niezalogowany public runtime nadal wymusza captcha.
- Rozszerzono testy: `tests/unit/forms/submissionAccess.test.ts`.
