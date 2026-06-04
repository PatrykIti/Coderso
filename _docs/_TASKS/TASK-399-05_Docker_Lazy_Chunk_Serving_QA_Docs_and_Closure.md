# TASK-399-05: Docker Lazy Chunk Serving QA Docs and Closure
# FileName: TASK-399-05_Docker_Lazy_Chunk_Serving_QA_Docs_and_Closure.md

**Priority:** High
**Category:** Docker + Production Serving + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-399-01, TASK-399-02, TASK-399-03, TASK-399-04
**Status:** To Do

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

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `_docs/ARCHITECTURE.md` | Record the admin route-level code-splitting contract and eager/lazy route partition. |
| `_docs/RELEASE_PROCESS.md` | Note local Docker smoke expectations when admin bundle/chunk serving changes. |
| `tests/README.md` | Record bundle/Docker smoke commands if they become standard validation. |
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

request:
  GET /admin/ -> 200 index.html
  GET /admin/assets/index-*.js -> 200 application/javascript
  GET /admin/assets/<lazy-route-chunk>-*.js -> 200 application/javascript
  GET /admin/pages/example -> 200 index.html fallback

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
- If a lazy chunk 404s, fix serving/base path behavior before closing.
- If the largest remaining lazy route chunk still triggers Vite warning, record
  it as a follow-up target instead of hiding the warning.

## Security Contract

- Endpoint visibility: same-origin static admin assets only.
- Auth model: admin route data remains session-authenticated; static chunks do
  not bypass API auth.
- RBAC: route chunks may download after navigation intent, but protected data
  fetches remain guarded by existing APIs and route permissions.
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
- `bun x vite build --config vite.config.ts` from `core/`
- bundle guard script from `TASK-399-04`
- `docker build -t coderso-docker-smoke:lazy-routes --build-arg APP_VERSION=0.0.0-lazy-routes -f Dockerfile .`
- Production serving smoke for `/admin/`, `/admin/assets/index-*.js`, at least
  one lazy route chunk, and a deep-link admin route fallback.
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
- Final docs include before/after metrics and any remaining follow-up chunk
  target.
- Task board, task files, and changelog leaf coverage are synchronized.
