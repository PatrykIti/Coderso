/**
 * The booking reservation exclusion constraint descriptor (TASK-551-05-L01).
 *
 * Pure, Bun-free, driver-free: this file owns bytes, nothing else.
 *
 * The installed Drizzle pg-core DSL cannot represent a PostgreSQL GiST
 * exclusion constraint, so this frozen descriptor is the schema-side source of
 * truth for the ONE explicitly custom migration fragment in the TASK-551-05
 * migration. The transactional migration appends `extensionSql` followed by
 * `addSql` exactly once inside its transaction; `dropSql` exists only so the
 * pre-traffic reverse path (and the tests that pin it) can name the exact
 * reverse bytes — no generated artifact may ever contain it.
 *
 * This is the sole documented snapshot exception. Drizzle's snapshot has no
 * (and may not be given a fake) representation of this object; live-catalog
 * parity is proven by `pg_constraint.contype = 'x'`, the exact name, table,
 * predicate, GiST access method, equality/overlap operators and the
 * `btree_gist` extension, and a fresh generation/drift pass must emit neither a
 * second add nor a `.dropSql`.
 *
 * The predicate blocks exactly the two states where a resource is physically
 * committed to a customer window — `pending` and `confirmed`. The five current
 * booking status literals stay `pending|confirmed|cancelled|completed|no_show`;
 * nothing new is invented and cancelled/completed/no_show rows never block a
 * window.
 */
export const BOOKING_RESERVATION_EXCLUSION_SQL = Object.freeze({
  table: "bookings",
  extensionSql: "CREATE EXTENSION IF NOT EXISTS btree_gist",
  name: "bookings_active_resource_window_excl",
  predicate: "status IN ('pending', 'confirmed')",
  definition:
    "EXCLUDE USING gist (resource_id WITH =, tsrange(starts_at, ends_at, '[)') WITH &&) WHERE (status IN ('pending', 'confirmed'))",
  addSql:
    "ALTER TABLE bookings ADD CONSTRAINT bookings_active_resource_window_excl EXCLUDE USING gist (resource_id WITH =, tsrange(starts_at, ends_at, '[)') WITH &&) WHERE (status IN ('pending', 'confirmed'))",
  dropSql: "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_active_resource_window_excl",
} as const);

export type BookingReservationExclusionDescriptor = Readonly<
  typeof BOOKING_RESERVATION_EXCLUSION_SQL
>;
