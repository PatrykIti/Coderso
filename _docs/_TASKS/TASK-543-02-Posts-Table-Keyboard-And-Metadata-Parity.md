# TASK-543-02: Posts Table Keyboard and Metadata Parity

# FileName: TASK-543-02-Posts-Table-Keyboard-And-Metadata-Parity.md

**Parent Task:** TASK-543
**Priority:** Medium
**Category:** Posts List / Accessibility / Responsive UI
**Estimated Effort:** Small
**Dependencies:** TASK-543-01
**Status:** ⏳ To Do
**Changelog:** 1255 (pinned; create only at implementation closure)

---

## Scope

Remove synthetic navigation from the table row and retain the title AdminLink as the
single semantic navigation target. Restore author/date context through the md..lg range
without duplicating status or accessible names.

## Grounded anchors

- core/admin/ui/posts/PostsTable.tsx:104-108 puts onClick/cursor behavior on tr.
- PostsTable.tsx:85-87 shows Status at md and Author/Published only at lg.
- PostsTable.tsx:133-139 hides all fallback metadata at md, leaving author/date absent.

## Leaf

TASK-543-02-L01 is the sole PostsTable.tsx writer and owns the three directly affected
PostsTable/list/keyboard suites. Those tests land with the source. TASK-543-03-L01 reruns
them read-only and owns smoke/docs/closure.

## Accessibility invariants

- tr has no click handler, button/link role, tabIndex, key handler, or pointer cursor.
- Title AdminLink is keyboard/pointer navigation and retains canonical admin path helpers.
- Checkbox and action buttons execute only their own operations.
- Mid-width author/published context is visibly and semantically present once.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/ui/posts-table-wave.test.tsx \
  tests/vitest/ui-integration/post-list-restyle.test.tsx \
  tests/vitest/ui-integration/post-editor-keyboard-a11y.test.tsx
~~~
