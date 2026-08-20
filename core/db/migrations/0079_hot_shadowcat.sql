CREATE TABLE "seo_indexed_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"coverage_state" text,
	"indexing_state" text,
	"verdict" text,
	"robots_state" text,
	"google_canonical" text,
	"user_canonical" text,
	"last_crawled_at" timestamp,
	"last_fetched_at" timestamp,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_search_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"date" timestamp NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"ctr" numeric,
	"position" numeric,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_search_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"query" text NOT NULL,
	"date" timestamp NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"ctr" numeric,
	"position" numeric,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_sitemap_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sitemap_url" text NOT NULL,
	"source" text DEFAULT 'google' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"is_pending" boolean DEFAULT true NOT NULL,
	"url_count" integer,
	"warnings" integer DEFAULT 0 NOT NULL,
	"errors" integer DEFAULT 0 NOT NULL,
	"last_submitted_at" timestamp,
	"last_downloaded_at" timestamp,
	"last_error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "seo_indexed_pages_url_idx" ON "seo_indexed_pages" USING btree ("url");--> statement-breakpoint
CREATE INDEX "seo_indexed_pages_target_idx" ON "seo_indexed_pages" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "seo_indexed_pages_state_idx" ON "seo_indexed_pages" USING btree ("indexing_state");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_search_metrics_url_date_idx" ON "seo_search_metrics" USING btree ("url","date");--> statement-breakpoint
CREATE INDEX "seo_search_metrics_date_idx" ON "seo_search_metrics" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_search_queries_url_query_date_idx" ON "seo_search_queries" USING btree ("url","query","date");--> statement-breakpoint
CREATE INDEX "seo_search_queries_query_idx" ON "seo_search_queries" USING btree ("query");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_sitemap_submissions_source_url_idx" ON "seo_sitemap_submissions" USING btree ("source","sitemap_url");