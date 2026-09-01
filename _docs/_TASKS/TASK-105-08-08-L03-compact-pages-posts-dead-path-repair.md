# TASK-105-08-08-L03: Compact Pages/Posts Dead-Path Repair
# FileName: TASK-105-08-08-L03-compact-pages-posts-dead-path-repair.md

**Parent Subtask:** TASK-105-08-08
**Priority:** High
**Category:** UI Reliability + Coverage
**Estimated Effort:** Medium
**Dependencies:** TASK-105-08-11 implementation-complete split receipt; fresh L03 source-contract audit
**Status:** ⏳ To Do

---

## Overview

Remove compact source paths that cannot be reached through a supported product flow instead
of covering them with casts, fabricated registry values, or private mocks. All production
files in this leaf are presently below 1,000 lines, but `PageEditorToolbar.tsx` is 988 and
`PostClassicEditorShell.tsx` is 998; their repair must be deletion/neutral refactoring or
a cohesive split before adding code. This leaf has no API behavior change.

Two page paths need a fresh owner-boundary decision first:

- `PageEditorRegistryFields.tsx:892,903-904` renders `unsupported`. Its removability is
  unresolved: the coverage artifact does not prove the model branch is impossible. The audit
  must identify the model owner and decide whether it remains a supported fail-closed path or
  needs a new direct L03 child; this leaf makes no deletion assertion today.
- `ListItemsControl.tsx:62` handles an element excluded by the upstream normalizer. The
  audit must prove whether its public input can be narrowed locally or needs the normalizer
  owner. It must not be hit with `as unknown as`.

If either requires a source path not named below, stop, author an execution-ready direct
child with that owner, and rerun the L03 audit. L03 cannot close with either residual merely
labelled untestable.

## Exact Single-Writer Scope

**Production source writers:**

- `core/admin/ui/pages/PagePreview.tsx` (`:19`)
- `core/admin/ui/pages/editor/PageEditorRegistryFields.tsx` (`:892,903-904`, conditional
  only after the required source-owner audit)
- `core/admin/ui/pages/editor/PageEditorToolbar.tsx` (`:483-484`)
- `core/admin/ui/pages/editorControls/ListItemsControl.tsx` (`:62`)
- `core/admin/ui/pages/editorControls/SegmentedControl.tsx` (`:82`)
- `core/admin/ui/posts/PostsListPage.tsx` (`:77`)
- `core/admin/ui/posts/editor/PostClassicEditorShell.tsx` (`:349-354,693-696`)
- `core/admin/ui/posts/editor/hooks/useFocusReturn.ts` (`:19`)
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` (`:281,337-338,346,348`)

**Test writers (new, each planned at ≤700 physical lines):**

- `tests/vitest/ui/task-105-08-08-pages-dead-paths.test.tsx`
- `tests/vitest/ui/task-105-08-08-post-classic-dead-paths.test.tsx`
- `tests/vitest/ui/task-105-08-08-post-richtext-toolbar-dead-paths.test.tsx`

Every listed new DOM suite must begin literally with
`// @vitest-environment happy-dom` as its first physical line, before imports.

All other source/test paths, including `pageEditorControlUiModel.ts`, normalizers, routes,
clients, state/canvas/adapter modules, task board, changelog, and coverage configuration,
are read-only. A newly authorized owner path requires a newly authored child; do not widen
this scope during implementation.

## Implementation Pseudocode

```ts
// PagePreview.tsx: this screen itself invokes window.close(), so it is client-only.
const params = useMemo(() => parseParams(window.location.search), []);

// PageEditorToolbar.tsx: saveCurrentDraft() resolves a saved page or throws.
const saved = await saveCurrentDraft();
publishTarget = saved;
publishDocument = normalizePageData(saved.currentData);

// PostsListPage.tsx: every caller chooses foreground/background explicitly.
const resolvePostsRefreshBackground = (explicitBackground: boolean) => explicitBackground;

// SegmentedControl.tsx: bind/route keyboard movement through a known option element,
// rather than retaining a group-level impossible non-option early return.
const moveFromOption = (option: HTMLButtonElement, key: "ArrowLeft" | "ArrowRight") => { /* existing cycle */ };
```

1. Preserve existing client-only preview output while removing the SSR branch at
   `PagePreview.tsx:19`; do not change the preview URL format.
2. Preserve save-before-publish error handling while deleting only the impossible falsy-save
   branch at `PageEditorToolbar.tsx:483-484`.
3. For registry/list controls, complete the stated fresh audit before editing. For Registry,
   do not presume removal: retain the fail-closed branch if the model owner confirms it is
   supported, otherwise create the explicit owner child. For ListItems, narrow or remove only
   after all supported callers are proven; otherwise create the explicit owner child.
4. Move segmented arrow-key navigation to a known option seam (or equivalent typed event
   seam), retaining focus cycle, `aria-pressed`, disabled behavior, and scroll-to-selected.
5. Make posts refresh call sites pass their known explicit policy and remove only the
   private optional fallback at `PostsListPage.tsx:77`; retain cache hydration and mutation
   background semantics.
6. In the classic shell, preserve lease, local-edit, and preview state behavior while
   deleting the unreachable loader/preview guard paths. Do not change cache subscription
   behavior at `PostClassicEditorShell.tsx:471-475`.
