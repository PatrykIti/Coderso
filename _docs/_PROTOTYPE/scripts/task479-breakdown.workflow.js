export const meta = {
  name: "task-479-breakdown",
  description: "Author the full TASK-479 child tree (token + shell + per-screen subtasks & leaves) per AGENTS.md",
  phases: [{ title: "Author tasks", detail: "one Opus agent per subtask -> subtask file + all leaf files" }],
};

const TASKS_DIR = "/home/coder/project/Coderso/_docs/_TASKS";

const CONTRACT = `You are authoring TASK FILES (Markdown) that break down TASK-479 — porting the finished visual-redesign PROTOTYPE in _docs/_PROTOTYPE/ into the REAL admin at core/admin/**. You do NOT write product code; you write execution-ready task/leaf files that a future implementer follows.

Write files with the Write tool to absolute paths under ${TASKS_DIR}/.

FORMAT RULES (from AGENTS.md + _docs/_TASKS/EXAMPLE_TASK.md — READ EXAMPLE_TASK.md first):
- Subtask file name: TASK-479-NN-<Slug>.md ; leaf file name: TASK-479-NN-LNN-<Slug>.md (hyphen slugs, zero-padded NN/LNN).
- Each file starts with: "# TASK-479-NN: <Title>" (or -NN-LNN) on line 1, then "# FileName: <exact filename>" on line 2.
- Then the header fields: **Priority:** / **Category:** / **Estimated Effort:** (Small|Medium|Large) / **Dependencies:** / **Status:** ⏳ To Do , and a parent field: subtasks use "**Parent Task:** TASK-479", leaves use "**Parent Subtask:** TASK-479-NN".
- SUBTASK files: required sections — Overview (Goal / Owning module/service / Source-of-truth docs / Out of scope), Sub-Tasks (a markdown table listing THIS subtask's leaves: | Leaf | Title | Status | with each leaf ⏳ To Do), Testing Requirements, Documentation Updates Required. Add a short Security Contract line: "No endpoint or permission model changes (visual restyle only; preserves existing routes, RBAC, cache, and adminPaths)." unless the screen genuinely changes an API.
- LEAF files (execution-ready): required sections — Overview (Goal / Owning module/service / Source-of-truth docs / Out of scope), Security Contract (use the line above unless API changes), Implementation Pseudocode (show the concrete component/helper shape + data flow + error handling + regression-test shape — NOT prose; reference the REAL target files and the PROTOTYPE source file it ports from), Testing Requirements, Documentation Updates Required. Keep each leaf tightly scoped to ONE coherent unit of work.

MIGRATION CONTEXT (bake into every file):
- Design language to port: soft & friendly (Notion-like), VIOLET accent, rounded-2xl cards, soft shadows, warm neutrals, light default + dark toggle. Prototype tokens live in _docs/_PROTOTYPE/src/styles/theme.css; shared primitives in _docs/_PROTOTYPE/src/components/{ui,patterns,shell}.
- Self-hosted WordPress-competitor (NOT SaaS): the shell shows SITE identity (site name + domain + "Visit site"), NO workspace switcher, NO plans/"Coderso Pro"/trial; footer just a version label.
- HARD constraints implementers must preserve (state them in each relevant leaf): keep real data/logic; route admin nav/hrefs/prefetch through the shared canonical helpers (adminPaths, AdminLink, prefetchAdminRoute) — never hand-build hrefs; preserve RBAC/permission gating, cache contract (cache keys/TTL, cachedClient, cacheBus invalidation, cache-hydrate + background revalidation, NO mount-force refetch loops, NO dirty-state overwrites); obey ESLint 9 react-hooks rules (no sync setState in effects; lazy init / render-time derivation / reducers); schema-first for any payloads.
- Testing lane = VITEST (Bun-free admin/UI) per _docs/TESTING_STRATEGY.md. Standard commands every Testing Requirements section must list: \`bun --cwd core lint\`, \`bun --cwd core lint:types\`, and \`NODE_ENV=test vitest run --config vitest.config.ts <relevant tests/vitest/... or tests/vitest/ui-integration/... suite>\`. Add per-screen Vitest suites under tests/vitest/admin or tests/vitest/ui-integration. Do NOT move runtime tests to Vitest for coverage.
- Documentation Updates Required (every file): update _docs/_TASKS/README.md board + statistics on status change; add a _docs/_CHANGELOG/ entry on closure (linking TASK-479 + the leaf id); plus any contract doc the work touches.

Reference (read as needed): _docs/_PROTOTYPE/README.md, _docs/DESIGN_TOKENS.md, core/admin/ui/navigation/sidebarConfig.ts, core/admin/app/AdminApp.tsx.

Return STRICT JSON: { "written": ["<relative path under _docs/_TASKS>", ...], "notes": "<one line>" }.`;

