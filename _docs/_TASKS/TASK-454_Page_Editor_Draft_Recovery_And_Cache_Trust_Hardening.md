# TASK-454: Page Editor Draft Recovery And Cache Trust Hardening
# FileName: TASK-454_Page_Editor_Draft_Recovery_And_Cache_Trust_Hardening.md

**Priority:** High
**Category:** Admin UI / Pages / Editor Persistence
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

Follow-up split out of the TASK-449-01 live reproduction and the TASK-449-02
post-fix verification (2026-06-11, evidence in `.tmp/phase0/columns-repro.md`
and `.tmp/phase0/postfix-verify.md`). TASK-449-02 closed the broadcast-driven
data-loss path (stale `pageDetail` cache events are now ignored unless
strictly newer than the loaded page). Three adjacent, pre-existing gaps
remain and together can still lose author work or render a poisoned view:

1. **Autosave is never promoted.** `pageService.autosavePage` writes only an
   autosave revision; `pages.currentData` is untouched. An author who inserts
   content, sees autosave succeed, and leaves without a manual Save reopens an
   editor whose content silently reverted — the work survives only as an
   un-surfaced revision.
2. **No SPA unsaved-changes navigation guard.** Editor state with
   `hasUnsavedChanges=true` (or with autosaved-but-unpromoted content) can be
   abandoned via admin SPA navigation without any confirmation; only hard
   navigation paths are guarded today.
3. **Mount path trusts a TTL-fresh poisoned cache.** `PageEditor` hydrates
   from `initialCachedPage` (~`PageEditor.tsx:896`) and the load effect early
   returns when an initial detail exists (~`:1474`), with no timestamp check
   or server revalidation; `pagesClient.ts:189-191` merges only `status` into
   the cached detail on publish/status changes. Observed live: reloading the
   editor while a poisoned (empty) cached record was in localStorage rendered
   `s=0/b=0` until the cache was cleared.

Additional evidence (2026-06-11 Phase 2 smoke): when the dev host died
mid-session, the editor silently reloaded and dropped unsaved work, and a Save
issued during the outage failed with no visible error UI — the recovery and
error-surfacing scope below covers this path too.

Scope: surface autosaved drafts on reopen (restore prompt or promote-on-open
contract — decide explicitly; revision restore UI already exists), add an
unsaved-changes guard for SPA navigation consistent with existing admin UX
patterns, and make mount hydration revalidate against the server (cache
renders first, fresh detail wins by `updatedAt` — same monotonic rule
TASK-449-02 established for broadcasts).

---

## Security Contract

- **Endpoint visibility:** no new endpoints; existing internal admin page
  detail/revision routes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged admin write behavior.
- **Rate-limit bucket:** unchanged.
- **Validation:** restored/promoted documents flow through the existing
  `normalizePageDocumentV2ForWrite` path; reject-unknown preserved.
- **Anti-abuse controls:** not applicable.

---

## Sub-Tasks

- [ ] Decide and record the autosave-recovery contract (restore prompt on
      reopen vs explicit draft promotion) and implement it on the existing
      revision machinery.
- [ ] Add the SPA unsaved-changes navigation guard through the shared admin
      navigation helpers (no hand-built href/guard logic).
- [ ] Revalidate mount hydration: cached detail renders immediately, server
      detail is fetched and applied when strictly newer (`updatedAt`), reusing
      the TASK-449-02 monotonic comparison.
- [ ] Regression coverage in the Vitest UI lane + live `playwright-cli`
      replay of the poisoned-cache reload and abandon-after-autosave flows.

---

## Implementation Pseudocode

```tsx
// Mount revalidation (PageEditor load effect):
const cached = initialCachedPage ?? getCachedPageDetail(pageId);
if (cached) hydrate(cached);                      // render fast from cache
const fresh = await getPageCached(pageId, { revalidate: true });
if (fresh && (!cached || isNewerPageDetailTimestamp(fresh.updatedAt, cached.updatedAt))) {
  hydrate(fresh);                                  // server wins when newer
}

// Autosave recovery on reopen:
const latestAutosave = await listPageRevisions(pageId, { kind: "autosave", limit: 1 });
if (latestAutosave && isNewerPageDetailTimestamp(latestAutosave.createdAt, fresh.updatedAt)) {
  offerRestorePrompt(latestAutosave);              // explicit, non-destructive
}

// SPA navigation guard:
useAdminNavigationGuard({
  blocked: hasUnsavedChanges,
  message: "You have unsaved page changes.",
});
```

Expected data flow:

- Cache-first render is preserved (no mount-force refetch loops); the server
  response only replaces state when strictly newer — mirroring the
  TASK-449-02 broadcast rule so the two hydration paths share one contract.
- Autosave recovery is explicit and non-destructive (prompt + existing
  restore path), never a silent overwrite in either direction.
- Navigation guard goes through shared admin navigation helpers per
  `AGENTS.md` (no parallel guard implementations).

Error handling:

- Revalidation fetch failures keep the cached view and surface the existing
  inline error affordances; they never blank the document.
- Restore declines leave both the draft and the autosave revision untouched.

Regression-test shape:

- Vitest UI: poisoned-cache mount renders cached then corrects to fresh;
  fresh-older-than-cache does not regress state; autosave-newer-than-draft
  triggers the restore prompt; SPA navigation with unsaved changes prompts.
- Live `playwright-cli`: reload with poisoned cache shows correct content;
  insert -> autosave -> navigate away -> reopen offers recovery.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Live `coderso-dev-core-host` + `playwright-cli` replay of both flows.

---

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` (pages detail hydration/revalidation contract).
- `_docs/_TASKS/README.md` board + statistics sync.
- `_docs/_CHANGELOG/` entry on completion.
