# TASK-420-03: Implement Page Templates Admin Rewrite Closure
# FileName: TASK-420-03-Implement-Page-Templates-Admin-Rewrite-Closure.md

**Parent Task:** TASK-420
**Priority:** Medium
**Category:** Admin UI / Pages / Templates
**Estimated Effort:** Large
**Dependencies:** TASK-420-02, TASK-421-02 (the shared Page Editor inspector control primitives must land before this rewrite consumes them)
**Status:** ⏳ To Do

---

## Overview

Implement the Page Templates admin rewrite after TASK-420-02 freezes the storage
and preview contract. This leaf owns deleting/replacing the obsolete
widget-template admin surface, adding the Page Templates UI/routes/cache/docs,
and closing validation.

---

## Implementation Pseudocode

```ts
function implementPageTemplatesSurface(contract) {
  const routes = registerAdminRoutes(contract.routes);
  const cache = addTemplateCacheKeys(contract.cacheKeys);
  const ui = buildPageTemplatesAdminSurface(contract.uiModel, {
    inspectorPrimitives: "shared-page-editor-control-primitives"
  });
  const assistant = updateAssistantSurfaceContext(contract.assistantContext);
  const obsoleteSurface = deleteObsoleteWidgetTemplateSurface(contract.deletion);
  return validateRewrite({ routes, cache, ui, assistant, obsoleteSurface });
}
```

Expected data flow:

- Admin navigation and prefetch use shared `adminPaths`, `AdminLink`, and
  `prefetchAdminRoute` helpers.
- Cached admin client wrappers, cache invalidation, and cache-bus broadcasts are
  added for any new resource family.
- Legacy widget-template UI/routes are removed from the Page Templates product
  path according to the approved replacement contract.
- Page Templates consumes the shared Page Editor inspector adapter/primitives
  from TASK-421-02 and must not define a separate raw-input inspector; the
  TASK-421-02 dependency above enforces this ordering, so this leaf is blocked
  until those primitives land.
- Assistant context advertises only the active surface contract that the current
  editor actually owns.

Error handling:

- Dirty-state protection must prevent background revalidation from overwriting
  unsaved edits.
- Route and cache errors map through existing admin error conventions.
- Obsolete route hits return explicit not-found or retired-surface responses.
- Page Templates reject `WidgetBlock[]` payloads at route/service boundaries.

Regression-test shape:

- Admin UI tests for list/create/edit/preview/publish or equivalent flows.
- Route registration/cache invalidation tests for any new endpoints.
- Assistant active-surface tests if context changes.
- Runtime smoke for public/preview output.
- Boundary tests proving Page Templates are Page v2-only and obsolete
  widget-template paths are gone.
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
- **Validation:** strict Page v2 schemas for Page-template payloads; reject
  `WidgetBlock[]` payloads.
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
