# 1093 - TASK-399 admin SPA route code splitting

Date: 2026-06-04
Version: Unreleased
Tasks: TASK-399, TASK-399-01, TASK-399-02, TASK-399-03, TASK-399-04, TASK-399-05

## Key Changes

### Admin UI / Routing

- Moved protected admin workspace pages behind route-level lazy descriptors
  while keeping auth, reset, two-factor, preview, setup, theme bootstrap, and
  shell providers eager.
- Changed protected route rendering so auth/RBAC checks and setup-gating happen
  before a lazy route component is rendered.
- Added a bounded admin route error boundary for stale or missing lazy chunk
  failures, with route-change reset and manual reload.

### Build / Bundle Guard

- Added `bun --cwd core build:admin` and `bun run check:admin-bundle`.
- The bundle guard reads `core/dist/client/index.html`, follows modulepreloads
  and recursive static JS imports, writes `.tmp/admin-bundle-report.json`, and
  fails if the bundle collapses back into one JS chunk or exceeds budgets.
- Final measured admin build:
  - JS chunks: `160`;
  - entry gzip: `94,947 B` against a `160,000 B` budget;
  - initial static graph gzip: `400,812 B` against a `500,000 B` budget;
  - previous baseline: one JS chunk at `1,036.45 kB` gzip.
- Remaining Vite raw-size warning is documented as a follow-up for the shared
  `registry` and assistant/runtime chunks instead of being hidden with
  `chunkSizeWarningLimit`.

### Docker / CI / Serving

- Dockerfile now uses the canonical admin and site build scripts.
- PR gates include an admin bundle job that builds the admin SPA, runs the
  guard, and uploads the JSON bundle report.
- Admin asset routing tests cover direct hashed JS chunks, nested lazy chunk
  rewrites, and custom admin base paths.

## Validation

- `bun run test:vitest -- tests/vitest/admin/adminBundleReport.test.ts tests/vitest/admin/adminRouteComponents.test.tsx tests/vitest/admin/AdminRouteErrorBoundary.test.tsx tests/vitest/admin/adminApp.test.tsx tests/vitest/ui-integration/admin-shell-request-budget.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx`
- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- `bun test tests/unit/server/adminAssetsRouting.test.ts`
- `bun run lint:repo:types`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `docker build -t coderso-docker-smoke:lazy-routes --build-arg APP_VERSION=0.0.0-lazy-routes -f Dockerfile .`
- Docker runtime smoke on `localhost:3007`:
  - `GET /admin/` returned `200`;
  - `GET /admin/assets/index-*.js` returned `200`;
  - `GET /admin/assets/assistantRuntimeStateCache-*.js` returned `200`;
  - `GET /admin/assets/BackupsPage-*.js` returned `200`;
  - `GET /admin/pages/example/assets/BackupsPage-*.js` returned `200`;
  - `GET /admin/pages/example` returned `200` admin `index.html`.
