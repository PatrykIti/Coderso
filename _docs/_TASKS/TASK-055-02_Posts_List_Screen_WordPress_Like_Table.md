# TASK-055-02: Posts List Screen (WordPress-Like Table)
# FileName: TASK-055-02_Posts_List_Screen_WordPress_Like_Table.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-055-01  
**Status:** To Do

---

## Goal
Add a dedicated posts table view with fast editorial actions, following the Pages list interaction model.

## Files to Change
- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/posts/PostsListPage.tsx` (new)
- `core/admin/services/postsClient.ts` (new)
- `core/admin/ui/components/data-table/*`
- `core/admin/ui/components/row-actions/*`

## UX Requirements
- Columns: Title, Status, Author, Categories/Tags, Updated, Published At.
- Row title is clickable and opens post editor.
- Row actions menu: Edit, Preview, Duplicate, Delete.
- Filters: status, author, search, taxonomy.
- Bulk actions: publish, unpublish, delete.

## Pseudocode
```tsx
const { data, loading } = usePostsList({ search, status, authorId, taxonomy });

<DataTable
  rows={data}
  columns={[
    { key: "title", render: (row) => <Link to={`/admin/coderso/posts/${row.id}`}>{row.title}</Link> },
    { key: "status" },
    { key: "author" },
    { key: "updatedAt" },
  ]}
  rowActions={(row) => ["Edit", "Preview", "Duplicate", "Delete"]}
/>
```

## Acceptance Criteria
1. List interactions match Pages table UX standards.
2. Title click opens editor directly (without three-dot menu).
3. Preview action opens runtime preview for the selected post.
