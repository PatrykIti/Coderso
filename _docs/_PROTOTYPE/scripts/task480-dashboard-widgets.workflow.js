export const meta = {
  name: "task-480-dashboard-widgets",
  description: "Author TASK-480 (Dashboard Widgets & Configurable Panels) — full feature implementation tree",
  phases: [{ title: "Author TASK-480", detail: "Opus agents: umbrella + audit + contract + persistence + renderers + builder + docs" }],
};

const TASKS_DIR = "/home/coder/project/Coderso/_docs/_TASKS";

const CONTRACT = `You are authoring TASK FILES (Markdown) for TASK-480 — a NEW board task: "Dashboard Widgets & Configurable Panels". This is a FULL FEATURE IMPLEMENTATION (backend + admin UI), NOT a re-skin. It is the sibling/feature counterpart to the visual TASK-479 (which only re-skins the dashboard shell, see TASK-479-07).

Write files with the Write tool to absolute paths under ${TASKS_DIR}/.

PRODUCT VISION (bake in): the admin Dashboard is currently a FIXED blob — \`DashboardPayload\` (core/services/dashboard/dashboardTypes.ts) = { totals{pages,entries,media,users}, storage, security, recentEdits }, served by core/services/dashboard/dashboardService.ts via core/admin/services/dashboardClient.ts. Turn it into a MODERN, CONFIGURABLE WIDGET/PANEL dashboard: the user adds/removes/arranges/resizes panels ("widgets") that each pull from a CMS DATA SOURCE — e.g. counters (totals, per-content-type counts), charts (content over time), recent activity, storage usage, security/site-health, quick actions, and custom content queries. These are ADMIN DASHBOARD widgets — DISTINCT from core/widgets (page/content widgets); say so. Visual language = the TASK-479 prototype (StatCard/charts/SectionCard) with an edit-mode builder using the floating-panel pattern (_docs/_PROTOTYPE).

FORMAT RULES (AGENTS.md + _docs/_TASKS/EXAMPLE_TASK.md — READ EXAMPLE_TASK.md):
- Board umbrella file: TASK-480_Dashboard_Widgets_And_Configurable_Panels.md (UNDERSCORES after the id; H1 "# TASK-480: Dashboard Widgets & Configurable Panels"; "# FileName: <name>"; fields Priority/Category/Estimated Effort/Dependencies/Status ⏳ To Do; required sections Overview, Sub-Tasks (table of 480-01..06), Testing Requirements, Documentation Updates Required; add a Security Contract overview).
- Subtask file: TASK-480-NN-<Slug>.md (H1 "# TASK-480-NN: ..."; "**Parent Task:** TASK-480"); required sections Overview, Sub-Tasks (table of its leaves), Testing Requirements, Documentation Updates Required, + Security Contract.
- Leaf file: TASK-480-NN-LNN-<Slug>.md (H1 "# TASK-480-NN-LNN: ..."; "**Parent Subtask:** TASK-480-NN"); EXECUTION-READY: Overview (Goal/Owning module/Source-of-truth docs/Out of scope), Security Contract (REAL — see below; many leaves touch internal admin API routes), Implementation Pseudocode (concrete schema/type/service/route/component shapes — schema-first; normalize* helpers; route stays orchestration-only; map*Error at boundary; reference REAL files), Testing Requirements, Documentation Updates Required.

HARD CONSTRAINTS to state in leaves:
- Schema-first: define/extend Zod-or-equivalent schema, REJECT unknown fields, normalize via explicit normalize* helpers; own schemas/enums/defaults in the domain/service contract module (core/services/dashboard/*); routes re-export but import the owner.
- API leaves: Security Contract REQUIRED — endpoint visibility = internal admin (/admin/api/*), auth = session, RBAC = an explicit permission (e.g. content:read for widget data; a settings/dashboard write perm for layout), CSRF required for admin writes, rate-limit bucket = admin, validation = schema reject-unknown, secrets never to client cache/logs.
- Cache contract end-to-end: cache keys/TTL, cached client wrapper, cacheBus invalidation, cache-hydrate + background revalidation, NO mount-force refetch loops, NO dirty-state overwrites. If a cached admin resource is added, note _docs/ADMIN_CACHE.md + _docs/ADMIN_CACHE_MAP.md updates.
- DB changes need full migration artifacts (SQL + meta/*_snapshot.json + meta/_journal.json).
- react-hooks rules (no sync setState in effects; lazy init/reducers).
- Testing lanes per _docs/TESTING_STRATEGY.md: Bun for routes/integration/security/perf gates (tests/integration/routes, tests/security); Vitest for pure domain/services + admin UI (tests/vitest/*, ui-integration). List \`bun --cwd core lint\`, \`bun --cwd core lint:types\`, the relevant Bun route/security suites, AND Vitest UI/domain suites. Load env with \`set -a && source .env && set +a\` before DB tests.
- Documentation: new/updated _docs/DASHBOARD_WIDGETS_SPEC.md (create), _docs/CMS_API.md (new routes), _docs/ADMIN_CACHE*.md, _docs/DATA_MODEL.md (if DB), board + changelog.

Read for grounding: core/services/dashboard/{dashboardTypes.ts,dashboardService.ts}, core/admin/services/dashboardClient.ts, core/admin/ui/dashboard/DashboardPage.tsx, _docs/CMS_API.md, _docs/DATA_MODEL.md, _docs/RBAC_SPEC.md, _docs/ADMIN_CACHE.md, _docs/_PROTOTYPE/src/pages/DashboardPage.tsx.

Return STRICT JSON: { "written": ["<path under _docs/_TASKS>", ...], "notes": "<one line>" }.`;

