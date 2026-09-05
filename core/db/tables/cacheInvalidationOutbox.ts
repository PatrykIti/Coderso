/**
 * The durable cache-invalidation outbox (TASK-551-05-L01).
 *
 * One row per invalidation event, claimed and completed by the TASK-551-08
 * runtime. The table is the contract between the writers that enqueue here and
 * the outbox services that drain it: the event key is unique and byte-bounded,
 * the tag array is bounded, and the claim/processed state machine is enforced
 * by `cache_invalidation_outbox_state_chk` so no row can ever be both claimed
 * and processed, or claimed without an expiry, or processed with a live claim.
 *
 * Re-exported verbatim by `core/db/schema.ts`; import from there, not from here.
 */

import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const cacheInvalidationOutbox = pgTable(
  "cache_invalidation_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventKey: text("event_key").notNull(),
    tags: jsonb("tags").$type<string[]>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    availableAt: timestamp("available_at").defaultNow().notNull(),
    attempts: integer("attempts").default(0).notNull(),
    claimToken: text("claim_token"),
    claimUntil: timestamp("claim_until"),
    processedAt: timestamp("processed_at"),
    lastErrorCode: text("last_error_code"),
  },
  (t) => [
    uniqueIndex("cache_invalidation_outbox_event_key_idx").on(t.eventKey),
    // Ready-unclaimed work, oldest first. This is the ONLY index the claim
    // scan needs: `claim_token IS NULL` keeps claimed rows out of it.
    index("cache_invalidation_outbox_pending_idx")
      .on(t.availableAt, t.id)
      .where(sql`processed_at IS NULL AND claim_token IS NULL`),
    // Expired claims, oldest expiry first, for the reclaimer.
    index("cache_invalidation_outbox_expired_claim_idx")
      .on(t.claimUntil, t.id)
      .where(sql`processed_at IS NULL AND claim_token IS NOT NULL`),
    // Completed rows, oldest first, for pruning.
    index("cache_invalidation_outbox_processed_idx")
      .on(t.processedAt, t.id)
      .where(sql`processed_at IS NOT NULL`),
    // The bounded health/recovery index over EVERY unprocessed row. It must
    // see ready, backed-off, live-claimed and expired-claimed rows alike: the
    // health statement `WHERE processed_at IS NULL ORDER BY created_at, id
    // LIMIT 1` has to return an older claimed or backed-off row rather than
    // report healthy while work is outstanding. Adding an availability or
    // claim predicate here is a correctness failure.
    index("cache_outbox_unprocessed_age_idx")
      .on(t.createdAt, t.id)
      .where(sql`processed_at IS NULL`),
    check("cache_invalidation_outbox_attempts_chk", sql`${t.attempts} >= 0`),
    check(
      "cache_invalidation_outbox_tags_chk",
      sql`jsonb_typeof(${t.tags}) = 'array' AND jsonb_array_length(${t.tags}) BETWEEN 1 AND 32`
    ),
    check(
      "cache_invalidation_outbox_event_key_bytes_chk",
      sql`octet_length(${t.eventKey}) BETWEEN 1 AND 128`
    ),
    check(
      "cache_invalidation_outbox_state_chk",
      // Exactly one of: unclaimed-unprocessed, claimed-unprocessed,
      // processed-unclaimed.
      sql`(${t.processedAt} IS NULL AND ${t.claimToken} IS NULL AND ${t.claimUntil} IS NULL) OR (${t.processedAt} IS NULL AND ${t.claimToken} IS NOT NULL AND ${t.claimUntil} IS NOT NULL) OR (${t.processedAt} IS NOT NULL AND ${t.claimToken} IS NULL AND ${t.claimUntil} IS NULL)`
    ),
  ]
);
