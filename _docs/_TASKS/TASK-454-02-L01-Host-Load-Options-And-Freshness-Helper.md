# TASK-454-02-L01: Host Load Options And Freshness Helper
# FileName: TASK-454-02-L01-Host-Load-Options-And-Freshness-Helper.md

**Parent Subtask:** TASK-454-02
**Priority:** High
**Category:** Admin UI / Page Editor / Host Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-454-01-L01
**Status:** ⏳ To Do

---

## Overview

Extend the Page Editor host load contract so shared editor code can request a
forced server read without knowing whether the host is a page, template, or
menu. Also move or export the timestamp comparison helper so mount revalidation,
cache-bus rehydration, and autosave detection use one monotonic timestamp rule
where the host has an authoritative `updatedAt`.

## Sub-Tasks

- [ ] Add `PageEditorHostLoadOptions = { force?: boolean }`.
- [ ] Add a host-owned freshness mode so hosts without reliable `updatedAt`
      can opt into forced clean replacement.
- [ ] Update Pages, Page Templates, and Menu Design hosts to pass `force` into
      their cached clients.
- [ ] Reuse `isNewerPageDetailTimestamp` from one local helper location.
- [ ] Keep existing cache-bus behavior unchanged.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/editor/pageEditorHostContract.ts` | Add load options type and update `loadDetail`. |
| `core/admin/ui/pages/PageEditor.tsx` | Use the options type and shared timestamp helper. |
| `core/admin/ui/pages/templates/PageTemplateEditorPage.tsx` | `getPageTemplateCached(id, options)`. |
| `core/admin/ui/menus/MenuDesignEditorPage.tsx` | `getMenuWithItemsCached(id, options)`. |
| `tests/vitest/ui/page-editor-v2-flow.test.tsx` | Assert forced load call shape. |

## Implementation Pseudocode

```ts
export type PageEditorHostLoadOptions = {
  force?: boolean;
};

export type PageEditorHostFreshnessMode = "updatedAt" | "forced-clean-replace";

export function shouldApplyFreshDetail(input: {
  current: PageEditorResourceDetail | null;
  fresh: PageEditorResourceDetail;
  isDirty: boolean;
  mode: PageEditorHostFreshnessMode;
}) {
  if (input.isDirty) return false;
  if (!input.current) return true;
  if (input.mode === "forced-clean-replace") return true;
  return isNewerPageDetailTimestamp(input.fresh.updatedAt, input.current.updatedAt);
}

export type PageEditorHost = {
  freshnessMode?: PageEditorHostFreshnessMode;
  loadDetail: (
    id: string,
    options?: PageEditorHostLoadOptions
  ) => Promise<PageEditorResourceDetail | null>;
};

const defaultPagesEditorHost: PageEditorHost = {
  loadDetail: (id, options) => getPageCached(id, { force: options?.force }),
};

const pageTemplateHost: PageEditorHost = {
  loadDetail: async (id, options) => {
    const detail = await getPageTemplateCached(id, { force: options?.force });
    return detail ? toEditorDetail(detail) : null;
  },
};

const menuHost: PageEditorHost = {
  freshnessMode: "forced-clean-replace",
  loadDetail: async (id, options) => {
    const detail = await getMenuWithItemsCached(id, { force: options?.force });
    return detail ? toMenuDesignEditorDetail(detail.menu) : null;
  },
};
```

Data flow: host callers pass only `{ force: true }` for mount verification;
existing prefetch/list warmups stay `force: false`. Pages and Page Templates use
`updatedAt` freshness; Menu Design uses `forced-clean-replace` because its
adapter currently has only `createdAt`.

Error handling: host load errors keep throwing through existing client behavior.

Regression-test shape:

```ts
test("PageEditor host load receives force true during mount revalidation", async () => {
  mount(<PageEditor pageId="page-1" />);
  await flush();
  expect(pageEditorState.getPageCached).toHaveBeenCalledWith("page-1", { force: true });
});
```

## Security Contract

- **Endpoint visibility:** no new endpoints; existing internal detail reads.
- **Auth model:** existing admin session.
- **RBAC:** existing host read permissions.
- **CSRF expectations:** not applicable to reads.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** unchanged.
- **Anti-abuse controls:** not applicable.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- None unless implementation changes documented cache semantics.

## Acceptance Criteria

1. All Page Editor hosts compile with the new load signature.
2. Forced mount read uses existing cached-client APIs.
3. Timestamp freshness has one local rule and Menu Design has an explicit
   non-timestamp mode instead of silently relying on `createdAt`.
