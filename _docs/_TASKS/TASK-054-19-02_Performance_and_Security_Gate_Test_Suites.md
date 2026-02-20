# TASK-054-19-02: Performance and Security Gate Test Suites
# FileName: TASK-054-19-02_Performance_and_Security_Gate_Test_Suites.md

**Priority:** High  
**Category:** QA/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-19-01  
**Status:** Done (2026-02-20)

---

## Overview
Dodac dedykowane suite testow pod release gates: `tests/perf/*` i `tests/security/*`.

## Scope
1. `tests/perf/codersoPerformanceGate.test.ts`
   - synthetic benchmark listing/filter execution p95,
   - synthetic benchmark admin route transition helpers p95,
   - budzety z ENV z sensownymi defaultami.
2. `tests/security/codersoSecurityGate.test.ts`
   - public mode wymusza captcha dla forms/booking,
   - internal mode wymaga session/API key scope,
   - nonce contract dla form/booking (required + invalid tamper path),
   - endpoint policy sanity (public write scope, admin read/write buckets).
3. Unikac flaky testow (powtarzalne dane, bez sieci).

## Files
- `tests/perf/codersoPerformanceGate.test.ts` (new)
- `tests/security/codersoSecurityGate.test.ts` (new)

## Pseudocode
```ts
const cachedP95 = await runListingScenario("cached");
expect(cachedP95).toBeLessThan(BUDGET_CACHED_MS);

const publicForms = evaluateSubmissionAccess({ mode: "public", ... });
expect(publicForms.requireCaptcha).toBe(true);
```

## Testing Requirements
- `bun test tests/perf/codersoPerformanceGate.test.ts`
- `bun test tests/security/codersoSecurityGate.test.ts`

## Documentation Updates Required
- `_docs/CODERSO_RELEASE_GATES.md`
- `_docs/SECURITY_SPEC.md`

## Completion Notes (2026-02-20)
- Added performance gate suite `tests/perf/codersoPerformanceGate.test.ts`.
- Added security gate suite `tests/security/codersoSecurityGate.test.ts`.
- Updated `_docs/SECURITY_SPEC.md` with release gate security baseline section.
