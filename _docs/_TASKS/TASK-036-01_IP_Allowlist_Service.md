# TASK-036-01: IP Allowlist Service
# FileName: TASK-036-01_IP_Allowlist_Service.md

**Priority:** Medium  
**Category:** Admin/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001  
**Status:** Done (2026-01-31)

---

## Overview

Persist allowlist CIDR entries and provide CRUD service.

## DB Model

Add `ip_allowlist` table:
- `id` (uuid)
- `cidr` (text, unique)
- `label` (text, nullable)
- `description` (text, nullable)
- `createdAt`

## Service API

`core/services/security/ipAllowlistService.ts`:
- `listAllowlist()`
- `addAllowlistEntry(cidr, label?)`
- `removeAllowlistEntry(id)`
- `isIpAllowed(ip)` (CIDR match)

## Testing Requirements

- `tests/unit/security/ipAllowlistService.test.ts`
- Include CIDR parsing tests.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` allowlist strategy.

## Changelog Entry

- `_docs/_CHANGELOG/091-2026-01-31-ip-allowlist-core.md`
