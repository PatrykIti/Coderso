# TASK-047-02: Routing Policy Middleware
# FileName: TASK-047-02_Routing_Policy_Middleware.md

**Priority:** 🔴 High  
**Category:** Site/Runtime  
**Estimated Effort:** Medium  
**Dependencies:** TASK-047-01  
**Status:** 🟡 To Do

---

## Overview

Wprowadź middleware, który na podstawie hosta:
- blokuje /admin na public host
- blokuje public routes na admin host

---

## Implementation Checklist

| Layer | File | Change |
|------|------|--------|
| Middleware | `core/server/middleware/hostPolicy.ts` | new logic |
| Server | `core/server/httpServer.ts` | apply policy before routing |
| Settings | `core/services/settings/settingsService.ts` | read `site.adminBaseUrl`, `site.publicBaseUrl` |

---

## Testing Requirements

- Unit: hostPolicy (admin/public allow/deny)
- Integration: simulated host requests

---

## Documentation Updates Required

- `_docs/SITE_RUNTIME.md`
- `_docs/_CHANGELOG/<new>.md`
