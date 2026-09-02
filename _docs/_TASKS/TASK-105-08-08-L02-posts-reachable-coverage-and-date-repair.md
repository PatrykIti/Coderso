# TASK-105-08-08-L02: Posts Reachable Coverage and Date Repair
# FileName: TASK-105-08-08-L02-posts-reachable-coverage-and-date-repair.md

**Parent Subtask:** TASK-105-08-08
**Priority:** High
**Category:** UI Reliability + Coverage
**Estimated Effort:** Large
**Dependencies:** TASK-105-08-11 implementation-complete split receipt; TASK-105-08-08-L03 through L06 validation-complete receipts; fresh L02 contract audit
**Status:** ✅ Done (2026-09-02)

---

## Overview

Cover supported posts behavior after all source-dead paths have been repaired. This leaf
also owns the one compact production fix: `PostsTable.tsx:19-30` (`formatDate`;
`toLocaleDateString` call site `:22-26`) renders a malformed persisted timestamp as
`Invalid Date`, and the `catch { return value; }` at `:28` is dead because
`toLocaleDateString()` does not throw. The 185-line module may safely receive the explicit
`Number.isNaN(date.getTime())` raw-value fallback (keeping the `value?: string | null`
signature and the `if (!value) return "—";` guard), provided its final physical count
remains at most 1,000.

The exported `postInsertFlow.ts:50,54` missing-target branches are supported pure-helper
contracts, not dead code (`PostInsertSource` and `PostInsertTarget` are public at
`postInsertFlow.ts:3-14`). `PostRichTextAdapter.tsx:1001-1002` is similarly a valid optional
callback transition after rerender. Neither may be reclassified away.

## Exact Single-Writer Scope

**Production source writer:**

- `core/admin/ui/posts/PostsTable.tsx` only

**Test writers:**

- `tests/vitest/ui/task-105-08-08-post-table-preferences-residual.test.tsx` (new, ≤800)
- `tests/vitest/ui/task-105-08-08-post-shell-residual.test.tsx` (new, ≤800)
- `tests/vitest/ui/task-105-08-08-post-inspector-store-residual.test.tsx` (new, ≤800;
  shell-suite split — see Contract Amendment 2, 2026-08-31)
- `tests/vitest/ui/task-105-08-08-post-classic-canvas-residual.test.tsx` (new, ≤800)
- `tests/vitest/ui/task-105-08-08-post-editor-state-data-errors-residual.test.tsx` (new, ≤800)
- `tests/vitest/ui/task-105-08-08-post-editor-state-concurrency-residual.test.tsx` (new, ≤800)
- `tests/vitest/ui/task-105-08-08-post-richtext-residual.test.tsx` (new, ≤800)
- `tests/vitest/posts/post-insert-flow.test.ts` (existing; 98 physical lines before work)

Every new `.test.tsx` DOM suite listed above must begin literally with
`// @vitest-environment happy-dom` as its first physical line, before imports.
`post-insert-flow.test.ts` already begins with `// @vitest-environment happy-dom`; keep its
line 1 as-is — it is a pure non-DOM helper suite and must not gain further directives.

No other source, existing test, fixture, route, service, task file, board, changelog, or
coverage configuration is writable. `post-classic-editor-shell-wave.test.tsx` (900),
`postBlockEditorShellFixtures.tsx` (617), `postEditorStateFixtures.tsx` (639),
`postRichTextAdapterFixtures.tsx` (301), and `postEditorCanvasFixtures.tsx` (417) are
read-only coverage consumers.

## Implementation Pseudocode

### Source/Test Map