const UNITS = [
  {
    label: "umbrella+audit",
    files: "TASK-480_Dashboard_Widgets_And_Configurable_Panels.md + TASK-480-01-* (Feature-Completeness-Audit-And-Widget-Product-Spec) + its leaves",
    brief: `Write TWO things:
(A) The UMBRELLA board file ${TASKS_DIR}/TASK-480_Dashboard_Widgets_And_Configurable_Panels.md — Priority: High, Category: Admin UI / Dashboard / Feature, Estimated Effort: Very Large, Dependencies: TASK-479-05 (tokens) + TASK-479-06 (shell) recommended but feature can land independently, Status ⏳ To Do. Overview (goal: configurable widget dashboard from CMS data; relationship to TASK-479-07 which is UI-shell-only). Sub-Tasks table listing TASK-480-01..06: 01 Feature-Completeness Audit & Widget Product Spec, 02 Widget & Data-Source Contract, 03 Layout Persistence & API, 04 Widget Renderer Components, 05 Dashboard Builder UI (edit mode), 06 Docs, Gates & Closure. Security Contract overview. Testing Requirements (Bun + Vitest lanes). Documentation Updates.
(B) Subtask ${TASKS_DIR}/TASK-480-01-Feature-Completeness-Audit-And-Widget-Product-Spec.md + leaves:
  - TASK-480-01-L01-Admin-Screen-Completeness-Audit.md: a READ-ONLY audit leaf — produce a table of every admin screen (Dashboard, Pages, Posts, Menus, Media, Engine, Entries, Custom Screens, Forms, Listings/Filters/Search, Booking, Reviews, Commerce, Popups, Solution Kits, Widgets, Page Templates, Store, Themes, Tools, Admin, Settings, Auth) marked Complete | Partial | Stub, with WHAT is missing for the Partial/Stub ones, so the team knows which TASK-479 subtasks are pure re-skin vs need a sibling feature task. Method: grep/read core/admin/ui/* + services. (Pseudocode = the audit method + the output table shape.)
  - TASK-480-01-L02-Dashboard-Widget-Product-Spec.md: define the widget catalog (Counter/Stat, Chart, RecentActivity, ContentTypeCount, Storage, SiteHealth/Security, QuickActions, ContentQuery), each with its data source + config; the layout model (grid: per-widget id/type/config/position{x,y,w,h}); edit-mode UX (add from catalog, drag/arrange/resize, configure via floating panel, save); per-user vs per-site layout decision (recommend + justify).`,
  },
  {
    label: "480-02-contract",
    files: "TASK-480-02-Widget-And-Data-Source-Contract.md + leaves",
    brief: `Subtask TASK-480-02 "Widget & Data-Source Contract" + leaves:
  - L01-Widget-And-Layout-Types-Schema: extend core/services/dashboard/dashboardTypes.ts with DashboardWidgetType enum, DashboardWidget {id,type,title?,config,position{x,y,w,h}}, DashboardLayout {version,widgets[]}; a Zod-style schema that rejects unknown fields; normalizeDashboardLayout() with defaults + clamped grid; a non-destructive adapter so a legacy empty/missing layout yields the DEFAULT widget set (totals counters + recent activity + storage + security — reuse current DashboardPayload data). Pseudocode for types + schema + normalize.
  - L02-Data-Source-Registry-And-Service: a data-source registry mapping each widget type -> a resolver that reads real CMS data (extend dashboardService.ts: totals, per-content-type counts, recentEdits, storage, security; ContentQuery resolver runs a safe, clamped content query). Resolvers are pure/lazy (Bun-free where possible). Pseudocode for the registry + resolveWidgetData().
  - L03-Contract-Tests: Vitest unit tests for schema/normalize/defaults/legacy-adapter + resolver shaping (tests/vitest/*). Commands + closure.`,
  },
  {
    label: "480-03-persistence",
    files: "TASK-480-03-Layout-Persistence-And-API.md + leaves",
    brief: `Subtask TASK-480-03 "Layout Persistence & API" (Security Contract heavy) + leaves:
  - L01-Layout-Storage-And-Migration: store the dashboard layout (recommend per-user JSONB column on the admin user or a dashboard_layouts table; justify). Include FULL migration artifacts (SQL + meta/*_snapshot.json + meta/_journal.json) per _docs/DATA_MODEL.md. Pseudocode for the column/table + repository read/write.
  - L02-Layout-Routes: internal admin routes GET /admin/api/dashboard/layout and PUT (save) — Security Contract: internal, session, RBAC (content:read to view; a dashboard/settings write perm to save), CSRF on PUT, admin rate-limit bucket, schema reject-unknown, map*Error at boundary, routes orchestration-only. Pseudocode for both routes + registration test shape.
  - L03-Widget-Data-Route: GET /admin/api/dashboard/widget-data (or batched) returning resolved data per the layout's widgets — Security Contract (internal/session/RBAC/validation). Pseudocode.
  - L04-Cached-Client-And-CacheBus: core/admin/services/dashboardClient.ts: cache keys/TTL for layout + widget data, cached wrappers, cacheBus invalidation on save, cache-hydrate + background revalidation, no mount-force refetch. Note _docs/ADMIN_CACHE.md + _docs/ADMIN_CACHE_MAP.md updates.
  - L05-Route-And-Security-Tests: Bun lane — route registration + RBAC/CSRF + reject-unknown + map*Error coverage (tests/integration/routes), plus relevant tests/security. Commands (set -a && source .env && set +a) + closure.`,
  },
  {
    label: "480-04-renderers",
    files: "TASK-480-04-Widget-Renderer-Components.md + leaves",
    brief: `Subtask TASK-480-04 "Widget Renderer Components" (admin UI) + leaves:
  - L01-Widget-Renderer-Registry: a typed registry mapping DashboardWidgetType -> a React renderer component, each receiving {widget, data}; a <DashboardWidgetHost> that picks the renderer + handles loading/empty/error states. Token-styled (SectionCard/StatCard). Pseudocode.
  - L02-Core-Widget-Renderers: implement StatWidget (counter + sparkline), ChartWidget (area/bar/donut from shared charts), RecentActivityWidget, ContentTypeCountWidget, StorageWidget, SiteHealthWidget, QuickActionsWidget, ContentQueryWidget — schema-driven, using shared patterns from TASK-479-06. Pseudocode per renderer family.
  - L03-Renderer-Tests: Vitest render tests (states) for the registry + renderers (tests/vitest/admin or ui-integration). Commands + closure.`,
  },
  {
    label: "480-05-builder",
    files: "TASK-480-05-Dashboard-Builder-UI.md + leaves",
    brief: `Subtask TASK-480-05 "Dashboard Builder UI (edit mode)" + leaves:
  - L01-Widget-Grid-And-Edit-Mode: render the saved layout as a responsive grid of <DashboardWidgetHost>; an Edit toggle enabling drag/arrange/resize (a11y-friendly), dirty-state, Save (calls the PUT route via cached client). Integrates into core/admin/ui/dashboard/DashboardPage.tsx (the TASK-479-07 shell hosts this). Pseudocode + react-hooks-safe state (reducer, no sync setState in effects).
  - L02-Add-Widget-Catalog-And-Configure-Panel: an "Add widget" catalog (from the widget product spec) + a per-widget configure panel using the floating-panel pattern (title, data source/content type, range, columns, etc.), schema-driven, preview. Pseudocode.
  - L03-Builder-Tests: Vitest ui-integration for edit mode (add/remove/arrange/save → dirty-state/cache), with the routes mocked at the client boundary (not production fallbacks). Commands + closure.`,
  },
  {
    label: "480-06-docs",
    files: "TASK-480-06-Docs-Gates-And-Closure.md + leaves",
    brief: `Subtask TASK-480-06 "Docs, Gates & Closure" + leaves:
  - L01-Dashboard-Widgets-Spec-And-Api-Docs: create _docs/DASHBOARD_WIDGETS_SPEC.md (widget catalog, data sources, layout model, edit-mode UX, persistence, RBAC) + update _docs/CMS_API.md (new routes), _docs/ADMIN_CACHE.md + _docs/ADMIN_CACHE_MAP.md (new cached resource), _docs/DATA_MODEL.md (if DB), AGENTS.md repo index if a new spec doc is added. Pseudocode = the doc outline + the exact files to touch.
  - L02-Release-Gates-And-Closure: run/extend relevant release gates (functional/ux/performance if dashboard load is gated), changelog entry (TASK-480 + leaves), board + statistics sync, closure checklist. List the exact validation commands (bun --cwd core lint/lint:types, Bun route+security suites, Vitest UI/domain, bun run gates:coderso as baseline).`,
  },
];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { written: { type: "array", items: { type: "string" } }, notes: { type: "string" } },
  required: ["written", "notes"],
};

phase("Author TASK-480");
log(`Authoring TASK-480 umbrella + 6 subtasks + leaves with Opus`);

const results = await parallel(
  UNITS.map((u) => () =>
    agent(
      `${CONTRACT}\n\n==== UNIT: ${u.label} ====\nCreate: ${u.files}\n\nSPEC:\n${u.brief}\n\nWrite all files (full absolute paths under ${TASKS_DIR}), then return JSON.`,
      { label: u.label, phase: "Author TASK-480", model: "opus", schema: SCHEMA },
    ),
  ),
);

const written = results.filter(Boolean).flatMap((r) => r.written ?? []);
log(`Done — ${written.length} TASK-480 files written`);
return { results, written };
