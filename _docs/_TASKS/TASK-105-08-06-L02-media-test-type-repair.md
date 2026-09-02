# TASK-105-08-06-L02: Media Test Type Repair
# FileName: TASK-105-08-06-L02-media-test-type-repair.md

**Parent Subtask:** TASK-105-08-06
**Priority:** High
**Category:** Test Integrity
**Estimated Effort:** Medium
**Dependencies:** Current root TypeScript diagnostic map; fresh child-contract audit
**Status:** ✅ Done (2026-09-02)

---

## Overview

Repair the inherited media Vitest drafts so their fixtures and interaction helpers follow
the current public media contracts. This test-only leaf resolves the seventeen root
TypeScript diagnostics listed below without changing source, routes, coverage configuration,
or the L06 five-unreachable coverage disposition. Each retained test must still prove the
same visible media behavior through a valid public input.

Read the current diff before adopting every named test file. Most are untracked drafts;
never reset, clean, stage, commit, or rewrite another stream's work.

## Exact Single-Writer Scope

**Exclusive test writers:**

- tests/vitest/ui/media-details-drawer-edges.test.tsx
- tests/vitest/ui/media-folder-rail-edges.test.tsx
- tests/vitest/ui/media-library-page-actions.test.tsx
- tests/vitest/ui/media-library-page-gaps.test.tsx
- tests/vitest/ui/media-picker-edges.test.tsx
- tests/vitest/ui/upload-dropzone.test.tsx

**Read-only public type contracts:**

- core/admin/services/mediaClient.ts
- core/admin/services/mediaFoldersClient.ts
- core/admin/ui/media/MediaFolderRail.tsx
- core/admin/ui/media/MediaLibraryPage.tsx
- core/admin/ui/media/MediaPicker.tsx
- core/admin/ui/media/UploadDropzone.tsx
- core/admin/ui/media/types.ts
- core/admin/ui/media/utils.ts

No production source, shared mediaLibraryTestUtils helper, other test, route, client,
coverage configuration, task/board document, changelog, or commit is writable. A need to
change any read-only path is a stop condition requiring a new exact-owner contract.

## Root TypeScript Diagnostic Map

| Sole writer | Current anchor | Required type-correct repair |
|---|---|---|
| media-details-drawer-edges.test.tsx | 31 TS2304 | Import the current MediaFolder type from the public media type boundary for the drawer fixture. |
| media-folder-rail-edges.test.tsx | 114 TS2353; 263 TS2322; 313 TS2352 and TS2493; 378 TS2322 | Separate FolderOperation from FolderOperationTarget: load has no formGeneration, rename operation has id, rename feedback target has folderId, reorder calls are typed, and retry accepts an error token and returns FolderRetryResult or null. |
| media-library-page-actions.test.tsx | 44 TS2322; 562,567 TS2345 | Normalize optional button queries to HTMLElement or null before helpers, preserving the copy success and failure visible assertions. |
| media-library-page-gaps.test.tsx | 40 TS2322; 304 TS2352; 466,612 TS2322 | Use valid MediaRecord fixtures: a document, audio, or video display kind is represented by type file plus its MIME type, never by an unsupported record type or cast. |
| media-picker-edges.test.tsx | 117,126 TS2322 | Use type file with audio/mpeg and video/mp4 MIME values; media UI display kinds remain derived from MIME through the existing public utils contract. |
| upload-dropzone.test.tsx | 35,37 TS2783 | Replace the duplicate-property fake and double cast with a real happy-dom DataTransfer: add File objects to transfer.items and pass transfer.files to the input/drop event. |

## Implementation Pseudocode

~~~tsx
const documentRecord: MediaRecord = {
  ...baseRecord,
  type: "file",
  mimeType: "application/pdf",
};
const videoRecord: MediaRecord = {
  ...baseRecord,
  type: "file",
  mimeType: "video/mp4",
};

const retry: FolderOperation = {
  kind: "rename",
  id: "folder-1",
  name: "Brand",
  formGeneration: 1,
};
const target: FolderOperationTarget = {
  kind: "rename",
  folderId: "folder-1",
  name: "Brand",
  formGeneration: 1,
};

const transfer = new DataTransfer();
transfer.items.add(new File(["content"], "upload.txt", { type: "text/plain" }));
const fileList = transfer.files;
~~~

1. Import and use the actual MediaFolder, MediaRecord, FolderOperation, FolderOperationTarget,
   FolderOperationFeedback, and FolderRetryResult shapes. Do not collapse their distinct
   rename identifiers or add fields to the load target.
2. Preserve document/audio/video UI assertions by supplying valid transport records. The
   read-only resolveAdminMediaKind and toMediaItem path maps file MIME types to the visible
   document/audio/video kinds; source MediaRecord remains image or file only.
