# TASK-479-23-L02: Template Editor → Floating-Panel Canvas
# FileName: TASK-479-23-L02-Template-Editor-Floating-Canvas.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Advanced (Page Templates) / Page Builder
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06, TASK-479-08, TASK-479-23-L01
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-23

---

## Overview

Keep the Page Template editor as the **same floating-panel Page Editor** used by
Pages, now wearing the redesign. The real `PageTemplateEditorPage` already binds the
shared `PageEditor` through the `PageEditorHost` seam (mode `page-template`,
reusing the Page v2 / `PAGE_MODEL` document, the canvas renderer, inline-edit
contract, and the floating control panel) — so the heavy editor restyle is delivered
once by **TASK-479-08-L02** and **inherited** here. This leaf restyles only the
**template-specific chrome** (the settings sheet and the propagation/usage note) and
**guarantees the editor is reused, not forked**. The prototype shows the propagation
note **always visible** in the editor (not hidden behind a settings drawer), so this
leaf surfaces it via the **existing** optional `canvasChrome` host seam (real
`PageEditorHost` field — host-owned chrome rendered inside the canvas frame above the
sections; the Menus editor already uses it for the live shell preview), keeping the
note always visible without forking/wrapping the shared editor or adding a new host
field.

- **Goal:** `core/admin/ui/pages/templates/PageTemplateEditorPage.tsx` renders the
  redesigned floating-panel `CanvasEditor`/`PageEditor` for templates, surfaces the
  propagation/usage context through the host seam, and restyles the template
  settings sheet — while keeping the `PageEditorHost` contract, the template model,
  and PAGE_MODEL reuse untouched.
- **Owning module/service:**
  `core/admin/ui/pages/templates/PageTemplateEditorPage.tsx` (host wiring +
  `TemplateSettingsSheet`/`TemplateSettingsForm`); the shared
  `core/admin/ui/pages/PageEditor.tsx` (+ `pages/editor/*`) is **reused as restyled
  by TASK-479-08-L02 — do not fork or re-restyle it here**; shared
  `core/admin/components/ui/{sheet,button,badge,card}.tsx`,
  `core/admin/ui/pages/editorControls/SegmentedControl`.
- **Source-of-truth docs:** `_docs/PAGE_MODEL.md` (template document is a Page v2
  document — **never** change block/section shapes), `_docs/PREVIEW_SPEC.md`
  (preview-token contract honored by `previewPageTemplate`), `_docs/DESIGN_TOKENS.md`,
  `_docs/TESTING_STRATEGY.md`. **Prototype source to port from:**
  `_docs/_PROTOTYPE/src/pages/advanced/PageTemplateEditorPreview.tsx` (propagation
  note "Editing this template updates N pages that use it", site-wide/page `Badge`,
  the `CanvasEditor` floating-panel shape) and
  `_docs/_PROTOTYPE/src/components/patterns/CanvasEditor.tsx`. Background: memory
  notes **[[pages-editor-v2-remediation-program]]** and
  **[[page-editor-color-toolbar-live-findings]]** (real-input toolbar regression the
  reused editor must not reintroduce).
- **Out of scope:** No second editor, no `PageEditorHost` contract changes, no
  `PAGE_MODEL`/template schema/payload changes, no preview-token or runtime-preview
  contract changes, no endpoint/RBAC changes. The prototype's `CanvasEditor` mock
  content (footer/menu placeholders, `usedOn = 24`) is non-functional — adopt the
  **structure + floating-panel model** via the shared editor, and treat the usage
  count with the same **honesty guard** as L01 (show it only from a real
  `PageTemplateDetail` field; the model has none today → render a generic propagation
  note, never a fabricated number). The prototype's "site-wide/page" `Badge` is likewise
  a mock scope the real model does not carry — do not render a fabricated scope badge
  (see the parent 23 footer-template vs navigation-menu reconciliation; main-menu scope
  is owned by TASK-479-10, not a template).

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). The editor keeps flowing through the existing
host seam: `loadDetail`/`getCachedDetail` (`getPageTemplateCached` /
`getCachedPageTemplateDetail`, `cacheKeys.pageTemplateDetail`), `saveDocument`
(`updatePageTemplate`), `preview` (`previewPageTemplate`, preview-token guarded per
`PREVIEW_SPEC.md`), and `renderSettings`. The cache contract (cache-hydrate +
`subscribeCacheEvents` background revalidation, no mount-force refetch, no dirty-state
overwrite) and the `assistantSurface: false` gating are preserved unchanged.

