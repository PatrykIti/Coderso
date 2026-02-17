# TASK-055-05: Posts Public Routes and Rendering
# FileName: TASK-055-05_Posts_Public_Routes_and_Rendering.md

**Priority:** High  
**Category:** Runtime/Site + Templates  
**Estimated Effort:** Medium  
**Dependencies:** TASK-055-04  
**Status:** To Do

---

## Goal
Define and implement public runtime rendering for post list/detail with template controls.

## Files to Change
- `core/server/publicSite.tsx`
- `core/services/site/runtimeResolver.ts`
- `core/services/settings/siteSettings.ts`
- `core/server/routes/settingsRoutes.ts`
- `_docs/SITE_RUNTIME.md` (if exists) or `_docs/ARCHITECTURE.md`

## Route Contract (example)
- List route: `/blog`
- Detail route: `/blog/:slug`
- Preview route supports unpublished posts in admin preview context.

## Template Contract
- `postsIndexTemplate`: template key for list route.
- `postDetailTemplate`: template key for detail route.
- Fallback behavior if template missing is documented and deterministic.

## Pseudocode
```ts
if (pathname === blogBasePath) {
  const posts = await listPublishedPosts({ page, limit });
  return renderTemplate(settings.postsIndexTemplate, { posts });
}

if (pathname.startsWith(`${blogBasePath}/`)) {
  const slug = extractSlug(pathname);
  const post = await getPublishedPostBySlug(slug, { previewToken });
  if (!post) return notFound();
  return renderTemplate(settings.postDetailTemplate, { post });
}
```

## Acceptance Criteria
1. Published posts are available on list/detail routes.
2. Preview can render draft post by explicit preview context.
3. Template fallback strategy is stable and documented.
