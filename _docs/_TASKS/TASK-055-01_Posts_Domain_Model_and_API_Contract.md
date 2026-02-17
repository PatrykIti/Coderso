# TASK-055-01: Posts Domain Model and API Contract
# FileName: TASK-055-01_Posts_Domain_Model_and_API_Contract.md

**Priority:** High  
**Category:** CMS/Content + API  
**Estimated Effort:** Medium  
**Dependencies:** TASK-055  
**Status:** To Do

---

## Goal
Create a dedicated `Posts` contract on top of existing content engine, without duplicating tables.

## Approach
- Reserve content type slug: `post`.
- `Posts` service wraps generic content entries with post-specific defaults and validation.
- Add admin API aliases for cleaner UI integration.

## Files to Change
- `core/services/content/contentTypesService.ts`
- `core/services/content/contentEntriesService.ts`
- `core/services/content/postsService.ts` (new)
- `core/server/routes/contentEntryRoutes.ts`
- `core/server/routes/postsRoutes.ts` (new)
- `core/server/routes/index.ts`
- `core/server/validation/postSchemas.ts` (new)

## API Contract (admin/internal)
- `GET /admin/api/posts`
- `POST /admin/api/posts`
- `GET /admin/api/posts/:id`
- `PATCH /admin/api/posts/:id`
- `DELETE /admin/api/posts/:id`

All routes map to entries where `type.slug = "post"`.

## Pseudocode
```ts
async function ensurePostType() {
  const type = await getContentTypeBySlug("post");
  if (type) return type;
  return createContentType({
    name: "Post",
    slug: "post",
    schema: defaultPostSchema,
  });
}

async function listPosts(params) {
  const postType = await ensurePostType();
  return listEntries({ typeId: postType.id, ...params });
}
```

## Acceptance Criteria
1. No new `posts` table is required.
2. API returns only `post` entries for posts endpoints.
3. Missing `post` type is auto-created safely once.
