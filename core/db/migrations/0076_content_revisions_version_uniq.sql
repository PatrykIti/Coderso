CREATE UNIQUE INDEX "content_revisions_entry_version_idx" ON "content_revisions" USING btree ("entry_id","version");
