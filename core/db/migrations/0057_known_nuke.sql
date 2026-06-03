ALTER TABLE "access_logs" ADD COLUMN "session_id" uuid;--> statement-breakpoint
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_logs_session_id_idx" ON "access_logs" USING btree ("session_id");