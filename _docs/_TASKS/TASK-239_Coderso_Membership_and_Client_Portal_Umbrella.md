# TASK-239: Coderso Membership and Client Portal Umbrella
# FileName: TASK-239_Coderso_Membership_and_Client_Portal_Umbrella.md

**Priority:** High
**Category:** Auth/RBAC + Runtime + CMS + Admin/UI
**Estimated Effort:** Very Large
**Dependencies:** TASK-004, TASK-020, TASK-054, TASK-054-06, TASK-054-07, TASK-054-15, TASK-238
**Status:** To Do

---

## Overview

Build a first-class public membership and client portal module for Coderso.
This replaces the old planning stub `TASK-054-20`, which is now closed as
superseded by this umbrella.

The portal is separate from admin authentication. Admin users continue to use
the existing admin auth/session/RBAC surface, while portal members get public
runtime sessions, profile management, access rules, protected pages, and
widgets that site owners can configure without code.

## Goals

- Let a site owner create a private client/member area without custom code.
- Keep portal member identity separate from admin users and permissions.
- Enforce role/plan/relation-based content visibility consistently across
  pages, entries, posts, widgets, listings, and media references.
- Provide admin management screens through the existing Advanced module
  registry, shared admin route helpers, cache contracts, and theme tokens.
- Provide public login/register/reset/profile routes with explicit abuse
  controls and auditable session behavior.

## Non-Goals

- Do not replace the existing admin auth model.
- Do not add billing/subscription provider integration in this umbrella.
  Membership plans can be modeled as access tiers; payment adapters should be a
  later commerce/checkout integration task.
- Do not store portal secrets, reset tokens, or private member data in browser
  cache/localStorage/debug payloads.

## Sub-Tasks

- [ ] TASK-239-01: Portal Domain, DB Migrations, and Session Model
- [ ] TASK-239-02: Public Member Auth Routes and Abuse Controls
- [ ] TASK-239-03: Portal Access Evaluator and Content Visibility Guards
- [ ] TASK-239-04: Admin Portal Management UI, Cache, and Prefetch
- [ ] TASK-239-05: Runtime Widgets and Protected Page Flow
- [ ] TASK-239-06: QA, Docs, Changelog, and Board Closure

## Files to Change

- `core/db/schema.ts`
- `core/db/migrations/*`
- `core/db/meta/*_snapshot.json`
- `core/db/meta/_journal.json`
- `core/services/portal/*` (new owner for portal schemas, normalizers,
  session helpers, access evaluator, and domain errors)
- `core/server/routes/portalAuthRoutes.ts` (new public auth routes)
- `core/server/routes/portalProfileRoutes.ts` (new public member profile routes)
- `core/server/routes/adminPortalRoutes.ts` (new internal admin routes)
- `core/server/middleware/portalAccess.ts` (new runtime access middleware)
- `core/server/publicSite.tsx`
- `core/admin/ui/navigation/advancedModules.ts`
- `core/admin/utils/adminPaths.ts`
- `core/admin/utils/adminPrefetch.ts`
- `core/admin/ui/portal/*` (new admin management screens)
- `core/admin/services/portalClient.ts` (new cached client wrapper)
- `core/admin/services/cacheKeys.ts`
- `core/admin/services/cacheBus.ts`
- `core/widgets/core/portalAccountMenu.tsx`
- `core/widgets/core/portalProtectedSection.tsx`
- `tests/unit/portal/*`
- `tests/integration/routes/portal*.test.ts`
- `tests/integration/runtime/portal*.test.ts`
- `tests/vitest/ui/portal*.test.tsx`

## Architecture

- `core/services/portal/*` owns all portal contracts:
  - schemas and strict validators,
  - `normalizePortalMember`,
  - `normalizePortalRole`,
  - `normalizePortalAccessRule`,
  - `evaluatePortalAccess`,
  - machine-readable errors such as `portal_auth_invalid`,
    `portal_member_not_found`, `portal_access_denied`, and
    `portal_token_expired`.
- Route modules stay orchestration-only:
  - validate payloads,
  - enforce auth/RBAC/CSRF/rate limits,
  - delegate business rules to portal services,
  - map known domain errors through a centralized `mapPortalError` helper.
- Admin cache follows the shared contract end-to-end:
  - cache keys and TTLs for portal members, roles, plans, and access rules,
  - cached client wrappers,
  - invalidation plus `cacheBus` broadcasts,
  - cache hydration with background revalidation,
  - no mount-force refetch loops or dirty-state overwrites.
- Runtime access checks should be deterministic and auditable. Every protected
  resource check should record the evaluated rule id, member id, resource id,
  and decision outcome in an audit-safe event without leaking private data.

## Security Contract

- Visibility:
  - Internal/admin: `/admin/api/portal/*`.
  - Public: `/api/portal/auth/*`, `/api/portal/profile/*`, and protected
    runtime page/resource requests.
