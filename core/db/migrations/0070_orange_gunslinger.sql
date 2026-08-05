-- Intentionally owner-approved for recurring canonical smoke access-log lookups.
-- Do not remove as diagnostic-only without a measured replacement.
CREATE INDEX "access_logs_user_agent_idx" ON "access_logs" USING hash ("user_agent");
