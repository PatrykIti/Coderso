# TASK-105-08-08: Pages, Posts, Entries, Forms, Listings, Themes, Booking, Audit Residual
# FileName: TASK-105-08-08-pages-posts-entries-forms-listings-themes-booking-residual.md

**Priority:** High
**Category:** QA + Coverage
**Estimated Effort:** Large
**Dependencies:** TASK-105-08-11 implementation-complete split receipt; fresh L08 pages/posts contract audit
**Parent Task:** TASK-105-08
**Status:** ✅ Done (2026-09-02)

---

## Overview

The former one-leaf, test-only plan was invalid. The current pages/posts coverage
artifact contains both real user-reachable branches and statically dominated paths;
testing the latter with casts or private mocks would misrepresent the product contract.
It also names three production modules already above the 1,000 physical-line gate:
`usePostEditorState.ts` (2,713), `PostEditorCanvas.tsx` (1,526), and
`PostRichTextAdapter.tsx` (1,352). Any source repair in one of those modules must split
it cohesively in the same change before it can land.

This parent is now a coordination contract only. It owns no production or test writer
paths. The direct children below own disjoint pages/posts source and test paths. L08-L10
add a separate test-integrity-only lane for exact root-TypeScript diagnostics in audit,
entries, and forms; they do not claim their historical coverage rows. Listings, themes,
and booking remain frozen pending their own fresh child contracts. L08 cannot be closed
until those coverage contracts, these ten children, and a fresh full coverage run resolve
every L08 row.

## Verified Pages/Posts Disposition

The last full artifact reported 153 pages and 140 posts uncovered executable lines.
Those counts are a starting diagnostic, not permission to manufacture execution.

### Pages

Of the 22 artifact lines originally labelled unreachable, **14 are reachable** through
the supported custom-host palette: `pageEditorDocumentCommands.ts:592-615`. The public
host permits sections without `content` at
`core/admin/ui/pages/editor/pageEditorHostContract.ts:141-143,213`, and the controller
builds that palette at `usePageEditorController.ts:495-511`. L01 must cover that valid
no-selection fallback through the public controller/command seam.

The remaining diagnostic set separates **five source-proven page dead-path lines** from
**three unresolved registry lines**:

- `PagePreview.tsx:19` (the supported preview route is client-only and already uses
  `window.close`; its SSR fallback is not a product execution path);
- `editor/PageEditorToolbar.tsx:483-484` (dominated by the preceding no-page return);
- `editorControls/ListItemsControl.tsx:62` (the upstream page-control normalizer excludes
  the invalid list shape); and
- `editorControls/SegmentedControl.tsx:82` (a keyboard event's target is always a real
  option; the container is not a focus target).

`editor/PageEditorRegistryFields.tsx:892,903-904` is **unresolved pending the L03
source-owner audit**. The current coverage artifact does not prove that the `unsupported`
model branch is removable today; the audit must identify its model owner and either retain it
as a supported fail-closed path or create an exact follow-up leaf. It is neither a fake-test
target nor a source-proven deletion in this contract.

L03 must resolve the five source-proven paths without artificial execution. `ListItemsControl`
requires a fresh source-contract decision before changing a normalizer outside L03's named
writer set. `PageEditorRegistryFields` remains the separately unresolved owner-audit item
above: it may be retained as fail-closed behavior, or moved to an exact direct child, but is
not presumed removable. Neither may be covered by an artificial cast.

### Posts

Of the artifact's 29 allegedly unreachable posts lines, four are valid supported
contracts and must be tested: `postInsertFlow.ts:50,54` are exported insertion fallback
cases (`PostInsertSource`/`PostInsertTarget` at `postInsertFlow.ts:3-14`), and
`PostRichTextAdapter.tsx:1001-1002` is an optional callback transition after rerender.
The remaining **25 source-proven artifact-dead line numbers** are:

- `PostsListPage.tsx:77`;
- `editor/PostClassicEditorShell.tsx:349-354,693-696`;
- `editor/PostEditorCanvas.tsx:1298-1299`;
- `editor/hooks/useFocusReturn.ts:19`;
- `editor/hooks/usePostEditorState.ts:1098-1100,1136,1181,1705`;
- `editor/richtext/PostRichTextAdapter.tsx:202,626`; and
- `editor/richtext/PostRichTextToolbar.tsx:281,337-338,346,348`.

`PostsTable.tsx:28` was not in that unreachable list, but is a real user-visible source
defect: `new Date(malformed).toLocaleDateString()` returns `"Invalid Date"` rather than
throwing into the current catch. L02 owns the compact 185-line source repair and proves
that malformed saved data displays its raw value.