- Auth model:
  - Admin routes require existing admin session auth and RBAC.
  - Public member routes use portal sessions that are cryptographically
    separate from admin sessions.
  - API keys are not valid for public member login/register/profile writes.
- RBAC:
  - Admin portal management requires explicit permissions such as
    `portal:read`, `portal:write`, and `portal:manage_access`.
  - Runtime member access is evaluated by portal roles/plans/relationships,
    not by admin RBAC.
- CSRF:
  - Admin/internal writes require existing admin CSRF protection.
  - Public member profile writes require CSRF/session protection once a portal
    session exists.
- Rate-limit bucket:
  - `portal_auth` for login/register/reset/verify.
  - `portal_profile` for authenticated member profile writes.
  - `portal_access` for protected-resource checks if a route can be abused at
    high volume.
- Reject-unknown validation:
  - All admin and public payloads must reject unknown fields through strict
    schemas before persistence or session mutation.
- Anti-abuse:
  - Public registration/reset/login must use nonce + signature/HMAC patterns
    consistent with existing public-write hardening.
  - Optional reCAPTCHA should be policy-driven through security settings, not
    hardcoded per route.
  - Reset/verify tokens must be single-use, TTL-bound, hashed at rest, and
    never logged.
  - Session fixation and cross-surface admin/member session confusion must be
    covered by tests.
- Secret handling:
  - No portal tokens, reset links, private profile fields, or member access
    decisions may be stored in browser cache, localStorage, or debug payloads.

## Implementation Order

1. Add DB migration artifacts and pure portal domain/service contracts first.
2. Add public member auth/profile routes with strict validation, rate limits,
   token hashing, and focused route tests.
3. Add access-rule evaluator and runtime middleware before any UI exposes
   protected content settings.
4. Add internal admin routes, cached client wrappers, cache-bus invalidation,
   and Advanced navigation/prefetch.
5. Add admin management UI and runtime widgets.
6. Finish with docs, changelog, board closure, and full targeted validation.

## Implementation Pseudocode

```ts
export type PortalAccessInput = {
  memberId: string | null;
  resource: {
    kind: "page" | "post" | "entry" | "media" | "listing";
    id: string;
    typeSlug?: string;
  };
  rules: PortalAccessRule[];
};

export function evaluatePortalAccess(input: PortalAccessInput): PortalAccessDecision {
  const normalizedRules = input.rules.map(normalizePortalAccessRule);
  const matchingRules = normalizedRules.filter((rule) =>
    matchesPortalResource(rule.target, input.resource)
  );

  if (matchingRules.length === 0) {
    return { allowed: true, reason: "public" };
  }

  if (!input.memberId) {
    return { allowed: false, reason: "auth_required" };
  }

  const allowed = matchingRules.some((rule) => memberSatisfiesPortalRule(input.memberId, rule));

  return allowed
    ? { allowed: true, reason: "member_allowed" }
    : { allowed: false, reason: "access_denied" };
}
```

```ts
export async function handlePortalRegister(ctx: RouteContext) {
  await enforceRateLimit(ctx, "portal_auth");
  await verifyPublicWriteNonce(ctx.request);
  const payload = validatePortalRegisterPayload(await ctx.request.json());
  const member = await registerPortalMember(payload);
  return json(serializePortalMemberSession(member));
}
```

## Testing Requirements

- Unit:
  - portal schema normalization,
  - access evaluator allow/deny matrix,
  - role/plan/relation matching,
  - token hashing and TTL behavior,
  - `mapPortalError` coverage.
- Bun route/runtime:
  - register/login/logout/reset/profile flow,
  - protected page/post/entry/media/listing allow and deny paths,
  - admin CSRF/RBAC rejection,
  - public nonce/signature/rate-limit rejection,
  - session separation from admin auth.
- Vitest admin/UI:
  - portal settings list/editor cache hydration,
  - access rule editor dirty-state behavior,
  - Advanced nav/prefetch route exposure,
  - runtime widget configuration states.
- Required commands:

```bash
bun --cwd core lint
bun --cwd core lint:types
bun run lint:repo:types
set -a && source .env && set +a && bun test tests/unit/portal tests/integration/routes/portal*.test.ts tests/integration/runtime/portal*.test.ts
bun run test:vitest -- tests/vitest/ui/portal*.test.tsx
git diff --check
```

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/AUTH_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Portal members can register, authenticate, manage profile basics, and log out
   without using admin auth.
2. Site owners can define access rules for pages/posts/entries/listings/media
   without code.
3. Runtime denies protected content deterministically for anonymous or
   unauthorized members and renders allowed content for authorized members.
4. Admin portal management follows Advanced navigation, shared cache, route
   helper, theme-token, and dirty-state contracts.
5. Public write endpoints have nonce/signature/HMAC, rate-limit, strict schema,
   and optional reCAPTCHA policy coverage.
6. DB migrations include SQL, snapshot, and journal artifacts.
7. Docs, changelog, and kanban board are synchronized at closure.