| Source lines (post-split map, audit 2026-08-31 §2–§4) | Writer | Required observable behavior |
|---|---|---|
| `PostsTable.tsx:19-30` (toLocaleDateString `:22-26`, dead catch `:28`); `hooks/usePostEditorPreferences.ts:158`; `settings/postEditorPreferences.ts:29` | post-table/preferences suite | Render malformed `updatedAt` and see the original raw string, not `Invalid Date`; prove preference fallback and normalizer output. |
| `editor/PostBlockEditorShell.tsx:69,280,331-332,396-399,403-404,407,412,416,439-440,461-462,498,630,712,769-771`; `editor/PostRevisionDrawer.tsx:84`; `blocks/BlockInserter.tsx:187`; `blocks/blockTransforms.ts:62`; `header/PostEditorHeader.tsx:185`; `inspector/BlockInspector.tsx:195,418,425,433`; `inspector/DocumentInspector.tsx:73`; `editor/postEditorStore.ts:129` | post-shell suite | Drive actual shell buttons, drawer, block insert/transform, inspector fields, and header/store effects. |
| `PostClassicEditorShell.tsx:571`; `postEditorCanvasBlockItemModel.ts:64,76`; `postEditorCanvasBlockItem.tsx:224,269,590-591` | classic/canvas suite | Use supported classic editor/canvas controls and assert focus/selection or rendered document effects. (Original refs `PostEditorCanvas.tsx:152,164,444,489,810-811` remapped: `:152`→`postEditorCanvasBlockItemModel.ts:64` parseVimeoId catch→null; `:164`→`Model.ts:76` parseLoomId catch→null; `:444`→`BlockItem.tsx:224` selected button attr-editor stopPropagation; `:489`→`:269` selected embed attr-editor stopPropagation; `:810-811`→`:590-591` list Textarea onFocus setListDraft+onSelect.) |
| `usePostEditorState.ts:504-507,632,704,706`; `hooks/postEditorStateDocument.ts:60,121`; `hooks/postEditorStateRefresh.ts:425,471-472,486-487,656-657,699,725,733`; `hooks/postEditorStateSaveQueue.ts:174-176,288,681` | state-data/errors suite | Resolve/reject deferred client calls to prove externally visible loading, stale-result, restoration, save/error states. (Original single-file refs `:87,148,1112,1173-1174,1266-1267,1358-1360,1473,1912,1943,2113-2116,2170,2178,2469,2582-2583,2621,2623` remapped post-split; 24 refs, audit §2.) |
| `usePostEditorState.ts:415,492,496,523,703`; `hooks/postEditorStateRefresh.ts:177,184,272,298,624-625,635-636,652-653,693,721`; `hooks/postEditorStateSaveQueue.ts:145,150-151,153-154,170,196,212,327,331,350-351,368,475,547,563,590,611,711,757,776,778` | state-concurrency suite | Use deferred real client responses to prove request supersession, autosave/reload sequencing, dirty state, and error behavior. (Original single-file refs `:767,772-773,775-776,797,804,898,923,1314,1354,1378,1397,1515,1519,1540-1541,1558,1674,1744,1769,1798,1819,1906,1986,2034,2053,2055,2101,2105,2132,2166,2550-2551,2561-2562,2578-2579,2620` remapped post-split; 39 refs, audit §2.) |
| `richtext/PostRichTextAdapter.tsx:388,473-479` (post-split; original HEAD refs `:120,323,913,1001-1002`: `:120`→`richtext/postRichTextSelection.ts:16-17` dual-form formatBlock fallback, `:323`→`postRichTextSelection.ts:181` resolveCollapsedSelectionTextNode null tail, `:913`→`Adapter.tsx:388` command-executor formatBlock fallback, `:1001-1002`→`Adapter.tsx:473-479` updateSlashState closes popover when `onSlashInsertBlock` is absent); `richtext/PostRichTextToolbar.tsx:442,548`; `richtext/postRichTextCommandEngine.ts:124` | richtext suite | Trigger commands through public toolbar/editor seams and rerender without `onSlashInsertBlock`; assert no stale callback action. |
| `editor/postInsertFlow.ts:50,54` | existing insertion-flow suite | Directly call exported pure helpers with missing `after-block`/`appender` targets and assert deterministic append. |

