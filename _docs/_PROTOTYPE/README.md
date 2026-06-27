# Coderso Admin — Visual Redesign Prototype

A **browser-runnable, non-functional prototype** of a modern look for the entire
Coderso admin UI. Built to be **easy to port back** into `core/admin/**`
(same stack, same token names, shadcn-shaped components).

> Scope: **most subpages** of the admin, rendered in the new look. **Editors are
> static previews only** (a "Preview only" pill + realistic chrome) — no real
> editing behavior. See `_docs/_TASKS/TASK-479_*`.

## Design language

| | |
|---|---|
| **Direction** | Soft & friendly (Notion-like) — warm off-white canvas, white `rounded-2xl` cards, soft shadows, calm spacing |
| **Accent** | Violet / Purple (`--primary: #7c3aed` light, `#8b5cf6` dark) |
| **Theme** | Light by default, with a dark toggle (persisted) |
| **Type** | Inter / Inter Tight (system fallback) |

## Run it

```bash
cd _docs/_PROTOTYPE
bun install                  # or: npm install

# To just VIEW it (recommended — robust over container/remote port-forwarding):
bun run build && bun run preview     # serves the static build on :5180

# To EDIT it live (HMR):
bun run dev                          # :5180, but see the container note below
```

Open **http://localhost:5180**.

> **Container / remote / white page?** The Vite **dev** server relies on an HMR
> WebSocket + on-demand ES modules that often fail through container or tunnel
> port-forwarding (the HTML loads but the page stays blank). Use
> `bun run build && bun run preview` instead — it serves a plain static bundle
> (relative asset paths, `base: "./"`) that works under any host/proxy/subpath.
> A hard refresh (Cmd/Ctrl+Shift+R) clears any stale cached blank page.

- Start on the **Dashboard** (`#/`).
- Open **All screens** (`#/screens`, also in Not-Found) to jump to every route.
- Toggle **light/dark** from the moon/sun button in the top bar.
- It's a hash router, so back/forward and shareable `#/...` URLs work, and it can
  be served as static files (`bun run build` → `dist/`).

## What's inside

```
src/
  styles/theme.css         design tokens (light + .dark) — violet, soft, warm
  lib/                     cn, hash router, theme provider, mock data
  components/
    ui/                    primitives (button, card, badge, input, select, switch,
                           checkbox, table, tabs, avatar, separator, progress,
                           skeleton, dropdown, tooltip) — shadcn-shaped API
    patterns/              PageHeader, StatCard, SectionCard, DataTable, FilterBar,
                           Pagination, EmptyState, StatusBadge, SettingsSection,
                           EditorPreviewFrame, charts (pure-SVG)
    shell/                 AppShell, Sidebar, Topbar, ThemeToggle, AuthShell,
                           SettingsLayout
  nav/navConfig.ts         sidebar structure (mirrors core/admin navigation)
  pages/                   one file per screen + routes.tsx (registry + matcher)
```

## Screens (~60)

Auth (4) · Dashboard · Pages/Posts/Menus/Media · Advanced (Engine, Entries,
Screens, Forms, Listings, Filters, Search, Booking, Reviews, Commerce, Popups,
Solution kits, Widgets, Page templates + editor previews) · Plugin store + details ·
Admin UI theme · Tools (Search, SEO, Analytics, Backups, Import/Export, Redirects) ·
Admin (Users, Roles matrix, Audit, Access logs) · Settings (General, Site,
Assistant, Security, IP allowlist, Sessions, Login alerts, API keys, Webhooks,
Email, Storage, Integrations).

## Porting back into `core/admin`

The prototype is deliberately aligned with the real admin:

1. **Tokens** — `src/styles/theme.css` uses the same variable names as
   `core/admin/styles/globals.css` (`--background`, `--card`, `--primary`,
   `--muted-foreground`, `--border`, `--ring`, …). Port by changing the resolved
   hexes there (and add a `.dark` block).
2. **Primitives** — `components/ui/*` match the shadcn "new-york" API already used
   in `core/admin/components/ui`. The real admin's Radix-based versions are
   drop-in; only the styling/variants here need merging.
3. **Patterns/shell** — `components/patterns/*` and `components/shell/*` map onto
   `core/admin/ui/shared/*` and `core/admin/ui/layouts/AdminShell.tsx`. Restyle
   real pages by swapping in these structures while keeping existing data/logic.

Migration is tracked as `TASK-479-05/06/07`.

## Notes

- No network calls, no real state, no editor behavior — purely visual.
- No Radix in the prototype (self-contained primitives) so it installs and runs
  instantly; the class structure still maps 1:1 onto the real shadcn components.
- `scripts/genstubs.mjs` scaffolds page files; `scripts/build-pages.workflow.js`
  is the generator used to author the screens.