---

## Implementation Pseudocode

Keep the `PageTemplateEditorPage` host construction (`useMemo<PageEditorHost>`),
`toEditorDetail`, `resolveTemplateId`, and the `PageEditor` reuse **intact**. The
restyle is confined to: (a) the `TemplateSettingsSheet`/`TemplateSettingsForm` chrome
(soft tokens, redesigned inputs, the already-present `SegmentedControl` status), and
(b) surfacing the propagation/usage context through the host seam rather than forking
the editor shell.

```tsx
// core/admin/ui/pages/templates/PageTemplateEditorPage.tsx
// REUSE-NOT-FORK: the floating-panel canvas, chrome bar, undo/redo, device switch,
// and the floating control panel are all owned by the shared PageEditor (restyled in
// TASK-479-08-L02). This file only configures the host + restyles template chrome.
const host = useMemo<PageEditorHost>(() => ({
  mode: "page-template",
  resourceLabel: "Page Templates",
  settingsLabel: "Template settings",
  previewTitle: "Template preview",
  assistantSurface: false,                       // keep: templates have no assistant
  detailCacheKey: (id) => cacheKeys.pageTemplateDetail(id),
  getCachedDetail: (id) => { const c = getCachedPageTemplateDetail(id); return c ? toEditorDetail(c) : null; },
  loadDetail: async (id, o) => { const d = await getPageTemplateCached(id, { force: o?.force }); return d ? toEditorDetail(d) : null; },
  saveDocument: async (id, document) => { const u = await updatePageTemplate(id, { document }); if (!u) throw new Error(...); return toEditorDetail(u); },
  preview: async (id) => ({ previewUrl: (await previewPageTemplate(id, { ttlMinutes: 15 })).previewUrl }),
  renderSettings: (props) => <TemplateSettingsSheet {...props} />,
  // PROPAGATION CONTEXT (always-visible, like the prototype): surface "this template
  // is reused by pages" through the EXISTING optional `canvasChrome` host field — a
  // real `PageEditorHost` member (`canvasChrome?: ({ document, device }) => ReactNode`,
  // rendered inside the canvas frame above the document sections; precedent:
  // MenuDesignEditorPage's `canvasChrome` live shell). This keeps the note always
  // visible WITHOUT wrapping/forking the editor shell and WITHOUT any contract change.
  // Do NOT invent a `notice`/`subheaderRender` host field — none exists; reuse
  // `canvasChrome`. The template's banner ignores the `document`/`device` props (it is
  // a static propagation note). HONESTY GUARD: generic copy, never a fabricated count
  // (PageTemplateDetail carries no usage field).
  canvasChrome: () => <TemplatePropagationBanner />,
}), []);

return <PageEditor key={resolvedTemplateId ?? "missing"} pageId={resolvedTemplateId ?? undefined} host={host} />;
```

```tsx
// TemplatePropagationBanner — the ALWAYS-VISIBLE violet soft note rendered by the
// host `canvasChrome` seam (above the canvas sections), porting the prototype's
// PageTemplateEditorPreview "Editing this template updates the pages that use it" cue.
// HONESTY GUARD: generic copy only — include a page COUNT solely if PageTemplateDetail
// gains a real usage field (it has none today), never "updates 24 pages". OWNERSHIP:
// keep it page-scoped — a template can be the site footer (site.footerTemplateId); the
// header/main menu is a Menu (site.navigationMenuId, owned by TASK-479-10), so do not
// imply the main menu propagates from here (see parent 23 reconciliation note).
const TemplatePropagationBanner = () => (
  <Card className="mx-auto mb-3 flex max-w-3xl items-center gap-3 bg-primary-soft/50 p-3">
    <RefreshCw className="size-5 shrink-0 text-primary" />
    <p className="text-sm text-muted-foreground">Editing this template updates every page that uses it.</p>
  </Card>
);

// TemplateSettingsForm / TemplateSettingsSheet — restyle to soft/violet tokens.
//  - keep the EXISTING fields (name/slug/description/category) and the EXISTING
//    SegmentedControl status (Draft | Published) — stored enum tokens stay
//    lowercase; only display labels capitalize. Keep data-page-template-status-control.
//  - keep handleSave -> updatePageTemplate(...) and onSaved(toEditorDetail(updated)).
//  - the propagation note is NOT duplicated here as the primary surface (it lives in
//    the always-visible canvasChrome banner); the sheet keeps its existing
//    "settings/SEO never apply to target pages — only sections are inserted" description.
// Restyle inputs to the shared redesigned Input/Textarea primitives (rounded-xl,
// border-input, soft focus ring) instead of the ad-hoc inputClass strings.
const TemplateSettingsForm = ({ templateId, onOpenChange, onSaved }) => {
  const cached = getCachedPageTemplateDetail(templateId);   // lazy-init from cache
  const [name,setName] = useState(cached?.name ?? "");      // ...slug/description/category/status
  // ... handleSave unchanged ...
  return (
    <div className="space-y-4">
      {/* restyled name/slug/description/category fields + SegmentedControl status */}
    </div>
  );
};
```