```ts
// PostsTable.tsx — replace the dead try/catch (:21-29) inside formatDate; keep the
// value?: string | null signature and the if (!value) return "—"; guard (:19-20).
const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// test: the prop is `items` (PostsTable.tsx:42), and onEdit/onPreview/onPublish/
// onUnpublish/onDuplicate are required callbacks (:49-53) — no synthetic Date throw.
render(
  <PostsTable
    items={[{ ...post, updatedAt: "not-a-date" }]}
    onEdit={onEdit}
    onPreview={onPreview}
    onPublish={onPublish}
    onUnpublish={onUnpublish}
    onDuplicate={onDuplicate}
  />
);
expect(screen.getByText("not-a-date")).toBeVisible();
```

Keep the current date locale/options for valid timestamps. Do not change list cache, error
mapping, post persistence, revision semantics, permission checks, or any source module
owned by L03–L06. Use public components/hooks and existing client seams, never a private
hook helper mock or cross-realm cast.

## Security Contract

Internal admin UI only. Existing posts session/RBAC permissions, CSRF protection for writes,
server-side strict validation, cache broadcast/invalidation, rate limits, and persistence
are unchanged. The raw-date fallback is display-only: it must not normalize or write the
malformed value back to the server. No endpoint, schema, migration, public write, or secret
handling changes are permitted.

## Testing Requirements and Gates

Run every writer test independently:

```bash
for test_path in \
  tests/vitest/ui/task-105-08-08-post-table-preferences-residual.test.tsx \
  tests/vitest/ui/task-105-08-08-post-shell-residual.test.tsx \
  tests/vitest/ui/task-105-08-08-post-classic-canvas-residual.test.tsx \
  tests/vitest/ui/task-105-08-08-post-editor-state-data-errors-residual.test.tsx \
  tests/vitest/ui/task-105-08-08-post-editor-state-concurrency-residual.test.tsx \
  tests/vitest/ui/task-105-08-08-post-richtext-residual.test.tsx \
  tests/vitest/posts/post-insert-flow.test.ts; do
  export TMPDIR=/tmp
  set -a && . ./.env && set +a
  NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts "$test_path" || exit $?
done
```

Run the combined full-lane post-repair V8 proof after L03–L06's source changes. This is the
whole-module 100% gate for retained posts sources and must include every extracted state,
canvas, and rich-text module, not only their stable façades:

```bash
coverage_dir="$(mktemp -d /tmp/task105-08-08-l02-v8.XXXXXX)" || exit 1
[[ -d "$coverage_dir" && ! -L "$coverage_dir" ]] || exit 1
export TMPDIR=/tmp
set -a && . ./.env && set +a
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  --coverage --coverage.provider=v8 --coverage.reporter=json-summary \
  "--coverage.reportsDirectory=$coverage_dir" \
  --coverage.include=core/admin/ui/posts/PostsTable.tsx \
  --coverage.include=core/admin/ui/posts/PostsListPage.tsx \
  --coverage.include=core/admin/ui/posts/editor/PostBlockEditorShell.tsx \
  --coverage.include=core/admin/ui/posts/editor/PostClassicEditorShell.tsx \
  --coverage.include=core/admin/ui/posts/editor/PostEditorCanvas.tsx \
  --coverage.include=core/admin/ui/posts/editor/PostRevisionDrawer.tsx \
  --coverage.include=core/admin/ui/posts/editor/postEditorStore.ts \
  --coverage.include=core/admin/ui/posts/editor/postInsertFlow.ts \
  --coverage.include=core/admin/ui/posts/editor/blocks/BlockInserter.tsx \
  --coverage.include=core/admin/ui/posts/editor/blocks/blockTransforms.ts \
  --coverage.include=core/admin/ui/posts/editor/header/PostEditorHeader.tsx \
  --coverage.include=core/admin/ui/posts/editor/hooks/useFocusReturn.ts \
  --coverage.include=core/admin/ui/posts/editor/hooks/usePostEditorPreferences.ts \
  --coverage.include=core/admin/ui/posts/editor/hooks/usePostEditorState.ts \
  --coverage.include=core/admin/ui/posts/editor/hooks/postEditorStateDocument.ts \
  --coverage.include=core/admin/ui/posts/editor/hooks/postEditorStateRefresh.ts \
  --coverage.include=core/admin/ui/posts/editor/hooks/postEditorStateSaveQueue.ts \
  --coverage.include=core/admin/ui/posts/editor/hooks/postEditorStateSession.ts \
  --coverage.include=core/admin/ui/posts/editor/inspector/BlockInspector.tsx \
  --coverage.include=core/admin/ui/posts/editor/inspector/DocumentInspector.tsx \
  --coverage.include=core/admin/ui/posts/editor/postEditorCanvasSelection.ts \
  --coverage.include=core/admin/ui/posts/editor/postEditorCanvasFocus.ts \
  --coverage.include=core/admin/ui/posts/editor/postEditorCanvasBlocks.tsx \
  --coverage.include=core/admin/ui/posts/editor/postEditorCanvasBlockItem.tsx \
  --coverage.include=core/admin/ui/posts/editor/postEditorCanvasBlockItemModel.ts \
  --coverage.include=core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx \
  --coverage.include=core/admin/ui/posts/editor/richtext/postRichTextSelection.ts \
  --coverage.include=core/admin/ui/posts/editor/richtext/postRichTextMedia.ts \
  --coverage.include=core/admin/ui/posts/editor/richtext/postRichTextSlashState.ts \
  --coverage.include=core/admin/ui/posts/editor/richtext/postRichTextBlockTransforms.ts \
  --coverage.include=core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx \
  --coverage.include=core/admin/ui/posts/editor/richtext/postRichTextCommandEngine.ts \
  --coverage.include=core/admin/ui/posts/editor/settings/postEditorPreferences.ts
node - "$coverage_dir/coverage-summary.json" <<'NODE'
const fs = require("node:fs");
const summary = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const failures = Object.entries(summary)
  .filter(([key]) => key !== "total")
  .filter(([, value]) => value.lines.pct !== 100);
console.log(JSON.stringify({ failures }, null, 2));
if (failures.length) process.exit(1);
NODE
```

