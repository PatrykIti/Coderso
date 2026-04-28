CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pages_search_idx"
ON "pages"
USING GIN (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("slug", '')));
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "content_entries_search_idx"
ON "content_entries"
USING GIN (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("slug", '')));
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "media_search_idx"
ON "media"
USING GIN (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("alt", '') || ' ' || coalesce("caption", '')));
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pages_title_trgm_idx"
ON "pages"
USING GIN ("title" gin_trgm_ops);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pages_slug_trgm_idx"
ON "pages"
USING GIN ("slug" gin_trgm_ops);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "content_entries_title_trgm_idx"
ON "content_entries"
USING GIN ("title" gin_trgm_ops);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "content_entries_slug_trgm_idx"
ON "content_entries"
USING GIN ("slug" gin_trgm_ops);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "media_title_trgm_idx"
ON "media"
USING GIN ("title" gin_trgm_ops);
