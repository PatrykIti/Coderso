# TASK-105-08-08-L09: Entries Test Type Repair
# FileName: TASK-105-08-08-L09-entries-test-type-repair.md

**Parent Subtask:** TASK-105-08-08
**Priority:** High
**Category:** Test Integrity
**Estimated Effort:** Medium
**Dependencies:** Current root TypeScript diagnostic map; fresh child-contract audit
**Status:** ✅ Done (2026-09-02)

---

## Overview

Repair the inherited entries Vitest drafts so their DOM queries, fixtures, cache events, and
client mocks match current public contracts. This is L09 under TASK-105-08-08, not the
separate TASK-105-08-09 family. It owns nineteen root TypeScript diagnostics in seven exact
tests. It changes no source, route, schema, coverage configuration, task board, changelog,
or commit and does not claim an L08 coverage delta.

The invalid color field test has no supported public input: FieldType excludes color. Replace
that case with a supported richtext default-value case, preserving the valid non-number/
non-boolean default behavior. Do not retain an invalid union value through a cast. If the
product needs an unknown-field fallback contract, stop and author a source-contract child
rather than changing this test-only leaf.

Read each current diff before editing. These files include untracked drafts and inherited
modifications; never reset, clean, stage, commit, or erase concurrent work.

## Exact Single-Writer Scope

**Exclusive test writers:**

- tests/vitest/ui/entry-create-drawer-required-fields.test.tsx
- tests/vitest/ui/entry-editor-residual-wave.test.tsx
- tests/vitest/ui/entry-editor-shell-wave.test.tsx
- tests/vitest/ui/entry-list-residual-wave.test.tsx
- tests/vitest/ui/entry-metadata-panel.test.tsx
- tests/vitest/ui/entry-value-mapping-wave.test.ts
- tests/vitest/ui/use-entry-taxonomy-hooks-wave.test.tsx

**Read-only public type contracts:**

- core/admin/services/entriesClient.ts
- core/admin/services/taxonomyClient.ts
- core/admin/ui/content-types/SchemaBuilder.tsx
- core/admin/ui/entries/EntryCreateDrawer.tsx
- core/admin/ui/entries/EntryEditor.tsx
- core/admin/ui/entries/EntryList.tsx
- core/admin/ui/entries/EntryMetadataPanel.tsx
- core/admin/ui/entries/entryLinkedFields.ts
- core/admin/ui/entries/entryValueMapping.ts
- core/admin/ui/entries/useEntryRelationTargets.ts
- core/admin/ui/entries/useEntryTaxonomyTermCreate.ts
- core/admin/utils/cacheBus.ts

No production source, other test, shared fixture/helper, route, client implementation,
coverage configuration, task/board document, changelog, or commit is writable. A needed
source/shared-fixture repair is a stop condition requiring a separate direct child.

## Root TypeScript Diagnostic Map

| Sole writer | Current anchor | Required type-correct repair |
|---|---|---|
| entry-create-drawer-required-fields.test.tsx | 709,716 TS2339 | Make the slug-query helper return HTMLInputElement or null and narrow before reading value or setting it. |
| entry-editor-residual-wave.test.tsx | 765,804,844,893 TS2345 | Build complete EntryDetail and TaxonomyOverview factories and type getEntryCached/updateEntryMetadata mocks with their real options and EntryMetadataPayload signatures. |
| entry-editor-shell-wave.test.tsx | 758 TS2322 | Type the mutable editor fixture as EntryDetail or use an EntryStatus field so a supported published state remains assignable. |
| entry-list-residual-wave.test.tsx | 461 TS2322 | Return EntryListItem from the fixture factory so author is correctly nullable; preserve the no-author option behavior. |
| entry-metadata-panel.test.tsx | 914 TS2322 | Remove the stale helpCollapsed prop. Drive the component-owned What is this toggle and its localStorage lifecycle through public DOM interaction. |
| entry-value-mapping-wave.test.ts | 21,30,39,48,57,63 TS2345 | Use typed ContentField and EntryData helpers plus the complete linked columns record with title and slug. Replace the invalid color field at 63 with supported richtext behavior. |
| use-entry-taxonomy-hooks-wave.test.tsx | 79 TS2353; 264,439,444 TS2349 | Model a real CacheEvent and type the captured taxonomy updater as a TaxonomyOverview updater, using complete taxonomy/term fixtures without casts. |

## Implementation Pseudocode

~~~tsx
const columns: EntryLinkedColumnValues = { title: "", slug: "" };
const richtextField: ContentField = {
  id: "field-summary",
  name: "summary",
  type: "richtext",
  label: "Summary",
  required: false,
  defaultValue: "Default body",
};
expect(buildInitialValues([richtextField], {}, columns).summary).toBe("Default body");

const makeEntryDetail = (): EntryDetail => ({
  id: "entry-1",
  typeId: "type-1",
  title: "Hello",
  slug: "hello",
  status: "draft",
  visibility: "public",
  hasPassword: false,
  data: {},
  createdAt: "2026-06-18T10:00:00Z",
  updatedAt: "2026-06-27T10:00:00Z",
  author: { id: "author-1", name: "Alex Doe", email: "alex@example.test" },
});

let capturedUpdater: ((previous: TaxonomyOverview | null) => TaxonomyOverview | null) | null = null;
const event: CacheEvent = { key: cacheKeys.contentTypesList, action: "invalidate", sourceId: "test", ts: 1 };
~~~

1. Build typed local factories from EntryDetail, EntryListItem, EntryMetadataPayload,
   TaxonomyOverview, ContentTaxonomy, ContentTerm, ContentField, EntryData, and
   EntryLinkedColumnValues. Complete required fields instead of using broad Record shapes.