```ts
// REUSE / NON-REGRESSION notes (carry over the V2 model, do NOT regress):
// 1. The editor MUST be the shared PageEditor floating-panel surface — assert this
//    in tests via the host seam (mode === "page-template"); never instantiate a
//    template-only canvas. The floating panel is the sole control surface.
// 2. REAL-INPUT REGRESSION GUARD (memory: page-editor-color-toolbar-live-findings):
//    because the editor is shared, the fix lives in 08-L02; here just DO NOT
//    re-wrap the panel or add a sheet-wide onMouseDown preventDefault that could
//    steal focus from the settings inputs or the SegmentedControl.
// 3. ESLint 9 react-hooks: TemplateSettingsForm keeps lazy-init from cache (no sync
//    setState in an effect); the keyed remount (`key={detail.id}:${open}`) handles
//    re-seeding when a new template opens — keep it.
```

**Data flow:** unchanged. `getCachedPageTemplateDetail`/`getPageTemplateCached`
hydrate the Page v2 document → the shared `PageEditor` drives the canvas + floating
panel via `PAGE_MODEL` ops → `saveDocument` persists through `updatePageTemplate`
with the dirty-state guard → `subscribeCacheEvents` background-revalidates without
overwriting dirty state → `previewPageTemplate` + the runtime preview honor preview
tokens. Template settings persist via `updatePageTemplate` and `onSaved` refreshes
the editor detail. The restyle re-homes nothing in the data path.

**Error handling:** keep `resolveSheetError` and the inline settings error; keep the
shared editor's existing Alert banners. The save throw in `saveDocument`
(`"Failed to save page template."`) and `isApiClientError` mapping stay. No new error
states; restyle banners to soft destructive tokens only.

**Regression-test shape:** see TASK-479-23-L03 — assert the editor mounts the shared
`PageEditor` with a host whose `mode === "page-template"` and `assistantSurface ===
false`; the host exposes a `canvasChrome` function whose output renders the generic
(non-fabricated) always-visible propagation note (assert by direct-rendering
`host.canvasChrome?.({ document, device })`, mirroring the existing `renderSettings`
direct-render pattern — the shared `PageEditor` is stubbed in this suite, so chrome is
verified through the seam, not the stub); the settings sheet renders the restyled
fields + `SegmentedControl` status; and the host cache/preview functions still resolve
`cacheKeys.pageTemplateDetail` / `previewPageTemplate`.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-authoring-canvas.test.tsx`
- Existing `page-templates-surface.test.tsx` host-seam assertions (captured host
  `mode`/`assistantSurface`, cache key, preview) must stay green; the shared editor's
  `page-editor-v2-flow` + `page-authoring-canvas` suites must stay green (do not
  weaken the data-* hook assertions).
- Real-input verification (manual / playwright real mouse+keyboard) is inherited from
  TASK-479-08-L02; re-confirm the **settings sheet** inputs + status SegmentedControl
  remain focusable/live with a real mouse + keyboard (guarding the documented
  `page-editor-color-toolbar-live-findings` focus regression).

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this leaf changes status.
- Add a `_docs/_CHANGELOG/` entry on closure linking **TASK-479** + **TASK-479-23-L02**.
- No contract-doc changes expected (visual-only, editor reused via the existing host
  seam). The always-visible propagation note reuses the **existing** optional
  `PageEditorHost.canvasChrome` field — **no new host field is introduced** — so no
  `_docs/PAGE_MODEL.md` contract edit is required; if that assumption ever changes
  (a dedicated host field is added in 08-L02), cross-link it and state it in the changelog.
