# TASK-105-08-06-L01: Commerce Test Type Repair
# FileName: TASK-105-08-06-L01-commerce-test-type-repair.md

**Parent Subtask:** TASK-105-08-06
**Priority:** High
**Category:** Test Integrity
**Estimated Effort:** Medium
**Dependencies:** Current root TypeScript diagnostic map; fresh child-contract audit
**Status:** ✅ Done (2026-09-02)

---

## Overview

Repair the inherited commerce Vitest drafts so their fixtures, fetch seams, DOM queries, and
mock callbacks match the current public commerce types. This is test-only work: it fixes
the fifteen root TypeScript diagnostics listed below while preserving every supported
commerce interaction already asserted. It does not reopen TASK-105-08-06's five
source-proven unreachable coverage records and must not claim a coverage delta.

Read the current diff for each writer file before editing. Several files are untracked
drafts and commerce-list-page-wave.test.tsx is an inherited modification; adopt current
work without reset, clean, stage, commit, or unrelated rewrite.

## Exact Single-Writer Scope

**Exclusive test writers:**

- tests/vitest/ui/commerce-bulk-actions-bar.test.tsx
- tests/vitest/ui/commerce-collections-page.test.tsx
- tests/vitest/ui/commerce-components.test.tsx
- tests/vitest/ui/commerce-editor-page.test.tsx
- tests/vitest/ui/commerce-editor-sections.test.tsx
- tests/vitest/ui/commerce-list-page-wave.test.tsx
- tests/vitest/ui/use-commerce-catalog.test.tsx

**Read-only public type contracts:**

- core/admin/services/commerceClient.ts
- core/admin/ui/commerce/CommerceBulkActionsBar.tsx
- core/admin/ui/commerce/CommerceCollectionsPage.tsx
- core/admin/ui/commerce/CommerceEditorPage.tsx
- core/admin/ui/commerce/CommerceListPage.tsx
- core/admin/ui/commerce/CommerceTable.tsx
- core/admin/ui/commerce/components/CommerceEditorSections.tsx
- core/admin/ui/commerce/hooks/useCommerceCatalog.ts

No production source, route, client implementation, shared fixture, test outside this list,
coverage configuration, task/board document, changelog, or commit is writable. If a
correct repair needs one, stop and author a new exact-owner contract. Do not use a broad
directory grant to absorb another commerce test.

## Root TypeScript Diagnostic Map

| Sole writer | Current anchor | Required type-correct repair |
|---|---|---|
| commerce-bulk-actions-bar.test.tsx | 107 TS2345 | Normalize an optional found option to Element or null before the click helper, and type the selected value with the exported commerce bulk-action union rather than a cast. |
| commerce-collections-page.test.tsx | 181 TS2349; 204,314 TS2322 | Type deferred Response resolvers so they remain callable after unmount, and preserve the actual fetch body type instead of narrowing BodyInit or null to string. |
| commerce-components.test.tsx | 435 TS2345; 501 TS2739 | Normalize a missing combobox to null before selection and supply every required CommerceTable action callback while preserving the invalid-date rendering assertion. |
| commerce-editor-page.test.tsx | 129,234 TS2322; 808,844,880 TS2349 | Preserve BodyInit in captured fetch calls and type each late Response resolver as a callable deferred seam rather than optional never. |
| commerce-editor-sections.test.tsx | 413 TS2345 | Narrow the queried node to HTMLInputElement or HTMLTextAreaElement before dispatching a typed input change. |
| commerce-list-page-wave.test.tsx | 213 TS2345 | Give the mocked bulk bar the real union that includes draft; do not remove the supported Move to draft interaction or invent a narrower local union. |
| use-commerce-catalog.test.tsx | 36,38 TS2554 | Make the cached product and collection mocks accept the actual optional force options forwarded by useCommerceCatalog. |

## Implementation Pseudocode

~~~ts
type DeferredResponse = {
  promise: Promise<Response>;
  resolve: (response: Response) => void;
};

const fetchCalls: Array<{ url: string; method?: string; body?: BodyInit | null }> = [];
const selectedOption = options.find(matchesLabel) ?? null;
click(selectedOption);

const cachedProducts = vi.fn<(options?: { force?: boolean }) => Promise<CommerceProductRecord[]>>();
const action: CommerceBulkActionValue = "draft";
renderCommerceTable({ onEdit, onPublish, onMoveToDraft, onArchive, onDelete });
~~~

1. Replace each error-producing loose mock, cast, or stale callback type with the corresponding
   exported service/component type or a local typed helper.
2. Keep every current interaction meaningful: late fetches still prove unmount safety, list
   actions still prove the supported union values, and table/component cases still assert
   visible text or emitted public payloads.
