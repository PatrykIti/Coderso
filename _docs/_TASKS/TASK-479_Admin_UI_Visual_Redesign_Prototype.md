# TASK-479: Admin UI Visual Redesign — Prototype & Migration Plan
# FileName: TASK-479_Admin_UI_Visual_Redesign_Prototype.md

**Priority:** Medium
**Category:** Admin UI / Design System / Visual Refresh
**Estimated Effort:** Very Large
**Dependencies:** None (greenfield prototype; migration children depend on it)
**Status:** 🚧 In Progress
**Started:** 2026-06-27
**Completed:** `<set when the migration children close>`

---

## Business Goal

Give the whole Coderso admin UI a cohesive, modern look. Owner asked to:

1. Analyze the entire admin UI.
2. Design a "nice, modern" look for the **whole** admin.
3. Save a **browser-runnable prototype** to `_docs/_PROTOTYPE/` so the owner can
   click through **most** subpages and see how the redesign feels.
4. Base it on code that is **easy to port back** into the real admin
   (`core/admin/**`).
5. Cover **most subpages** but **without editor functionality** — editors are
   shown as static visual previews only.

This task tracks the prototype delivery (done) and the staged plan to adopt the
redesign in `core/admin` (planned children).

## Design decisions (owner-selected 2026-06-27)

| Decision | Choice |
|----------|--------|
| Visual direction | **Soft & Friendly (Notion-like)** — warm off-white canvas, white `rounded-2xl` cards, soft shadows, generous spacing, calm tone |
| Default theme | **Light by default + a dark toggle** (persisted to `localStorage`) |
| Accent color | **Violet / Purple** (`--primary: #7c3aed` light / `#8b5cf6` dark) |
| Density | Comfortable (chosen as the sensible default) |

## Stack (chosen for easy port-back)

Mirrors `core/admin` exactly so components/pages lift over with minimal friction:
**React 19 + Vite 8 + Tailwind CSS v4 (`@tailwindcss/vite`) + lucide-react +
`clsx`/`tailwind-merge`/`class-variance-authority`**, shadcn-style component API,
`cn()` helper, CSS-variable design tokens named the same as
`core/admin/styles/globals.css` (`--background`, `--card`, `--primary`,
`--muted-foreground`, `--border`, `--ring`, …). No Radix dependency in the
prototype (lightweight, self-contained primitives with the same class structure),
so it installs and runs instantly while still mapping 1:1 onto the real shadcn
components.

## Where it lives / how to run

- Location: `_docs/_PROTOTYPE/`
- Run:
  ```bash
  cd _docs/_PROTOTYPE
  bun install                       # or: npm install
  bun run build && bun run preview  # VIEW (robust in containers) -> http://localhost:5180
  # bun run dev                     # EDIT (HMR) — may white-screen via container port-forward
  ```
- The build uses `base: "./"` (relative assets) + an `ErrorBoundary`, so it works
  under any host/proxy/subpath and one bad screen never blanks the whole app.
- Entry route `#/` (Dashboard). A built-in **"All screens"** index lives at
  `#/screens` and links to every prototype route for fast click-through.
- Hash router (no server route config needed); back/forward + shareable URLs work.
- Light/dark toggle is in the top bar.

## Architecture (prototype)

```
_docs/_PROTOTYPE/
  index.html                 # pre-paint theme class + Inter font
  vite.config.ts             # react + @tailwindcss/vite, @ alias -> src, port 5180
  src/
    styles/theme.css         # design tokens (light + .dark), violet, soft shadows
    lib/{cn,router,theme,mock}.ts(x)
    components/
      ui/*                   # shadcn-style primitives (button, card, badge, input,
                             #   select, switch, checkbox, table, tabs, avatar,
                             #   separator, progress, skeleton, dropdown, tooltip)
      patterns/*             # PageHeader, StatCard, SectionCard, DataTable, FilterBar,
                             #   Pagination, EmptyState, StatusBadge, SettingsSection,
                             #   EditorPreviewFrame, charts (pure-SVG: Area/Bar/Spark/Donut)
      shell/*                # AppShell, Sidebar, Topbar, ThemeToggle, AuthShell, SettingsLayout
    nav/navConfig.ts         # mirrors core/admin sidebarConfig + advancedModules
    pages/                   # one file per screen + routes.tsx registry/matcher
    App.tsx, main.tsx
  scripts/                   # genstubs.mjs (scaffolder), build-pages.workflow.js (generator)
```

The sidebar/nav structure mirrors `core/admin/ui/navigation/sidebarConfig.ts` and
`advancedModules.ts` (Main + collapsible Advanced group, Store, Visual, Tools,
Admin). The route registry mirrors the `AdminApp.tsx` route patterns
(`/`, `/pages`, `/posts`, `/menus`, `/media`, `/advanced/*`, `/store`, `/themes`,
`/search`, `/seo`, `/analytics`, `/backups`, `/tools/import-export`, `/redirects`,
`/users`, `/roles`, `/audit`, `/access-logs`, `/settings/*`, auth).

## Screen inventory (~66 routes / 67 page files)

