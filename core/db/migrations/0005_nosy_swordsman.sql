CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_id" uuid NOT NULL,
	"label" text NOT NULL,
	"href" text,
	"page_id" uuid,
	"order_index" integer DEFAULT 0 NOT NULL,
	"parent_id" uuid
);
--> statement-breakpoint
CREATE TABLE "menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_parent_id_menu_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "menu_items_menu_id_idx" ON "menu_items" USING btree ("menu_id");--> statement-breakpoint
CREATE INDEX "menu_items_parent_id_idx" ON "menu_items" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "menu_items_order_idx" ON "menu_items" USING btree ("menu_id","parent_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "menus_name_idx" ON "menus" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "menus_location_idx" ON "menus" USING btree ("location");