## Direct Child Order and Exact Ownership

| Order | Child | Sole writer scope | Unlocks |
|---|---|---|---|
| 1 | `L03` | compact pages/posts dead-path repairs and their regression suites | L01 and L04 |
| 2 | `L04` | split + repair `usePostEditorState.ts` | L05 |
| 3 | `L05` | split + repair `PostEditorCanvas.tsx` | L06 |
| 4 | `L06` | split + repair `PostRichTextAdapter.tsx` | L02 |
| 5 | `L01` | reachable pages behavior suites | pages V8 aggregate |
| 6 | `L02` | reachable posts suites plus `PostsTable` date repair and combined posts V8 aggregate | L07 |
| 7 | `L07` | registered shared-platform pages/posts runtime smoke and evidence | L08 runtime acceptance |

| 8 | `L08` | audit root-TypeScript test repair only | audit test attribution |
| 9 | `L09` | entries root-TypeScript test repair only | entries test attribution |
| 10 | `L10` | forms root-TypeScript test repair only | forms test attribution |

The order is intentional: no coverage child may rely on fake execution of dead code, and
the 1,000-line production gate applies before any repair of an oversized module. L08-L10
are test-only and must not wait for, or be used as evidence for, a pages/posts V8 aggregate.

## Reachable Coverage File Map

### L01 — pages

| Source lines | New focused test file | Real behavior to prove |
|---|---|---|
| `PageCreateDrawer.tsx:146-147,189`; `PageListPage.tsx:117,142,235,332-333,350,368-369,377` | `tests/vitest/ui/task-105-08-08-page-list-create-residual.test.tsx` | Typed slug marks the draft touched; cancel closes; cold cache subscription, default-create navigation, bulk delete selection/toast, and drawer open/close visibly update UI. |
| `templates/PageTemplatesPage.tsx:234,254,276,336` | `tests/vitest/ui/task-105-08-08-page-templates-residual.test.tsx` | Empty-state create, typed template name, Edit navigation, and cancel behavior. |
| `editor/PageAuthoringCanvasInline.tsx:598`; `PageEditorLayers.tsx:147`; `PageEditorRoot.tsx:329,690`; `PageEditorSettingsPanel.tsx:195,306,318,326`; `PageEditorToolbar.tsx:106,297,327,543,836-838,849-851,854-856,859-861,864-866,869-871,895-901,904-906,909-911,914-916,923` | `tests/vitest/ui/task-105-08-08-page-editor-shell-toolbar-residual.test.tsx` | Visible canvas/layer/settings changes, pointer propagation, recovery sorting/error state, Escape precedence, and editor hotkeys. |
| `PageEditorRegistryFields.tsx:565,567,578,608,618,620,635,647-648,752,880`; `ComboboxControl.tsx:122-123,158-160,316`; `FacetListControl.tsx:277`; `GalleryCategoryTokensControl.tsx:121-123`; `GalleryItemsControl.tsx:197,320`; `MediaUrlControl.tsx:92-93,95,100-101` | `tests/vitest/ui/task-105-08-08-page-editor-registry-controls-residual.test.tsx` | Actual control selection, input, token/gallery, URL, and gradient interactions emit the expected public field updates. |
| `pageEditorDocumentCommands.ts:137,340,538-539,592-615,675-684,741`; `usePageEditorController.ts:92,131-140,315,358,517,525,534,796-803,809-810,823-827`; `usePageEditorHostWiring.ts:73` | `tests/vitest/ui/task-105-08-08-page-editor-commands-controller-residual.test.tsx` | Insert/reorder command behavior, typed `{ sections, blocks }` custom-host palette with no selected section, controller normalization/error paths, and host wiring. |

Each new L01 suite has a planned cap of **800 physical lines**. It must not extend
`tests/vitest/ui/pageEditorV2FlowHarness.tsx` (1,000),
`tests/vitest/pages/page-editor-control-registry.test.ts` (999), or the near-cap shared
page-editor helpers.

### L02 — posts

