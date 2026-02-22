# TASK-059-01: Posts DB Schema and Migration Foundation
# FileName: TASK-059-01_Posts_DB_Schema_and_Migration_Foundation.md

**Priority:** High  
**Category:** Database  
**Estimated Effort:** Medium  
**Dependencies:** TASK-059  
**Status:** To Do

---

## Overview
Zaprojektowac i wdrozyc dedykowany schemat DB dla posts, tak aby storage posts byl calkowicie niezalezny od `content_entries`.

## Scope
1. Dodac nowe tabele:
   - `posts`,
   - `post_revisions`,
   - `post_preview_tokens`,
   - `post_term_assignments` (jesli tagi/kategorie maja zostac niezaleznie mapowane).
2. Dodac indeksy i constraints:
   - unikalny `slug`,
   - sort/filter po `status`, `updated_at`, `published_at`,
   - FK dla `author_id` i opcjonalnie `featured_media_id`.
3. Dodac Drizzle schema + migracje (`journal.json`, snapshot).
4. Zapewnic kompatybilne typy TS dla nowego modelu.

## Files to Create / Change
- `core/db/schema.ts`
- `core/db/migrations/00xx_posts_decoupled.sql`
- `core/db/migrations/meta/00xx_snapshot.json`
- `core/db/migrations/meta/_journal.json`
- `tests/unit/posts/schema.test.ts` (new)

## Pseudocode
```ts
createTable("posts", {
  id: uuidPk(),
  title: textNotNull(),
  slug: textUniqueNotNull(),
  status: textEnum(["draft", "published", "scheduled"]),
  excerpt: textNullable(),
  blockDocument: jsonbNotNullDefault(),
  metadata: jsonbNotNullDefault(),
  seo: jsonbNotNullDefault(),
  authorId: uuidFk("admin_users.id"),
  featuredMediaId: uuidFkNullable("media.id"),
  publishedAt: timestampNullable(),
  scheduledAt: timestampNullable(),
  createdAt: timestampNow(),
  updatedAt: timestampNow()
});

createTable("post_revisions", { ... });
createTable("post_preview_tokens", { ... });
createTable("post_term_assignments", { ...optional... });
```

## Acceptance Criteria
1. Migrations tworza nowe tabele i indeksy bez konfliktu z aktualnym schema.
2. Unikalnosc `posts.slug` jest egzekwowana przez DB.
3. Tabele revisions/preview wspieraja obecny workflow posts editora.
4. Testy schematu przechodza.

## Testing Requirements
- Unit:
  - constraints i relacje tabel posts.
- Integration (DB):
  - insert/update/delete lifecycle,
  - uniqueness i FK behavior.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (data model)
- `_docs/_TASKS/README.md`
