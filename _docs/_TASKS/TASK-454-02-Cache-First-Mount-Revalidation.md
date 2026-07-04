# TASK-454-02: Cache-First Mount Revalidation
# FileName: TASK-454-02-Cache-First-Mount-Revalidation.md

**Parent Task:** TASK-454
**Priority:** High
**Category:** Admin UI / Page Editor / Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-454-01
**Status:** ✅ Done
**Completed:** 2026-06-17

---

## Overview

Close the mount-path cache trust vector. The Page Editor must keep cache-first
hydration for speed, then perform exactly one forced server revalidation for the
mounted resource. Fresh detail applies only when the editor is not dirty and the
host freshness policy allows it.

This is host-neutral work for Pages, Page Templates, and Menu Design because all
three use `PageEditorHost.loadDetail`. Pages and Page Templates use strict
`updatedAt` freshness. Menu Design currently maps `updatedAt` from
`menu.createdAt`, so it must use an explicit forced-clean replacement mode or
gain a real menu freshness source before timestamps are treated as authoritative.

## Sub-Tasks

- [x] TASK-454-02-L01: Host Load Options And Freshness Helper
- [x] TASK-454-02-L02: PageEditor Mount Revalidation And Error State
- [x] TASK-454-02-L03: Cache Regression Coverage And Docs

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/editor/pageEditorHostContract.ts` | Add host load options type. |
| `core/admin/ui/pages/PageEditor.tsx` | One-shot mount revalidation and shared hydrate helper. |
| `core/admin/ui/pages/templates/PageTemplateEditorPage.tsx` | Pass `{ force }` through to `getPageTemplateCached`. |
| `core/admin/ui/menus/MenuDesignEditorPage.tsx` | Pass `{ force }` through to `getMenuWithItemsCached`. |
| `tests/vitest/ui/page-editor-v2-flow.test.tsx` | Cache-first/revalidate regression coverage. |
| `_docs/ADMIN_CACHE.md` | Document the corrected mount contract. |

## Implementation Pseudocode

```tsx
type PageEditorHostLoadOptions = { force?: boolean };
type PageEditorHostFreshnessMode = "updatedAt" | "forced-clean-replace";

const shouldApplyFreshDetail = ({
  current,
  fresh,
  isDirty,
  mode,
}: {
  current: PageEditorResourceDetail | null;
  fresh: PageEditorResourceDetail;
  isDirty: boolean;
  mode: PageEditorHostFreshnessMode;
}) => {
  if (isDirty) return false;
  if (!current) return true;
  if (mode === "forced-clean-replace") return true;
  return isNewerPageDetailTimestamp(fresh.updatedAt, current.updatedAt);
};

const hydrateFromDetail = (detail: PageEditorResourceDetail) => {
  const document = normalizePageData(detail.currentData);
  setPage(detail);
  setPageDocument(document);
  selectSection(document.sections[0]?.id ?? null);
  setSettingsTitle(detail.title);
  setSettingsSlug(detail.slug);
  setShowInNav(document.settings.showInNav);
  setRevisionRetention(normalizePageRevisionRetentionValue(document.settings.revisionRetention));
};

useEffect(() => {
  if (!pageId) return;
  let cancelled = false;
  const loadedAtStart = page;
  void editorHost.loadDetail(pageId, { force: true }).then((fresh) => {
    if (cancelled || !fresh || hasUnsavedChangesRef.current) return;
    if (!shouldApplyFreshDetail({
      current: loadedAtStart,
      fresh,
      isDirty: hasUnsavedChangesRef.current,
      mode: editorHost.freshnessMode ?? "updatedAt",
    })) return;
    hydrateFromDetail(fresh);
  });
  return () => {
    cancelled = true;
  };
}, [editorHost, pageId]);
```

Data flow:

- Initial state may come from `initialPage`, `getCachedDetail`, or empty
  placeholder.
- Forced read writes the normal detail cache through the existing cached client.
- Fresh detail does not overwrite unsaved local edits.
- Timestamp-authoritative hosts reject older/same/unparsable candidates.
- Menu Design has explicit coverage for forced clean replacement when
  `createdAt` cannot prove freshness.

Error handling:

- Failed forced read keeps the current view and surfaces bounded inline copy.
- Same/older/unparsable timestamps fail closed.

Regression-test shape:

- Initial poisoned cache renders first, then fresh server detail replaces it.
- Fresh detail older than cache does not replace for timestamp-authoritative
  hosts.
- Menu Design same-`createdAt` fresh detail corrects a poisoned clean cache.
- Dirty editor blocks revalidation overwrite.
- Page Template and Menu Design host load signatures stay compatible.

## Security Contract

- **Endpoint visibility:** no new endpoints; existing internal detail reads.
- **Auth model:** existing admin session.
- **RBAC:** existing host permissions.
- **CSRF expectations:** not applicable to detail reads.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** unchanged; detail payloads normalize through
  existing read paths.
- **Anti-abuse controls:** not applicable.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun run test:vitest -- tests/vitest/admin/pagesClient.test.ts tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`

## Acceptance Criteria

1. TTL-fresh poisoned detail cache cannot remain authoritative after mount,
   including Menu Design caches that lack a real `updatedAt` source.
2. Cache-bus monotonic behavior remains unchanged.
3. No prefetch or mount refetch loop is introduced.
