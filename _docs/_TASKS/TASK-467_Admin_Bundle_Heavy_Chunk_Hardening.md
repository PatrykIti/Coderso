# TASK-467: Admin Bundle Heavy Chunk Hardening
# FileName: TASK-467_Admin_Bundle_Heavy_Chunk_Hardening.md

**Priority:** High
**Category:** Admin Build / Admin UI / Bundle Performance / Architecture
**Estimated Effort:** Large
**Dependencies:** TASK-399-04, TASK-462, TASK-464, TASK-209, TASK-054-22
**Status:** ⏳ To Do

---

## Overview

Reduce the heavy admin production chunks exposed by the current
`bun --cwd core build:admin` output without hiding the issue by raising
`build.chunkSizeWarningLimit`.

Current measured build output on 2026-06-14 shows the Vite/Rolldown warning:

```text
Some chunks are larger than 500 kB after minification.
```

The warning is a JavaScript chunk-size warning after minification, not the
Render 512 MB memory limit. The largest relevant chunks are:

- `registry-*.js`: about `1,119.80 kB` raw / `226.89 kB` gzip.
- `customScreensClient-*.js`: about `866.87 kB` raw / `214.92 kB` gzip.

The source analysis found three concrete owners:

1. `assistantClient.ts` imports `clearCustomScreensCache` from the full
   `customScreensClient`, so `AdminShell -> AssistantPanel -> assistantClient`
   can pull the heavy Custom Screens client into the shell/preload graph.
2. `customScreensClient.ts` imports domain normalizers/capability helpers that
   reach Custom Screen schemas, binding resolvers, runtime widget registration,
   and core widget definitions.
3. `core/admin/ui/widgets/registry.ts` statically imports the full widget editor
   barrel, so one registry access pulls every widget editor into one large
   dynamic chunk.

This family keeps the current admin product behavior and route contracts. It is
not a redesign of Custom Screens and it must not change Page Editor UX.

## Sub-Tasks

- [ ] TASK-467-01: Extract lightweight Custom Screens cache invalidation.
- [ ] TASK-467-02: Split the browser Custom Screens client into lightweight
  list/cache and editor-only normalization modules.
- [ ] TASK-467-03: Lazy split the widget editor registry.

## Architecture

Target dependency direction:

```text
AdminShell / AssistantPanel
  -> assistant client
  -> lightweight cache invalidation helpers
  -> cache keys, storage cache, cache bus

Custom Screens list/sidebar/client paths
  -> lightweight DTO validation and cached API wrappers

Custom Screens builder/editor paths
  -> editor-only document normalization and widget-binding helpers

Widget picker/library/builder paths
  -> lightweight widget metadata first
  -> lazy editor component bundles only when an editor is rendered
```

Forbidden closure criteria:

- Do not solve this by raising `build.chunkSizeWarningLimit`.
- Do not introduce Vite aliases, externals, or browser stubs for application
  code.
- Do not duplicate Custom Screen schema ownership in routes or admin UI.
- Do not let admin browser modules import server/runtime-only services.
- Do not regress `bun run check:admin-boundary`.

## Security Contract

- **Endpoint visibility:** no new endpoints in this family.
- **Auth model:** unchanged admin session-cookie auth.
- **RBAC:** unchanged Custom Screens, Assistant, Widgets, Pages, and Entries
  permissions.
- **CSRF expectations:** unchanged for existing admin writes.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** route/service validation remains schema-first;
  lightweight client DTO validation must not become the persistence authority.
- **Anti-abuse controls:** no public write path is introduced.
- **Secret handling:** bundle reports and new guards must not print `.env`,
  tokens, cookies, provider keys, storage credentials, or raw private payloads.

## Testing Requirements

- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- Add or update `check:admin-bundle` coverage so the Vite 500 kB raw JS
  chunk-warning target is asserted for dynamic chunks, not only reported.
- `bun run check:admin-boundary`
- `bun run test:vitest -- tests/vitest/admin/assistantClient.test.ts tests/vitest/admin/customScreensClient.test.ts tests/vitest/admin/adminBundleReport.test.ts`
- Add or update focused Vitest tests for any new lightweight Custom Screens
  cache module and widget editor loader module.
- Run affected Custom Screens UI tests when list/editor imports change.
- Run affected widget/admin UI tests when registry/editor loading changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `bun run precommit` before a manual commit.

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/ARCHITECTURE.md` if a new admin bundle/import rule is added.
- `tests/README.md` if validation commands or bundle evidence commands change.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if Custom Screens cache
  ownership changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when this family is
  completed.

## Acceptance Criteria

1. `assistantClient` no longer imports the full `customScreensClient` for cache
   invalidation.
2. The admin shell/preload graph does not need the heavy Custom Screens editor
   normalizer or runtime widget registry just to render navigation and the
   assistant panel.
3. Custom Screens list/sidebar/cache behavior stays equivalent and remains
   cache-bus consistent after assistant-driven Custom Screen mutations.
4. Widget editor code is not statically pulled into one large registry chunk
   when only widget metadata is needed.
5. `bun --cwd core build:admin` and `bun run check:admin-bundle` produce
   before/after evidence for `customScreensClient-*`, `registry-*`, initial
   static graph gzip, largest dynamic chunk gzip, and largest dynamic chunk raw
   size.
6. No validation is weakened: server/domain normalizers remain the write
   authority, and client-side lightweight DTO checks are only browser cache/UI
   guards.
7. TASK-467 cannot close while the production admin build still emits the
   500 kB minified raw JS chunk warning for a TASK-467-owned chunk. If a
   remaining warning is outside this family, split a follow-up with exact
   ownership and evidence.
