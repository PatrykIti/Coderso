# TASK-055-04: Posts Widget/Template Binding and Query Controls
# FileName: TASK-055-04_Posts_Widget_Template_Binding_and_Query_Controls.md

**Priority:** High  
**Category:** CMS/Widgets + Runtime  
**Estimated Effort:** Medium  
**Dependencies:** TASK-055-01, TASK-055-03  
**Status:** To Do

---

## Goal
Allow pages/templates to render posts via widgets with explicit query controls.

## Files to Change
- `core/widgets/core/contentList.tsx`
- `core/widgets/core/entryTeaser.tsx`
- `core/services/content/contentListResolver.ts`
- `core/server/publicSite.tsx`
- `core/admin/ui/widgets/editors/*` (for query controls)

## Query Controls (Widget UI)
- Source preset: `Posts`.
- Filters: categories, tags, author.
- Sorting: newest, oldest, most viewed (if metric available).
- Limit and pagination mode.

## Pseudocode
```ts
resolveContentList({ source: "posts", filters, sort, limit }) {
  const postType = await getContentTypeBySlug("post");
  return listEntries({
    typeId: postType.id,
    status: "published",
    filters,
    sort,
    limit,
  });
}
```

```tsx
<Select value={query.source} onValueChange={setSource}>
  <SelectItem value="posts">Posts</SelectItem>
  <SelectItem value="contentType">Custom content type</SelectItem>
</Select>
```

## Acceptance Criteria
1. Widget can query posts without manual content-type setup.
2. Editors expose user-friendly query controls.
3. Runtime output respects publish status and filters.
