# TASK-543-02-L01: Remove Row Click and Restore Mid-Viewport Metadata

# FileName: TASK-543-02-L01-Remove-Row-Click-And-Restore-Mid-Viewport-Metadata.md

**Parent Task:** TASK-543
**Parent Subtask:** TASK-543-02
**Priority:** Medium
**Category:** Posts Table / Accessibility
**Estimated Effort:** Small
**Dependencies:** TASK-543-02
**Status:** ✅ Done
**Started:** 2026-07-13
**Completed:** 2026-07-13
**Changelog:** 1255

---

## Scope

Make each row a passive table row, give the real action-menu trigger a contextual
accessible name, and adjust responsive metadata visibility so author and published/date
remain available below the dedicated lg columns.

## Source and direct-test ownership

This leaf is the sole TASK-543 writer of:

- core/admin/ui/posts/PostsTable.tsx;
- core/admin/ui/pages/PageRowActions.tsx;
- tests/vitest/ui/posts-table-wave.test.tsx;
- tests/vitest/ui-integration/post-list-restyle.test.tsx;
- tests/vitest/ui/page-row-actions.test.tsx.

It must not edit editor/autosave source/tests, navigation helpers, docs, task indexes, or
changelog. `tests/vitest/ui/page-table-wave.test.tsx` is a read-only shared-consumer
no-regression gate, not an owned writer file. Add the compatibility/changed-behavior
assertions before the source gate; TASK-543-03 may rerun but never edit/rebaseline them.

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
  <td>
    <PageRowActions actionLabel={`Actions for ${title}`} ... />
  </td>
</tr>

type PageRowActionsProps = {
  // existing props
  actionLabel?: string;
};

<Button
  // preserve the native DropdownMenuTrigger/asChild contract
  aria-label={actionLabel ?? "Page actions"}
>
  <MoreHorizontal aria-hidden="true" ... />
</Button>
~~~

Use the existing formatters and no second link wrapping the row. Decorative separators
must be aria-hidden. Empty author/date fallback uses the existing bounded label, not an
empty interactive node.

## Interaction and compatibility

Pointer clicks on blank row space do nothing. Enter/Space act according to the focused
native link/button/checkbox only. Existing multi-select, actions menu, status display,
admin aliases, and prefetch behavior remain. Metadata is not duplicated to assistive
technology at any breakpoint because CSS visibility leaves one semantic copy active. The
shared PageTable consumer receives the bounded default action label; PostsTable supplies
the post-title context.

## Error behavior

This seam adds no asynchronous operation or new error surface. Missing optional author/
date metadata uses the existing bounded fallback text; it never creates an empty link,
throws during render, or restores synthetic row navigation.

## Direct regression-test shape

This leaf owns the three test edits. In Vitest assert the row has no click/role/tabIndex,
the title AdminLink resolves the canonical href with prefetch, checkbox/action callbacks
remain isolated, the real action trigger has its expected accessible name, and
status/author/date nodes carry the exact `md:hidden`, `lg:hidden`, `hidden md:table-cell`,
and `hidden lg:table-cell` representation. Do not claim native Enter activation,
computed display, geometry, or accessibility-tree parity from happy-dom/SSR. TASK-543-03
owns those real-browser assertions at 390/768/900/1024 px and proves exactly one visible
and accessible status/author/date representation for each breakpoint family.

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

Re-run a named file alone before classifying it.

## Acceptance criteria

- Rows are semantically passive.
- Native controls have no nested/synthetic activation conflict.
- The production action-menu trigger is named in both Posts and Pages consumers.
- Author/date context is visible and accessible through md..lg.

## Completion

Posts rows are passive, the title remains the canonical AdminLink, checkbox and action controls
retain native ownership, and the actions trigger has a contextual accessible name. Responsive
status/author/date copies passed the final four-file table matrix (19/19) and the live
390/768/900/1024 px smoke.
