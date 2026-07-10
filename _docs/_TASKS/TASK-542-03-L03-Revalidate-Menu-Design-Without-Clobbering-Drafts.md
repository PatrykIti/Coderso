# TASK-542-03-L03: Revalidate Menu Design Without Clobbering Drafts

# FileName: TASK-542-03-L03-Revalidate-Menu-Design-Without-Clobbering-Drafts.md

**Parent Task:** TASK-542
**Parent Subtask:** TASK-542-03
**Priority:** High
**Category:** Menu Design / Admin Cache / Responsive UI / Data Safety
**Estimated Effort:** Medium
**Dependencies:** TASK-542-03-L01, TASK-542-03-L02
**Status:** ⏳ To Do
**Changelog:** 1254 (pinned; closure only)

---

## Exclusive ownership

- `core/admin/ui/menus/MenuDesignEditor.tsx`

Use `grep -an`/direct reads for this large file. Do not trust empty `rg` output.
Do not edit `menusClient.ts`: force reads and cache broadcasts already exist.

## Grounded anchors

- Raw canvas recursive projection: `MenuDesignEditor.tsx:794-845`.
- First-section canvas assumption made safe by 542-01: `:1010+`.
- Cache-seeded reducer/dirty state: `:3081-3109`.
- One non-force load/no subscription: `:3124-3148`.
- Unguarded Structure navigation: `:3233-3240`.
- Dirty badge: `:3246-3280`.
- Fixed `paddingRight:300`: `:3332-3337`.
- Proven structure-editor refresh pattern:
  `MenuEditorPage.tsx:458-563`.
- Client force/broadcast support: `menusClient.ts:168-175,225-239`.

## Implementation Pseudocode

```tsx
const cached = getCachedMenuDetail(menuId); // synchronous initial state remains
const dirtyRef = useLatest(history.dirty);
const mutationInFlightRef = useRef(false);
const skipNextDetailRefreshRef = useRef(0);
const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);

const applyAuthoritative = useCallback((detail, pages) => {
  setItems(projectPublicNavigationItems(mapMenuNodesToNavigationItems(...)));
  if (dirtyRef.current) {
    setRemoteUpdatePending(true);
    return; // never dispatch hydrate over local doc
  }
  dispatch({ type: "hydrate", doc: seedMenuDocument(detail.menu.settings) });
  setRemoteUpdatePending(false);
}, []);

useEffect(() => {
  let active = true;
  // cache already painted; always force authoritative background revalidation
  void Promise.all([
    getMenuWithItemsCached(menuId, { force: true }),
    listPagesCached({ force: true }),
  ]).then((payload) => { if (active) applyAuthoritative(...payload); })
    .catch(showNonDestructiveLoadError);
  return () => { active = false; };
}, [menuId, applyAuthoritative]);

useEffect(() => subscribeCacheEvents((event) => {
  if (event.key === cacheKeys.pagesList || event.key === cacheKeys.menuDetail(menuId)) {
    if (ownMutationEvent(event, refs)) return;
    void revalidateInBackground();
  }
}), [menuId, revalidateInBackground]);

const { dialog: dirtyNavigationDialog } = useAdminDirtyNavigationGuard({
  blocked: history.dirty,
  ...,
  onConfirmDiscard: discard,
});

// Structure button uses normal router navigation; shared blocker handles it.
// Replace inline paddingRight with panelOpen && "lg:pr-[300px]".
```

Render a remote-update notice with Reload/Keep editing choices. Reload explicitly
discards and applies the latest authoritative payload; Keep editing preserves the
draft. Save/publish mark mutation-in-flight and skip only their own cache event,
then hydrate the server result and clear dirty on success. Failure keeps dirty.

Use shared public projection for the canvas. Do not copy `siteShell` visibility
logic. Conditional wide clearance mirrors the landed Screen host approach but
does not edit `CanvasEditor.tsx`.

## Error/compatibility flow

- Warm cache renders immediately; forced background request always occurs.
- Background failure shows a retryable message without clearing cache/draft.
- Remote update while clean hydrates; while dirty only sets pending notice.
- Own mutation broadcast does not cause a redundant force loop.
- Structure navigation, browser navigation, and beforeunload are blocked while
  dirty; cancel preserves, confirm discards once.
- Narrow canvas retains usable width and panel remains in viewport.

## Tests owned by TASK-542-04

- `menu-design-editor.test.tsx`: cache seed + force, detail/pages cacheBus,
  clean hydrate, dirty no-clobber, remote notice choices, own-mutation skip,
  failure/retry, shared projection, Structure dirty guard, conditional clearance.
- `menusClient.test.ts`: existing force/broadcast contract stays sufficient.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/ui/menu-design-editor.test.tsx \
  tests/vitest/admin/menusClient.test.ts \
  tests/vitest/site/siteShell.test.tsx
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
```

Rerun named failures once in isolation.
