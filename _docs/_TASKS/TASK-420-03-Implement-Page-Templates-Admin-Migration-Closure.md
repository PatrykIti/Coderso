# TASK-420-03: Implement Page Templates Admin Migration Closure
# FileName: TASK-420-03-Implement-Page-Templates-Admin-Migration-Closure.md

**Parent Task:** TASK-420
**Priority:** Medium
**Category:** Admin UI / Pages / Templates
**Estimated Effort:** Large
**Dependencies:** TASK-420-02
**Status:** ⏳ To Do

---

## Overview

Implement the selected Page Templates admin migration after TASK-420-02 freezes
the storage and preview contract. This leaf owns UI/routes/cache/docs/changelog
closure, not the initial product audit or contract design.

---

## Implementation Pseudocode

```ts
function implementPageTemplatesSurface(contract) {
  const routes = registerAdminRoutes(contract.routes);
  const cache = addTemplateCacheKeys(contract.cacheKeys);
  const ui = buildPageTemplatesAdminSurface(contract.uiModel);
  const assistant = updateAssistantSurfaceContext(contract.assistantContext);
  return validateMigration({ routes, cache, ui, assistant });
}
```

Expected data flow:

- Admin navigation and prefetch use shared `adminPaths`, `AdminLink`, and
  `prefetchAdminRoute` helpers.
- Cached admin client wrappers, cache invalidation, and cache-bus broadcasts are
  added for any new resource family.
- Legacy widget-template UI remains available or is migrated according to the
  approved contract.
- Assistant context advertises only the active surface contract that the current
  editor actually owns.

Error handling:

- Dirty-state protection must prevent background revalidation from overwriting
  unsaved edits.
- Route and cache errors map through existing admin error conventions.
- Migration failures leave legacy widget templates intact and actionable.
- Wire `pageTemplateBoundary` guards at the actual legacy surface entry points
  selected by TASK-420-02 so widget-template, custom-screen, and detail-page
  runtimes reject Page v2 `sections[]` at migration boundaries.

Regression-test shape:

- Admin UI tests for list/create/edit/preview/publish or equivalent flows.
- Route registration/cache invalidation tests for any new endpoints.
- Assistant active-surface tests if context changes.
- Runtime smoke for public/preview output.
- Runtime boundary tests for legacy surface rejection of Page v2 documents where
  TASK-420-02 requires migration-time guard wiring.
- Real browser smoke must start the app through `coderso-dev-core-host` and use
  the `playwright-cli` command. Load `.env` first for credentials/runtime
  settings; do not use MCP browser tooling.
- Run read-only Claude drift audits with `--permission-mode plan --effort xhigh
  --tools Read,Grep,Bash`, no artificial budget in prompts, and up to 25 minutes
  of wait time per pass. Do not send `.env` contents or secrets.

---

## Security Contract

- **Endpoint visibility:** internal admin endpoints; public output read-only;
  preview token routes only where the contract requires them.
- **Auth model:** existing admin session for admin writes and preview token
  validation for preview reads.
- **RBAC:** explicit page/template permissions checked at route boundaries.
- **CSRF:** all admin writes require existing CSRF behavior.
- **Rate-limit bucket:** existing admin and preview buckets unless TASK-420-02
  defines a stricter bucket.
- **Validation:** strict Page v2 schemas for Page-template payloads and legacy
  widget schemas for retained widget templates.
- **Anti-abuse controls:** no public writes, no mixed-contract rendering, no
  secret-bearing settings in browser cache/localStorage/debug payloads, and
  redacted preview target labels.

---

## Testing Requirements

- Relevant Vitest admin/UI suites.
- Relevant Bun route/runtime/preview suites.
- `coderso-dev-core-host` server smoke plus `playwright-cli` browser checks for
  changed admin/preview/public paths.
- Read-only Claude drift audits before implementation and before closure.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` if release-gated behavior changes.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/WIDGETS.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cached resources are
  added or changed.
