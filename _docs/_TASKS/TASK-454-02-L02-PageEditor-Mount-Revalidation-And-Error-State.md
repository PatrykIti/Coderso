# TASK-454-02-L02: PageEditor Mount Revalidation And Error State
# FileName: TASK-454-02-L02-PageEditor-Mount-Revalidation-And-Error-State.md

**Parent Subtask:** TASK-454-02
**Priority:** High
**Category:** Admin UI / Page Editor / Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-454-02-L01
**Status:** ⏳ To Do

---

## Overview

Implement one-shot mount revalidation in `PageEditor`. Cached detail should
render immediately, but a forced server detail must verify it. Fresh server
detail wins only when strictly newer and the editor is not dirty.

## Sub-Tasks

- [ ] Extract a local `hydrateFromDetail` helper that updates page, document,
      selection, settings title/slug, nav visibility, and revision retention.
- [ ] Replace the current early-return load effect with cache-first plus forced
      server revalidation.
- [ ] Keep dirty-state protection: revalidation never overwrites local edits.
- [ ] Surface bounded revalidation errors without blanking the document.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/PageEditor.tsx` | Hydrate helper, forced revalidation effect, error copy. |
| `tests/vitest/ui/page-editor-v2-flow.test.tsx` | Poisoned cache and dirty revalidation tests. |

## Implementation Pseudocode

```tsx
const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
const latestLoadedPageRef = useRef<PageDetail | null>(page);
const revalidatedResourceRef = useRef<string | null>(null);

useEffect(() => {
  hasUnsavedChangesRef.current = hasUnsavedChanges;
}, [hasUnsavedChanges]);

useEffect(() => {
  latestLoadedPageRef.current = page;
}, [page]);

const hydrateFromDetail = useCallback((detail: PageDetail, options?: { selectFirst?: boolean }) => {
  const document = normalizePageData(detail.currentData);
  setPage(detail);
  setPageDocument(document);
  if (options?.selectFirst ?? true) {
    selectSection(document.sections[0]?.id ?? null);
  }
  setSettingsTitle(detail.title);
  setSettingsSlug(detail.slug);
  setShowInNav(document.settings.showInNav);
  setRevisionRetention(normalizePageRevisionRetentionValue(document.settings.revisionRetention));
}, [selectSection]);

useEffect(() => {
  if (!pageId) return undefined;
  const resourceKey = `${editorHost.mode}:${pageId}`;
  if (revalidatedResourceRef.current === resourceKey) return undefined;
  revalidatedResourceRef.current = resourceKey;
  let cancelled = false;
  const run = async () => {
    const loaded = latestLoadedPageRef.current;
    if (!loaded) setIsLoading(true);
    try {
      const fresh = await editorHost.loadDetail(pageId, { force: true });
      if (cancelled || !fresh || hasUnsavedChangesRef.current) return;
      const currentLoaded = latestLoadedPageRef.current;
      if (loaded && !isNewerPageDetailTimestamp(fresh.updatedAt, loaded.updatedAt)) return;
      if (currentLoaded && !isNewerPageDetailTimestamp(fresh.updatedAt, currentLoaded.updatedAt)) return;
      hydrateFromDetail(fresh);
      setError(null);
    } catch (revalidationError) {
      if (!cancelled) setError(resolveInlineError(revalidationError, editorHost.loadFailedMessage));
    } finally {
      if (!cancelled) setIsLoading(false);
    }
  };
  void run();
  return () => {
    cancelled = true;
  };
}, [editorHost, hydrateFromDetail, pageId]);
```

Data flow:

- `initialPage` or cached detail seeds state.
- Forced server detail revalidates once.
- Existing cache client writes the fresh detail into localStorage.
- Fresh detail updates editor state only through `hydrateFromDetail`.

Error handling:

- If no current detail exists, load errors show the existing load failure copy.
- If cached detail exists, load errors keep the cached view and show a warning.
- Cancellation avoids state writes after unmount or route change.

Regression-test shape:

```ts
test("poisoned initial cache is corrected by forced fresh detail", async () => {
  pageEditorState.cachedPage = emptyPage({ updatedAt: "2026-01-01T00:00:00Z" });
  pageEditorState.currentPage = populatedPage({ updatedAt: "2026-01-02T00:00:00Z" });
  const view = mount(<PageEditor pageId="page-1" />);
  expect(view.container.textContent).not.toContain("Welcome to Coderso");
  await flush();
  expect(view.container.textContent).toContain("Welcome to Coderso");
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

- `_docs/ADMIN_CACHE.md` in TASK-454-02-L03.

## Acceptance Criteria

1. Full reload with poisoned cache cannot remain stale after the forced read.
2. Dirty local editor state is not overwritten by revalidation.
3. Revalidation failure is visible and non-destructive.