3. Do not remove, skip, rename, or weaken a case merely to make TypeScript pass. Do not replace
   a DOM assertion with only a mock-call assertion where the UI exposes a visible result.
4. Do not introduce any, as never, as unknown as, ts-ignore, ts-expect-error, invalid union
   fixture, private helper mock, or production fallback. Replace existing error-causing casts
   in the named files with valid public values and typed helpers.

## Security Contract

This leaf changes no API or production behavior. Existing internal-admin session, RBAC, CSRF,
server validation, cache, rate-limit, and public-write protections remain authoritative.
Mocks must use only public client seams, must contain no secrets or privileged settings, and
must not bypass authorization or fabricate an unsupported request shape.

## Testing Requirements and Gates

Run each owned suite independently:

~~~bash
if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
for test_path in tests/vitest/ui/commerce-bulk-actions-bar.test.tsx tests/vitest/ui/commerce-collections-page.test.tsx tests/vitest/ui/commerce-components.test.tsx tests/vitest/ui/commerce-editor-page.test.tsx tests/vitest/ui/commerce-editor-sections.test.tsx tests/vitest/ui/commerce-list-page-wave.test.tsx tests/vitest/ui/use-commerce-catalog.test.tsx; do
  export TMPDIR=/tmp
  NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts "$test_path" || exit $?
done
~~~

Run scoped lint and static gates:

~~~bash
./node_modules/.bin/eslint --max-warnings=0 tests/vitest/ui/commerce-bulk-actions-bar.test.tsx tests/vitest/ui/commerce-collections-page.test.tsx tests/vitest/ui/commerce-components.test.tsx tests/vitest/ui/commerce-editor-page.test.tsx tests/vitest/ui/commerce-editor-sections.test.tsx tests/vitest/ui/commerce-list-page-wave.test.tsx tests/vitest/ui/use-commerce-catalog.test.tsx
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
git diff --check
~~~

Run root TypeScript only as an attribution gate. Record the full log and fail this leaf if
any current diagnostic starts in an owned file; unrelated diagnostics are external baseline
evidence, not permission to modify their owner or to claim a clean root compile.

~~~bash
tsc_log="$(mktemp /tmp/task-105-08-06-l01-tsc.XXXXXX.log)" || exit 1
if ./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false >"$tsc_log" 2>&1; then tsc_exit=0; else tsc_exit=$?; fi
cat "$tsc_log"
printf "root tsc exit: %s\n" "$tsc_exit"
if rg -n '^(tests/vitest/ui/(commerce-bulk-actions-bar|commerce-collections-page|commerce-components|commerce-editor-page|commerce-editor-sections|commerce-list-page-wave|use-commerce-catalog)\.test\.tsx)\(' "$tsc_log"; then exit 1; fi
~~~

## 1000-Line Rule

Enforce the hard per-file gate, not a combined total:

~~~bash
for test_path in tests/vitest/ui/commerce-bulk-actions-bar.test.tsx tests/vitest/ui/commerce-collections-page.test.tsx tests/vitest/ui/commerce-components.test.tsx tests/vitest/ui/commerce-editor-page.test.tsx tests/vitest/ui/commerce-editor-sections.test.tsx tests/vitest/ui/commerce-list-page-wave.test.tsx tests/vitest/ui/use-commerce-catalog.test.tsx; do
  line_count="$(wc -l < "$test_path")"
  printf "%s %s\n" "$line_count" "$test_path"
  test "$line_count" -le 1000 || exit 1
done
~~~

commerce-editor-page.test.tsx is currently 906 lines. If any named writer would exceed
1,000 physical lines, split its cohesive test responsibility through a new exact-owner
contract before adding more work.

## Closure Checklist

- [ ] Only the seven named test files changed.
- [ ] All fifteen owned root-TypeScript anchors are absent from the attribution log.
- [ ] Existing supported commerce assertions remain behaviorally meaningful.
- [ ] No coverage, source, or security contract was claimed or changed.
- [ ] Every named writer remains at or below 1,000 physical lines.

## Closure (2026-09-02)

Closed on tree evidence (commit 25921215 "test(task-105): close 08-06 commerce media and search coverage"): all seven owned commerce suites are committed and pass independently; every writer stays at or under 1,000 lines.
Attribution gate re-run 2026-09-02: tsc -p tsconfig.json --noEmit exits 0 with zero diagnostics, so all fifteen owned anchors are absent from the log; bun --cwd core lint exits 0.
No coverage delta is claimed: the five source-proven unreachable commerce records remain dispositioned in TASK-105-08-12 (08-06 cluster: 3 files / 5 lines).
Canonical artifact: TASK-105-08-12 Closure Evidence (2026-09-01) — 99.26% lines, 291 uncovered / 87 files, canonical run 1186 files / 10444 tests / 0 failures.