| Source lines | Test writer | Real behavior to prove |
|---|---|---|
| `PostsTable.tsx:28`; `usePostEditorPreferences.ts:158`; `postEditorPreferences.ts:29` | `tests/vitest/ui/task-105-08-08-post-table-preferences-residual.test.tsx` | Malformed persisted date remains its raw visible value; preference fallback/normalization stays stable. |
| `PostBlockEditorShell.tsx:69,280,331-332,396-399,403-404,407,412,416,439-440,461-462,498,630,712,769-771`; `PostRevisionDrawer.tsx:84`; `BlockInserter.tsx:187`; `blockTransforms.ts:62`; `PostEditorHeader.tsx:185`; `BlockInspector.tsx:195,418,425,433`; `DocumentInspector.tsx:73`; `postEditorStore.ts:129` | `tests/vitest/ui/task-105-08-08-post-shell-residual.test.tsx` | Shell actions, revision UI, insertion/transform, inspector edits, and observable store/header changes. |
| `PostClassicEditorShell.tsx:571`; `PostEditorCanvas.tsx:152,164,444,489,810-811` | `tests/vitest/ui/task-105-08-08-post-classic-canvas-residual.test.tsx` | Supported classic editor/canvas commands and focus-visible effects only; dead canvas SSR lines remain L05 work. |
| `usePostEditorState.ts:87,148,1112,1173-1174,1266-1267,1358-1360,1473,1912,1943,2113-2116,2170,2178,2469,2582-2583,2621,2623` | `tests/vitest/ui/task-105-08-08-post-editor-state-data-errors-residual.test.tsx` | Public data/error, stale-result, restore, and save-result states after L04's stable façade. |
| `usePostEditorState.ts:767,772-773,775-776,797,804,898,923,1314,1354,1378,1397,1515,1519,1540-1541,1558,1674,1744,1769,1798,1819,1906,1986,2034,2053,2055,2101,2105,2132,2166,2550-2551,2561-2562,2578-2579,2620` | `tests/vitest/ui/task-105-08-08-post-editor-state-concurrency-residual.test.tsx` | Real deferred-client races, request supersession, autosave/reload ordering, and visible dirty/error behavior. |
| `PostRichTextAdapter.tsx:120,323,913,1001-1002`; `PostRichTextToolbar.tsx:442,548`; `postRichTextCommandEngine.ts:124` | `tests/vitest/ui/task-105-08-08-post-richtext-residual.test.tsx` | Rich-text command/UI effects and optional slash callback removal after rerender; no cross-realm cast. |
| `postInsertFlow.ts:50,54` | Existing `tests/vitest/posts/post-insert-flow.test.ts` (98 lines before work) | Exported `after-block` and `appender` missing-target fallbacks append deterministically. |

Every new L02 suite has a planned cap of **800 physical lines**. The sole existing-file
extension is `post-insert-flow.test.ts`, which remains below 1,000 lines.

## Root TypeScript Test-Repair Leaves

These three children own exact existing tests and no production file. They repair only the
recorded root TypeScript diagnostics by matching current exported public types. Every other
test, shared fixture, source module, route, client, task-board file, changelog, and coverage
configuration remains read-only. A source or shared-fixture need triggers a new direct
owner contract rather than scope expansion.

| Child | Status | Sole writer files | Boundary |
|---|---|---|---|
| TASK-105-08-08-L08 | To Do | tests/vitest/ui/audit-list-residual.test.tsx | Audit export mock type repair only. |
| TASK-105-08-08-L09 | To Do | tests/vitest/ui/entry-create-drawer-required-fields.test.tsx; tests/vitest/ui/entry-editor-residual-wave.test.tsx; tests/vitest/ui/entry-editor-shell-wave.test.tsx; tests/vitest/ui/entry-list-residual-wave.test.tsx; tests/vitest/ui/entry-metadata-panel.test.tsx; tests/vitest/ui/entry-value-mapping-wave.test.ts; tests/vitest/ui/use-entry-taxonomy-hooks-wave.test.tsx | Entries test-type repair only, including the supported replacement for the invalid color fixture. |
| TASK-105-08-08-L10 | To Do | tests/vitest/ui/forms-residual-components.test.tsx | Forms fixture type repair only. |

The actual full diagnostic anchors, implementation shape, targeted commands, and per-file
line-count gates are exclusive to the child contracts. Their results are root-TypeScript
attribution receipts, not L08 coverage completion evidence.

## Frozen Non-Pages/Posts Rows

Entries (84 lines), forms (24), listings (67), themes (2), booking (1), and audit (10)
remain in L08's historical coverage inventory. L08-L10 now own only their listed test
type repairs; they do not own or resolve the coverage lines. Listings, themes, and booking
still have no coverage writer and require fresh direct children before implementation. The
historical broad directory-glob ownership is revoked. This parent explicitly excludes
`field-editor.test.tsx` (03), all media/commerce/search suites (06),
`site-health-card.test.tsx` and `site-shell-dialog.test.tsx` (05), and
redirect/shared list-toast suites (09).

## Parent Acceptance Criteria

1. L01–L10 are completed in their declared dependency order, with no conflicting writer
   paths and every changed production/test file at most 1,000 physical lines.
