// Executable proof that the phase-8 bootstrap CAS predicate list can actually be DISPATCHED.
//
// The bootstrap CAS restore is the last statement of the whole smoke, and for as long as it existed
// it could never run: four of its ten `WHERE` predicates bound a JavaScript value that postgres.js
// cannot serialise in an untyped raw-`sql` parameter position (a jsonb object and three Dates), so
// the child died in the driver's Bind step, the restore never reached Postgres, and phase 8 could
// only report the resulting baseline drift. The self-test that was supposed to guard those
// predicates pinned them as literal SOURCE TOKENS and never executed the statement, so a green
// executor self-test was fully compatible with an UPDATE that could not be dispatched. That is the
// hole this module closes: it compiles the production predicate builder through drizzle's own
// dialect and inspects the BOUND PARAMETERS, which is the only assertion class that could have
// caught the defect.
//
// It is deliberately offline - no database, no network, no child process. The whole check is a pure
// SQL compilation, so it costs milliseconds and cannot flake on the slow shared test database.
import { and, sql } from "drizzle-orm";
import { PgDialect, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { deepFreezeExact, invariant } from "../foundation.mjs";

// A stand-in for core/db/schema.ts `users`, so the self-test never has to load TypeScript into the
// node parent. Only the COLUMN NAMES reach the compiled SQL - the types are declared to mirror the
// real schema and are asserted through the quoted references below. The real column set stays
// pinned by the baseline-read bridge, which fails closed on any change to the ten own keys of the
// bootstrap row.
const CAS_PREDICATE_USERS = pgTable("users", {
  id: uuid("id"),
  email: text("email"),
  emailHash: text("email_hash"),
  emailEncrypted: jsonb("email_encrypted"),
  passwordHash: text("password_hash"),
  name: text("name"),
  status: text("status"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  lastLoginAt: timestamp("last_login_at"),
});

const CAS_PREDICATE_COLUMN_REFERENCES = deepFreezeExact([
  '"users"."id"',
  '"users"."email"',
  '"users"."email_hash"',
  '"users"."email_encrypted"',
  '"users"."password_hash"',
  '"users"."name"',
  '"users"."status"',
  '"users"."created_at"',
  '"users"."updated_at"',
  '"users"."last_login_at"',
]);

// Shaped exactly like a real `bootstrap-restore-input-v1`: every timestamp is a round-trip-exact
// millisecond ISO string (the bridge input guard rejects anything else), `emailEncrypted` is the
// jsonb envelope the application stores, and `lastLoginAt` is NON-NULL so the historical
// `timestamp(...)` bind really does produce a Date the way it does in a real run.
const CAS_BIND_FIXTURE = deepFreezeExact({
  baseline: {
    rawUserRow: {
      createdAt: "2026-01-27T21:27:22.169Z",
      email: "0f9a1c7b2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f708192a3b4c5d6e7f809a1b2c3",
      emailEncrypted: { cipherText: "wf540-cipher-text", iv: "wf540-iv", tag: "wf540-tag", v: 1 },
      emailHash: "0f9a1c7b2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f708192a3b4c5d6e7f809a1b2c3",
      id: "54000000-0000-4000-8000-000000007801",
      lastLoginAt: "2026-07-26T21:34:14.942Z",
      name: "TASK-540 bootstrap admin",
      passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$wf540$wf540",
      status: "active",
      updatedAt: "2026-07-26T21:34:14.942Z",
    },
  },
  newestOwnedPair: {
    lastLoginAt: "2026-07-26T22:04:51.108Z",
    updatedAt: "2026-07-26T22:04:51.108Z",
  },
  userId: "54000000-0000-4000-8000-000000007801",
});

// The bind contract: ten predicates, every bound parameter a string or NULL, and every comparison
// explicitly typed - one uuid, five text, one jsonb and three millisecond-truncated timestamps.
const CAS_BIND_CONTRACT = deepFreezeExact({
  bindSafe: true,
  jsonbCasts: 1,
  millisecondTruncations: 3,
  paramCount: 10,
  textCasts: 5,
  timestampCasts: 3,
  uuidCasts: 1,
});
const CAS_BIND_CONTRACT_KEYS = deepFreezeExact(Object.keys(CAS_BIND_CONTRACT).sort());

function compileCasPredicates(predicates) {
  invariant(
    Array.isArray(predicates) && predicates.length > 0,
    "bootstrap CAS predicate list is absent"
  );
  return new PgDialect().sqlToQuery(and(...predicates));
}

function casBindShape(query) {
  const countToken = (token) => query.sql.split(token).length - 1;
  return deepFreezeExact({
    bindSafe: query.params.every((param) => param === null || typeof param === "string"),
    jsonbCasts: countToken("::jsonb"),
    millisecondTruncations: countToken("date_trunc('milliseconds',"),
    paramCount: query.params.length,
    textCasts: countToken("::text"),
    timestampCasts: countToken("::timestamp"),
    uuidCasts: countToken("::uuid"),
  });
}

const validatesCasBindShape = (shape) =>
  CAS_BIND_CONTRACT_KEYS.length === 7 &&
  CAS_BIND_CONTRACT_KEYS.every((key) => shape[key] === CAS_BIND_CONTRACT[key]);

// Every mutant below is a form that shipped or nearly shipped. The first four are the exact binds
// that broke the run; the next three drop a type cast the driver needs; the last four break the
// predicate count. All of them must be rejected by the bind contract.
function casBindMutants(productionPredicates) {
  const rawNotDistinct = (column, value) => sql`${column} IS NOT DISTINCT FROM ${value}`;
  const legacyTimestamp = (value) => (value === null ? null : new Date(value));
  const untruncatedTimestamp = (column, iso) =>
    sql`${column} IS NOT DISTINCT FROM ${iso}::timestamp`;
  const stringifiedWithoutJsonbCast = (column, value) =>
    sql`${column} IS NOT DISTINCT FROM ${JSON.stringify(value)}`;
  const { rawUserRow } = CAS_BIND_FIXTURE.baseline;
  const { newestOwnedPair, userId } = CAS_BIND_FIXTURE;
  const replacing = (replacements) => {
    const predicates = [...productionPredicates];
    for (const [index, predicate] of replacements) predicates[index] = predicate;
    return predicates;
  };
  return deepFreezeExact([
    {
      label: "bootstrap CAS jsonb object bound as a raw parameter",
      predicates: replacing([
        [3, rawNotDistinct(CAS_PREDICATE_USERS.emailEncrypted, rawUserRow.emailEncrypted)],
      ]),
    },
    {
      label: "bootstrap CAS created at bound as a raw Date",
      predicates: replacing([
        [7, rawNotDistinct(CAS_PREDICATE_USERS.createdAt, new Date(rawUserRow.createdAt))],
      ]),
    },
    {
      label: "bootstrap CAS updated at bound as a raw Date",
      predicates: replacing([
        [8, rawNotDistinct(CAS_PREDICATE_USERS.updatedAt, new Date(newestOwnedPair.updatedAt))],
      ]),
    },
    {
      label: "bootstrap CAS last login bound through the nullable Date helper",
      predicates: replacing([
        [
          9,
          rawNotDistinct(
            CAS_PREDICATE_USERS.lastLoginAt,
            legacyTimestamp(newestOwnedPair.lastLoginAt)
          ),
        ],
      ]),
    },
    {
      label: "bootstrap CAS created at millisecond truncation removed",
      predicates: replacing([
        [7, untruncatedTimestamp(CAS_PREDICATE_USERS.createdAt, rawUserRow.createdAt)],
      ]),
    },
    {
      label: "bootstrap CAS every millisecond truncation removed",
      predicates: replacing([
        [7, untruncatedTimestamp(CAS_PREDICATE_USERS.createdAt, rawUserRow.createdAt)],
        [8, untruncatedTimestamp(CAS_PREDICATE_USERS.updatedAt, newestOwnedPair.updatedAt)],
        [9, untruncatedTimestamp(CAS_PREDICATE_USERS.lastLoginAt, newestOwnedPair.lastLoginAt)],
      ]),
    },
    {
      label: "bootstrap CAS jsonb cast removed",
      predicates: replacing([
        [
          3,
          stringifiedWithoutJsonbCast(
            CAS_PREDICATE_USERS.emailEncrypted,
            rawUserRow.emailEncrypted
          ),
        ],
      ]),
    },
    {
      label: "bootstrap CAS uuid cast removed",
      predicates: replacing([[0, rawNotDistinct(CAS_PREDICATE_USERS.id, userId)]]),
    },
    {
      label: "bootstrap CAS text cast removed",
      predicates: replacing([[1, rawNotDistinct(CAS_PREDICATE_USERS.email, rawUserRow.email)]]),
    },
    {
      label: "bootstrap CAS predicate deleted",
      predicates: productionPredicates.filter((_, index) => index !== 5),
    },
    {
      label: "bootstrap CAS predicate duplicated",
      predicates: [...productionPredicates, productionPredicates[5]],
    },
  ]);
}

export function runBootstrapCasBindFormsSelfTest({
  BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE,
  assertNegative,
  bootstrapCasPredicates,
}) {
  invariant(
    typeof bootstrapCasPredicates === "function" &&
      bootstrapCasPredicates.length === 3 &&
      typeof assertNegative === "function" &&
      typeof BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE === "string",
    "bootstrap CAS bind form self-test dependencies are absent"
  );
  // Without this the module could pass while the child ran something else entirely: the text the
  // bridge dispatches must be the text compiled below, once.
  invariant(
    BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.includes(bootstrapCasPredicates.toString()) &&
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.split("const predicates = (").length - 1 === 1 &&
      BOOTSTRAP_CAS_RESTORE_BRIDGE_SOURCE.split("(sql,users,input);").length - 1 === 1,
    "bootstrap CAS predicate builder is not the dispatched predicate source"
  );
  const { rawUserRow } = CAS_BIND_FIXTURE.baseline;
  invariant(
    rawUserRow.lastLoginAt !== null &&
      CAS_BIND_FIXTURE.newestOwnedPair.lastLoginAt !== null &&
      typeof rawUserRow.emailEncrypted === "object" &&
      rawUserRow.emailEncrypted !== null &&
      [
        rawUserRow.createdAt,
        rawUserRow.lastLoginAt,
        rawUserRow.updatedAt,
        CAS_BIND_FIXTURE.newestOwnedPair.lastLoginAt,
        CAS_BIND_FIXTURE.newestOwnedPair.updatedAt,
      ].every((value) => new Date(value).toISOString() === value),
    "bootstrap CAS bind fixture does not match the bridge input contract"
  );

  const productionPredicates = bootstrapCasPredicates(sql, CAS_PREDICATE_USERS, CAS_BIND_FIXTURE);
  const productionQuery = compileCasPredicates(productionPredicates);
  invariant(
    validatesCasBindShape(casBindShape(productionQuery)),
    "bootstrap CAS predicate bind form drift"
  );
  invariant(
    CAS_PREDICATE_COLUMN_REFERENCES.every(
      (reference) => productionQuery.sql.split(reference).length - 1 === 1
    ) && CAS_PREDICATE_COLUMN_REFERENCES.length === 10,
    "bootstrap CAS predicate column reference drift"
  );

  for (const { label, predicates } of casBindMutants(productionPredicates)) {
    assertNegative(!validatesCasBindShape(casBindShape(compileCasPredicates(predicates))), label);
  }
}
