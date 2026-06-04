# TASK-399-05: Docker Lazy Chunk Serving QA Docs and Closure
# FileName: TASK-399-05_Docker_Lazy_Chunk_Serving_QA_Docs_and_Closure.md

**Priority:** High
**Category:** Docker + Production Serving + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-399-01, TASK-399-02, TASK-399-03, TASK-399-04
**Status:** Done (2026-06-04)

---

## Overview

Prove the code-split admin build works in the same Docker path used by release
automation and close the task family with synchronized docs, board state, and
changelog coverage.

The Vite build alone is not enough because `core/vite.config.ts` uses
`base: "./"` and production serving injects an admin base path. Hashed lazy
chunks must be fetched successfully under `/admin/assets/*` after a Docker
image build.

## Source Findings

- `Dockerfile` runs `bun x vite build --config vite.config.ts`.
- Release workflow builds the runtime image from the same `Dockerfile`.
- PR gates currently run lint/tests/security/release gates but do not build the
  Docker image on every PR.
- `core/server/httpServer.ts` serves admin assets and falls back to
  `index.html` for admin SPA routes.
- `core/package.json` currently has `build:site`; `TASK-399-04` adds
  `build:admin`, and the Dockerfile should use those named scripts instead of
  inline Vite commands.

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `_docs/ARCHITECTURE.md` | Record the admin route-level code-splitting contract and eager/lazy route partition. |
| `_docs/RELEASE_PROCESS.md` | Note local Docker smoke expectations when admin bundle/chunk serving changes. |
| `tests/README.md` | Record bundle/Docker smoke commands if they become standard validation. |
| `Dockerfile` | Use `bun run build:admin` and `bun run build:site` after the named scripts exist. |
| `.github/workflows/coderso-pr-gates.yml` or equivalent workflow | Add or document Docker build smoke coverage if not covered by the bundle gate. |
| `tests/unit/server/adminAssetsRouting.test.ts` | Extend hashed JS asset, custom admin path, and deep-link fallback coverage. |
| `_docs/_TASKS/README.md` | Move TASK-399 family rows through Done when completed. |
| `_docs/_CHANGELOG/README.md` | Add closure changelog row if not covered by the planning entry. |
| `_docs/_CHANGELOG/*.md` | Changelog entry listing parent and every closed leaf ID. |

## Implementation Pseudocode

```text
docker build \
  -t coderso-docker-smoke:lazy-routes \
  --build-arg APP_VERSION=0.0.0-lazy-routes \
  -f Dockerfile .

run image or local production server with built dist/client
if DATABASE_URL is required for production boot:
  set -a && source .env && set +a
  verify DB reachability or record that runtime smoke is blocked

request:
  GET /admin/ -> 200 index.html
  GET /admin/assets/index-*.js -> 200 application/javascript
  GET /admin/assets/<lazy-route-chunk>-*.js -> 200 application/javascript
  GET /admin/pages/example -> 200 index.html fallback
  repeat asset/deep-link checks for custom admin path if configured, or record
  custom admin path as explicitly out-of-scope with a follow-up task

browser/manual network smoke:
  login route eager
  navigate to at least one lazy route
  observe lazy chunk request under /admin/assets/
  no "Failed to fetch dynamically imported module"
```

Data flow:

- Docker builder copies source and runs admin/site Vite builds.
- Runner image serves the built `dist/client` assets.
- Browser loads entry chunk first, then route chunks from relative URLs resolved
  under `/admin/assets/`.

Error handling:

- If Docker is unavailable, record exact command/status and run the closest
  local production server smoke; do not claim Docker validation passed.
- If the production server cannot boot because the configured `DATABASE_URL` is
  unavailable, record the DB preflight result and do not claim runtime smoke
  passed.
- If a lazy chunk 404s, fix serving/base path behavior before closing.
- If the largest remaining lazy route chunk still triggers Vite warning, record
  it as a follow-up target instead of hiding the warning.

## Security Contract

- Endpoint visibility: same-origin static admin assets only.
- Auth model: admin route data remains session-authenticated; static chunks do
  not bypass API auth.
- RBAC: route chunks may download only after allowed guarded render in this
  first family. Do not add hover/focus chunk preloading unless a follow-up
  defines an RBAC-aware preload policy. Protected data fetches remain guarded
  by existing APIs and route permissions.
- CSRF: unchanged.
- Rate-limit bucket: unchanged static asset serving.
- Reject unknown validation: unchanged.
- Anti-abuse: no public write path.
- Secret handling: Docker/image output and docs must not include `.env`,
  credentials, tokens, cookies, source maps with secrets, or private local
  paths.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Admin targeted Vitest tests from previous leaves.
- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- `bun test tests/unit/server/adminAssetsRouting.test.ts`
- `docker build -t coderso-docker-smoke:lazy-routes --build-arg APP_VERSION=0.0.0-lazy-routes -f Dockerfile .`
- `docker run --env-file .env -p 3000:3000 coderso-docker-smoke:lazy-routes`
  when DB/runtime prerequisites are available.
- Production serving smoke for `/admin/`, `/admin/assets/index-*.js`, at least
  one lazy route chunk, and a deep-link admin route fallback.
- Workflow/release tests for any changed PR gate files, or a clear note if the
  workflow can only be validated by CI.
- `git diff --check`
- `bun run precommit` before final commit.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/RELEASE_PROCESS.md`
- `tests/README.md` if bundle/Docker validation becomes a documented lane
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- Changelog entry listing TASK-399 and every closed TASK-399 leaf.

## Acceptance Criteria

- Docker build succeeds with the code-split admin output.
- Production static serving returns 200 for entry and lazy route chunks.
- Deep-link admin routes still fall back to `index.html`.
- Admin asset routing tests cover hashed `.js` files, nested admin deep links,
  and custom admin base paths or explicitly document a follow-up if custom base
  path validation is not available locally.
- Final docs include before/after metrics and any remaining follow-up chunk
  target.
- Task board, task files, and changelog leaf coverage are synchronized.

## Closure Notes

Done (2026-06-04):

- Dockerfile now uses the canonical `build:admin` and `build:site` scripts.
- Admin asset routing tests cover direct hashed JS chunks, nested lazy chunk
  rewrites, and custom admin base paths.
- Production serving uses the unchanged `/admin/assets/*` static asset handler
  plus deep-link fallback to `index.html` with injected admin base href.
- Local Docker image build is part of final validation for this task family.
