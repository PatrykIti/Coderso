# TASK-014: Audit Logs
# FileName: TASK-014_Audit_Logs.md

**Priority:** Medium
**Category:** CMS/Security
**Estimated Effort:** Medium
**Dependencies:** TASK-004, TASK-024
**Status:** To Do

---

## Overview

Implement minimal audit logging for admin actions and expose a read-only
admin UI.

**Goals:**
- Record critical events (auth, publish, plugin changes).
- Provide `GET /audit` endpoint.
- Admin UI for browsing logs.

---

## Architecture

```
core/services/audit/
  auditService.ts
core/server/routes/
  auditRoutes.ts
core/admin/ui/audit/
  AuditList.tsx

tests/unit/audit/
  auditService.test.ts
```

## Commands (if needed)

No new dependencies.

---

## Sub-Tasks

### TASK-014-01_Audit_log_service

**Status:** To Do

Example:

```ts
async function logAudit(event: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, any>;
}) {
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    actorId: event.actorId,
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId,
    metadata: event.metadata ?? {},
    createdAt: new Date(),
  });
}
```

Rules:
- Do not log secrets or tokens in metadata.
- Use consistent `action` naming (`domain.action`).
- Store `ip` and `userAgent` inside `metadata` when available.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/services/audit/auditService.ts` | log + list |

Service sketch:

```ts
export async function listAudit(limit = 50) {
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}
```

Redaction sketch:

```ts
function sanitizeMetadata(meta: Record<string, any>) {
  const { token, password, ...rest } = meta;
  return rest;
}
```

---

### TASK-014-02_Hook_audit_into_core_actions

**Status:** To Do

Events (v1):
- auth.login
- auth.logout
- pages.publish
- pages.restore
- plugins.install
- plugins.update
- plugins.disable
 - settings.update

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/services/audit/auditService.ts` | helpers for events |
| `core/server/routes/*` | log on actions |

---

### TASK-014-03_Admin_API_and_UI

**Status:** To Do

- `GET /audit` endpoint (read-only).
- Admin UI list with filters (action, date, user).
- Export to CSV (optional).

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/server/routes/auditRoutes.ts` | audit endpoint |
| `core/admin/ui/audit/AuditList.tsx` | audit UI |

Route sketch:

```ts
router.get("/audit", requirePermission("audit:read"), async () => {
  const items = await listAudit(100);
  return json({ items });
});
```

UI sketch:

```tsx
<AuditList items={items} onFilterChange={setFilters} />
```

---

## Testing Requirements

- [ ] `tests/unit/audit/auditService.test.ts` logs events.
- [ ] `tests/integration/routes/audit.test.ts` returns ordered list.
- [ ] UI test validates filters.
- [ ] `tests/unit/audit/auditService.test.ts` rejects sensitive metadata.

---

## New Files to Create

- `core/services/audit/auditService.ts`
- `core/server/routes/auditRoutes.ts`
- `core/admin/ui/audit/AuditList.tsx`
- `tests/unit/audit/auditService.test.ts`
- `tests/integration/routes/audit.test.ts`

---

## Documentation Updates Required

- `_docs/AUDIT_SPEC.md` (event list and API behavior).
- `_docs/CMS_API.md` (audit endpoint details).
- `_docs/SECURITY_SPEC.md` (audit logging scope).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-audit-logs.md`
- Notes: audit logging and admin UI.

---

## Additional Docs

- `_docs/CMS_SPEC.md`