2. Keep the editor's stale-result, metadata-race, status-update, nullable-author, and
   taxonomy behavior assertions. Mock only public client/cache seams with actual callback
   parameters, including an optional getEntryCached force option and EntryMetadataPayload.
3. Preserve the help-panel behavioral test through the public button and persisted state;
   do not add a prop that EntryMetadataPanel no longer exposes.
4. Replace the invalid color case with the supported richtext default test described above.
   It proves the intended normal default branch without constructing an impossible schema.
5. Do not introduce any, as never, as unknown as, ts-ignore, ts-expect-error, an invalid
   union fixture, private callback invocation, or production fallback. Do not skip, delete,
   or weaken a test to make TypeScript pass.

## Security Contract

No endpoint, authentication, RBAC, CSRF, validation, schema allowlist, persistence, cache,
rate limit, or public-write anti-abuse behavior may change. Existing entry data/metadata and
taxonomy server validation remain authoritative. Fixtures must be synthetic and must not
contain credentials, real personal data, or plaintext access secrets.

## Testing Requirements and Gates

Run each owned suite independently:

~~~bash
if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
for test_path in tests/vitest/ui/entry-create-drawer-required-fields.test.tsx tests/vitest/ui/entry-editor-residual-wave.test.tsx tests/vitest/ui/entry-editor-shell-wave.test.tsx tests/vitest/ui/entry-list-residual-wave.test.tsx tests/vitest/ui/entry-metadata-panel.test.tsx tests/vitest/ui/entry-value-mapping-wave.test.ts tests/vitest/ui/use-entry-taxonomy-hooks-wave.test.tsx; do
  export TMPDIR=/tmp
  NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts "$test_path" || exit $?
done
~~~

Run scoped lint and static gates:

~~~bash
./node_modules/.bin/eslint --max-warnings=0 tests/vitest/ui/entry-create-drawer-required-fields.test.tsx tests/vitest/ui/entry-editor-residual-wave.test.tsx tests/vitest/ui/entry-editor-shell-wave.test.tsx tests/vitest/ui/entry-list-residual-wave.test.tsx tests/vitest/ui/entry-metadata-panel.test.tsx tests/vitest/ui/entry-value-mapping-wave.test.ts tests/vitest/ui/use-entry-taxonomy-hooks-wave.test.tsx
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
git diff --check
~~~

Run root TypeScript only as an attribution gate. Record the entire log; unrelated paths are
external baseline evidence, while any listed writer path remaining in the output fails this
leaf. Do not call a nonzero global root status a clean compile.

~~~bash
tsc_log="$(mktemp /tmp/task-105-08-08-l09-tsc.XXXXXX.log)" || exit 1
if ./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false >"$tsc_log" 2>&1; then tsc_exit=0; else tsc_exit=$?; fi
cat "$tsc_log"
printf "root tsc exit: %s\n" "$tsc_exit"
if rg -n '^(tests/vitest/ui/(entry-create-drawer-required-fields|entry-editor-residual-wave|entry-editor-shell-wave|entry-list-residual-wave|entry-metadata-panel|entry-value-mapping-wave|use-entry-taxonomy-hooks-wave)\.test\.(ts|tsx))\(' "$tsc_log"; then exit 1; fi
~~~

## 1000-Line Rule

Enforce the hard per-file line-count gate:

~~~bash
for test_path in tests/vitest/ui/entry-create-drawer-required-fields.test.tsx tests/vitest/ui/entry-editor-residual-wave.test.tsx tests/vitest/ui/entry-editor-shell-wave.test.tsx tests/vitest/ui/entry-list-residual-wave.test.tsx tests/vitest/ui/entry-metadata-panel.test.tsx tests/vitest/ui/entry-value-mapping-wave.test.ts tests/vitest/ui/use-entry-taxonomy-hooks-wave.test.tsx; do
  line_count="$(wc -l < "$test_path")"
  printf "%s %s\n" "$line_count" "$test_path"
  test "$line_count" -le 1000 || exit 1
done
~~~

entry-metadata-panel.test.tsx is currently 978 lines, entry-editor-residual-wave.test.tsx
is 978, and entry-editor-shell-wave.test.tsx is 896. If any named writer would exceed
1,000 physical lines, split a cohesive responsibility through a new exact-owner contract
before adding work.

## Closure Checklist

- [ ] Only the seven named test files changed.
- [ ] All nineteen owned root-TypeScript anchors are absent from the attribution log.
- [ ] The former invalid color case is a supported richtext default-value behavior.
- [ ] Existing entries behavior assertions remain meaningful and public-contract based.
- [ ] No source, coverage, or security contract was claimed or changed.
- [ ] Every named writer remains at or below 1,000 physical lines.

## Closure (2026-09-02)

Closed on tree evidence (commit 85b4c725 "test(task-105): close 08-03 content types and entries residuals"): all seven owned entry suites are committed (entry-create-drawer-required-fields, entry-editor-residual-wave, entry-editor-shell-wave, entry-list-residual-wave, entry-metadata-panel, entry-value-mapping-wave, use-entry-taxonomy-hooks-wave), each at or under 1,000 lines and green in the canonical run.
Attribution gate re-run 2026-09-02: root tsc -p tsconfig.json --noEmit exits 0 with zero diagnostics, so this leaf's owned anchors are absent from the log.
No coverage delta is claimed: remaining entry lines stay in the 08-08 entries/themes/booking attribution in TASK-105-08-12 (3 files / 5 lines).
Canonical artifact: TASK-105-08-12 Closure Evidence (2026-09-01) — 99.26% lines, 291 uncovered / 87 files, canonical run 1186 files / 10444 tests / 0 failures.
