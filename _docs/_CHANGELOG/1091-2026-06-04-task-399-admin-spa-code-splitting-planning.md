# 1091 - TASK-399 admin SPA code-splitting planning

Date: 2026-06-04
Version: Unreleased
Tasks: TASK-399, TASK-399-01, TASK-399-02, TASK-399-03, TASK-399-04, TASK-399-05

## Key Changes

### Admin UI / Build Performance

- Added the TASK-399 execution family for route-level admin SPA code splitting,
  focused on reducing the current one-chunk admin bundle baseline.
- Recorded the current Vite 8 / Rolldown baseline: one admin JavaScript chunk
  at `4,369.13 kB` raw and `1,036.45 kB` gzip.
- Defined the first-step strategy as protected route dynamic imports, not
  `chunkSizeWarningLimit` suppression or arbitrary manual chunking.

### Planning / QA

- Split the work into lazy route registry, guarded Suspense rendering, protected
  route migration, bundle budget measurement, and Docker lazy-chunk serving
  verification leaves.
- Captured the initial local baseline findings for Settings bootstrap imports,
  Assistant cache imports, denied-route lazy-load behavior, and Docker
  asset-serving validation; the dedicated Claude/agent drift pass follows this
  baseline commit.

## Validation

- `bun x vite build --config vite.config.ts` from `core/`
- Task format compared with `_docs/_TASKS/README.md` and representative
  TASK-360 / TASK-354 leaves.
