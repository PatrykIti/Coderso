# TASK-020-11-03: Public Endpoint Policy + Protection
# FileName: TASK-020-11-03_Public_Endpoint_Policy_and_Protection.md

**Priority:** High  
**Category:** Core/Security + Public Runtime  
**Estimated Effort:** Medium  
**Dependencies:** TASK-020-11-01  
**Status:** To Do  

---

## Overview

Define explicit public endpoints and apply read/write rate limits plus reCAPTCHA v3 checks. Protect preview tokens and public submission endpoints.

---

## Goals

1. Identify public routes and classify as read/write.
2. Apply stricter limits to public write endpoints.
3. Ensure preview tokens cannot be brute-forced.
4. Add reCAPTCHA v3 gate to public write endpoints.

---

## Pseudocode

```ts
// public route classification
const PUBLIC_WRITE = ["/forms/submit", "/webhooks/*"]; // example
const PUBLIC_READ = ["/site/*", "/preview/*"]; // example

if (PUBLIC_WRITE.matches(path)) bucket = "public_write";
else if (PUBLIC_READ.matches(path)) bucket = "public_read";
```

---

## Implementation Checklist

| File | Action |
| --- | --- |
| `core/server/publicSite.tsx` | Apply bucket mapping for public read/write |
| `core/server/httpServer.ts` | Ensure preview endpoints are gated + bucketed |
| `core/server/routes/formsRoutes.ts` | reCAPTCHA v3 for public submissions |
| `tests/unit/security/rateLimit.test.ts` | Add public bucket coverage |
| `tests/integration/routes/forms.test.ts` | Validate public write throttling |

---

## Open Questions

1. Which public endpoints should be classified as write?
2. Should preview endpoints be considered read (high limit) or write (stricter)?

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/CMS_API.md`
