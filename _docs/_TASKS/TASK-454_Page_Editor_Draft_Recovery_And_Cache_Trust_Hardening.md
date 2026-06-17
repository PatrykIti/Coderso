# TASK-454: Page Editor Draft Recovery And Cache Trust Hardening
# FileName: TASK-454_Page_Editor_Draft_Recovery_And_Cache_Trust_Hardening.md

**Priority:** High
**Category:** Admin UI / Pages / Editor Persistence
**Estimated Effort:** Medium
**Dependencies:** TASK-449-02
**Status:** ⏳ To Do

---

## Overview

Follow-up split out of the TASK-449-01 live reproduction and the TASK-449-02
post-fix verification (2026-06-11, evidence in `.tmp/phase0/columns-repro.md`
and `.tmp/phase0/postfix-verify.md`). TASK-449-02 closed the broadcast-driven
data-loss path: `pageDetail` cache-bus updates are ignored unless their
`updatedAt` is strictly newer than the loaded editor detail. Three adjacent
pre-existing gaps remain:

1. **Autosave is not surfaced on reopen.** `pageService.autosavePage` writes
   only an autosave revision; `pages.currentData` is untouched. An author who
   inserts content, sees autosave succeed, and leaves without manual Save
   reopens an editor whose visible content silently reverted. The work survives
   only as a hidden autosave revision.
2. **Page Editor has no SPA unsaved-changes navigation guard.** Editor state
   with `hasUnsavedChanges=true` can be abandoned via admin SPA navigation
   without confirmation. The shared admin router already supports blockers and
   Settings already proves the dialog + `beforeunload` pattern; Page Editor
   does not use that seam.
3. **Mount path still trusts TTL-fresh poisoned detail cache.** `PageEditor`
   hydrates from `initialCachedPage` and skips the load effect when an initial
   detail exists. TASK-449-02 guarded cache-bus rehydration only; a poisoned
   localStorage detail can still render on full editor reload until the cache is
   cleared. The earlier note that publish/status flows only merge `status` is
   stale for the normal publish path at current HEAD: `publishPage` now merges
   the full returned detail when available. The mount trust vector remains open.

Scope decisions:

- **Autosave recovery is explicit and non-destructive.** Reopen offers a
  restore/discard prompt for a newer autosave revision. Do not silently promote
  autosave revisions into `currentData`.
- **Revision filtering is client-side.** Use existing `listPageRevisions(id)`
  and filter `kind === "autosave"` in the Page Editor. Do not add route query
  parameters unless a later task explicitly expands the API contract.
- **Mount revalidation is host-neutral, freshness policy is host-owned.** Pages,
  Page Templates, and Menu Design share `PageEditor`; cache-first mount
  revalidation and dirty navigation guard must preserve all three host modes.
  Pages and Page Templates can use strict `updatedAt` freshness. Menu Design
  currently adapts `updatedAt` from `menu.createdAt`, so the contract must use
  an explicit forced-clean replacement mode or add a real menu freshness source
  before relying on timestamps. Autosave recovery is Pages-only because only the
  Pages host exposes autosave/revisions.
- **No mount refetch loop.** Cached detail may render immediately, but the
  editor performs one explicit forced server revalidation per resource mount.
  The server detail replaces local state only when the editor is not dirty and
  the host freshness policy allows it.

---

## Audit Evidence

Pre-split read-only audits were run on 2026-06-17 against clean HEAD
`09d1094a739da9aa89c4aabaaa9101aee88fb574`:

- Subagent Carver: contract drift audit; found stale `{ revalidate: true }`
  pseudocode, missing host-scope split, and validation lane gaps.
- Subagent Lagrange: implementation-surface inventory; confirmed shared
  `PageEditor` blast radius and the existing router blocker pattern.
- Claude CLI (`--permission-mode plan --effort xhigh`): read-only task-contract
  audit; confirmed the three gaps, noted stale publish-cache wording, and
  recommended the four implementation tracks below.

Because this file and its children now correct task contract drift, any later
implementation run must start from a fresh read-only pre-implementation audit
before editing source code.

---

## Security Contract

- **Endpoint visibility:** no new endpoints in the planned implementation.
  Existing internal admin page detail/revision routes stay under `/admin/api`.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions: `content:read` for detail/revision
  reads, `content:write` for restore/discard/save/autosave.
- **CSRF:** unchanged admin write behavior for save, autosave, restore, discard,
  publish, and unpublish.
- **Rate-limit bucket:** unchanged.
- **Validation:** restored documents flow through the existing
  `normalizePageDocumentV2ForWrite` path. Unknown fields remain rejected.
- **Anti-abuse controls:** not applicable; no public write path.
- **Secret handling:** no browser cache or debug payload may include secrets.
  Page documents/revisions contain authored content only.

