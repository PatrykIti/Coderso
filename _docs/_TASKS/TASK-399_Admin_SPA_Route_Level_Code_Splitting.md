# TASK-399: Admin SPA Route-Level Code Splitting and Bundle Reduction
# FileName: TASK-399_Admin_SPA_Route_Level_Code_Splitting.md

**Priority:** High
**Category:** Admin UI + Build Performance + Vite/Rolldown + Docker + QA
**Estimated Effort:** Large
**Dependencies:** Docker build smoke on `fix/docker`; Vite 8.0.10 / Rolldown 1.0.0-rc.17 build behavior
**Status:** Done (2026-06-04)

---

## Overview

Reduce the admin SPA first-load JavaScript bundle by moving authenticated admin
route pages from static `AdminApp` imports to route-level lazy imports.

Baseline captured on 2026-06-04:

- Command: `bun x vite build --config vite.config.ts` from `core/`.
- Vite: `8.0.10`; Rolldown: `1.0.0-rc.17`.
- Admin build transformed `2497` modules.
- Output JS: one `dist/client/assets/index-*.js` chunk at `4,369.13 kB`
  raw / `1,036.45 kB` gzip.
- Current warning is not a Docker failure; it is Vite's
  `build.chunkSizeWarningLimit` warning for the uncompressed chunk size.

The first implementation step is not to hide the warning or add arbitrary
manual chunk groups. The real fix is to keep the admin bootstrap/auth shell
eager and defer protected route page modules through dynamic `import()`.
Vite/Rolldown can then emit separate hashed route chunks and load them only
after auth/RBAC allows a route to render.

## Source Evidence

- `core/admin/app/AdminApp.tsx`
  - static imports for most admin pages at the top of the file;
  - route table creates JSX elements directly in `useMemo`;
  - auth/RBAC guards run before final render and must stay fail-closed.
- `core/admin/entry-server.tsx`
  - uses `renderToString`, so auth/public routes should stay eager in this
    first step rather than relying on Suspense during SSR.
- `core/vite.config.ts`
  - `base: "./"`;
  - no current `build.rolldownOptions.output.codeSplitting` groups;
  - no `build.chunkSizeWarningLimit` override.
- `Dockerfile`
  - Docker image build runs both admin and site Vite builds.
- `_docs/RELEASE_PROCESS.md`
  - release Docker image is built from `Dockerfile`; local Docker smoke must
    remain part of this task family.
- `tests/vitest/admin/adminApp.test.tsx`
  - owns current AdminApp routing, RBAC, settings-bootstrap, and theme-token
    behavior.

## Bundle Strategy

Keep eager in this first step:

- auth/public entry pages: `LoginPage`, `TwoFactorPage`, `ResetPasswordPage`,
  `SetPasswordPage`;
- bootstrap-only UI: `SetupWizard`, `Loading`, `NotFound`, `AccessDenied`;
- providers, theme token style, toaster, auth/bootstrap/settings state logic;
- public preview route: `/preview` is in `publicRoutes` and stays eager until a
  separate SSR/public-preview task proves it can safely move behind Suspense.

Lazy-load:

- all authenticated admin workspace route pages;
- content/editor/list pages, Tools pages, Settings subpages, Store pages, Users,
  Roles, Themes, Widgets, Media, Menus, and Advanced route families.

Avoid these non-fixes:

- Do not raise `build.chunkSizeWarningLimit` as the primary remediation.
- Do not add manual chunk grouping before route-level dynamic imports are in
  place and measured. If a later measured follow-up needs grouping under Vite 8,
  use the documented `build.rolldownOptions.output.codeSplitting.groups`
  contract; do not introduce deprecated `manualChunks` / `advancedChunks`
  patterns as the first fix.
- Do not weaken React Hooks lint rules to make the route refactor pass.

## Sub-Tasks

Physical execution leaves:

- `TASK-399-01_Admin_Lazy_Route_Registry_and_Bootstrap_Seams.md`
- `TASK-399-02_Guarded_Lazy_Route_Rendering_and_Suspense_Recovery.md`
- `TASK-399-03_Protected_Workspace_Route_Migration.md`
- `TASK-399-04_Admin_Bundle_Measurement_and_Budget_Guard.md`
- `TASK-399-05_Docker_Lazy_Chunk_Serving_QA_Docs_and_Closure.md`

## Implementation Order

1. Land `TASK-399-01` first so `AdminApp` can import pure bootstrap values and
   stable lazy route helper/descriptors without pulling Settings or Assistant
   panels into the entry chunk. This leaf creates the seam; it is not expected
   to reduce the one-chunk build by itself.
2. Land `TASK-399-02` to change route definitions from pre-created elements to
   guarded render functions, add Suspense, add dynamic-import recovery, and
   migrate one simple protected route plus one prop-passing protected route so
   the new guard behavior is testable.
3. Land `TASK-399-03` to migrate the protected route inventory in coherent
   groups with focused AdminApp regression tests.
4. Land `TASK-399-04` to measure the real split, add a regression guard, add CI
   enforcement for that guard, and document the Vite/Rolldown bundle contract.
5. Land `TASK-399-05` only after local build metrics are green; prove Docker and
   production static serving for hashed lazy chunks, then close docs/changelog.

