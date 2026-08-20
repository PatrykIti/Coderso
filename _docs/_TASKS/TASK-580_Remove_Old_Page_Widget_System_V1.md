# TASK-580: Remove Old Page Widget System V1
# FileName: TASK-580_Remove_Old_Page_Widget_System_V1.md

**Priority:** High
**Category:** Architecture / Widget Removal / Page V2
**Estimated Effort:** Very Large
**Dependencies:** None (standalone family). Cross-stream land-order coordination with S1 (menus: `MenuDesignEditor.tsx`, `publicSite.tsx`), S3 (pages: `core/services/pages/*`), and S4 (widget coverage family TASK-105-06).
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-20

---

## Overview

Remove the old page-widget system v1 (`core/widgets/**`, `core/admin/ui/widgets/**`
editors, the Widget Library surface, `modulePackMatrix`, v1 preview routes, and the
v1 `WidgetBlock[]` render path) because Page V2 sections/blocks/templates are now
the only authoring model. Strategy A (owner-approved) drives a phased removal:
relocate the contracts that Page V2 and the public render pipeline still share
out of `core/widgets/core/*` (580-01), delete the retired v1 authoring surfaces
(580-02; editors/builder/preview surfaces stay until 580-03/04),
migrate stored entry-detail-page documents off `WidgetBlock[]` to
`PageDocumentV2` (580-03), then delete the remaining v1 render kernel and close
with the documentation tombstone (580-04).

Research verdict (verified against HEAD `3c470092`, see `_S6-R1`..`_S6-R4`):

- **Pages (V2) are clean.** `PageBlockV2.type` is a closed union; no widget blocks
  are stored in page documents, and v1-shaped documents fail closed to an empty
  default document.
- **Custom screens are migrated** (TASK-468-07). Runtime renders `legacy-widget`
  placeholders; only admin compat adapters still project `ScreenBlockV1` to
  `WidgetBlock` and must be rewired during deletion.
- **Entry detail pages are the critical blocker.** Stored
  `detail_page_documents.currentDocument/publishedDocument` jsonb is still
  `WidgetBlock[]`, publicly rendered through `renderPublicPageRuntimeHtml`. A
  partial registry deletion is unsafe because `normalizeWidgetBlock` throws
  `widget_unknown_type`, which the resolver turns into a whole-page 404. The
  stored model must be migrated to `PageDocumentV2` before the v1 render path is
  removed.
- **Shared `core/widgets/core/*` contracts cannot be deleted wholesale.** Page V2
  services, content resolvers, navigation, the server render context, the site
  shell, and templates import a set of shared contract/renderer modules plus the
  `DeviceTarget`/`ContainerToken`/`SpacingToken` tokens (exact enumeration owned
  by 580-01). These must move to a neutral domain module first (580-01).
- **Out of scope (verified clean):** Admin Dashboard widgets (TASK-480) and the
  plugin store have zero `core/widgets/**` coupling and must not be touched.

- **Goal:** delete the v1 page-widget authoring and render system without breaking
  Page V2 rendering, entry detail pages, custom screens, navigation, or the site
  shell, and reconcile the docs/process contract that currently declares
  `core/widgets/**` a retained read-compat seam.
- **Owning modules:** `core/widgets/**`, `core/admin/ui/widgets/**`,
  `core/services/content/detailPage*`, `core/services/pages/*`,
  `core/site/renderPublicPage.tsx`, `core/server/publicSite*.ts*`.
- **Source-of-truth docs:** `_docs/ARCHITECTURE.md`, `_docs/PAGE_MODEL.md`,
  `_docs/WIDGETS.md`, `_docs/WIDGET_PACK_MATRIX.md`, `_docs/_WIDGETS/*`,
  `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`, `_docs/CONTENT_TYPES_SPEC.md`,
  `docs/develop/*`, and the AGENTS.md Product Contract Rules retained-seam policy
  line.
- **Out of scope:** Admin Dashboard widgets (TASK-480), the plugin store, and any
  new public write endpoints.

## Security Contract

- **Endpoint visibility:** internal admin API removal only. This family deletes
  internal preview/route/admin surfaces (`/advanced/widgets`, `GET /widgets`,
  v1 preview routes) and must not add any new public endpoint.
- **Auth model:** unchanged admin session for retained internal routes; public
  render paths keep their existing anonymous-read semantics.
- **RBAC:** removed surfaces retire their `widgets:read` permission usage;
  retained admin writes keep existing permissions.
- **CSRF:** unchanged; required on all remaining admin/internal writes.
- **Rate-limit bucket:** unchanged existing admin/public buckets; no new bucket.
- **Validation:** no new schemas. The moved V2-shared contracts must remain
  strict reject-unknown where they already are; no permissive fallback may be
  introduced while relocating.
- **Anti-abuse:** no public write path. Existing public write hardening (nonce +
  signature/HMAC, optional reCAPTCHA) is untouched.
- **Secret handling:** no secrets, provider keys, CSRF tokens, or privileged
  settings may reach browser cache, logs, or debug payloads; the deleted
  widget-catalog cache family must retire together with its keys and cached
  clients.

## Sub-Tasks

Land order is strict: `01 → 02 → 03 → 04`. Each source file has exactly one
writer; later subtasks build on the on-disk state left by earlier ones.

