CREATE TABLE "content_taxonomies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taxonomy_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_term_assignments" (
	"entry_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "content_term_assignments_pk" PRIMARY KEY("entry_id","term_id")
);
--> statement-breakpoint
ALTER TABLE "content_taxonomies" ADD CONSTRAINT "content_taxonomies_type_id_content_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."content_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_terms" ADD CONSTRAINT "content_terms_taxonomy_id_content_taxonomies_id_fk" FOREIGN KEY ("taxonomy_id") REFERENCES "public"."content_taxonomies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_term_assignments" ADD CONSTRAINT "content_term_assignments_entry_id_content_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."content_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_term_assignments" ADD CONSTRAINT "content_term_assignments_term_id_content_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."content_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_taxonomies_type_id_idx" ON "content_taxonomies" USING btree ("type_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "content_taxonomies_type_kind_idx" ON "content_taxonomies" USING btree ("type_id","kind");
--> statement-breakpoint
CREATE UNIQUE INDEX "content_taxonomies_type_slug_idx" ON "content_taxonomies" USING btree ("type_id","slug");
--> statement-breakpoint
CREATE INDEX "content_terms_taxonomy_id_idx" ON "content_terms" USING btree ("taxonomy_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "content_terms_taxonomy_slug_idx" ON "content_terms" USING btree ("taxonomy_id","slug");
--> statement-breakpoint
CREATE INDEX "content_term_assignments_entry_id_idx" ON "content_term_assignments" USING btree ("entry_id");
--> statement-breakpoint
CREATE INDEX "content_term_assignments_term_id_idx" ON "content_term_assignments" USING btree ("term_id");