---

## Sub-Tasks

- [ ] TASK-454-01: Contract Freeze And Host Boundary
- [ ] TASK-454-02: Cache-First Mount Revalidation
- [ ] TASK-454-03: Autosave Recovery Prompt
- [ ] TASK-454-04: Shared Unsaved Navigation Guard
- [ ] TASK-454-05: Validation Docs And Closure

## Implementation Order

1. Freeze the corrected contract and rerun a read-only drift audit.
2. Add host load options and one-shot mount revalidation.
3. Add page-only autosave recovery prompt on top of the fresh detail baseline.
4. Extract/wire the shared dirty-navigation guard.
5. Run targeted lanes, live `playwright-cli` replay, docs, board, changelog,
   and final drift pass.

## Implementation Pseudocode

```tsx
// Host load contract:
type PageEditorHostLoadOptions = { force?: boolean };
type PageEditorHostFreshnessMode = "updatedAt" | "forced-clean-replace";
type PageEditorHost = {
  freshnessMode?: PageEditorHostFreshnessMode;
  loadDetail(id: string, options?: PageEditorHostLoadOptions): Promise<PageEditorResourceDetail | null>;
};

// Mount revalidation:
const cached = initialPageDetail ?? host.getCachedDetail(id);
if (cached) hydrateFromDetail(cached);

const fresh = await host.loadDetail(id, { force: true });
if (fresh && shouldApplyFreshDetail({
  current: loaded,
  fresh,
  isDirty: hasUnsavedChanges,
  mode: host.freshnessMode ?? "updatedAt",
})) {
  hydrateFromDetail(fresh);
}

// Autosave recovery:
const autosave = revisions
  .filter((revision) => revision.kind === "autosave")
  .sort(byCreatedAtDesc)
  .find((revision) => isNewerPageDetailTimestamp(revision.createdAt, page.updatedAt));
if (autosave) {
  showRecoverableDraftBanner(autosave);
}

// SPA/hard navigation guard:
useAdminDirtyNavigationGuard({
  blocked: hasUnsavedChanges || Boolean(recoverableAutosave),
  title: "Discard unsaved page changes?",
  description: "Cancel to keep editing, or discard the local draft and continue.",
});
```

Expected data flow:

- Cache-first render remains fast.
- One forced server detail read verifies the cache on mount.
- Strict timestamp comparison is shared between cache-bus rehydration, autosave
  recovery, and mount revalidation for timestamp-authoritative hosts.
- Menu Design must not rely on `createdAt` as freshness; its forced
  revalidation either uses a real freshness source or replaces clean cached
  state through an explicit host mode.
- Autosave restore uses existing revision restore, which promotes the selected
  revision into `currentData` through the normal service/route path.
- Navigation confirmation discards only local editor state for the transition;
  server autosave revisions remain until the author restores or discards them.

Error handling:

- Revalidation fetch failures keep the cached/editor view and surface bounded
  inline copy; they never blank the document.
- Unparsable or same-timestamp candidates fail closed for timestamp-authoritative
  hosts.
- Autosave revision listing failures show a bounded recovery warning and do not
  block manual Save.
- Restore/discard failures remain visible and keep the prompt actionable.

Regression-test shape:

- Vitest UI: poisoned cache renders initially then corrects from forced server
  detail; older/same/unparsable fresh details do not overwrite for
  timestamp-authoritative hosts; Menu Design covers same-`createdAt` forced
  clean replacement; dirty editor is not overwritten by revalidation.
- Vitest UI: newer autosave revision triggers a recovery prompt; restore
  applies the revision; dismiss leaves the revision untouched.
- Vitest UI/router: SPA navigate and popstate are blocked when dirty; confirm
  continues with `skipBlockers`; `beforeunload` is registered only while dirty.
- Bun route/service: existing revision restore/discard/autosave contract remains
  green if touched.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun run test:vitest -- tests/vitest/admin/pagesClient.test.ts tests/vitest/ui/admin-router-context-blocker.test.tsx tests/vitest/ui/settings-shell.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/pages/pageRevisionAutosave.test.ts tests/unit/pages/revisionService.test.ts tests/integration/routes/pages.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `git diff --check`
- Live `coderso-dev-core-host` + `playwright-cli` replay:
  poisoned-cache reload and insert -> autosave -> guarded navigation -> reopen
  recovery prompt.

---

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` for page detail mount revalidation and dirty guard
  semantics.
- `docs/guide/screens/page-editor-preview-settings-and-history.md` if recovery
  prompt UX wording changes.
- `_docs/_TASKS/README.md` board + statistics sync.
- `_docs/_CHANGELOG/` entry on completion.