## Acceptance Criteria

- Admin build emits more than one JavaScript chunk without a
  `chunkSizeWarningLimit` override.
- Initial admin entry JavaScript gzip is at least 50% below the recorded
  `1,036.45 kB` gzip baseline, unless measured route-only splitting exposes a
  remaining shared/vendor chunk that is documented as a separate follow-up.
- Auth/public routes remain eager and render without a lazy-route fallback.
- `renderToString` for public/auth routes and protected-route loading states
  remains stable; no protected lazy route loader runs during SSR bootstrap.
- Protected routes do not import their route chunk before auth and RBAC checks
  allow rendering.
- Denied routes render `AccessDenied` without loading the denied page module.
- Settings bootstrap remains permission-gated and does not load Settings page
  modules for users without `settings:read`.
- Users/Roles route props, Settings save props, setup wizard behavior, canonical
  path redirects, theme tokens, toaster, and permission refresh remain intact.
- Docker build succeeds and the production server can serve every hashed lazy
  chunk under `/admin/assets/*`.
- Documentation records before/after bundle numbers, the final budget values,
  and the follow-up boundary for optional RBAC-aware route chunk prefetching or
  intra-page editor splitting.

Before/after table to complete during `TASK-399-04` / `TASK-399-05`:

| Metric | Before | After | Budget / follow-up |
|---|---:|---:|---|
| Admin JS chunk count | 1 | 160 | `> 1` |
| Initial admin JS raw | `4,369.13 kB` | Entry `314.50 kB`; initial static graph `1,495,404 B` | Guard records both HTML entry and static graph |
| Initial admin JS gzip | `1,036.45 kB` | Entry `94,947 B`; initial static graph `400,812 B` (`391.42 KiB`) | Static graph budget `500,000 B`, below the 50% baseline target |
| Largest lazy route JS raw/gzip | N/A | `registry-DhnPgsYo.js`: `1,131.47 kB` raw / `229,525 B` gzip | Follow-up: split shared widget/registry/editor helpers if the warning must be removed |

Closure notes (2026-06-04):

- `AdminApp` keeps auth/public/bootstrap routes eager and renders protected
  routes through guarded lazy descriptors after auth/RBAC checks.
- `bun --cwd core build:admin` emits route chunks without a
  `chunkSizeWarningLimit` override.
- `bun run check:admin-bundle` writes `.tmp/admin-bundle-report.json` and
  enforces `minJsChunkCount >= 2`, entry gzip `<= 160,000 B`, and initial
  static graph gzip `<= 500,000 B`.
- Vite still reports a large-chunk warning because the remaining shared dynamic
  `registry` chunk and initial static assistant/runtime chunk exceed the raw
  warning threshold. That is documented as a follow-up boundary, not hidden by
  increasing the warning limit.

## Security Contract

- Endpoint visibility: no new API endpoints; existing admin SPA assets remain
  same-origin static files served by the current admin asset handler.
- Auth model: unchanged admin session bootstrap before protected routes render.
- RBAC: route guards must run before lazy route render functions are called.
- CSRF: unchanged; no write operation is introduced.
- Rate-limit bucket: unchanged; static asset requests use existing public read
  serving behavior.
- Reject unknown validation: not applicable to static chunks; admin API calls
  inside lazy pages keep their existing route schemas.
- Anti-abuse: no nonce/HMAC/captcha flow; no public write path.
- Secret handling: dynamic chunks must not introduce secrets in browser payloads,
  cache, debug output, or generated bundle reports.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/admin/adminApp.test.tsx tests/vitest/admin/adminRouteComponents.test.tsx`
  (`adminRouteComponents.test.tsx` is created in `TASK-399-01`)
- `bun test tests/unit/server/adminAssetsRouting.test.ts`
- `bun --cwd core build:admin` after `TASK-399-04` adds the script
- `bun run check:admin-bundle` after `TASK-399-04`
- `docker build -t coderso-docker-smoke:lazy-routes --build-arg APP_VERSION=0.0.0-lazy-routes -f Dockerfile .`
- production static-serving smoke from `TASK-399-05`
- `bun run precommit` before final commits

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/1091-2026-06-04-task-399-admin-spa-code-splitting-planning.md`
- closure changelog `1093` or next available number for implemented and
  verified TASK-399 work; changelogs `1091` and `1092` are planning/refinement
  only and do not close any TASK-399 leaf.
- `_docs/ARCHITECTURE.md`
- `_docs/RELEASE_PROCESS.md` if Docker/build validation expectations change
- `tests/README.md` if a bundle guard becomes a documented test lane
- `_docs/CODERSO_RELEASE_GATES.md` only if the guard is promoted into
  `gates:coderso`

## Refinement Checklist

- Verify every current `AdminApp` route is classified as eager or lazy.
- Verify no heavy protected page module remains statically imported by
  `AdminApp` through type/default/helper imports.
- Recheck Vite 8/Rolldown docs for `build.rolldownOptions.output.codeSplitting`
  before adding any grouping options.
- Decide from measured output whether chunk prefetching belongs in this first
  family or a follow-up task.
- Claude CLI and agent drift pass ran after the first task draft commit; keep
  implementation aligned with the corrected eager/lazy inventory and guard
  ownership above.