- **Auth (4):** Login, 2FA, Reset password, Set password.
- **Main (8):** Dashboard, Pages list, Posts list, Menus, Media library, +3 editor
  previews (Page builder, Post editor, Menu editor).
- **Advanced (≈27):** Engine/Content types, Content type editor, Schema builder,
  Collection workspace, Entries, Entry editor, Custom screens (management + builder
  + **published-screen flow**), Forms (+ builder + submissions), Listings (+ editor),
  Filters, Search modules, Booking, Reviews, Commerce (+ product editor), Popups
  (+ editor), Solution kits, Widget library, Page templates.
- **Published custom screens (added 2026-06-27):** a published screen (e.g.
  *Projects*, *Clients*) appears in the left sidebar under its own name; opening it
  shows the **List View** = the content type's entries in a **flexibly configurable
  table** (toggle/reorder/rename columns, view types Table/Board/Gallery/Calendar,
  group/sort/density); each row opens the **Entry edit view** composed by the screen.
  Driven by `src/lib/screensMock.ts`; routes under `/advanced/custom-screens/:id/entries[/:entryId]`.
- **Store (2):** Plugin store (gallery), Plugin details.
- **Visual (1):** Admin UI theme editor.
- **Tools (6):** Global search, SEO manager, Analytics, Backups, Import/Export,
  Redirects.
- **Admin (4):** Users & roles, Roles matrix, Audit logs, Access logs.
- **Settings (12):** General, Site, Assistant, Security, IP allowlist, Sessions,
  Login alerts, API keys, Webhooks, Email, Storage, Integrations.

All **editor** routes are **non-functional preview chrome** (a "Preview only" pill),
per scope. They are **not all 3-pane** — the prototype ships **two editor models**:
a **floating-panel `CanvasEditor`** used by **4** editors (Page builder, Custom-Screen
builder, Custom-Screen entry editor, Page-Template editor) and the **legacy 3-pane
`EditorPreviewFrame`** used by **6** editors (Post, Menu, Form builder, Listing, Popup,
Schema builder). The migration honors both: `CanvasEditor` ports via 479-06-L06; the
3-pane editors keep their split frame.

**Scoped out — `SetupWizard`:** the first-run onboarding full-screen flow
(`core/admin/ui/setup/SetupWizard.tsx`, rendered by `AdminApp` via
`shouldShowSetupWizard` when `settingsState.values.setupCompleted === false`) is **not** part of this
re-skin. It is a deferred onboarding surface with its own flow, not an admin
chrome/list/editor screen, so the prototype intentionally omits it; a future task
(most naturally under 479-06 shell or 479-29 auth) can re-skin it separately.

## Sub-Tasks

**Rows 01–04 are prototype PHASES, not physical child tasks.** They were delivered
as the runnable prototype in `_docs/_PROTOTYPE/` (the app is written and works) and
intentionally have **no** `TASK-479-0N-*.md` files — they describe what shipped in
the prototype app, not core code. **05–29 are the physical migration children**
(each a real `TASK-479-NN-*.md` + its `TASK-479-NN-LNN-*.md` leaves) that port the
prototype look into `core/admin` (UI re-wiring + token extension). Each subtask `NN`
owns execution-ready **leaf files** listed in that subtask's own Sub-Tasks table.
Screens 07–29 depend on **05** (tokens) and **06** (shell/wrapper).

| Child | Title | Status |
|-------|-------|--------|
| TASK-479-01 | Design language + token system (soft/violet, light+dark) | ✅ Done |
| TASK-479-02 | Runnable prototype harness (Vite/React/Tailwind v4, hash router, shell) | ✅ Done |
| TASK-479-03 | Primitive + pattern + chart component library (shadcn-shaped) | ✅ Done |
| TASK-479-04 | All prototype screens (lists/settings/tools/admin/galleries + editor previews) | ✅ Done |
| TASK-479-05 | Design Tokens & Theming Alignment (extend `AdminThemeTokens` + globals.css + dark) — 7 leaves | ⏳ To Do |
| TASK-479-06 | Admin Shell & Wrapper Migration (primitives, patterns, sidebar/topbar de-SaaS, CanvasEditor) — 7 leaves | ⏳ To Do |
| TASK-479-07 | Dashboard Screen (UI shell only — widget feature = TASK-480) — 2 leaves | ⏳ To Do |
| TASK-479-08 | Pages Screen (list + page-editor floating canvas) — 3 leaves | ⏳ To Do |
| TASK-479-09 | Posts Screen (list + editor) — 3 leaves | ⏳ To Do |
| TASK-479-10 | Menus Screen (list + editor + design) — 3 leaves | ⏳ To Do |
| TASK-479-11 | Media Library Screen — 2 leaves | ⏳ To Do |
| TASK-479-12 | Engine / Content Types (list + editor + schema + collection) — 5 leaves | ⏳ To Do |
| TASK-479-13 | Entries Screen (list + editor) — 3 leaves | ⏳ To Do |
| TASK-479-14 | Custom Screens (published-screen flow: builder + list view + entry editor) — 5 leaves | ⏳ To Do |
| TASK-479-15 | Forms Screen (list + builder + submissions) — 4 leaves | ⏳ To Do |
| TASK-479-16 | Listings, Filters & Search Modules — 4 leaves | ⏳ To Do |
| TASK-479-17 | Booking Screen — 2 leaves | ⏳ To Do |
| TASK-479-18 | Reviews Screen — 2 leaves | ⏳ To Do |
| TASK-479-19 | Commerce Screen (list + product editor) — 3 leaves | ⏳ To Do |
| TASK-479-20 | Popups Screen (list + editor) — 3 leaves | ⏳ To Do |
| TASK-479-21 | Solution Kits Screen — 2 leaves | ⏳ To Do |
| TASK-479-22 | Widget Library Screen — 2 leaves | ⏳ To Do |
| TASK-479-23 | Page Templates Screen (list + template editor) — 3 leaves | ⏳ To Do |
| TASK-479-24 | Plugin Store Screen (store + details) — 3 leaves | ⏳ To Do |
| TASK-479-25 | Admin UI Theme Screen — 2 leaves | ⏳ To Do |
| TASK-479-26 | Tools Screens (Search/SEO/Analytics/Backups/Import-Export/Redirects) — 7 leaves | ⏳ To Do |
| TASK-479-27 | Admin Screens (Users/Roles/Audit/Access logs) — 5 leaves | ⏳ To Do |
| TASK-479-28 | Settings Screens (shell + 12 pages) — 7 leaves | ⏳ To Do |
| TASK-479-29 | Auth Screens (login/2FA/reset/set-password) — 3 leaves | ⏳ To Do |

