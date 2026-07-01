# TASK-497: Posts List & Editor — Prototype-Parity Restyle
# FileName: TASK-497_Posts_List_And_Editor_Prototype_Parity_Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Content (Posts)
**Estimated Effort:** Large
**Dependencies:** TASK-479 (Done — soft/violet redesign tokens + shared primitives shipped: `ui/shared/{PageHeader,StatusTabs,StatusBadge,ListPaginationFooter,DataTable}`, `components/ui/badge` `soft`/`outline` variants). **TASK-479-09 (Posts Screen Migration — Done 2026-06-29)** already moved Posts onto the redesign tokens + shared `PageHeader`/`StatusTabs`/`StatusBadge` (first pass: token migration); **this task is the prototype-parity second pass** (quiet table, single editor chrome strip, EditorRail rail, flat inspector). Same prototype design source-of-truth as TASK-495/TASK-496. **Independent of** TASK-496's shared `shared/CanvasEditor.tsx` shell — Posts keeps its own three-pane editor (see D2/D4). Background memories: **[[admin-ui-redesign-prototype]]**, **[[pages-editor-v2-remediation-program]]**, **[[pageeditor-tsx-grep-binary-trap]]**.
**Status:** ✅ Done
**Completed:** 2026-06-30

---

## Overview

The Posts **list** (`core/admin/ui/posts/PostsListPage.tsx` + `PostsTable.tsx`) and the Posts **block editor** (`core/admin/ui/posts/editor/*`) already ship on the redesign tokens and already share `PageHeader`/`StatusTabs`/`StatusBadge` with the prototype (delivered by TASK-479-09), but they diverge from the redesign **prototype** (`_docs/_PROTOTYPE/src/pages/content/{PostsListPage.tsx, PostEditorPreview.tsx}`) in their chrome and surface treatment:

- **List:** a loud table header (`bg-muted/40` + `uppercase tracking-wider` cells, `PostsTable.tsx:79,88-108`), `shadow-card` (`:77`), a 7-column responsive set (adds Categories/Tags + Updated), a full-name author, and the copy "New" / "Create and publish articles…" (`PostsListPage.tsx:433,483`) — versus the prototype's quiet `shadow-soft` `DataTable` header, lean 5-column set, first-name author, and "New post" / "Write, schedule, and publish blog posts for your site." (`proto:98,116`).
- **Editor:** a two-row custom header (back-arrow + breadcrumb + action cluster + gear, then a `border-t` second row of labeled Add-block / Outline / Details / Focus / Revisions buttons, `PostEditorHeader.tsx:80-214`), a `bg-background` left "Document Outline" rail and a heavy bordered-card `InspectorSection` right inspector — versus the prototype's **single** muted chrome strip (`EditorPreviewFrame.tsx:37`) with undo/redo + device toggle, a `bg-muted/20` "Blocks" `EditorRailGroup`/`EditorRailItem` rail, and a flat "Post settings" inspector with light `InspectorRow` rows + one muted SEO sub-card.

**This is a RESTYLE only — no re-architecture, no feature change.** Every post behavior — block model, autosave, revisions, runtime preview, status, bulk actions, create drawer, keyboard shortcuts, every `data-post-editor-*` hook + `aria-pressed`/`aria-controls`, the **Block** tab in the inspector — is preserved exactly. The canvas surface (`PostEditorCanvas.tsx:1354-1372`) is already at prototype parity.

Delivered as three children (see **Children** below): list restyle, editor restyle (incl. a small new shared `EditorRail` primitive port), and tests + docs + closure.

---

## Hard decisions (owner-approved — bake into the contract)