// nn, slug, title, dep, effort, screens/targets/proto context, and the leaf list.
const SUBTASKS = [
  {
    nn: "05", slug: "Design-Tokens-And-Theming-Alignment", title: "Design Tokens & Theming Alignment", effort: "Large",
    dep: "TASK-479 prototype (01–04)",
    ctx: `Align the DB-backed Admin UI Theme token contract with the prototype. CURRENT contract: AdminThemeTokens in core/services/adminThemes/tokenTypes.ts has groups base/buttons{primary,secondary,outline,ghost}/inputs/sidebar{bg,text,activeBg,activeText,hoverBg}/topbar/card/typography/state{success,warning,danger}. The prototype (theme.css) NEEDS NEW tokens the contract LACKS: primary-soft (+foreground); state.info + soft variants (success-soft/warning-soft/info-soft); sidebar.muted, sidebar.accent, sidebar.accentForeground, sidebar.border; effects shadows (soft/card/pop); warm-neutral base values + VIOLET primary (#7c3aed light / #8b5cf6 dark) + Inter fonts; and a DARK MODE token set (the contract is currently single-mode). Owning files: core/services/adminThemes/{tokenTypes.ts,tokenUtils.ts,tokenValidation.ts,adminThemeTemplateService.ts}, core/admin/styles/globals.css (@theme mapping + :root + new .dark block), themes/admin-default/theme.json, core/admin/ui/themes/{ThemeTokensEditor.tsx,ThemePreviewPanel.tsx}, _docs/DESIGN_TOKENS.md. Source-of-truth: _docs/DESIGN_TOKENS.md, _docs/THEMES_SPEC.md.`,
    leaves: [
      { lnn: "L01", slug: "Token-Gap-Analysis-And-Inventory", title: "Token Gap Analysis & Inventory", focus: "Read-only inventory: enumerate EVERY token the prototype theme.css uses vs AdminThemeTokens; produce the exact list of NEW tokens/groups to add (primary-soft+fg, state.info, *-soft, sidebar.muted/accent/accentForeground/border, effects.shadowSoft/Card/Pop) and the dark-mode strategy decision (recommend: add a parallel `dark` token set OR a `.dark` CSS override layer driven by the same tokens — pick one and justify). Map each prototype CSS var to its --admin-* owner. Output a token mapping table in the leaf." },
      { lnn: "L02", slug: "Extend-AdminThemeTokens-Contract", title: "Extend AdminThemeTokens Type, Defaults, Normalize & Validation", focus: "tokenTypes.ts (add groups/fields), DEFAULT_ADMIN_THEME_TOKENS (violet/warm values), tokenUtils (emit new --admin-* CSS vars), tokenValidation (schema reject-unknown + non-destructive adapter so old templates without the new tokens still normalize via defaults). Pseudocode for the type extension + a normalize adapter + CSS-var emission." },
      { lnn: "L03", slug: "Globals-Css-Mapping-And-Dark-Mode", title: "globals.css Mapping + :root + Dark Block", focus: "core/admin/styles/globals.css: map new --admin-* → shadcn @theme vars (--color-primary-soft, --color-success-soft, etc.); add soft-shadow utilities; set warm/violet :root values; add a .dark { ... } block (per L01 strategy). Pseudocode of the @theme additions + :root + .dark." },
      { lnn: "L04", slug: "Admin-Default-Theme-And-DB-Template", title: "admin-default Theme + DB Default Template", focus: "themes/admin-default/theme.json + the default admin_theme_template seed so a fresh install ships the violet/soft theme; include migration artifacts ONLY if the template schema is versioned (SQL + meta snapshot + journal). Preserve backward compat for existing custom templates." },
      { lnn: "L05", slug: "Admin-UI-Theme-Editor-Controls", title: "Admin UI Theme Editor Controls for New Tokens", focus: "core/admin/ui/themes/ThemeTokensEditor.tsx + ThemePreviewPanel.tsx: add token pickers for primary-soft, info, soft states, sidebar accents, shadows; live preview reflects them. Keep JSON export/import in sync. Pseudocode for the new control groups." },
      { lnn: "L06", slug: "Dark-Mode-Toggle-And-Persistence", title: "Dark-Mode Toggle & Persistence in Admin Shell", focus: "Wire a light/dark toggle in the admin TopBar (next-themes or a class toggle on <html>), persisted; ensure the .dark token layer applies. Preserve SSR/no-flash. Pseudocode for the toggle + persistence + class application." },
      { lnn: "L07", slug: "Docs-And-Token-Tests", title: "Token Docs & Tests", focus: "Update _docs/DESIGN_TOKENS.md (new groups + dark-mode section); add Vitest tests for tokenTypes/normalize/validation + CSS-var emission (tests/vitest/admin or services token tests). Validation commands + closure." },
    ],
  },
  {
    nn: "06", slug: "Admin-Shell-And-Wrapper-Migration", title: "Admin Shell & Wrapper Migration", effort: "Large",
    dep: "TASK-479-05",
    ctx: `Port the prototype shell + shared primitives + pattern library + floating-panel editor surface into core/admin. Targets: core/admin/ui/layouts/{AdminShell,AuthShell,EditorShell,SettingsShell,SplitShell}.tsx; core/admin/ui/shared/{SidebarNav,TopBar,PageHeader,SectionHeader,AdminThemeSwitcher}.tsx; core/admin/components/ui/* (shadcn primitives); core/admin/ui/navigation/sidebarConfig.ts. Prototype sources: _docs/_PROTOTYPE/src/components/{shell/*,ui/*,patterns/*}. De-SaaS the sidebar (site identity, no workspace switcher, no Pro/trial; version footer). Keep adminPaths/AdminLink/prefetch + permission gating + custom-screen/solution-kit wiring already in AdminShell.tsx.`,
    leaves: [
      { lnn: "L01", slug: "Shadcn-Primitive-Restyle", title: "Shared shadcn Primitive Restyle", focus: "core/admin/components/ui/{button,card,badge,input,textarea,select,switch,checkbox,table,tabs,avatar,separator,progress,skeleton,dropdown-menu,tooltip}.tsx — port prototype variants/sizes (button 'soft', badge soft/success/warning/info, rounded-2xl cards, soft shadows). Keep Radix internals. Pseudocode for the CVA variant additions." },
      { lnn: "L02", slug: "Shared-Pattern-Component-Library", title: "Shared Pattern Component Library", focus: "Add shared patterns under core/admin/ui/shared: PageHeader (already exists — extend), SectionCard, DataTable, StatCard, FilterBar, ListPaginationFooter (exists), EmptyState, StatusBadge, SettingsSection, charts (pure-SVG Area/Bar/Spark/Donut). Port from _docs/_PROTOTYPE/src/components/patterns/*." },
      { lnn: "L03", slug: "SidebarNav-Redesign-De-SaaS", title: "SidebarNav Redesign + Site Identity (de-SaaS)", focus: "core/admin/ui/shared/SidebarNav.tsx + navigation/sidebarConfig.ts: site identity block (name+domain+Visit site, NO workspace switcher), grouped sections + collapsible Advanced, published custom-screen shortcuts styling, longest-prefix active state, version footer (remove Pro/trial). Keep buildCustomScreenShortcutNavItems + permission gating." },
      { lnn: "L04", slug: "TopBar-Redesign", title: "TopBar Redesign (Command Search, Theme Toggle, User Menu)", focus: "core/admin/ui/shared/TopBar.tsx: command-style ⌘K search, theme toggle (from 05-L06), notifications, user menu, Create. Keep SearchBar wiring." },
      { lnn: "L05", slug: "AdminShell-And-EditorShell-Layout", title: "AdminShell & Editor Shell Layout", focus: "core/admin/ui/layouts/{AdminShell,EditorShell}.tsx: max-width content, mobile drawer, content scroll container, editor shell host for the floating-panel canvas. Preserve existing AssistantPanel + nav-group persistence." },
      { lnn: "L06", slug: "CanvasEditor-Floating-Panel-Pattern", title: "CanvasEditor Floating-Panel Pattern + Show/Hide Toggle", focus: "Add a shared CanvasEditor (interactive canvas + single floating control panel, right inspector or bottom toolbar, with a show/hide toggle) under core/admin/ui/shared, used by page/post/screen/template editors. Port from _docs/_PROTOTYPE/src/components/patterns/CanvasEditor.tsx." },
      { lnn: "L07", slug: "Shell-Tests", title: "Shell & Primitive Tests", focus: "Vitest ui-integration: shell render, nav active-state (longest-prefix), theme toggle, primitive variant snapshots. tests/vitest/ui-integration + tests/vitest/admin." },
    ],
  },
  { nn: "07", slug: "Dashboard-Screen", title: "Dashboard Screen Migration", effort: "Medium", dep: "TASK-479-06",
    ctx: "Restyle core/admin/ui/dashboard/DashboardPage.tsx to the prototype (_docs/_PROTOTYPE/src/pages/DashboardPage.tsx): stat cards w/ sparklines, traffic area chart, content donut, activity feed, tasks, recently-edited list. Keep real data hooks.",
    leaves: [
      { lnn: "L01", slug: "Dashboard-Page-Restyle", title: "Dashboard Page Restyle", focus: "DashboardPage.tsx: PageHeader, StatCard grid, AreaChart/Donut (shared charts from 06-L02), SectionCards for activity/tasks/recent. Preserve real data + cache hydration." },
      { lnn: "L02", slug: "Dashboard-Tests", title: "Dashboard Tests", focus: "Vitest render test for DashboardPage states (loading/loaded)." },
    ],
  },
  { nn: "08", slug: "Pages-Screen", title: "Pages Screen Migration", effort: "Large", dep: "TASK-479-06",
    ctx: "Pages: core/admin/ui/pages/PageListPage.tsx (list) + PageEditor.tsx (+ pages/editor, builder, editorControls). Prototype: _docs/_PROTOTYPE/src/pages/content/{PageListPage,PageEditorPreview}.tsx. The page editor must adopt the floating-panel CanvasEditor while preserving the REAL page builder logic + PAGE_MODEL (see _docs/PAGE_MODEL.md). NOTE PageEditor.tsx reads as binary to rg/grep — use Read/grep -an.",
    leaves: [
      { lnn: "L01", slug: "Page-List-Restyle", title: "Page List Restyle", focus: "PageListPage.tsx: PageHeader, status tabs, FilterBar, DataTable (Title/Status/Author/Updated/Views), StatusBadge, pagination. Preserve real list data + cache." },
      { lnn: "L02", slug: "Page-Editor-Floating-Canvas", title: "Page Editor → Floating-Panel Canvas", focus: "PageEditor.tsx + pages/editor/builder/editorControls: restyle chrome + canvas + move controls into the shared CanvasEditor floating panel (+ show/hide toggle); KEEP PAGE_MODEL, block/section ops, inline edit, dirty-state, preview. Source-of-truth _docs/PAGE_MODEL.md, _docs/PREVIEW_SPEC.md. Reference existing page-editor memory ([[pages-editor-v2-remediation-program]])." },
      { lnn: "L03", slug: "Pages-Tests", title: "Pages Tests", focus: "Vitest: PageListPage render/states + PageEditor canvas chrome render + panel toggle; keep existing page-editor suites green." },
    ],
  },
  { nn: "09", slug: "Posts-Screen", title: "Posts Screen Migration", effort: "Large", dep: "TASK-479-06",
    ctx: "Posts: core/admin/ui/posts/PostsListPage.tsx + PostEditorPage.tsx (+ posts/editor/{blocks,settings,inspector,layout,sidebars,outline,hooks,richtext,header}). Prototype: _docs/_PROTOTYPE/src/pages/content/{PostsListPage,PostEditorPreview}.tsx.",
    leaves: [
      { lnn: "L01", slug: "Posts-List-Restyle", title: "Posts List Restyle", focus: "PostsListPage.tsx: PageHeader, tabs, FilterBar, DataTable, StatusBadge, pagination. Preserve data/cache." },
      { lnn: "L02", slug: "Post-Editor-Restyle", title: "Post Editor Restyle", focus: "PostEditorPage.tsx + posts/editor/*: document-style canvas + inspector → prototype look (optionally the CanvasEditor floating panel for the inspector). Preserve richtext/block model + dirty-state." },
      { lnn: "L03", slug: "Posts-Tests", title: "Posts Tests", focus: "Vitest render tests for list + editor shell." },
    ],
  },
  { nn: "10", slug: "Menus-Screen", title: "Menus Screen Migration", effort: "Medium", dep: "TASK-479-06",
    ctx: "Menus: core/admin/ui/menus/{MenuListPage,MenuEditorPage,MenuDesignEditorPage}.tsx. Prototype: _docs/_PROTOTYPE/src/pages/content/{MenuListPage,MenuEditorPreview}.tsx.",
    leaves: [
      { lnn: "L01", slug: "Menu-List-Restyle", title: "Menu List Restyle", focus: "MenuListPage.tsx: card grid of menus (location badge, item count, Edit/Design). Preserve data." },
      { lnn: "L02", slug: "Menu-Editor-Restyle", title: "Menu Editor & Design Editor Restyle", focus: "MenuEditorPage.tsx (nested items list + item settings) + MenuDesignEditorPage.tsx to prototype look. Preserve drag/order + dirty-state." },
      { lnn: "L03", slug: "Menus-Tests", title: "Menus Tests", focus: "Vitest render tests." },
    ],
  },
  { nn: "11", slug: "Media-Screen", title: "Media Library Screen Migration", effort: "Medium", dep: "TASK-479-06",
    ctx: "Media: core/admin/ui/media/MediaLibraryPage.tsx (+ media details). Prototype: _docs/_PROTOTYPE/src/pages/media/MediaLibraryPage.tsx. Source-of-truth _docs/MEDIA_SPEC.md.",
    leaves: [
      { lnn: "L01", slug: "Media-Library-Restyle", title: "Media Library Restyle", focus: "Folder nav, storage usage Progress, FilterBar (grid view), media card grid, details drawer. Preserve upload + cache." },
      { lnn: "L02", slug: "Media-Tests", title: "Media Tests", focus: "Vitest render tests for grid + details." },
    ],
  },
  { nn: "12", slug: "Engine-Content-Types-Screen", title: "Engine / Content Types Migration", effort: "Large", dep: "TASK-479-06",
    ctx: "Engine: core/admin/ui/content-types/{ContentTypeList,ContentTypeEditor,SchemaBuilderPage,CollectionWorkspacePage,DetailTemplateEditorPage}.tsx. Prototype: _docs/_PROTOTYPE/src/pages/advanced/{EnginePage,ContentTypeEditorPreview,SchemaBuilderPreview,CollectionWorkspacePage}.tsx. Source-of-truth _docs/CONTENT_TYPES_SPEC.md.",
    leaves: [
      { lnn: "L01", slug: "Content-Type-List-Restyle", title: "Content Type List Restyle", focus: "ContentTypeList.tsx: card grid of types (field/entry counts, edit schema / entries). Preserve data." },
      { lnn: "L02", slug: "Content-Type-Editor-Restyle", title: "Content Type Editor Restyle", focus: "ContentTypeEditor.tsx: fields list + field settings, tabs (Fields/Relations/Settings/Permissions). Preserve schema ops + dirty-state." },
      { lnn: "L03", slug: "Schema-Builder-Restyle", title: "Schema Builder Restyle", focus: "SchemaBuilderPage.tsx: floating-panel canvas (field-type palette + field nodes + validation inspector). Preserve schema model." },
      { lnn: "L04", slug: "Collection-Workspace-And-Detail-Template", title: "Collection Workspace & Detail Template Restyle", focus: "CollectionWorkspacePage.tsx + DetailTemplateEditorPage.tsx restyle (tabs Entries/Detail template/Settings). Preserve data + builder logic." },
      { lnn: "L05", slug: "Engine-Tests", title: "Engine Tests", focus: "Vitest render tests for the 5 surfaces." },
    ],
  },
  { nn: "13", slug: "Entries-Screen", title: "Entries Screen Migration", effort: "Medium", dep: "TASK-479-06,TASK-479-12",
    ctx: "Entries: core/admin/ui/entries/{EntryList,EntryEditor}.tsx. Prototype: _docs/_PROTOTYPE/src/pages/advanced/{EntriesPage,EntryEditorPreview}.tsx.",
    leaves: [
      { lnn: "L01", slug: "Entry-List-Restyle", title: "Entry List Restyle", focus: "EntryList.tsx: type filter, tabs, DataTable, StatusBadge. Preserve data/cache." },
      { lnn: "L02", slug: "Entry-Editor-Restyle", title: "Entry Editor Restyle", focus: "EntryEditor.tsx: two-column content form (publish/taxonomy/meta sidebar). Preserve schema-driven fields + dirty-state." },
      { lnn: "L03", slug: "Entries-Tests", title: "Entries Tests", focus: "Vitest render tests." },
    ],
  },
  { nn: "14", slug: "Custom-Screens-Screen", title: "Custom Screens (Published Screen Flow) Migration", effort: "Large", dep: "TASK-479-06",
    ctx: "Custom Screens: core/admin/ui/custom-screens/{CustomScreenListPage,CustomScreenEditorPage,CustomScreenEntriesPage,CustomScreenEntryEditor}.tsx (+ hooks). Prototype: _docs/_PROTOTYPE/src/pages/advanced/{CustomScreensPage,CustomScreenEditorPreview,CustomScreenEntriesPage,CustomScreenEntryEditorPreview}.tsx + lib/screensMock.ts. KEY: published screens appear in the sidebar; published List View has a flexibly CONFIGURABLE table/view; the entry-view builder composes a PER-SCREEN layout (sections/blocks) shown when opening an entry; the entry editor edits content inline. Ties to existing TASK-468/474 ([[task-468-completion-state]], [[task-474-custom-screen-canvas-parity]]).",
    leaves: [
      { lnn: "L01", slug: "Custom-Screen-List-Restyle", title: "Custom Screen Management List Restyle", focus: "CustomScreenListPage.tsx: card grid with 'In sidebar' badge for published, Edit/Open. Preserve data + buildCustomScreenShortcutNavItems wiring." },
      { lnn: "L02", slug: "Entry-View-Builder-Floating-Canvas", title: "Entry-View Builder → Floating-Panel Canvas", focus: "CustomScreenEditorPage.tsx: floating-panel CanvasEditor designing the PER-SCREEN entry view from sections & blocks bound to fields; persists the screen-specific layout. Preserve custom-screen definition normalization (V4) + dirty-state." },
      { lnn: "L03", slug: "Published-List-View-Configurable-Table", title: "Published List View + Configurable Table/View", focus: "CustomScreenEntriesPage.tsx: published screen List View of entries with a 'Customize view' panel (toggle/reorder/rename columns, view types, group/sort/density) persisted per screen. Preserve bindings + cache." },
      { lnn: "L04", slug: "Entry-Content-Editor-Per-Screen", title: "Entry Content Editor (Per-Screen Presentation)", focus: "CustomScreenEntryEditor.tsx: render the screen-defined entry layout populated with the record, inline content editing via a compact bottom formatting floating toolbar. Per-screen presentation differs (e.g. Projects=checklist, Clients=activity)." },
      { lnn: "L05", slug: "Custom-Screens-Tests", title: "Custom Screens Tests", focus: "Vitest render tests for the 4 surfaces + reconcile with existing custom-screens suites." },
    ],
  },
  { nn: "15", slug: "Forms-Screen", title: "Forms Screen Migration", effort: "Large", dep: "TASK-479-06",
    ctx: "Forms: core/admin/ui/forms/{FormListPage,FormBuilderPage,FormSubmissionsPage,FormActionLogsPage}.tsx (+ hooks). Prototype: _docs/_PROTOTYPE/src/pages/advanced/{FormsPage,FormBuilderPreview,FormSubmissionsPage}.tsx. Forms involve public-write — DO NOT change anti-abuse/nonce/captcha contracts; restyle only.",
    leaves: [
      { lnn: "L01", slug: "Form-List-Restyle", title: "Form List Restyle", focus: "FormListPage.tsx: stat row + DataTable (fields/submissions/status/last). Preserve data." },
      { lnn: "L02", slug: "Form-Builder-Restyle", title: "Form Builder Restyle", focus: "FormBuilderPage.tsx: field palette + live form preview + field settings (optionally CanvasEditor floating panel). Preserve schema + validation contract." },
      { lnn: "L03", slug: "Form-Submissions-And-Logs-Restyle", title: "Form Submissions & Action Logs Restyle", focus: "FormSubmissionsPage.tsx + FormActionLogsPage.tsx: stat row + DataTable + export. Preserve data/cache." },
      { lnn: "L04", slug: "Forms-Tests", title: "Forms Tests", focus: "Vitest render tests; keep existing form suites green." },
    ],
  },
  { nn: "16", slug: "Listings-Filters-Search-Screen", title: "Listings, Filters & Search Modules Migration", effort: "Large", dep: "TASK-479-06",
    ctx: "Listings: core/admin/ui/listings/{ListingListPage,ListingEditorPage,ListingFiltersPage,ListingSearchPage}.tsx. Prototype: _docs/_PROTOTYPE/src/pages/advanced/{ListingsPage,ListingEditorPreview,FiltersPage,SearchModulePage}.tsx.",
    leaves: [
      { lnn: "L01", slug: "Listings-List-Restyle", title: "Listings List Restyle", focus: "ListingListPage.tsx: card grid (query summary, bound type, layout). Preserve data." },
      { lnn: "L02", slug: "Listing-Editor-Restyle", title: "Listing Editor Restyle", focus: "ListingEditorPage.tsx: data source + filters + result preview grid + layout settings (CanvasEditor optional). Preserve query model." },
      { lnn: "L03", slug: "Filters-And-Search-Modules-Restyle", title: "Filters & Search Modules Restyle", focus: "ListingFiltersPage.tsx + ListingSearchPage.tsx restyle. Preserve facet/search config." },
      { lnn: "L04", slug: "Listings-Tests", title: "Listings Tests", focus: "Vitest render tests." },
    ],
  },
  { nn: "17", slug: "Booking-Screen", title: "Booking Screen Migration", effort: "Medium", dep: "TASK-479-06",
    ctx: "Booking: core/admin/ui/booking/BookingPage.tsx (+ components). Prototype: _docs/_PROTOTYPE/src/pages/advanced/BookingPage.tsx.",
    leaves: [
      { lnn: "L01", slug: "Booking-Restyle", title: "Booking Calendar Restyle", focus: "BookingPage.tsx: stat row + weekly calendar grid with colored booking blocks + resources list. Preserve booking data + cache." },
      { lnn: "L02", slug: "Booking-Tests", title: "Booking Tests", focus: "Vitest render test." },
    ],
  },
  { nn: "18", slug: "Reviews-Screen", title: "Reviews Screen Migration", effort: "Medium", dep: "TASK-479-06",
    ctx: "Reviews: core/admin/ui/reviews/ReviewsModerationPage.tsx (+ hooks). Prototype: _docs/_PROTOTYPE/src/pages/advanced/ReviewsPage.tsx.",
    leaves: [
      { lnn: "L01", slug: "Reviews-Restyle", title: "Reviews Moderation Restyle", focus: "ReviewsModerationPage.tsx: stat row + tabs + review cards (rating, approve/reject). Preserve moderation actions + cache." },
      { lnn: "L02", slug: "Reviews-Tests", title: "Reviews Tests", focus: "Vitest render test." },
    ],
  },
  { nn: "19", slug: "Commerce-Screen", title: "Commerce Screen Migration", effort: "Medium", dep: "TASK-479-06",
    ctx: "Commerce: core/admin/ui/commerce/{CommerceListPage,CommerceEditorPage}.tsx (+ components,hooks). Prototype: _docs/_PROTOTYPE/src/pages/advanced/{CommercePage,CommerceEditorPreview}.tsx.",
    leaves: [
      { lnn: "L01", slug: "Commerce-List-Restyle", title: "Products List Restyle", focus: "CommerceListPage.tsx: stat row + DataTable (thumb/price/stock/status). Preserve data." },
      { lnn: "L02", slug: "Product-Editor-Restyle", title: "Product Editor Restyle", focus: "CommerceEditorPage.tsx: two-column product form (details/media/pricing/inventory + status/organization sidebar). Preserve schema + dirty-state." },
      { lnn: "L03", slug: "Commerce-Tests", title: "Commerce Tests", focus: "Vitest render tests." },
    ],
  },
  { nn: "20", slug: "Popups-Screen", title: "Popups Screen Migration", effort: "Medium", dep: "TASK-479-06",
    ctx: "Popups: core/admin/ui/popups/{PopupsListPage,PopupEditorPage}.tsx (+ components,hooks). Prototype: _docs/_PROTOTYPE/src/pages/advanced/{PopupsPage,PopupEditorPreview}.tsx.",
    leaves: [
      { lnn: "L01", slug: "Popups-List-Restyle", title: "Popups List Restyle", focus: "PopupsListPage.tsx: stat row + card grid (trigger/impressions/conversion/active). Preserve data." },
      { lnn: "L02", slug: "Popup-Editor-Restyle", title: "Popup Editor Restyle", focus: "PopupEditorPage.tsx: content blocks + popup preview + trigger/targeting settings (CanvasEditor optional). Preserve config." },
      { lnn: "L03", slug: "Popups-Tests", title: "Popups Tests", focus: "Vitest render tests." },
    ],
  },
  { nn: "21", slug: "Solution-Kits-Screen", title: "Solution Kits Screen Migration", effort: "Medium", dep: "TASK-479-06",
    ctx: "Solution Kits: core/admin/ui/kits/SolutionKitsPage.tsx (+ hooks). Prototype: _docs/_PROTOTYPE/src/pages/advanced/SolutionKitsPage.tsx.",
    leaves: [
      { lnn: "L01", slug: "Solution-Kits-Restyle", title: "Solution Kits Gallery Restyle", focus: "SolutionKitsPage.tsx: featured banner + kit card grid (includes badges, apply, active state). Preserve kit-selection wiring + cache." },
      { lnn: "L02", slug: "Solution-Kits-Tests", title: "Solution Kits Tests", focus: "Vitest render test." },
    ],
  },
  { nn: "22", slug: "Widget-Library-Screen", title: "Widget Library Screen Migration", effort: "Medium", dep: "TASK-479-06",
    ctx: "Widgets: core/admin/ui/widgets/WidgetLibraryPage.tsx (+ widgets/editors). Prototype: _docs/_PROTOTYPE/src/pages/advanced/WidgetLibraryPage.tsx. Note widget editor registry is lazily split (TASK-467).",
    leaves: [
      { lnn: "L01", slug: "Widget-Library-Restyle", title: "Widget Library Gallery Restyle", focus: "WidgetLibraryPage.tsx: category tabs + widget card grid (abstract previews, insert/preview). Preserve widget metadata registry + lazy editor loading." },
      { lnn: "L02", slug: "Widget-Library-Tests", title: "Widget Library Tests", focus: "Vitest render test." },
    ],
  },
  { nn: "23", slug: "Page-Templates-Screen", title: "Page Templates Screen Migration", effort: "Medium", dep: "TASK-479-06,TASK-479-08",
    ctx: "Page Templates: core/admin/ui/pages/templates/{PageTemplatesPage,PageTemplateEditorPage}.tsx. Prototype: _docs/_PROTOTYPE/src/pages/advanced/{PageTemplatesPage,PageTemplateEditorPreview}.tsx. Templates are reusable/configurable (site-wide footer/menu) that propagate; the editor must be the SAME floating-panel page editor.",
    leaves: [
      { lnn: "L01", slug: "Templates-List-Restyle", title: "Templates List Restyle", focus: "PageTemplatesPage.tsx: site-wide vs page scope, propagation note + usage count, Edit/Preview. Preserve template data." },
      { lnn: "L02", slug: "Template-Editor-Floating-Canvas", title: "Template Editor → Floating-Panel Canvas", focus: "PageTemplateEditorPage.tsx: reuse the shared CanvasEditor (same as Pages) for editing reusable templates; surface propagation/usage. Preserve template model + PAGE_MODEL reuse." },
      { lnn: "L03", slug: "Page-Templates-Tests", title: "Page Templates Tests", focus: "Vitest render tests." },
    ],
  },
  { nn: "24", slug: "Plugin-Store-Screen", title: "Plugin Store Screen Migration", effort: "Medium", dep: "TASK-479-06",
    ctx: "Store: core/admin/ui/store/{PluginStorePage,PluginDetailsPage}.tsx. Prototype: _docs/_PROTOTYPE/src/pages/store/{PluginStorePage,PluginDetailsPage}.tsx. Source-of-truth _docs/STORE_SPEC.md.",
    leaves: [
      { lnn: "L01", slug: "Plugin-Store-Restyle", title: "Plugin Store Gallery Restyle", focus: "PluginStorePage.tsx: featured banner + category tabs + plugin card grid (rating/installs/price/install). Preserve store data + cache." },
      { lnn: "L02", slug: "Plugin-Details-Restyle", title: "Plugin Details Restyle", focus: "PluginDetailsPage.tsx: header + tabs + info sidebar + permissions. Preserve install flow." },
      { lnn: "L03", slug: "Plugin-Store-Tests", title: "Plugin Store Tests", focus: "Vitest render tests." },
    ],
  },
  { nn: "25", slug: "Admin-UI-Theme-Screen", title: "Admin UI Theme Screen Migration", effort: "Medium", dep: "TASK-479-05,TASK-479-06",
    ctx: "Admin UI Theme: core/admin/ui/themes/ThemesPage.tsx + ThemeTokensEditor/ThemePreviewPanel/ThemeProfileCard/ThemeTemplateCard. Prototype: _docs/_PROTOTYPE/src/pages/themes/ThemesPage.tsx. (Token CONTROLS for new tokens are in TASK-479-05-L05; here = page chrome/preset/preview restyle.)",
    leaves: [
      { lnn: "L01", slug: "Theme-Editor-Page-Restyle", title: "Theme Editor Page Restyle", focus: "ThemesPage.tsx + preview/cards: preset row, live mini-admin preview, control panel layout to prototype look. Preserve token persistence (templates/profiles)." },
      { lnn: "L02", slug: "Theme-Editor-Tests", title: "Theme Editor Tests", focus: "Vitest render test; keep existing themes suites green." },
    ],
  },
  { nn: "26", slug: "Tools-Screens", title: "Tools Screens Migration", effort: "Large", dep: "TASK-479-06",
    ctx: "Tools: core/admin/ui/search/SearchPage.tsx, seo/SeoManagerPage.tsx, analytics/AnalyticsPage.tsx, backups/BackupsPage.tsx, import-export/ImportExportPage.tsx, redirects/RedirectsPage.tsx. Prototype: _docs/_PROTOTYPE/src/pages/tools/*.",
    leaves: [
      { lnn: "L01", slug: "Global-Search-Restyle", title: "Global Search Restyle", focus: "SearchPage.tsx: centered search + grouped results + recents. Preserve search wiring." },
      { lnn: "L02", slug: "SEO-Manager-Restyle", title: "SEO Manager Restyle", focus: "SeoManagerPage.tsx: stat row + DataTable (score/title/meta/issues). Preserve data." },
      { lnn: "L03", slug: "Analytics-Restyle", title: "Analytics Restyle", focus: "AnalyticsPage.tsx: stat cards + charts (area/donut/bar) + top-pages table. Preserve analytics data." },
      { lnn: "L04", slug: "Backups-Restyle", title: "Backups Restyle", focus: "BackupsPage.tsx: schedule card + storage progress + backups DataTable (restore/download/delete). Preserve backup actions." },
      { lnn: "L05", slug: "Import-Export-Restyle", title: "Import / Export Restyle", focus: "ImportExportPage.tsx: import dropzone + export checklist + recent jobs table. Preserve job flow." },
      { lnn: "L06", slug: "Redirects-Restyle", title: "Redirects Restyle", focus: "RedirectsPage.tsx: stat row + add row + DataTable (source/dest/type/hits). Preserve redirect data." },
      { lnn: "L07", slug: "Tools-Tests", title: "Tools Tests", focus: "Vitest render tests for the 6 tool pages." },
    ],
  },
  { nn: "27", slug: "Admin-Screens", title: "Admin Screens (Users, Roles, Audit, Access) Migration", effort: "Large", dep: "TASK-479-06",
    ctx: "Admin: core/admin/ui/users/UsersRolesPage.tsx, roles/PermissionsMatrixPage.tsx, audit/AuditList.tsx, security/AccessLogsPage.tsx. Prototype: _docs/_PROTOTYPE/src/pages/admin/*. Source-of-truth _docs/RBAC_SPEC.md, _docs/AUDIT_SPEC.md.",
    leaves: [
      { lnn: "L01", slug: "Users-Roles-Restyle", title: "Users & Roles Restyle", focus: "UsersRolesPage.tsx: tabs (members/invites), stat row, DataTable (avatar/role/status/2FA). Preserve RBAC-gated actions + cache." },
      { lnn: "L02", slug: "Roles-Matrix-Restyle", title: "Roles Matrix Restyle", focus: "PermissionsMatrixPage.tsx: permission×role matrix (check/dash), member counts, legend. Preserve permission model." },
      { lnn: "L03", slug: "Audit-Logs-Restyle", title: "Audit Logs Restyle", focus: "AuditList.tsx: timeline list (actor/action/target/category/ip/time) + export. Preserve audit data." },
      { lnn: "L04", slug: "Access-Logs-Restyle", title: "Access Logs Restyle", focus: "AccessLogsPage.tsx: stat row + DataTable (time/ip/location/method+path/status). Preserve data." },
      { lnn: "L05", slug: "Admin-Screens-Tests", title: "Admin Screens Tests", focus: "Vitest render tests for the 4 surfaces." },
    ],
  },
  { nn: "28", slug: "Settings-Screens", title: "Settings Screens Migration", effort: "Large", dep: "TASK-479-06",
    ctx: "Settings: core/admin/ui/layouts/SettingsShell.tsx + core/admin/ui/settings/{GeneralSettingsPage,AssistantSettingsPage,SecuritySettingsPage,IpAllowlistPage,SessionsPage,LoginAlertsPage,ApiKeysPage,WebhooksPage,EmailSettingsPage,StorageSettingsPage,IntegrationsPage}.tsx + site/SiteSettingsPage.tsx. Prototype: _docs/_PROTOTYPE/src/pages/settings/* + components/shell/SettingsLayout.tsx. Secret-handling: keep keys backend-only (no secrets to client cache/logs) per _docs/SECURITY_SPEC.md.",
    leaves: [
      { lnn: "L01", slug: "Settings-Shell-And-Nav", title: "Settings Shell & Sub-Nav Restyle", focus: "SettingsShell.tsx: two-column settings layout + sub-nav (General/Site/Assistant/Security[+children]/API keys/Webhooks/Email/Storage/Integrations) + save bar. Port SettingsLayout look. Preserve routing via adminPaths." },
      { lnn: "L02", slug: "General-And-Site-Settings-Restyle", title: "General & Site Settings Restyle", focus: "GeneralSettingsPage.tsx + site/SiteSettingsPage.tsx: SettingsSection groups + fields. Preserve save/dirty-state + cache." },
      { lnn: "L03", slug: "Assistant-Settings-Restyle", title: "Assistant Settings Restyle", focus: "AssistantSettingsPage.tsx: provider/model/key + behavior + features + usage. Default model options = latest Claude (claude-opus-4-8 etc.). Keep API key backend-only (no secret to client)." },
      { lnn: "L04", slug: "Security-Settings-Restyle", title: "Security Settings (+ IP Allowlist, Sessions, Login Alerts) Restyle", focus: "SecuritySettingsPage.tsx + IpAllowlistPage + SessionsPage + LoginAlertsPage: SettingsSections + quick-link cards + lists. Preserve security actions + RBAC." },
      { lnn: "L05", slug: "Api-Keys-And-Webhooks-Restyle", title: "API Keys & Webhooks Restyle", focus: "ApiKeysPage.tsx + WebhooksPage.tsx: masked keys + DataTable + endpoint cards. Keep secrets backend-only; preserve create/revoke flow." },
      { lnn: "L06", slug: "Email-Storage-Integrations-Restyle", title: "Email, Storage & Integrations Restyle", focus: "EmailSettingsPage + StorageSettingsPage + IntegrationsPage: SettingsSections + provider cards + integration grid. Keep credentials backend-only." },
      { lnn: "L07", slug: "Settings-Tests", title: "Settings Tests", focus: "Vitest render tests for the settings shell + pages." },
    ],
  },
  { nn: "29", slug: "Auth-Screens", title: "Auth Screens Migration", effort: "Medium", dep: "TASK-479-06",
    ctx: "Auth: core/admin/ui/auth/* (login, 2FA, reset, set password) + core/admin/ui/layouts/AuthShell.tsx. Prototype: _docs/_PROTOTYPE/src/pages/auth/* + components/shell/AuthShell.tsx. Source-of-truth _docs/AUTH_SPEC.md. Preserve auth flow, CSRF, rate-limit; restyle only.",
    leaves: [
      { lnn: "L01", slug: "Auth-Shell-And-Login-Restyle", title: "Auth Shell & Login Restyle", focus: "AuthShell.tsx + login page: centered card, social buttons, fields. Preserve auth submit + CSRF + error states." },
      { lnn: "L02", slug: "TwoFactor-Reset-SetPassword-Restyle", title: "2FA, Reset & Set Password Restyle", focus: "2FA (code inputs), reset request, set password (strength + checklist) pages. Preserve flows + validation." },
      { lnn: "L03", slug: "Auth-Tests", title: "Auth Tests", focus: "Vitest render tests for auth pages." },
    ],
  },
];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { written: { type: "array", items: { type: "string" } }, notes: { type: "string" } },
  required: ["written", "notes"],
};