| # | Task | Owner | Scope |
|---|------|-------|-------|
| 01 | TASK-580-01: Extract V2 Shared Widget Contracts | this author (parent + 01) | Move V2-shared contracts/renderers/tokens out of `core/widgets/core/*` and `core/widgets/types.ts` into a neutral domain module; rewire ~40 importers; relocate `SharedColorControl`/`TokenOrPixelField`; delete `.tmp` junk, orphaned blueprints, and the `popupRuntimeScript.ts` comment. No deletion of v1 runtime/registry/validator yet. |
| 02 | TASK-580-02: Delete V1 Authoring Surface | sibling agent | Delete the Widget Library admin surface + route graph, the catalog API + `widgetCatalog:list` cache family, the widget-template AUTHORING stack (keeping the `getWidgetTemplate`/`templateSectionRuntime` read path + tables), `modulePackMatrix` + assistant intake/blueprint matrix rewiring, assistant widget-kit de-wiring (site-kit executors kept), `userSettingsService` widgets.favorites key, and narrow test removal. `core/admin/ui/widgets/editors/*`, v1 builder panels, and the 4 preview routes + clients SURVIVE 580-02 and are deleted in 580-04 (still consumed by `DetailTemplateEditorPage` until 580-03-L05). Keep the v1 render kernel for still-stored legacy docs until 580-04. |
| 03 | TASK-580-03: Migrate Entry Detail Pages To PageV2 | sibling agent | Replace `DetailPageBlock = WidgetBlock` with a PageDocumentV2 model; non-destructive DB backfill of stored `detail_page_documents` (pattern: `0061_custom_screen_v4_backfill.sql`); placeholder rendering for unmigrated legacy widget blocks; rewire `detailPageSchema/detailPageRuntimeResolver/detailPageBindingResolver/publicEntryRender` to render exclusively through Page V2. |
| 04 | TASK-580-04: Delete V1 Widget Kernel And Close | sibling agent | Delete `core/widgets/**` (registry/validator/runtime/renderers) and every remaining authoring/preview surface made dead by 580-01/02/03; rewrite `_docs/WIDGETS.md` tombstone, delete `_docs/_WIDGETS/*`, update `_docs/WIDGET_PACK_MATRIX.md`, `_docs/ADMIN_CACHE.md`/`_ADMIN_CACHE_MAP.md`, `docs/develop/*`, and the AGENTS.md retained-seam policy line; board + Statistics sync; changelog 1323; runtime smoke. |

## Testing Requirements

Family-wide gates (see each child for its targeted subset):

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `bun run check:admin-bundle`
- `bun run gates:coderso`
- Targeted Vitest suites: `tests/vitest/pages/*`, `tests/vitest/site/*`,
  `tests/vitest/forms/*`, `tests/vitest/content/*`, `tests/vitest/assistant/*`,
  `tests/vitest/kits/*`.
- Targeted Bun suites: content/detail-page routes, navigation routes
  (`tests/unit/navigation/*`), menu render, commerce runtime,
  posts-feed/product-table pagination, assistant full-service runtime, and
  DB-backed migration/backfill tests when `DATABASE_URL` is available
  (`set -a && source .env && set +a` first).
- Byte-identity guards must stay green: `buildSiteShellCss(null)` and no-override
  V2 page render ZERO-line diffs; moved contracts must be byte-equivalent (same
  exported names/values).
- Runtime smoke (mandatory UI/editor work): at least 5 distinct real-flow
  scenarios via `bun scripts/runtime-smoke.ts run --suite <suite>
  --profile <fast|certification> --session <name>`, with visible-effect
  assertions and screenshots in `_docs/_workflows/_smoke/`.
- `git diff --check` and `bun run precommit` before manual commits.
- Security scanner lanes from `_docs/SECURITY_SPEC.md` if any auth, public-write,
  or scanner-config behavior changes (otherwise record as CI-only).

## Documentation Updates Required

- `_docs/_TASKS/README.md` (board row + Statistics, done at authoring for 580/580-01).
- `_docs/WIDGETS.md` (tombstone/read-compat note; supersedes the retained-seam banner).
- `_docs/WIDGET_PACK_MATRIX.md` and `_docs/_WIDGETS/*` (retire/delete per-widget docs).
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` (retire `widgetCatalog:list`
  and the widget-library compatibility cache sections).
- `docs/develop/*` (project-structure, testing, runtime-smoke-cookbook references
  to `core/widgets/**`).
- `AGENTS.md` (the retained read-compat seam policy line is superseded by this removal).
- `_docs/CONTENT_TYPES_SPEC.md` / `_docs/PAGE_MODEL.md` if the detail-page model
  migration changes the published content/detail contract.
- `_docs/ARCHITECTURE.md` if the widget layer boundary is re-drawn.
- `_docs/_CHANGELOG/` + `_docs/_CHANGELOG/README.md` at closure (changelog 1323
  pinned for the whole family).

## Acceptance Criteria

1. `core/widgets/**` and `core/admin/ui/widgets/**` v1 authoring/runtime surfaces
   are gone or reduced to an explicit, documented legacy read-compat remnant.
2. Page V2 render, entry detail pages, custom screens, navigation, and the site
   shell render byte-identically for no-widget/no-override documents.
3. Stored `detail_page_documents` are migrated from `WidgetBlock[]` to
   `PageDocumentV2` with non-destructive backfill and placeholder rendering for
   unmigrated legacy blocks.
4. Widget Library route, catalog API, preview routes, `modulePackMatrix`, and the
   widget-catalog cache family are removed together with their route/alias/prefetch
   registration.
5. The assistant no longer authors v1 widget blocks; it authors Page V2 sections
   and blocks.
6. The retained-seam policy in `AGENTS.md` and `_docs/WIDGETS.md` is reconciled to
   reflect the removal.
7. Family closes with all descendants terminal, board + Statistics synchronized,
   and changelog 1323 recorded.