These tensions are real (the prototype's literal patterns would regress shipped behavior or fabricate data). They are settled here so reviewers agree before any code is written.

**D1 — LIST keeps `PageFilters` + `ListPaginationFooter` (consistency with the Pages list).** The prototype list uses a borderless `FilterBar` + a numbered `Pagination` ("Showing 1–12 of 48", `proto:116-119`). The **shipped** redesign list (Pages — `PageListPage.tsx`) and Posts both use the bordered `PageFilters` card + the real `ListPaginationFooter` (`PostsListPage.tsx:501-511,533`). There is **no shared admin `FilterBar`** (confirmed: `find core/admin/ui -iname "*FilterBar*"` → none) and the numbered `Pagination` fixed "of 48" totals are **fixture-only**. **Decision:** keep `PageFilters` + `ListPaginationFooter` as-is; the prototype's borderless `FilterBar` + numbered `Pagination` are **deferred / fixture-only** (do not fork Posts away from Pages). Adopt only the prototype's *table look*, restyled in place.

**D2 — LIST restyles `PostsTable`'s look IN PLACE — does NOT swap to `shared/DataTable.tsx`.** The shared `DataTable` renders **uncontrolled, decorative** checkboxes (`DataTable.tsx:56` `<Checkbox aria-label="Select all" />`, `:75` `<Checkbox aria-label="Select row" />` — no `checked`/`onCheckedChange`) and has no per-row dropdown-actions slot. The real list needs **controlled** bulk-selection wiring (`PostsListPage.tsx:520-524`) + the functional `PageRowActions` dropdown (`PostsTable.tsx:182-190`). Swapping to `DataTable` would break bulk selection and row actions. **Decision:** restyle `PostsTable`'s classes to match the `DataTable` *look* (quiet header, `shadow-soft`, lean columns) while keeping its controlled selection + `PageRowActions`.

**D3 — Drop fixture-only prototype elements (parity ≠ inventing data).** The same way the team already dropped the prototype's `review`/`trash` tabs (`PostsListPage.tsx:213-215`):
- **Comments column** (`proto:66-76`) — no `comments` field on the `PostSummary` DTO (`postsClient.ts:37-51`). Drop.
- **Category subtitle** under the title (`proto:45`) — `PostSummary` carries no resolved category *name* (category lives on `PostDetail.taxonomy`, `postsClient.ts:53-55`, not on the list DTO); the title subtitle is the **slug** (`PostsTable.tsx:144-146`). **Keep the existing slug subtitle**; do not fabricate a category.
- Numbered-`Pagination` fake totals (D1), the prototype's sample **byline** "By Alex Rivera · Product · 6 min read" (`proto PostEditorPreview.tsx:134`), and the "non-functional preview" footer (`proto:170`) are preview scaffolding — drop.

**D4 — EDITOR stays its OWN three-pane shell (`PostEditorLayout` / `PostEditorRegions`) — does NOT adopt the Pages `shared/CanvasEditor.tsx`.** The prototype Post editor uses `EditorPreviewFrame` (NOT the Pages `CanvasEditor` — confirmed: `PostEditorPreview.tsx:15-19` vs `PageEditorPreview.tsx`), and it renders a page-level `PageHeader` above a `rounded-2xl … shadow-card` framed preview card *because it is a non-functional, scrolling embedded preview*. The real editor is a **full-viewport app** (`PostEditorLayout.tsx:103` `contentClassName="overflow-hidden p-0"`). Forcing the literal `PageHeader` + rounded scrolling card would regress full-height editing. **Decision:** parity = the **three panes' visual treatment + a single muted chrome strip**, NOT the prototype's literal `PageHeader` + rounded card, and the editor keeps `PostEditorLayout`/`PostEditorRegions` (do not adopt `shared/CanvasEditor.tsx`).

**D5 — Classic editor (`PostClassicEditorShell`) is OUT OF SCOPE.** `PostEditorPage.tsx:60-61` routes to `PostClassicEditorShell` when `posts.editor.mode === "classic"`; the prototype depicts only the block editor. **Decision:** out of scope for this restyle — only **verify** it still renders on the redesign tokens (no chrome restyle, no prototype reference exists for it).

---

## Preserve (untouched by the restyle)

Functional behavior is a hard invariant — the restyle touches **presentation only**:

- **List:** controlled bulk selection (`selectedIds`/`isAllSelected`/`isIndeterminate` + `onToggleAll`/`onTogglePost`, `PostsListPage.tsx:520-524`), the inline bulk-actions cluster (`:436-480`), `PostsCreateDrawer` create flow (`:481-484,535-545`), `StatusTabs` status counts (`:216-224,500`), `ListPaginationFooter` (`:533`), `PageRowActions` Edit/Preview/Duplicate/Publish/Unpublish/Delete (`PostsTable.tsx:182-190`), every `Checkbox` `aria-label`.
- **Editor:** the post block model + `postEditorStore` ops, autosave, revisions, runtime preview, status, keyboard shortcuts (`usePostEditorShortcuts`), **every** `data-post-editor-*` hook (`-header-row`, `-header-cluster`, `-sync-state`, `-region`, `-details`, `-details-tab`, `-details-tab-trigger`, `-shortcut`, `-density`), every `aria-pressed`/`aria-expanded`/`aria-controls` on the toggle buttons (`PostEditorHeader.tsx:146-148,164-166,181-183`), and the **Block** tab in the inspector (`PostDetailsSidebar.tsx:49-55` — selection-driven block editing is required by the block model; the prototype simply doesn't depict it). All `editor.*` wiring (`saveDraft` `PostBlockEditorShell.tsx:520`, publish/preview, `onChange*` handlers `:441-447`) is consumed unchanged.

---

## Scope gating

| Surface | Module | In scope | Treatment |
|---|---|---|---|
| **Posts list** | `posts/PostsListPage.tsx` + `posts/PostsTable.tsx` | YES (S1) | Copy + quiet `DataTable`-look table, in place (D1/D2/D3) |
| **Post block editor** | `posts/editor/*` (header, layout, regions, sidebars, inspector, canvas) | YES (S2) | Single muted chrome strip + `EditorRail` left rail + flat inspector (D4) |
| **`EditorRail` primitive** | NEW `core/admin/ui/shared/EditorRail.tsx` | YES (S2) | Port `EditorRailGroup`/`EditorRailItem` from `EditorPreviewFrame.tsx:82-119` |
| **Classic editor** | `posts/editor/PostClassicEditorShell.tsx` | NO — out of scope (D5) | Verify-only: still renders on redesign tokens |
| **Shared `DataTable` swap / borderless `FilterBar` / numbered `Pagination`** | — | NO (D1/D2) | Deferred / fixture-only |

---

## Children

| ID | Title | Scope |
|----|-------|-------|
| **TASK-497-01** | Posts List Restyle | `PostsListPage.tsx` copy ("New post" + "Write, schedule, and publish blog posts for your site.", keep the create-drawer — do **not** swap to a bare editor `Link` like the prototype) + `PostsTable.tsx` quiet `DataTable`-look restyle **in place**: drop `bg-muted/40` header + `uppercase tracking-wider`/`font-semibold` cells (`:79,88-108`), `shadow-card`→`shadow-soft` (`:77`), lean to **Title / Status / Author / Published / Actions** (drop Categories-Tags + Updated; **never** add Comments — D3), first-name author (`proto:57`), whole-row `onClick`→editor nav with `stopPropagation` on the checkbox + actions cells, keep slug subtitle / selected tint / `PageRowActions` / controlled selection / bulk cluster / `PageFilters` / `ListPaginationFooter` (D1/D2/D3). Full pseudocode + regression-test shape. |
| **TASK-497-02** | Post Editor Restyle | **PORT** `EditorRailGroup`/`EditorRailItem` from `EditorPreviewFrame.tsx:82-119` to a NEW `core/admin/ui/shared/EditorRail.tsx` (confirmed: none exists in admin). Then restyle the editor: collapse the two-row header (`PostEditorHeader.tsx:80-214`) into a **single** muted chrome strip (`bg-muted/40`, model `EditorPreviewFrame.tsx:37`) — back/breadcrumb left; right = autosave **badge** (`PostEditorActionCluster.tsx:44-49` pill → `Badge variant="outline"`, keep dynamic text) + undo/redo (wire `editor.canUndo`/`canRedo`) + optional device toggle (wire `PostEditorLayout` `viewportMode`) + the Add-block/Outline/Details/Focus/Revisions toggles **demoted to `icon` ghost buttons** keeping all `data-*`/`aria-pressed`/`aria-controls` + Preview/Save-draft/Publish (Send→Rocket) + gear; restyle the left region surface to `bg-muted/20` and the inserter palette to the `EditorRail` look (keep Outline/List-view); restyle the right region to `bg-card` with a flat "Post settings" + status header, light `InspectorRow` rows, and a single `bg-muted/30` SEO sub-card (keep the **Block** tab + all `onChange*`); optional canvas title `text-5xl`→`text-3xl` (no byline). Full pseudocode + regression-test shape. |
| **TASK-497-03** | Posts Tests, Docs & Closure | Add restyle assertions to the list + new editor-chrome wave specs (per **Validation** below) **without weakening** the existing posts suites; verify Classic editor still renders on redesign tokens (D5); full gates (`lint`/`lint:types`/vitest/`gates:coderso`) + runtime smoke (`coderso-dev-core-host`, admin `:5173`) + the Block-tab + bulk-selection a11y green. Docs: changelog `1206` + README board + Statistics closure; no contract docs change (pure restyle — state so explicitly). |

Sequence: **S1 (497-01) and S2 (497-02) are independent** (list vs editor tracks) and may run in parallel; **S3 (497-03)** lands after both. Each child ends with a sequential drift-verify + gates per the TASK-479 wave norm.

---

## Security Contract

**UI-only restyle.** No route, RBAC, cache, `adminPaths`, or DTO change. The list keeps loading through `getCachedPosts`/`listPostsCached` + `subscribeCacheEvents` (`PostsListPage.tsx:82,121,162-166`) and the bulk/create/publish/preview/delete flows through the existing `postsClient` helpers; the editor keeps autosave/revisions/preview/publish flowing through `usePostEditorState`/`postEditorStore`/`PostRevisionDrawer` and the runtime-preview contract — all untouched. The new `core/admin/ui/shared/EditorRail.tsx` is **purely presentational** (imports only `@/components/*`/`@/lib/*`/`lucide-react`/`react`, no data/service import) so it carries no security surface. No new endpoints or permissions; `PostSummary` is read exactly as shipped (no fabricated `comments`/`category` fields — D3).

---

## Acceptance criteria

All must be **true** at closure:

1. **List copy:** header renders "Write, schedule, and publish blog posts for your site." + a "New post" button that still opens `PostsCreateDrawer` (not a bare editor `Link`).
2. **List table look:** container is `shadow-soft` (not `shadow-card`); `TableHeader` has **no** `bg-muted/40` and header cells have **no** `uppercase tracking-wider`/`font-semibold`; columns are exactly **Title / Status / Author / Published / Actions** (no Comments header; Categories-Tags + Updated dropped); author shows first name; whole-row click navigates to `/posts/{id}` with checkbox + actions cells stopping propagation; slug subtitle + selected tint + `PageRowActions` + controlled selection + bulk cluster + `PageFilters` + `ListPaginationFooter` ("posts") all preserved.
3. **Editor chrome:** a **single** muted strip (`bg-muted/40`) replaces the two-row header — the secondary `data-post-editor-header-row="secondary"` toolbar row is merged/removed; the autosave badge keeps its dynamic text (Saving… / Unsaved changes / Saved at HH:MM / Synced); undo/redo present + disabled when `canUndo`/`canRedo` false; Preview + Publish (Rocket, label flips Update when published) + optional Save draft wired; all `data-post-editor-*` + `aria-pressed`/`aria-controls` preserved.
4. **Editor panes:** left region `bg-muted/20`; the inserter palette **adopts the `EditorRail` look** — its result sections are wrapped in the new `EditorRailGroup` (the AC#5 consumption point) and each option row carries the rail **active token** `bg-primary-soft` via `className` on its kept `<Button role="option">` (the inserter keeps that listbox `<Button>` for roving-keyboard a11y per 497-02 B6 — it does **not** use the literal `EditorRailItem` element); Outline + List-view kept. Right region `bg-card` with a flat "Post settings" header, light `InspectorRow` rows, and a single `bg-muted/30` SEO sub-card; the **Block** tab is still present + enabled after selecting a block.
5. **`EditorRail` primitive** exists at `core/admin/ui/shared/EditorRail.tsx`, is presentational, and is **consumed by the editor's left rail via `EditorRailGroup`** wrapping the inserter's "Blocks"/"Recently used" sections (mandatory — 497-02 B6). `EditorRailItem` is exported for reuse and supplies the shared `bg-primary-soft` active token the inserter rows mimic, but need **not** be rendered as a literal element (the inserter keeps its own `<Button role="option">` for listbox a11y).
6. **Preserved:** every existing posts vitest suite stays green **untouched** (no weakened assertions); the Classic editor still renders on redesign tokens (D5).
7. **Gates:** `bun --cwd core lint` + `lint:types` + the posts suites + `gates:coderso` all green; runtime-smoke of the list + editor (`coderso-dev-core-host`, admin `:5173` — white page = server down, re-run the helper).

---

## Validation & closure expectations

- **Gates:** `bun --cwd core lint`; `bun --cwd core lint:types`; `gates:coderso` — all green.
- **Existing posts suites stay green, UNTOUCHED** (functional coverage — do not weaken to fit the restyle): `tests/vitest/posts/{postEditorStore,post-editor-layout-state,post-editor-focus-return,post-editor-preferences,post-insert-flow}.test.ts` + integration `tests/integration/posts/{posts-revisions-flow,posts-runtime-flow}.test.ts`.
- **List restyle assertions** (extend `tests/vitest/ui/posts-list.test.tsx` + `posts-table-wave.test.tsx`; keep `posts-create-drawer-a11y.test.tsx` green): header copy + "New post"; quiet header (no `uppercase`/`bg-muted/40`) + `shadow-soft`; column set Title/Status/Author/Published/Actions, **absent** Comments (+ Updated/Categories); first-name author; title link + whole-row nav to `/posts/{id}`; select-all + per-row checkbox `aria-label`s present + controlled; bulk cluster appears on selection; `StatusTabs` counts + `ListPaginationFooter` ("posts") render.
- **Editor restyle assertions** (new `tests/vitest/ui/posts-editor-chrome-wave.test.tsx`, render `PostBlockEditorShell` like the existing wave tests): single chrome strip (`data-post-editor-header-row="secondary"` gone/merged, header region `bg-muted/40`); autosave badge states reachable; Preview/Publish (Update when published)/optional Save draft wired; undo/redo present + disabled on `!canUndo`/`!canRedo`; left region `bg-muted/20` + inserter sections wrapped in `EditorRailGroup` with each kept `<Button role="option">` carrying the rail active token `bg-primary-soft` (no literal `EditorRailItem` in the listbox); right inspector "Post settings" + `InspectorRow` labels + single `bg-muted/30` SEO sub-card + **Block tab present** (`data-post-editor-details-tab-trigger`) and enabled after block select; canvas `bg-dotted` + `max-w-2xl` card guarded against regression.
- **Real-/runtime smoke** (`playwright-cli` per **[[admin-ui-redesign-prototype]]**): list + editor render the prototype look; bulk selection, create drawer, autosave badge, undo/redo, device toggle (if shipped), and Block-tab block editing all still function.
- **Docs on closure:** update `_docs/_TASKS/README.md` board + **Statistics**; add a `_docs/_CHANGELOG/` entry (`1206`) linking **TASK-497** (+ the **TASK-479**/**TASK-479-09** tokens/primitives it builds on); **no** contract-doc edit is required for a pure restyle — state so explicitly in the changelog.