const buildPrompt = (s) => {
  const leafList = s.leaves
    .map(
      (l) =>
        `  - TASK-479-${s.nn}-${l.lnn}-${l.slug}.md  —  "${l.title}"  —  focus: ${l.focus}`,
    )
    .join("\n");
  return `${CONTRACT}

==== AUTHOR THIS SUBTASK + ITS LEAVES ====
Subtask: TASK-479-${s.nn}  "${s.title}"
Priority: Medium | Estimated Effort: ${s.effort} | Dependencies: ${s.dep} | Status: ⏳ To Do | Parent Task: TASK-479
Context: ${s.ctx}

Create these files (exact names):
- ${TASKS_DIR}/TASK-479-${s.nn}-${s.slug}.md   (the SUBTASK file; its Sub-Tasks table must list every leaf below with ⏳ To Do)
${s.leaves.map((l) => `- ${TASKS_DIR}/TASK-479-${s.nn}-${l.lnn}-${l.slug}.md`).join("\n")}

Leaves (each an execution-ready file with Implementation Pseudocode referencing the REAL target files + the prototype source):
${leafList}

Write all files, then return JSON listing them.`;
};

phase("Author tasks");
log(`Authoring ${SUBTASKS.length} subtasks + ${SUBTASKS.reduce((n, s) => n + s.leaves.length, 0)} leaves with Opus`);

const results = await parallel(
  SUBTASKS.map((s) => () =>
    agent(buildPrompt(s), { label: `TASK-479-${s.nn}`, phase: "Author tasks", model: "opus", schema: SCHEMA }),
  ),
);

const written = results.filter(Boolean).flatMap((r) => r.written ?? []);
log(`Done — ${written.length} task files written`);
return {
  written,
  perSubtask: SUBTASKS.map((s, i) => ({ id: `TASK-479-${s.nn}`, title: s.title, result: results[i] })),
};
