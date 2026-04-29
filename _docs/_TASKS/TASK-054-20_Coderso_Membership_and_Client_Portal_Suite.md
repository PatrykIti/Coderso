# TASK-054-20: Coderso Membership and Client Portal Suite
# FileName: TASK-054-20_Coderso_Membership_and_Client_Portal_Suite.md

**Priority:** High  
**Category:** Auth/RBAC + CMS + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-004, TASK-054-06, TASK-054-07, TASK-054-15  
**Status:** Done (2026-04-29)

---

## Closure Note

This planning stub is closed as superseded by
`TASK-239_Coderso_Membership_and_Client_Portal_Umbrella.md`.

The original `TASK-054` umbrella now closes around the delivered Advanced admin
IA/routing contract. Membership and client portal work remains valid product
scope, but it is tracked as a standalone execution-ready umbrella in `TASK-239`
instead of keeping `TASK-054` open.

## Goal

Add a full membership and client portal capability so site owners can create restricted areas, user profiles, and role-based content access.

## Features

- Frontend user registration/login/reset flows (separate from admin auth).
- User profiles and account dashboard.
- Role/permission mapping for portal users.
- Content visibility rules per role, plan, or relation.
- Portal navigation components (account menu, protected pages, logout).

## Files to Change

- `core/db/schema.ts` (portal users, profiles, memberships, ACL rules)
- `core/services/portal/*` (new)
- `core/services/auth/*` (extend for frontend member sessions)
- `core/server/routes/portalAuthRoutes.ts` (new)
- `core/server/routes/portalProfileRoutes.ts` (new)
- `core/server/middleware/portalAccess.ts` (new)
- `core/admin/ui/portal/*` (new)
- `core/widgets/core/portalAccountMenu.tsx` (new)
- `core/widgets/core/portalProtectedSection.tsx` (new)

## Pseudocode

```ts
if (!hasPortalSession(request)) {
  return redirectToPortalLogin();
}

const allowed = evaluatePortalAccess({
  userId,
  contentId,
  rules,
});

if (!allowed) {
  return forbiddenOrUpgradePage();
}
```

## Theme Compatibility Requirement

- Portal admin screens must consume existing Admin UI theme tokens and layout templates.
- No hardcoded visual styles outside current theme system contract.

## Acceptance Criteria

1. Owner can create a private client area without code.
2. Content restriction rules are enforceable and auditable.
3. Member auth/session logic is separated from admin auth surface.
4. Admin UI theme controls still style portal management screens correctly.

## Testing Requirements

- Unit: access rule evaluator and session guards.
- Unit: portal role/permission mapping.
- Integration: login/register/profile/update/protected route flow.
- UI unit: portal settings and ACL editor states.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/_CHANGELOG/*.md` (when implemented)
