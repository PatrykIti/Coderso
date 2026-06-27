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

## Screen inventory (~60 screens)

- **Auth (4):** Login, 2FA, Reset password, Set password.
- **Main (8):** Dashboard, Pages list, Posts list, Menus, Media library, +3 editor
  previews (Page builder, Post editor, Menu editor).
- **Advanced (≈25):** Engine/Content types, Content type editor, Schema builder,
  Collection workspace, Entries, Entry editor, Custom screens (+ editor + entries),
  Forms (+ builder + submissions), Listings (+ editor), Filters, Search modules,
  Booking, Reviews, Commerce (+ product editor), Popups (+ editor), Solution kits,
  Widget library, Page templates.
- **Store (2):** Plugin store (gallery), Plugin details.
- **Visual (1):** Admin UI theme editor.
- **Tools (6):** Global search, SEO manager, Analytics, Backups, Import/Export,
  Redirects.
- **Admin (4):** Users & roles, Roles matrix, Audit logs, Access logs.
- **Settings (12):** General, Site, Assistant, Security, IP allowlist, Sessions,
  Login alerts, API keys, Webhooks, Email, Storage, Integrations.

All **editor** routes are **non-functional preview chrome** (a "Preview only" pill
+ realistic 3-pane layout), per scope.

## Sub-Tasks

| Child | Title | Status |
|-------|-------|--------|
| TASK-479-01 | Design language + token system (soft/violet, light+dark) | ✅ Done |
| TASK-479-02 | Runnable prototype harness (Vite/React/Tailwind v4, hash router, shell) | ✅ Done |
| TASK-479-03 | Primitive + pattern + chart component library (shadcn-shaped) | ✅ Done |
| TASK-479-04 | All prototype screens (lists/settings/tools/admin/galleries + editor previews) | ✅ Done |
| TASK-479-05 | Port tokens into `core/admin/styles/globals.css` (violet/soft, dark) | ⏳ To Do |
| TASK-479-06 | Adopt shell/topbar/sidebar redesign in `core/admin/ui/layouts` + `shared` | ⏳ To Do |
| TASK-479-07 | Roll the new look across real pages (per nav section, behind the existing components) | ⏳ To Do |

### TASK-479-01..04 — Prototype (Done 2026-06-27)

Delivered in `_docs/_PROTOTYPE/`. Light + dark verified via Playwright on the
Dashboard, Pages list, Page editor preview, Settings, and the Screens index.
Production build is clean (`bun run build` → ~205 modules, CSS compiles).

### TASK-479-05 — Port design tokens (To Do)

- Translate `_docs/_PROTOTYPE/src/styles/theme.css` token values into
  `core/admin/styles/globals.css` `:root` (and add a `.dark` block + dark toggle
  if the owner wants dark in the real admin).
- Keep the existing `--admin-*` variable indirection; only change the resolved
  hexes (violet primary, warm neutrals, soft radii/shadows). Re-run the admin
  theme tests and `themes/admin-default` snapshots.

### TASK-479-06 — Adopt the shell (To Do)

- Update `AdminShell` / `SidebarNav` / `TopBar` to the prototype's structure:
  workspace switcher, collapsible Advanced group styling, rounded active pills,
  command-style search button, top-bar theme toggle, footer trial card.
- Reuse the real permission gating + custom-screen/solution-kit wiring already in
  `AdminShell.tsx`; only the visual layer changes.

### TASK-479-07 — Roll out per section (To Do)

- Section-by-section, restyle real pages using the prototype's
  PageHeader/SectionCard/DataTable/SettingsSection/StatCard patterns. Each real
  page keeps its data/logic; only presentation changes. Suggested order: Dashboard
  → Settings → list pages (Pages/Posts/Users/etc.) → galleries (Store/Media/
  Widgets/Themes) → editor chrome polish.

## Testing Requirements

- Prototype: `bun run build` (graph + Tailwind compile) and a Playwright
  click-through of `#/screens` + light/dark toggle. (Done for the exemplar set.)
- Migration children (05–07): existing Vitest admin suites must stay green; add/adjust
  `themes/admin-default` + admin theme token tests when 479-05 lands; visual diff a
  representative page set before/after per section in 479-07.

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
