CREATE TABLE "ip_allowlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cidr" text NOT NULL,
	"label" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ip_allowlist_cidr_unique" UNIQUE("cidr")
);
--> statement-breakpoint
CREATE INDEX "ip_allowlist_created_at_idx" ON "ip_allowlist" USING btree ("created_at");