Then run:

```bash
./node_modules/.bin/eslint --max-warnings=0 \
  core/admin/ui/posts/PostsTable.tsx \
  tests/vitest/ui/task-105-08-08-post-*-residual.test.tsx \
  tests/vitest/posts/post-insert-flow.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/admin/ui/posts/PostsTable.tsx \
  tests/vitest/ui/task-105-08-08-post-*-residual.test.tsx \
  tests/vitest/posts/post-insert-flow.test.ts
```

## Closure Checklist

- [x] `PostsTable` displays malformed persisted dates verbatim while preserving valid output.
- [x] All listed reachable branches are tested through public UI/pure-helper contracts.
- [x] The full V8 target set is 100% lines only after validated L03–L06 repair receipts.
- [x] Every modified writer file is at most 1,000 physical lines.

## Contract Amendment — 2026-08-31 (orchestrator)

Fresh source-contract audit
(`.tmp/receipts-20260831/audits/l01-l02-source-contract-audit-20260831.md`, verdict
NEEDS-CORRECTIONS → amended; 116/116 refs present, 0 dropped, 69 remapped to the
post-split modules):

1. The Source/Test Map's two `usePostEditorState.ts` rows were authored against the
   original 2,713-line monolith and are replaced by the post-split module→line maps
   (state-data/errors: 24 refs; state-concurrency: 39 refs). `orig:1359`
   `dirtyRevisionRef.current += 1` is now `bumpDirtyRevision()` (SaveQueue `:175`) — same
   behavior. `PostEditorCanvas.tsx:152,164,444,489,810-811` remapped to
   `postEditorCanvasBlockItemModel.ts:64,76` + `postEditorCanvasBlockItem.tsx:224,269,590-591`
   (canvas is now 429 lines). Bare filenames in the map are qualified with their directories.
2. V8 include list gains `postEditorCanvasBlockItem.tsx` (964) +
   `postEditorCanvasBlockItemModel.ts` (157) — L05-L01 extracted them and no test referenced
   them yet, so the previous list silently excluded 1,121 lines from the whole-module proof —
   plus advisory `richtext/postRichTextBlockTransforms.ts` (34, already 100%).
3. The `formatDate` fix keeps `value?: string | null` + `if (!value) return "—";` (the
   original snippet would regress the empty-`updatedAt` cell to `"null"`), and the test
   renders `items={…}` with the five required callbacks.
