# TASK-399: Admin SPA Route-Level Code Splitting and Bundle Reduction
# FileName: TASK-399_Admin_SPA_Route_Level_Code_Splitting.md

**Priority:** High
**Category:** Admin UI + Build Performance + Vite/Rolldown + Docker + QA
**Estimated Effort:** Large
**Dependencies:** Docker build smoke on `fix/docker`; Vite 8.0.10 / Rolldown 1.0.0-rc.17 build behavior
**Status:** To Do

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
- preview route unless runtime evidence proves `renderToString` and public
  preview behavior remain stable behind Suspense.

Lazy-load:

- all authenticated admin workspace route pages;
- content/editor/list pages, Tools pages, Settings subpages, Store pages, Users,
  Roles, Themes, Widgets, Media, Menus, and Advanced route families.

Avoid these non-fixes:

- Do not raise `build.chunkSizeWarningLimit` as the primary remediation.
- Do not add `manualChunks` / `codeSplitting.groups` before route-level dynamic
  imports are in place and measured.
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
   stable lazy route descriptors without pulling Settings or Assistant panels
   into the entry chunk.
2. Land `TASK-399-02` to change route definitions from pre-created elements to
   guarded render functions, add Suspense, and add dynamic-import recovery.
3. Land `TASK-399-03` to migrate the protected route inventory in coherent
   groups with focused AdminApp regression tests.
4. Land `TASK-399-04` to measure the real split, add a regression guard, and
   document the Vite/Rolldown bundle contract.
5. Land `TASK-399-05` only after local build metrics are green; prove Docker and
   production static serving for hashed lazy chunks, then close docs/changelog.

## Acceptance Criteria

- Admin build emits more than one JavaScript chunk without a
  `chunkSizeWarningLimit` override.
- Initial admin entry JavaScript gzip is materially below the recorded
  `1,036.45 kB` gzip baseline.
- Auth/public routes remain eager and render without a lazy-route fallback.
- Protected routes do not import their route chunk before auth and RBAC checks
  allow rendering.
- Denied routes render `AccessDenied` without loading the denied page module.
- Settings bootstrap remains permission-gated and does not load Settings page
  modules for users without `settings:read`.
- Users/Roles route props, Settings save props, setup wizard behavior, canonical
  path redirects, theme tokens, toaster, and permission refresh remain intact.
- Docker build succeeds and the production server can serve every hashed lazy
  chunk under `/admin/assets/*`.
- Documentation records before/after bundle numbers and the follow-up boundary
  for optional route chunk prefetching or intra-page editor splitting.

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
- `bun x vite build --config vite.config.ts` from `core/`
- bundle guard script from `TASK-399-04`
- `docker build -t coderso-docker-smoke:lazy-routes --build-arg APP_VERSION=0.0.0-lazy-routes -f Dockerfile .`
- production static-serving smoke from `TASK-399-05`
- `bun run precommit` before final commits

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/1091-2026-06-04-task-399-admin-spa-code-splitting-planning.md`
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
- Use Claude CLI and agents again after this first task draft to find drift
  before implementation starts.
