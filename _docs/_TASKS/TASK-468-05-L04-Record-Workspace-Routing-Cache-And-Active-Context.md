# TASK-468-05-L04: Record Workspace Routing Cache And Active Context
# FileName: TASK-468-05-L04-Record-Workspace-Routing-Cache-And-Active-Context.md

**Parent Subtask:** TASK-468-05
**Priority:** High
**Category:** Admin UI / Custom Screens / Routing And Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-468-05-L02, TASK-468-05-L03
**Status:** ⏳ To Do

---

## Overview

Wire record workspace routing, admin cache hydration, prefetch, and active
context around the V4 screen runtime. This leaf must use canonical admin route
helpers and must not hand-build admin links or prefetch matching.

## Sub-Tasks

- [ ] Route Custom Screen record list and record editor through canonical
  `adminPaths`, `AdminLink`, and `prefetchAdminRoute` helpers.
- [ ] Add cache keys/TTLs/invalidation for V4 screen record workspace data if
  existing keys are insufficient.
- [ ] Broadcast cache changes after entry save/delete/publish.
- [ ] Expose bounded active-context summaries for assistant work without raw
  privileged record payloads.
- [ ] Add routing/cache/prefetch tests.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/routes/**` | Route mapping updates if needed. |
| `core/admin/lib/adminPaths.ts` | Add canonical Custom Screen record paths if missing. |
| `core/admin/ui/custom-screens/**` | Replace hand-built links/prefetch with canonical helpers. |
| `core/admin/services/customScreenCache*.ts` | V4 cache key/invalidation updates if needed. |
| `_docs/ADMIN_CACHE.md` | Update when cache ownership changes. |
| `_docs/ADMIN_CACHE_MAP.md` | Update when cache ownership changes. |
| `tests/vitest/ui-integration/custom-screens/*Routing*.test.tsx` | Route/cache/prefetch coverage. |

## Implementation Pseudocode

```ts
export function customScreenRecordWorkspacePath(input: {
  screenId: string;
  recordId?: string;
}) {
  return adminPaths.customScreens.record({
    screenId: input.screenId,
    recordId: input.recordId,
  });
}

function invalidateScreenRecordWorkspace(input: { screenId: string; recordId?: string }) {
  customScreenCache.invalidate(["screen", input.screenId, "records"]);
  cacheBus.emit("customScreenRecords:changed", input);
}
```

Data flow:

- List rows and editor actions use canonical admin paths.
- Prefetch uses route helper-owned aliases.
- Entry mutations invalidate record list, record detail, and active-context
  summaries.

Error handling:

- Unknown screen or record ids map to existing not-found UI.
- Cache hydration failures fall back to bounded loading/error states without
  mount-force refetch loops.
- Dirty editor state blocks route changes through existing unsaved-change guards.

Regression-test shape:

```tsx
test("record list links use canonical admin paths", () => {
  render(<CustomScreenEntriesTable fixture={recordsFixture} />);
  expect(screen.getByRole("link", { name: /Edit Alpha/ })).toHaveAttribute(
    "href",
    adminPaths.customScreens.record({ screenId: "products", recordId: "alpha" })
  );
});
```

## Security Contract

- **Endpoint visibility:** existing internal admin routes only.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` for route loads; `content:write` for mutations.
- **CSRF expectations:** required for mutations.
- **Rate-limit bucket:** existing admin read/write buckets.
- **Reject unknown validation:** route params must be canonicalized and invalid
  ids rejected by existing route/service validation.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** active context and cache entries must avoid provider
  secrets, CSRF tokens, cookies, and unauthorized protected field values.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui-integration/custom-screens`
- `bun run check:admin-boundary`
- `bun --cwd core build:admin`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache keys change.
- `_docs/CMS_API.md`

## Acceptance Criteria

1. Custom Screen record workspace uses canonical admin route helpers.
2. Cache invalidation keeps list/detail/editor state coherent after mutations.
3. Active-context summaries are bounded and do not leak protected data.