4. `post-insert-flow.test.ts` already begins with the happy-dom directive; keep line 1.
5. Richtext HEAD refs are recorded semantically; the live locations cited
   (`Adapter.tsx:388`, `:473-479`, `postRichTextSelection.ts:16-17`, `:181`) were verified
   during the split's landing and must be re-confirmed against the final tree at
   implementation time (the split was in flight during the audit).

## Contract Amendment 2 — 2026-08-31 (orchestrator): shell-suite line-cap split (MANDATORY)

The delivered `task-105-08-08-post-shell-residual.test.tsx` is 1,044 physical lines —
44 over the hard cap (≤1,000 is a failed gate, same rule as L01: "Any `wc -l` result over
1,000 is a failed gate; split a suite before adding more cases"). Disclosing the overrun
does not satisfy the cap. The suite owns 34 target lines across 9 production files; the
fix is a split, never weaker assertions.

Required follow-up (same leaf, same writer rules, one additional writer file):

1. Split the shell suite into `task-105-08-08-post-shell-residual.test.tsx` (keeps the
   shell/header/drawer behaviors) and a new
   `task-105-08-08-post-inspector-store-residual.test.tsx` (inspector, store, inserter,
   transforms behaviors). Both files: ≤800 target / ≤1,000 hard cap, first physical line
   `// @vitest-environment happy-dom`, no `.only`/`.skip`, shared setup may be duplicated
   or hoisted into a local (non-exported) helper inside each file — no new fixture module.
   The new path matches the contract's eslint glob
   `task-105-08-08-post-*-residual.test.tsx`; keep it that way.
2. Every one of the 34 shell-suite target lines must remain covered after the split.
   Prove it with a focused V8 run of the two split suites over the nine affected include
   paths, statement counts in `coverage-final.json` (hit ≥ 1 per target line), following
   the L01 amendment's instrument standard.
3. Re-run gates on the final split state: per-file vitest for both files (one invocation
   each), the contract's eslint glob, `git diff --check`, `wc -l` on both files.
4. Append a "Follow-up" section to `coverage/task-105-08-08-l02/RECEIPT.md` (and sync
   `RECEIPT.json`) with the split table, both files' final line counts, the V8 statement
   evidence, and gate exits. Update §2's writer table and §7 Deviation 1 to point at the
   resolution.
5. Nothing staged/committed; no production-source edit; hooks/* remain read-only.

## Closure Verification — 2026-09-02 (NOT closed: checklist items 2 and 3 fail)

Status intentionally stays ⏳ To Do. Both blockers were re-verified against the 2026-09-02
working tree rather than assumed. Blocker (a) — dependency on validated L03–L06 receipts — is
satisfied: L03, L04, L05, L06 are ✅ Done (2026-09-02), and L03's same-day dead-path deletions
removed exactly the 15 L03-owned lines the TASK-105-08-12 posts cluster still listed
(`PostClassicEditorShell.tsx` 8, `PostRichTextToolbar.tsx` 5, `PostsListPage.tsx` 1,
`useFocusReturn.ts` 1). Blocker (b) — this checklist's V8 item — still fails.

Per-item verdict (checklist as authored above):

1. `PostsTable` displays malformed persisted dates verbatim while preserving valid output —
   PASS. `PostsTable.tsx:19-30` carries the amended `formatDate` (`value?: string | null`,
   `if (!value) return "—";` guard, `Number.isNaN(date.getTime())` raw-value fallback, valid
   timestamps unchanged), and `task-105-08-08-post-table-preferences-residual.test.tsx:266-293`
   renders `updatedAt: "not-a-date"` asserting the raw string in the cell and in `datetime`,
   never `Invalid Date`.
2. All listed reachable branches are tested through public UI/pure-helper contracts — FAIL
   (same root cause as item 3). The seven residual suites plus `post-insert-flow.test.ts`
   exist, each begins literally with `// @vitest-environment happy-dom`, none uses
   `.only`/`.skip`, and they pass 8 files / 69 tests — but named target lines of this
   contract's own Source/Test Map rows (state-data/errors and state-concurrency) are still
   unexecuted by them; see item 3.
3. The full V8 target set is 100% lines only after validated L03–L06 repair receipts — FAIL.
   Contract gate re-run 2026-09-02, full lane (no test-file filter), v8, `--testTimeout=15000`,
   all 33 amended include paths, temp report dir: 1189 files / 10478 tests / 0 failures (the
   canonical run's 1186/10444 plus the three new L03 `*-dead-paths` suites and three new
   `detail-template-inspector` tests, so nothing was skipped). 28 of 33 include files measure
   100% lines. Five files do not, with 27 uncovered lines:
   `postEditorStateSaveQueue.ts` 337/354 (17), `postEditorStateRefresh.ts` 259/266 (7),
   `postEditorStateDocument.ts` 158/159 (1), `usePostEditorState.ts` 246/247 (1),
   `postRichTextSelection.ts` 277/278 (1). The gate's own check
   (`failures.length → process.exit(1)`) therefore exits 1.
4. Every modified writer file is at most 1,000 physical lines — PASS (largest writer
   `task-105-08-08-post-shell-residual.test.tsx` 797; `PostsTable.tsx` 183).

Cross-checks that localize the remaining gap:

- The 27 lines are exactly the TASK-105-08-12 posts-cluster residual rows for these five files
  (ledger 17 + 7 + 1 + 1 + 1 = 27), so the 2026-09-01 canonical artifact and this fresh run
  agree at region level on an unchanged set of files (small ±few-line v8 attribution jitter;
  e.g. `postEditorStateDocument.ts:60`, `postEditorStateRefresh.ts:177,184`, and
  `postEditorStateSaveQueue.ts:475,547,563` are exact matches to both the ledger and this
  contract's Source/Test Map).
- The uncovered behaviors are the identity-changed/queue-integrity paths this contract mapped:
  `throw`/`Promise.reject(createEditorIdentityChangedError())` sites, queue reorder, dedup and
  splice branches, the save `barrier.completion` await, session rejection
  (`rejectQueuedSession`), and `setRemoteUpdatePending(true)` guards in
  `postEditorStateRefresh.ts`, plus `postEditorStateDocument.ts:60`, `usePostEditorState.ts:417`,
  and `postRichTextSelection.ts:218`.
- Correction to the closure brief: the seven residual suites and the `PostsTable.tsx` date
  repair landed in commit `ef6e2e7c` ("fix(posts): split editor state canvas and richtext seams
  for reachable coverage", 2026-09-01), not `85b4c725`/`56c9cd92`; `git log --follow` on each
  writer file returns `ef6e2e7c` only (those two commits own the 08-03/08-09 lanes).

Gap to close before this leaf can flip: bring all 33 include paths to `lines.pct === 100` by
covering the 27 residual lines through the public seams this contract already names, or
removing them through a fresh source-owner contract if a line proves dead; then re-run this
checklist's V8 block and record the exit. No coverage ignore, private callback, invalid union
data, or production fallback may be added to close it (Overview rule).

## Closure (2026-09-02)

Closed on the 2026-09-02 working tree. The gap was closed exactly as this contract's own
rule allows — residual lines that are supported behavior were covered by the three
2026-09-02 residual-suite extensions already on the tree, and the 24 that proved dead were
removed through the fresh source-owner child
`TASK-105-08-08-L02-L01-post-editor-state-dead-path-repair.md` (✅ Done 2026-09-02), which
re-verified every inherited classification line-by-line against the live tree before
deleting it. No coverage ignore, private callback, invalid union data, or production
fallback was added.

### Residual resolution table (all 27 lines from the verification above)

| Former uncovered lines | Resolution |
|---|---|
| `postEditorStateSaveQueue.ts:154-155, 178-180, 200, 216, 331, 335, 354-355, 475, 547, 563, 713, 761` | L02-L01 dead-path deletion (each with a pre-gating invariant comment naming its enforcement site) |
| `postEditorStateSaveQueue.ts:292` | L02-L01 dead-path deletion — re-classified during implementation: the line sat in the non-silent hydrate apply tail, which no supported flow reaches (no `"hydrate"`-mode record producer exists; every enqueue is `"silent"`), and the tail's apparent coverage was V8 function-range bleed-through, not execution; the whole tail is deleted (a first-pass whitespace-only merge fix was prettier-unstable under `format-staged.ts` and is superseded) |
| `postEditorStateRefresh.ts:177, 184, 295, 632-633` | L02-L01 dead-path deletion (`:184`'s orphaned `rejectQueuedSession` wiring in refresh and the facade removed with it) |
| `postEditorStateRefresh.ts:562-563` | covered by `task-105-08-08-post-editor-state-data-errors-residual.test.tsx` (dirty-draft hydration deferral through the public hook) |
| `postEditorStateDocument.ts:60` | L02-L01 dead-path deletion (`normalizeBlockAttrs` strips unknown attr keys before `hasMeaningfulParagraphAttrs` sees them) |
| `usePostEditorState.ts:417` | L02-L01 dead-path deletion (layout-effect ref sync precedes the passive unsubscribe; the synchronous local bus cannot deliver in that window) |
| `postRichTextSelection.ts:218` | covered by `task-105-08-08-post-richtext-residual.test.tsx` (resolve-collapsed-selection tail through the public adapter seam) |
| `postEditorStateSaveQueue.ts:780-784` | covered by `task-105-08-08-post-editor-state-concurrency-residual.test.tsx` (the close flush waits out a queued identical autosave instead of re-sending it) |

### Final gate run (2026-09-02, real numbers)

The checklist's V8 block, re-run exactly as authored on the post-repair tree — full lane
(no test-file filter), v8 provider, all 33 amended include paths, temp report dir:
**1189 files / 10481 tests / 0 failures; 33/33 include files at `lines.pct === 100`**
(gate total 3810/3810 lines, final post-amendment tree; repaired modules:
`postEditorStateSaveQueue.ts` 307/307, `postEditorStateRefresh.ts` 255/255,
`postEditorStateDocument.ts` 158/158,
`usePostEditorState.ts` 245/245). The gate's own node check printed `{"failures":[]}` and
**exited 0**. Adjacent-behavior regression on the same tree: the seven residual suites
plus `post-insert-flow.test.ts` plus `task-105-08-08-post-classic-dead-paths.test.tsx`
(the shell around the queue) — 9 files / 85 tests passed. Static gates: eslint
`--max-warnings=0` on L02-L01's four production files, `bun --cwd core lint`,
`bun --cwd core lint:types`, root `tsc -p tsconfig.json --noEmit` — all exit 0;
`git diff --check` clean; every writer file ≤ 1,000 physical lines.

### Checklist verdicts (final)

1. `PostsTable` displays malformed persisted dates verbatim while preserving valid output —
   PASS (unchanged from the verification above; `PostsTable.tsx:19-30` carries the amended
   `formatDate`, pinned by `task-105-08-08-post-table-preferences-residual.test.tsx`).
2. All listed reachable branches are tested through public UI/pure-helper contracts — PASS.
   The seven residual suites plus `post-insert-flow.test.ts` exercise every mapped row that
   is supported behavior; the rows that were not reachable through any supported flow were
   removed by the L02-L01 owner child with invariant comments, never relabeled untestable.
3. The full V8 target set is 100% lines only after validated L03–L06 repair receipts — PASS.
   L03–L06 receipts are ✅ Done (2026-09-02), and the final gate run above is 33/33 at
   100% lines with the node check exiting 0.
4. Every modified writer file is at most 1,000 physical lines — PASS (largest writer
   `task-105-08-08-post-shell-residual.test.tsx` 797; `PostsTable.tsx` 183; L02-L01's
   largest production writer `postEditorStateSaveQueue.ts` 805 after the L02-L01 dead-path
   repair).

Attribution correction carried from the verification above and now final: the seven residual
suites and the `PostsTable.tsx` date repair landed in commit `ef6e2e7c` (2026-09-01); the
2026-09-02 residual-suite extensions and the L02-L01 dead-path repair are uncommitted
working-tree state on `feat/implementations` at this closure.
