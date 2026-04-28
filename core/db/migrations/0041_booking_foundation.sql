CREATE TABLE "booking_blackouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" text DEFAULT 'staff' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_service_resources" (
	"service_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "booking_service_resources_service_id_resource_id_pk" PRIMARY KEY("service_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "booking_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"buffer_before_minutes" integer DEFAULT 0 NOT NULL,
	"buffer_after_minutes" integer DEFAULT 0 NOT NULL,
	"price_cents" integer,
	"currency" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"form_submission_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text,
	"notes" text,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_blackouts" ADD CONSTRAINT "booking_blackouts_resource_id_booking_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."booking_resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_schedules" ADD CONSTRAINT "booking_schedules_resource_id_booking_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."booking_resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_service_resources" ADD CONSTRAINT "booking_service_resources_service_id_booking_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."booking_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_service_resources" ADD CONSTRAINT "booking_service_resources_resource_id_booking_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."booking_resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_booking_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."booking_services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_resource_id_booking_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."booking_resources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_form_submission_id_form_submissions_id_fk" FOREIGN KEY ("form_submission_id") REFERENCES "public"."form_submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_blackouts_resource_time_idx" ON "booking_blackouts" USING btree ("resource_id","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "booking_blackouts_starts_idx" ON "booking_blackouts" USING btree ("starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_resources_slug_idx" ON "booking_resources" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "booking_resources_type_idx" ON "booking_resources" USING btree ("type");--> statement-breakpoint
CREATE INDEX "booking_resources_status_idx" ON "booking_resources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "booking_resources_updated_at_idx" ON "booking_resources" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "booking_schedules_resource_day_idx" ON "booking_schedules" USING btree ("resource_id","day_of_week");--> statement-breakpoint
CREATE INDEX "booking_schedules_resource_time_idx" ON "booking_schedules" USING btree ("resource_id","start_minute","end_minute");--> statement-breakpoint
CREATE INDEX "booking_service_resources_service_idx" ON "booking_service_resources" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "booking_service_resources_resource_idx" ON "booking_service_resources" USING btree ("resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_services_slug_idx" ON "booking_services" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "booking_services_status_idx" ON "booking_services" USING btree ("status");--> statement-breakpoint
CREATE INDEX "booking_services_updated_at_idx" ON "booking_services" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "bookings_service_idx" ON "bookings" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "bookings_resource_idx" ON "bookings" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_starts_idx" ON "bookings" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "bookings_resource_window_idx" ON "bookings" USING btree ("resource_id","starts_at","ends_at");