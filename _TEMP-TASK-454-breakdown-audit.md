# _TEMP — TASK-454 Breakdown Verification Audit

**Scope:** Read-only verification of the TASK-454 subtask/leaf breakdown against
AGENTS.md task-workflow rules and against the actual source at current HEAD.
**HEAD:** originally generated against
`09d1094a739da9aa89c4aabaaa9101aee88fb574`; superseded by the current
TASK-454 drift-fix pass on `d1c62950`.
**Verdict:** ✅ The breakdown is well-formed, AGENTS.md-compliant, and accurate
against the code. No blocking drift found. A few cosmetic/notes-only items below.

---

## 1. Files reviewed

15 task files (1 board parent + 5 subtasks + 9 leaves):

- `TASK-454_…` (parent), `TASK-454-01`, `…-01-L01`
- `TASK-454-02`, `…-02-L01`, `…-02-L02`, `…-02-L03`
- `TASK-454-03`, `…-03-L01`, `…-03-L02`
- `TASK-454-04`, `…-04-L01`, `…-04-L02`
- `TASK-454-05`, `…-05-L01`

---

## 2. AGENTS.md structural compliance — PASS

| Rule | Result |
|---|---|
| Board file slug uses underscores after ID (`TASK-454_…`) | ✅ |
| Child file slugs use hyphens | ✅ all |
| `NN` starts at `01`, `LNN` starts at `L01`, zero-padded | ✅ |
| H1 matches physical task ID | ✅ all |
| `# FileName:` equals actual filename | ✅ all |
| `**Parent Task:**` / `**Parent Subtask:**` present | ✅ all |
| Canonical `**Status:**` (`⏳ To Do`) | ✅ all |
| Execution-ready leaves include pseudocode + data flow + error handling + regression-test shape | ✅ all leaves |
| Security Contract subsection present | ✅ all (even though no new routes) |
| `_docs/_TASKS/README.md` board rows for all 15 | ✅ present (lines 135–149) |

Dependency graph is coherent and matches the cross-references inside the
pseudocode:

```
454-01 (None) → 454-02, 454-04
454-02 → 454-03 → (454-05)
454-04 → (454-05)
Leaves: 02-L01←01-L01 ; 02-L02←02-L01 ; 02-L03←02-L02
        03-L01←02-L02 ; 03-L02←03-L01
        04-L01←01-L01 ; 04-L02←04-L01 + 03-L01
        05-L01←02-L03 + 03-L02 + 04-L02
```

The `04-L02 ← 03-L01` edge is correct: the nav-guard block condition
(`hasUnsavedChanges || Boolean(recoverableAutosave)`) needs the recoverable
autosave state produced by 03-L01. Good ordering — no forward references.

---

## 3. Code-accuracy verification — PASS

Every file, symbol, prop, type alias, and API signature referenced by the tasks
was checked against source. All exist as described:

| Task claim | Source evidence |
|---|---|
| `PageEditorHost.loadDetail(id)` has **no** options today → adding `{ force }` is real work | `pageEditorHostContract.ts:155` `loadDetail: (id: string) => Promise<…>` |
| Host has `mode: "page" \| "page-template" \| "menu"` | `pageEditorHostContract.ts:146` |
| Host `revisions.{list,restore,discard}` with restore returning `{ ok, restored, revision, page }` | `pageEditorHostContract.ts:66-78` |
| `getCachedDetail`, `loadFailedMessage` on host | `:154`, `:150` |
| Cached clients already accept `{ force }` | `pagesClient.ts:300`, `pageTemplatesClient.ts:146`, `menusClient.ts:168` |
| Default Pages host `loadDetail: (id) => getPageCached(id)` lives in PageEditor.tsx | `PageEditor.tsx:236-243`, `editorHost = host ?? defaultPagesEditorHost` `:626` |
| Template host `toEditorDetail` + Menu host `toMenuDesignEditorDetail` | `PageTemplateEditorPage.tsx:33,201`, `MenuDesignEditorPage.tsx:48,266` |
| `isNewerPageDetailTimestamp` is a **local** const (so “move/export” is accurate) | `PageEditor.tsx:567`, reused in cache-bus rehydrate `:1832` |
| Existing **early-return** load effect to be replaced | `PageEditor.tsx:1764` `if (!pageId \|\| initialPageDetail) return;` |
| Hydration body (setPage/normalizePageData/selectSection/title/slug/showInNav/retention) matches proposed `hydrateFromDetail` | `PageEditor.tsx:1773-1782` |
| Cache-bus rehydrate already strict-newer + dirty-guarded (TASK-449-02) | `PageEditor.tsx:1823-1838` |
| Autosave writes revision only, not `currentData` (gap #1) | `PageEditor.tsx:1840-1853` (autosaveDocument) |
| `initialPage` prop + derived `initialCachedPage`/`initialPageDetail` | `PageEditor.tsx:272,632,636` |
| `revisionsHost = editorHost.revisions` | `PageEditor.tsx:1963` |
| Router `registerBlocker` + `navigate(…, { skipBlockers })` | `AdminRouterContext.tsx:31,60,105` |
| Settings guard pattern (`SettingsDirtyNavigationProvider`, `useAdminBasePath`, `ConfirmActionDialog`, `resolveAdminHref`, `registerBlocker`, `beforeunload`, `requestNavigation`) | `SettingsDirtyNavigation.tsx:13,15,16,77,128,142` |
| Revision client fns `listPageRevisions/restorePageRevision/discardPageRevision` (restore: CSRF + cacheBus, returns `{page}`) | `pagesClient.ts:438,442,457` |
| Pseudocode type names use the shared host contract (`PageEditorResourceDetail` / `PageEditorRevision`) | `pageEditorHostContract.ts:19`, `:45` |
| All 9 referenced test files exist | verified present |

The breakdown also correctly captured the already-applied contract correction:
the parent uses `{ force: true }` everywhere (no leftover nonexistent
`{ revalidate: true }`), satisfying 454-01 acceptance criterion #1.

---

## 4. Notes (non-blocking)

1. **Cosmetic naming spread resolved:** the parent now uses
   `initialPageDetail` in the mount pseudocode, matching the derived value used
   by the current early-return.

2. **One-shot vs existing effect:** 454-02-L02 replaces the early-return effect
   (`:1764-1793`) rather than adding alongside it — confirmed as the intent
   ("Replace the current early-return load effect"). Worth keeping explicit so no
   double mount load is introduced; the `revalidatedResourceRef` one-shot guard
   covers it.

3. **README Statistics arithmetic:** rows are present and synced; the
   **To Do: 71 / In Progress: 9 / Done: 2581** totals in `README.md` were
   re-derived during the current drift-fix pass.

4. **Pseudocode type shorthand resolved:** 454-03 / 03-L01 now use
   `PageEditorRevision` / `PageEditorResourceDetail`, matching the host
   contract names directly.

---

## 5. Conclusion

The TASK-454 breakdown is **correct and execution-ready**. It is structurally
compliant with AGENTS.md and its pseudocode/Files-To-Change map onto real,
current code with unusually high fidelity (every host field, helper, alias, and
client signature verified). Per AGENTS.md, the first implementation run should
still begin from a fresh read-only pre-implementation audit (this is exactly what
454-01-L01 owns), since these files corrected prior contract drift.

_Originally generated as a read-only verification pass; updated after the
TASK-454 drift-fix pass. No application source files were edited._