3. Use actual DOM nullability and typed mock callback signatures instead of casts. Assert
   the existing visible grid, drawer, retry, reorder, copy, and upload outcomes.
4. Do not introduce any, as never, as unknown as, ts-ignore, ts-expect-error, invalid union
   data, private helper mock, or production fallback. Do not turn a behavior assertion into
   only a mock-count assertion.

## Security Contract

No endpoint, authentication, RBAC, CSRF, cache, storage, validation, persistence, rate
limit, or public-write anti-abuse behavior may change. The tests use existing public client
seams and non-sensitive synthetic media only. They must not bypass media authorization,
weaken file-trust validation, or introduce privileged credentials/settings.

## Testing Requirements and Gates

Run each owned suite independently:

~~~bash
if [[ -f .env ]]; then set -a; . ./.env; set +a; fi
for test_path in tests/vitest/ui/media-details-drawer-edges.test.tsx tests/vitest/ui/media-folder-rail-edges.test.tsx tests/vitest/ui/media-library-page-actions.test.tsx tests/vitest/ui/media-library-page-gaps.test.tsx tests/vitest/ui/media-picker-edges.test.tsx tests/vitest/ui/upload-dropzone.test.tsx; do
  export TMPDIR=/tmp
  NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts "$test_path" || exit $?
done
~~~

Run scoped lint and static gates:

~~~bash
./node_modules/.bin/eslint --max-warnings=0 tests/vitest/ui/media-details-drawer-edges.test.tsx tests/vitest/ui/media-folder-rail-edges.test.tsx tests/vitest/ui/media-library-page-actions.test.tsx tests/vitest/ui/media-library-page-gaps.test.tsx tests/vitest/ui/media-picker-edges.test.tsx tests/vitest/ui/upload-dropzone.test.tsx
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
git diff --check
~~~

Run root TypeScript only as an attribution gate. Record its whole log and fail if an owned
path appears; non-owned diagnostics remain external baseline evidence and are not a reason
to edit their owner or claim a clean root compile.

~~~bash
tsc_log="$(mktemp /tmp/task-105-08-06-l02-tsc.XXXXXX.log)" || exit 1
if ./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false >"$tsc_log" 2>&1; then tsc_exit=0; else tsc_exit=$?; fi
cat "$tsc_log"
printf "root tsc exit: %s\n" "$tsc_exit"
if rg -n '^(tests/vitest/ui/(media-details-drawer-edges|media-folder-rail-edges|media-library-page-actions|media-library-page-gaps|media-picker-edges|upload-dropzone)\.test\.tsx)\(' "$tsc_log"; then exit 1; fi
~~~

## 1000-Line Rule

Enforce the hard per-file line-count gate:

~~~bash
for test_path in tests/vitest/ui/media-details-drawer-edges.test.tsx tests/vitest/ui/media-folder-rail-edges.test.tsx tests/vitest/ui/media-library-page-actions.test.tsx tests/vitest/ui/media-library-page-gaps.test.tsx tests/vitest/ui/media-picker-edges.test.tsx tests/vitest/ui/upload-dropzone.test.tsx; do
  line_count="$(wc -l < "$test_path")"
  printf "%s %s\n" "$line_count" "$test_path"
  test "$line_count" -le 1000 || exit 1
done
~~~

media-library-page-actions.test.tsx is currently 906 lines. If a named writer would exceed
1,000 physical lines, split a cohesive media test responsibility through a new exact-owner
contract before adding more cases.

## Closure Checklist

- [ ] Only the six named test files changed.
- [ ] All seventeen owned root-TypeScript anchors are absent from the attribution log.
- [ ] Document/audio/video behavior uses valid file-plus-MIME fixtures.
- [ ] No source, coverage, or security contract was claimed or changed.
- [ ] Every named writer remains at or below 1,000 physical lines.

## Closure (2026-09-02)

Closed on tree evidence (commit 25921215 "test(task-105): close 08-06 commerce media and search coverage"): all six owned media suites are committed and pass independently; every writer stays at or under 1,000 lines.
Attribution gate re-run 2026-09-02: tsc -p tsconfig.json --noEmit exits 0 with zero diagnostics, so all seventeen owned anchors are absent from the log; document/audio/video assertions ride valid file-plus-MIME fixtures.
No coverage delta is claimed: the L06 five-unreachable media disposition stands in TASK-105-08-12 (08-06 cluster: 3 files / 5 lines).
Canonical artifact: TASK-105-08-12 Closure Evidence (2026-09-01) — 99.26% lines, 291 uncovered / 87 files, canonical run 1186 files / 10444 tests / 0 failures.