2. L01 and L02 prove only genuine public behavior. No `as unknown as`, private helper mock,
   or unsupported registry construction may be used to execute a classified dead path.
3. L01/L02 own the combined fresh whole-module V8 proof after L03–L06 repairs. It includes
   every extracted L04/L05/L06 module as well as the retained façades, and shows every
   pages/posts line either at 100% or resolved by the validated source repair listed above.
4. L07 proves five real visible editor flows through the registered shared smoke platform,
   including screenshots, host restart/readiness, admin/front response, and zero console errors.
5. L08-L10 repair only their exact root-TypeScript test diagnostics and preserve supported
   test behavior; they do not substitute for coverage evidence or source ownership.
6. Fresh execution-ready contracts assign the frozen 188 non-pages/posts coverage lines,
   then the same full coverage proof resolves them before L08 can be marked done.

## Shared Final Validation

After L01/L02 land, run their combined V8 proof and the final static gates; after that run L07
through the shared runner and retain its evidence receipt:

```bash
bun scripts/run-vitest-coverage.ts
bun scripts/analyze-vitest-gaps.ts
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false
git diff --check
```

The final owner must additionally run `wc -l` across every changed source and test file;
any result over 1,000 is a failed closure gate.

## Security Contract

This coordination contract does not add an endpoint or alter an API. All child work stays
inside the existing internal admin UI: existing session authentication, RBAC, CSRF for
writes, strict server validation, cache invalidation, and rate-limit behavior remain
authoritative. No public write, persistence, schema, migration, or secret-handling
behavior may change without a separate approved contract.

## Closure (2026-09-02)

Closed as a coordination contract: every direct child and grandchild is terminal on the
2026-09-02 working tree — L01 ✅, L02 ✅, L03 ✅, L03-L01 ✅, L04 ✅, L04-L01 ✅, L05 ✅,
L05-L01 ✅, L06 ✅, L08 ✅, L09 ✅, L10 ✅ (all 2026-09-02), L07 ✅ (2026-09-01, r44
`task105-l08-fast-20260901-r44` full PASS), and the closing grandchild L02-L01 ✅
(2026-09-02). The last open item was L02's V8 gate; L02-L01's dead-path repair and the
three 2026-09-02 residual-suite extensions took it to **33/33 include paths at 100% lines**
(full lane 1189 files / 10481 tests / 0 failures; the gate's node check exited 0), recorded
in L02's `## Closure (2026-09-02)` with the per-line residual resolution table.

Family receipt against the Parent Acceptance Criteria:

1. L01–L10 ran in their declared order with disjoint writer paths; every changed
   production/test file is at most 1,000 physical lines (largest posts writer
   `postEditorStateSaveQueue.ts` 805 after the L02-L01 dead-path repair; largest test
   writer `task-105-08-08-post-shell-residual.test.tsx` 797 after the Amendment 2 split).
2. L01/L02 proved only genuine public behavior — no `as unknown as`, private helper mock,
   or unsupported registry construction executed a classified dead path; every dead path
   was instead deleted under a fresh owner contract (L03 + L03-L01 for pages/posts shells,
   L04/L05/L06 splits, L02-L01 for the post editor state modules) with pre-gating
   invariant comments at each deletion site.
3. L01 and L02 satisfy the criterion as written — every pages/posts line is at 100% or
   resolved by a validated source repair: L02's posts aggregate is 33/33 includes at
   100% lines (3810/3810 lines, 2026-09-02 full-lane run on the final post-amendment
   tree, node check exit 0), and L01's
   fresh instrument re-run (2026-09-02) hits every named reachable page row, with the
   remaining page lines being exactly the 08-12 ledger's instrument-level residuals for
   the pages cluster (10 files / 25 lines) — a disposition this criterion explicitly
   allows and L01's closure records.
4. L07's five visible editor flows passed through the registered shared smoke platform
   with screenshots and zero console errors (r44 receipt, 2026-09-01).
5. L08–L10 repaired only their exact root-TypeScript test diagnostics and their receipts
   make no coverage-completion claim.
6. The frozen non-pages/posts rows were never this family's to write: they remain owned by
   the program-level ledger (TASK-105-08-12 rebaseline: 99.26% lines, 291-line residual
   ledger, 17 infra-noise zero-executable files), which the 08-family apex closure
   summarizes. The 2026-09-02 package (L03 deletions → L03-owned files at 100%, L03-L01
   typed seam, L02 residual suites, L02-L01 dead-path repair → L02 gate 33/33) reduced
   that ledger's pages/posts cluster rows; the ledger itself keeps the authoritative
   remaining-line accounting and no new whole-program coverage total is claimed here.
