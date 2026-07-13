# TASK-543-02: Posts Table Keyboard and Metadata Parity

# FileName: TASK-543-02-Posts-Table-Keyboard-And-Metadata-Parity.md

**Parent Task:** TASK-543
**Priority:** Medium
**Category:** Posts List / Accessibility / Responsive UI
**Estimated Effort:** Small
**Dependencies:** TASK-543-01
**Status:** ✅ Done
**Started:** 2026-07-13
**Completed:** 2026-07-13
**Changelog:** 1255

---

## Scope

Remove synthetic navigation from the table row and retain the title AdminLink as the
single semantic navigation target. Restore author/date context through the md..lg range
without duplicating status or accessible names. Give the real shared row-actions trigger
an accessible name; a mocked trigger must not hide that production defect.

## Grounded anchors at task start

- core/admin/ui/posts/PostsTable.tsx:104-108 puts onClick/cursor behavior on tr.
- PostsTable.tsx:85-87 shows Status at md and Author/Published only at lg.
- PostsTable.tsx:133-139 hides all fallback metadata at md, leaving author/date absent.
- core/admin/ui/pages/PageRowActions.tsx:38-44 renders an icon-only trigger without an
  accessible name.

## Leaf

TASK-543-02-L01 is the sole PostsTable.tsx/PageRowActions.tsx writer and owns the three
directly affected PostsTable/list/action suites. Those tests land with the source. The
existing PageTable suite is a read-only no-regression gate. TASK-543-03-L01 reruns them
read-only and owns browser smoke/docs/closure.

## Accessibility invariants

- tr has no click handler, button/link role, tabIndex, key handler, or pointer cursor.
- Title AdminLink is keyboard/pointer navigation and retains canonical admin path helpers.
- Checkbox and action buttons execute only their own operations.
- The icon-only action trigger has a stable, contextual accessible name; its icon is
  decorative.
- Mid-width author/published context is visibly and semantically present once.
- Vitest pins DOM structure, breakpoint classes, href/prefetch, and isolated callbacks.
  Native keyboard activation, computed visibility/geometry, and accessibility-tree
  evidence belong to the live browser smoke at 390/768/900/1024 px.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/ui/posts-table-wave.test.tsx \
  tests/vitest/ui-integration/post-list-restyle.test.tsx \
  tests/vitest/ui/page-row-actions.test.tsx \
  tests/vitest/ui/page-table-wave.test.tsx
~~~

## Completion

The list now exposes native, independently named controls without a synthetic row activation.
Author and date remain available through the mid-width range, with breakpoint structure and
interaction coverage passing 19/19 and real-browser verification at all four required widths.
