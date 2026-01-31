# TASK-040-02: Webhooks Delivery and Retry
# FileName: TASK-040-02_Webhooks_Delivery_and_Retry.md

**Priority:** Medium  
**Category:** Settings/Integrations  
**Estimated Effort:** Medium  
**Dependencies:** TASK-040-01  
**Status:** Done (2026-01-31)

---

## Overview

Implement delivery pipeline (signing, retries, and status logging).

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/services/webhooks/deliveryService.ts` | send + retry/backoff |
| `core/services/webhooks/signing.ts` | HMAC signature helper |
| `core/server/jobs/webhooksDelivery.ts` | simple worker loop |
| `tests/unit/webhooks/deliveryService.test.ts` | success + retry |

## Notes

- Signature header: `x-nextless-signature` (HMAC SHA256).
- Retry policy: 3 attempts with exponential backoff.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` webhook signing.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-webhooks-delivery.md`
