CREATE TABLE "commerce_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_product_collections" (
	"product_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commerce_product_collections_product_id_collection_id_pk" PRIMARY KEY("product_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "commerce_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"excerpt" text,
	"description" text,
	"pricing" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"stock" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"media_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "commerce_product_collections" ADD CONSTRAINT "commerce_product_collections_product_id_commerce_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."commerce_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_product_collections" ADD CONSTRAINT "commerce_product_collections_collection_id_commerce_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."commerce_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_collections_slug_idx" ON "commerce_collections" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "commerce_collections_name_idx" ON "commerce_collections" USING btree ("name");--> statement-breakpoint
CREATE INDEX "commerce_collections_updated_at_idx" ON "commerce_collections" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "commerce_product_collections_product_idx" ON "commerce_product_collections" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "commerce_product_collections_collection_idx" ON "commerce_product_collections" USING btree ("collection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_products_slug_idx" ON "commerce_products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "commerce_products_status_idx" ON "commerce_products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "commerce_products_updated_at_idx" ON "commerce_products" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "commerce_products_published_at_idx" ON "commerce_products" USING btree ("published_at");