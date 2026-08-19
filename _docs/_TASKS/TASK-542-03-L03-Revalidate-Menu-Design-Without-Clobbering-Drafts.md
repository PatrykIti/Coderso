# TASK-542-03-L03: Revalidate Menu Design Without Clobbering Drafts

# FileName: TASK-542-03-L03-Revalidate-Menu-Design-Without-Clobbering-Drafts.md

**Parent Task:** TASK-542
**Parent Subtask:** TASK-542-03
**Priority:** High
**Category:** Menu Design / Admin Cache / Responsive UI / Data Safety
**Estimated Effort:** Medium
**Dependencies:** TASK-542-03-L01, TASK-542-03-L02
**Status:** ⏳ To Do
**Changelog:** 1319 (pinned; closure only)

---

## Exclusive ownership

- `core/admin/ui/menus/MenuDesignEditor.tsx` (facade after the split below)
- `core/admin/ui/menus/MenuDesignEditorCanvas.tsx`
- `core/admin/ui/menus/MenuDesignEditorControls.tsx`
- `core/admin/ui/menus/MenuDesignEditorBarPanel.tsx`
- `core/admin/ui/menus/MenuDesignEditorBrandNavControls.tsx`
- `core/admin/ui/menus/MenuDesignEditorBlockPanel.tsx`

Use `grep -an`/direct reads for this large file. Do not trust empty `rg` output.
Do not edit `menusClient.ts` or `cachePolicy.ts`: force reads and cache
broadcasts already exist and the revalidation contract below already bounds
coherence independently of the cache TTL.

## Line-gate split plan

`MenuDesignEditor.tsx` is 3,409 lines at HEAD 3c470092 and must be split in this
same change: the 1,000-line gate applies at TASK-542 close, so the later
TASK-551-03-L02 `MenuDesignEditor.tsx` split row is INSUFFICIENT and must be
rebased. Split by cohesive component/panel responsibility and preserve the
`MenuDesignEditor` default export as the facade.

| New module | Responsibility |
|---|---|
| `MenuDesignEditorCanvas.tsx` | canvas/preview render: `previewHasRealHref`, `renderPreviewNavItem`, `NavItemsPreview`, `canvasMenuLeafToPageBlock`, `MenuBlockPreview`, `MenuDocumentCanvas` |
| `MenuDesignEditorControls.tsx` | history reducer, `seedMenuDocument`, option/label maps, swatch helpers, generic control shells (`ShadowValueField`, `BrandIconPicker`, `SelectableBlock`, `MenuResponsiveStateBadge`, `MenuResponsiveControlShell`, `ControlDefaultHint`) |
| `MenuDesignEditorBarPanel.tsx` | `MenuBarPanel`, `NavLevelInheritBadge` |
| `MenuDesignEditorBrandNavControls.tsx` | `BrandLogoPicker`, `BrandStyleControls`, `NavLevelControls` |
| `MenuDesignEditorBlockPanel.tsx` | `MenuBlockPanel` and its block-type field renderers |
| `MenuDesignEditor.tsx` | the exported `MenuDesignEditor` component: cache/dirty revalidation orchestration, Structure dirty guard, conditional clearance; imports and composes the modules above |

Land order: `Canvas → Controls → BarPanel → BrandNavControls → BlockPanel →
Facade`. Re-run `bun --cwd core lint:types`, `bun --cwd core lint`, and
`tests/vitest/ui/menu-design-editor.test.tsx` after each step. Post-split
receipt: each module is at most 1,000 physical lines (`wc -l`); if
`MenuDesignEditorBlockPanel.tsx` lands above the gate, extract its per-block
field renderers into `MenuDesignEditorBlockFields.tsx` (same leaf). Record the
verified line counts in closeout evidence.

Rebaseline note for TASK-551-03-L02: that task's split row for
`MenuDesignEditor.tsx` (`MenuDesignCanvas.tsx`; `MenuDesignInspector.tsx`;
`MenuDesignDataSources.tsx`) is superseded by the names above; at its closure
TASK-551-03-L02 must rebaseline its table against these post-TASK-542 modules
rather than splitting `MenuDesignEditor.tsx` again.

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
- Client force/broadcast support: `menusClient.ts:168-175,198-199,237-238,259,274-275`.

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

## Cache TTL / coherence contract

`core/admin/services/cachePolicy.ts:1` sets `DEFAULT_TTL_MS = 5 * 60 * 1000`
(five minutes) for menu detail and pages list. This leaf does not edit
`cachePolicy.ts`; instead its contract makes that TTL a paint-latency bound, not
a coherence bound: the synchronous `getCachedMenuDetail` paints immediately, and
the editor ALWAYS forces `getMenuWithItemsCached(menuId, { force: true })` and
`listPagesCached({ force: true })` plus subscribes to the menu-detail/pages-list
`cacheBus` keys. A warm snapshot older than any TTL is therefore replaced by the
authoritative fetch on every mount/event, and a dirty local document is never
hydrated over. The five-minute TTL must not be able to pin a stale document for
five minutes.

## Tests owned by TASK-542-04

- `menu-design-editor.test.tsx`: cache seed + force, detail/pages cacheBus,
  clean hydrate, dirty no-clobber, remote notice choices, own-mutation skip,
  failure/retry, shared projection, Structure dirty guard, conditional clearance,
  stale warm-cache replacement (snapshot older than `cacheTtlMs.detail` is
  replaced by the forced fetch and never clobbers a dirty draft).
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
