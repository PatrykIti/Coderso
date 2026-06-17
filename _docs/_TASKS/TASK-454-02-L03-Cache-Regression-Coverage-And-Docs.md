# TASK-454-02-L03: Cache Regression Coverage And Docs
# FileName: TASK-454-02-L03-Cache-Regression-Coverage-And-Docs.md

**Parent Subtask:** TASK-454-02
**Priority:** High
**Category:** Admin UI / Cache / Tests
**Estimated Effort:** Small
**Dependencies:** TASK-454-02-L02
**Status:** ⏳ To Do

---

## Overview

Lock the corrected mount hydration contract in tests and documentation. This
leaf is the cache-specific validation/documentation pass for TASK-454-02.

## Sub-Tasks

- [ ] Add Vitest cases for cache-first plus forced fresh detail.
- [ ] Add stale/same/unparsable mount candidates to mirror cache-bus behavior.
- [ ] Document that Page Editor treats cached detail as provisional on mount.

## Files To Change

| File | Required change |
|---|---|
| `tests/vitest/ui/page-editor-v2-flow.test.tsx` | Mount revalidation cases. |
| `tests/vitest/admin/pagesClient.test.ts` | Forced cached-client behavior if changed. |
| `_docs/ADMIN_CACHE.md` | Page detail mount revalidation contract. |

## Implementation Pseudocode

```ts
describe("PageEditor mount revalidation", () => {
  test("renders cached detail then applies strictly newer fresh detail");
  test("does not apply same timestamp fresh detail");
  test("does not apply older fresh detail");
  test("does not apply unparsable timestamp fresh detail");
  test("does not apply fresh detail while dirty");
});
```

Data flow: tests mock `getCachedDetail` and `loadDetail(force:true)` so no
browser/server network is used in Vitest.

Error handling: test one rejected forced read keeps cached content and shows
bounded inline copy.

Regression-test shape: assertions must check both visible canvas content and
client call options.

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** unchanged.
- **Anti-abuse controls:** not applicable.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/admin/pagesClient.test.ts`
- `git diff --check`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`

## Acceptance Criteria

1. Mount path and cache-bus path share the same monotonic rule.
2. Admin cache docs mention the one-shot forced revalidation.
3. Tests fail on the pre-TASK-454 poisoned-cache reload behavior.
