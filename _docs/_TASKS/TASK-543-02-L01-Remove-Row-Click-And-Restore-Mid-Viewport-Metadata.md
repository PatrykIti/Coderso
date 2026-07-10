# TASK-543-02-L01: Remove Row Click and Restore Mid-Viewport Metadata

# FileName: TASK-543-02-L01-Remove-Row-Click-And-Restore-Mid-Viewport-Metadata.md

**Parent Task:** TASK-543
**Parent Subtask:** TASK-543-02
**Priority:** Medium
**Category:** Posts Table / Accessibility
**Estimated Effort:** Small
**Dependencies:** TASK-543-02
**Status:** ⏳ To Do
**Changelog:** 1255 (pinned; create only at implementation closure)

---

## Scope

Make each row a passive table row and adjust responsive metadata visibility so author
and published/date remain available below the dedicated lg columns.

## Source and direct-test ownership

This leaf is the sole TASK-543 writer of:

- core/admin/ui/posts/PostsTable.tsx;
- tests/vitest/ui/posts-table-wave.test.tsx;
- tests/vitest/ui-integration/post-list-restyle.test.tsx;
- tests/vitest/ui-integration/post-editor-keyboard-a11y.test.tsx.

It must not edit editor/autosave source/tests, navigation helpers, docs, task indexes, or
changelog. Add the compatibility/changed-behavior assertions before the source gate;
TASK-543-03 may rerun but never edit/rebaseline these suites.

## Implementation Pseudocode

~~~tsx
<tr
  // remove onClick, keyboard simulation, role, tabIndex, and cursor-pointer
  className="existing visual row classes without synthetic-interactive styling"
>
  <td>
    selection checkbox remains its own control;
  </td>
  <td>
    <AdminLink href={canonical edit path} prefetch>{title}</AdminLink>

    <div className="metadata layout lg:hidden">
      <span className="md:hidden">{status once for narrow view}</span>
      <span>{author fallback}</span>
      <time dateTime={machine date}>{published/draft date fallback}</time>
    </div>
  </td>
  <td className="hidden md:table-cell">{status dedicated column}</td>
  <td className="hidden lg:table-cell">{author dedicated column}</td>
  <td className="hidden lg:table-cell">{published dedicated column}</td>
  <td>{action buttons/menu}</td>
</tr>
~~~

Use the existing formatters and no second link wrapping the row. Decorative separators
must be aria-hidden. Empty author/date fallback uses the existing bounded label, not an
empty interactive node.

## Interaction and compatibility

Pointer clicks on blank row space do nothing. Enter/Space act according to the focused
native link/button/checkbox only. Existing multi-select, actions menu, status display,
admin aliases, and prefetch behavior remain. Metadata is not duplicated to assistive
technology at any breakpoint because CSS visibility leaves one semantic copy active.

## Error behavior

This seam adds no asynchronous operation or new error surface. Missing optional author/
date metadata uses the existing bounded fallback text; it never creates an empty link,
throws during render, or restores synthetic row navigation.

## Direct regression-test shape

This leaf owns the test edits. Assert row has no click/role/tabIndex, title AdminLink has
correct href and keyboard activation, checkbox/action do not navigate, status/author/date
visibility classes produce exactly one copy for narrow/md/lg, and a browser at 768/900/
1024 px observes author/date as visible.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/ui/posts-table-wave.test.tsx \
  tests/vitest/ui-integration/post-list-restyle.test.tsx \
  tests/vitest/ui-integration/post-editor-keyboard-a11y.test.tsx
~~~

Re-run a named file alone before classifying it.

## Acceptance criteria

- Rows are semantically passive.
- Native controls have no nested/synthetic activation conflict.
- Author/date context is visible and accessible through md..lg.
