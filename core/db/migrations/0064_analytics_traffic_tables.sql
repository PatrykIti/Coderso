CREATE TABLE "analytics_pageviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"path" text NOT NULL,
	"referrer_host" text,
	"source_kind" text NOT NULL,
	"device_class" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_hash" text NOT NULL,
	"source_kind" text NOT NULL,
	"referrer_host" text,
	"device_class" text NOT NULL,
	"lang" text,
	"entry_path" text NOT NULL,
	"exit_path" text,
	"pageview_count" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_pageviews" ADD CONSTRAINT "analytics_pageviews_session_id_analytics_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."analytics_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_pageviews_created_at_idx" ON "analytics_pageviews" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "analytics_pageviews_path_idx" ON "analytics_pageviews" USING btree ("path");--> statement-breakpoint
CREATE INDEX "analytics_pageviews_session_idx" ON "analytics_pageviews" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "analytics_sessions_started_at_idx" ON "analytics_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "analytics_sessions_visitor_idx" ON "analytics_sessions" USING btree ("visitor_hash");