7. Narrow focus-return input resolution so the final structurally unreachable path at
   `useFocusReturn.ts:19` disappears, preserving `HTMLElement`, `RefObject`, SSR, and
   disconnected-node safety.
8. Replace profile-invariant toolbar fallbacks with the selected profile's actual groups;
   retain command order, disabled state, labels, and accessible menu/button behavior.

Regression tests prove the unchanged supported behavior adjacent to each deletion: preview
query display/close, save-then-publish, segmented keyboard focus cycling, posts refresh
policy, classic editing/preview, focus return, and rich-text toolbar profile commands. They
must not assert artificial execution of the deleted lines.

## Security Contract

Internal admin UI refactor only. No endpoint visibility, session/RBAC grant, CSRF rule,
rate-limit bucket, strict server validation, cache invalidation/broadcast contract,
persistence, schema, migration, or public-write anti-abuse behavior may change. Existing
client-only preview and post mutation authorization behavior stays intact. Tests contain no
secrets or privileged payloads.

## Testing Requirements and Gates

Run each owned regression suite and the adjacent existing target suite selected by the
implementer after the fresh audit:

```bash
for test_path in \
  tests/vitest/ui/task-105-08-08-pages-dead-paths.test.tsx \
  tests/vitest/ui/task-105-08-08-post-classic-dead-paths.test.tsx \
  tests/vitest/ui/task-105-08-08-post-richtext-toolbar-dead-paths.test.tsx; do
  export TMPDIR=/tmp
  set -a && . ./.env && set +a
  NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts "$test_path" || exit $?
done
./node_modules/.bin/eslint --max-warnings=0 \
  core/admin/ui/pages/PagePreview.tsx \
  core/admin/ui/pages/editor/PageEditorRegistryFields.tsx \
  core/admin/ui/pages/editor/PageEditorToolbar.tsx \
  core/admin/ui/pages/editorControls/ListItemsControl.tsx \
  core/admin/ui/pages/editorControls/SegmentedControl.tsx \
  core/admin/ui/posts/PostsListPage.tsx \
  core/admin/ui/posts/editor/PostClassicEditorShell.tsx \
  core/admin/ui/posts/editor/hooks/useFocusReturn.ts \
  core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx \
  tests/vitest/ui/task-105-08-08-*-dead-paths.test.tsx
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
git diff --check
wc -l \
  core/admin/ui/pages/PagePreview.tsx \
  core/admin/ui/pages/editor/PageEditorRegistryFields.tsx \
  core/admin/ui/pages/editor/PageEditorToolbar.tsx \
  core/admin/ui/pages/editorControls/ListItemsControl.tsx \
  core/admin/ui/pages/editorControls/SegmentedControl.tsx \
  core/admin/ui/posts/PostsListPage.tsx \
  core/admin/ui/posts/editor/PostClassicEditorShell.tsx \
  core/admin/ui/posts/editor/hooks/useFocusReturn.ts \
  core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx \
  tests/vitest/ui/task-105-08-08-*-dead-paths.test.tsx
```

Run a scoped V8 diagnostic for the regression suites. It proves that each retained adjacent
source is observed and supplies a line map for the removed/dead mapping where meaningful; it
does **not** require 100% whole-module coverage. L01/L02 own the post-repair combined
whole-module proof. If the source-owner audit leaves Registry untouched, omit it here and
record the audit receipt rather than manufacturing execution.

```bash
coverage_dir="$(mktemp -d /tmp/task105-08-08-l03-v8.XXXXXX)" || exit 1
[[ -d "$coverage_dir" && ! -L "$coverage_dir" ]] || exit 1
export TMPDIR=/tmp
set -a && . ./.env && set +a
NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts \
  --coverage --coverage.provider=v8 --coverage.reporter=json-summary \
  "--coverage.reportsDirectory=$coverage_dir" \
  --coverage.include=core/admin/ui/pages/PagePreview.tsx \
  --coverage.include=core/admin/ui/pages/editor/PageEditorToolbar.tsx \
  --coverage.include=core/admin/ui/pages/editorControls/ListItemsControl.tsx \
  --coverage.include=core/admin/ui/pages/editorControls/SegmentedControl.tsx \
  --coverage.include=core/admin/ui/posts/PostsListPage.tsx \
  --coverage.include=core/admin/ui/posts/editor/PostClassicEditorShell.tsx \
  --coverage.include=core/admin/ui/posts/editor/hooks/useFocusReturn.ts \
  --coverage.include=core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx
node - "$coverage_dir/coverage-summary.json" <<'NODE'
const fs = require("node:fs");
const summary = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const rows = Object.entries(summary)
  .filter(([key]) => key !== "total")
  .map(([key, value]) => ({ key, covered: value.lines.covered, total: value.lines.total }));
console.log(JSON.stringify({ rows }, null, 2));
if (rows.length === 0 || rows.some((row) => row.covered === 0)) process.exit(1);
NODE
```

## Closure Checklist

- [ ] The registry source-owner audit explicitly retains the fail-closed branch or an exact
  follow-up child owns its model change; no removability assumption remains.
- [ ] No classified dead path is exercised by a cast or private mock.
- [ ] Supported adjacent behavior is visibly regression-tested; scoped V8 is diagnostic only.
- [ ] Every production and test writer path is at most 1,000 physical lines.
