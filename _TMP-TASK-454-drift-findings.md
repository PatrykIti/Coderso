# _TMP — TASK-454 Breakdown Drift Findings

**Type:** Read-only verification of the TASK-454 subtask/leaf breakdown vs.
AGENTS.md task-workflow rules and vs. actual source.
**HEAD at this pass:** `e2729190228a742577eaf0bad420b6d4a99625b7`
(after `d1c62950 docs: split TASK-454 contract` and
`e2729190 docs: resolve TASK-454 audit drift`).
**Breakdown size:** 15 files — 1 board parent + 5 subtasks + 9 leaves, all
`⏳ To Do`.
**Overall verdict:** ✅ Well-formed, AGENTS.md-compliant, and accurate against
the code. No blocking drift. Findings below are the drifts surfaced by the audit
and their current resolution status.

---

## Drift findings

### D1 — Cosmetic naming spread (`initialCachedPage` vs `initialPage`) — ✅ RESOLVED
- **Severity:** Low (cosmetic, no behavior impact).
- **Was:** parent Overview prose used `initialCachedPage`, parent pseudocode used
  `initialPage`/`host.getCachedDetail`. All three are real identifiers, but the
  early-return the implementer must guard on is the derived `initialPageDetail`.
- **Source:** `PageEditor.tsx:272` (`initialPage` prop), `:632` (`initialCachedPage`),
  `:636` (`initialPageDetail`), early-return `:1765`.
- **Now:** parent mount pseudocode standardized on `initialPageDetail`
  (fixed in `e2729190`).

### D2 — Pseudocode type shorthand (`PageRevision` / `PageDetail`) — ✅ RESOLVED
- **Severity:** Low (aliases resolved to real types either way).
- **Was:** 454-03 / 03-L01 pseudocode used `PageRevision[]` / `PageDetail`, which
  are local import aliases of the host-contract types.
- **Source:** host types `PageEditorRevision` (`pageEditorHostContract.ts:54`),
  `PageEditorResourceDetail` (`:19`).
- **Now:** pseudocode uses the canonical host-contract names directly
  (fixed in `e2729190`).

### D3 — Stale `{ revalidate: true }` contract — ✅ RESOLVED (pre-this-pass)
- **Severity:** Medium (was a nonexistent API name in the original draft).
- **Was:** earlier TASK-454 draft referenced a nonexistent `{ revalidate: true }`
  option; the cached clients actually take `{ force?: boolean }`.
- **Source:** `pagesClient.ts:300`, `pageTemplatesClient.ts:146`,
  `menusClient.ts:168` all expose `{ force }`.
- **Now:** breakdown uses `{ force: true }` everywhere; satisfies 454-01
  acceptance criterion #1. Confirmed clean.

### D4 — One-shot replacement of the existing load effect — ⚠️ WATCH (non-blocking)
- **Severity:** Low (implementation guardrail, not a doc defect).
- **Detail:** 454-02-L02 **replaces** the current early-return load effect
  (`PageEditor.tsx:1765-1793`) rather than adding a second effect alongside it.
  Implementer must keep this explicit so no double mount load is introduced; the
  `revalidatedResourceRef` one-shot guard in the L02 pseudocode covers it.
- **Status:** intentional and correctly described; flagged only as an
  implementation watch-item.

### D5 — README Statistics arithmetic — ✅ RESOLVED
- **Severity:** Low (board hygiene).
- **Was:** the 15 TASK-454 rows existed but the To Do/Done totals had not been
  re-derived for the added rows.
- **Now:** totals re-derived during the drift-fix pass (`_docs/_TASKS/README.md`,
  rows at lines 135–149).

---

## Re-verified source anchors (current HEAD `e2729190`)

| Claim | Evidence |
|---|---|
| `loadDetail(id)` has no options today → adding `{ force }` is real work | `pageEditorHostContract.ts:155` |
| Host `mode` / `revisions.{list,restore,discard}` (restore → `{ ok, restored, revision, page }`) | `pageEditorHostContract.ts:146,66-78` |
| Cached clients already accept `{ force }` | `pagesClient.ts:300`, `pageTemplatesClient.ts:146`, `menusClient.ts:168` |
| Default Pages host `loadDetail: (id) => getPageCached(id)` | `PageEditor.tsx:236-243`, `:626` |
| Template/Menu host converters `toEditorDetail` / `toMenuDesignEditorDetail` | `PageTemplateEditorPage.tsx:33,201`, `MenuDesignEditorPage.tsx:48,266` |
| `isNewerPageDetailTimestamp` is a local const (so "move/export" is accurate) | `PageEditor.tsx:567`, reused `:1832` |
| Existing early-return load effect to be replaced | `PageEditor.tsx:1765` |
| Hydration body matches proposed `hydrateFromDetail` | `PageEditor.tsx:1773-1782` |
| Cache-bus rehydrate already strict-newer + dirty-guarded (TASK-449-02) | `PageEditor.tsx:1823-1838` |
| Autosave writes revision only, not `currentData` (gap #1) | `PageEditor.tsx:1840-1853` |
| Router `registerBlocker` + `navigate(…, { skipBlockers })` | `AdminRouterContext.tsx:31,60,105` |
| Settings guard pattern present (extraction target) | `SettingsDirtyNavigation.tsx:13,15,16,77,128,142` |
| Revision client fns (restore: CSRF + cacheBus, returns `{page}`) | `pagesClient.ts:438,442,457` |
| All 9 referenced test files exist | verified present |

---

## AGENTS.md structural compliance — PASS

Slugs (underscore board / hyphen children), zero-padded `NN`/`L01` numbering,
`H1 = ID`, `# FileName:` matches filename, parent fields present, canonical
`⏳ To Do` status, execution-ready pseudocode + data flow + error handling +
regression-test shape in every leaf, Security Contract subsections, and synced
`_docs/_TASKS/README.md` rows — all present.

Dependency graph (coherent, no forward references):

```
454-01 (None) → 454-02, 454-04
454-02 → 454-03 → (454-05)
454-04 → (454-05)
Leaves: 02-L01←01-L01 ; 02-L02←02-L01 ; 02-L03←02-L02
        03-L01←02-L02 ; 03-L02←03-L01
        04-L01←01-L01 ; 04-L02←04-L01 + 03-L01
        05-L01←02-L03 + 03-L02 + 04-L02
```

---

## Conclusion

The TASK-454 breakdown is **correct and execution-ready**. Of the 5 drift items
surfaced, D1/D2/D3/D5 are resolved in the current tree and D4 is a non-blocking
implementation watch-item that the existing pseudocode already guards. Per
AGENTS.md, the first implementation run should still open with the fresh
read-only pre-implementation audit owned by 454-01-L01.

_Read-only verification pass; no task or application source files were edited by
this pass._