### TASK-479-01..04 — Prototype (Done 2026-06-27)

Delivered in `_docs/_PROTOTYPE/`. Light + dark verified via Playwright; production
build clean (`bun run build` → ~299 modules, 0 errors) — with one **non-blocking**
warning: a single JS chunk of **~546 kB** (gzip ~139 kB) exceeds Vite's 500 kB
advisory (no code-splitting yet); not a build failure. Now includes the published
custom-screen flow, floating-panel canvas editors (page/screen/template), the
panel show/hide toggle, and the de-SaaS shell.

### Scope: UI re-wiring vs full feature implementation

TASK-479 is the **visual re-wiring + global token extension** layer only — its
per-screen subtasks (07–29) restyle existing screens and keep their data/logic.

**Some CMS screens are functionally incomplete and need real feature work, not a
re-skin.** Those are tracked as **dedicated sibling implementation tasks**, and
the matching 479 subtask is limited to the UI shell + integrating the feature:

- **Dashboard** → needs a modern, configurable **widget/panel system** (build
  dashboard panels from CMS data sources; the current `DashboardPayload` is a
  fixed totals/storage/security/recentEdits blob with no widgets). Full
  implementation = **TASK-480 (Dashboard Widgets & Configurable Panels)**.
  `TASK-479-07` covers only the dashboard UI shell + rendering TASK-480 widgets.
- A **feature-completeness audit** (which other screens are stubs vs real) is
  owned by `TASK-480-01` and may spawn further sibling implementation tasks.

## Testing Requirements

- Prototype: `bun run build` (graph + Tailwind compile) and a Playwright
  click-through of `#/screens` + light/dark toggle. (Done for the exemplar set.)
- Migration children (05–29): per leaf run `bun --cwd core lint`,
  `bun --cwd core lint:types`, and the relevant Vitest suite
  (`NODE_ENV=test vitest run --config vitest.config.ts <tests/vitest/admin|ui-integration>`);
  existing admin/page-editor/themes Vitest suites must stay green. Token work
  (479-05) adds/adjusts `themes/admin-default` + admin-theme token tests.

### Local environment & runtime smoke-test (real CMS)

For browser smoke-tests of the migrated UI against the real CMS:

- Start the core dev server with the helper command **`coderso-dev-core-host`**.
- Admin: **http://coderso-a.localhost:5173/admin/** (tenant `coderso-a.localhost`,
  Vite :5173). A **white page** there means the server is **not running** —
  re-run `coderso-dev-core-host`.
- Front end: **http://coderso-a.localhost:3000**.
- Running the full suite (`bun run test` / `bun test`) **resets the CMS setup
  wizard** — it must be clicked through on the next first launch before the
  site/admin behaves normally.
- Admin credentials are in **`.env`**.
- Verify with the installed **`playwright-cli`** terminal command (open the
  default chromium; the `chrome` channel isn't installed).

## Documentation Updates Required

- `_docs/_PROTOTYPE/README.md` — run + porting guide (Done with this task).
- On migration: update `_docs/UI/admin_panel/` references (these are the legacy
  "Nextless" mockups) and note the new design language in admin theme docs.
- Changelog entry on each child closure, listing `TASK-479` + the child ID.

## Notes

- The legacy HTML mockups under `_docs/UI/admin_panel/<n>-*/code.html` (old
  "Nextless" branding) were used only as a **content** reference for what each
  screen contains; the prototype is a fresh visual system, not a restyle of them.
- The prototype intentionally ships **no real editor behavior** — editor routes are
  preview chrome only, matching the owner's scope.
