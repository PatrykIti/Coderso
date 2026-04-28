ALTER TABLE "sessions" ADD COLUMN "csrf_token_hash" text;
--> statement-breakpoint
CREATE INDEX "sessions_csrf_token_hash_idx" ON "sessions" USING btree ("csrf_token_hash");
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "password_resets_token_hash_idx" ON "password_resets" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "password_resets_expires_at_idx" ON "password_resets" USING btree ("expires_at");
