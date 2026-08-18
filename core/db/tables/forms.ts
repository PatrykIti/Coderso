/**
 * Forms: definitions, fields, post-submit actions, received submissions and the
 * per-action execution log used for retries.
 *
 * Re-exported verbatim by `core/db/schema.ts`; import from there, not from here.
 */

import { desc, sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  uniqueIndex,
  index,
  check,
  bigint,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "./identity";

export const forms = pgTable(
  "forms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("draft"),
    description: text("description"),
    successMessage: text("success_message"),
    successRedirectUrl: text("success_redirect_url"),
    submissionAccess: text("submission_access").notNull().default("public"),
    settings: jsonb("settings").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex("forms_slug_idx").on(t.slug),
    statusIdx: index("forms_status_idx").on(t.status),
    updatedIdx: index("forms_updated_idx").on(t.updatedAt),
  })
);

export const formFields = pgTable(
  "form_fields",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    label: text("label").notNull(),
    name: text("name").notNull(),
    required: boolean("required").notNull().default(false),
    settings: jsonb("settings").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    formIdx: index("form_fields_form_idx").on(t.formId),
    orderIdx: index("form_fields_order_idx").on(t.formId, t.orderIndex),
    nameIdx: uniqueIndex("form_fields_name_idx").on(t.formId, t.name),
  })
);

export const formActions = pgTable(
  "form_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    label: text("label").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    continueOnError: boolean("continue_on_error").notNull().default(true),
    condition: jsonb("condition").notNull(),
    config: jsonb("config").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    formIdx: index("form_actions_form_idx").on(t.formId),
    orderIdx: index("form_actions_order_idx").on(t.formId, t.orderIndex),
  })
);

export const formSubmissions = pgTable(
  "form_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "restrict" }),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("new"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    formIdx: index("form_submissions_form_idx").on(t.formId),
    createdIdx: index("form_submissions_created_idx").on(t.createdAt),
    statusIdx: index("form_submissions_status_idx").on(t.status),
    // TASK-571: keyset-cursor serving index for the bounded export scan
    // (`ORDER BY created_at DESC, id DESC` with the `id` tiebreaker). Equality
    // (form_id) first, then the DESC range/sort columns, finished with the
    // stable cursor tiebreaker (id) — the traversal order the export cursor
    // contract requires.
    exportCursorIdx: index("form_submissions_export_cursor_idx").on(
      t.formId,
      desc(t.createdAt),
      desc(t.id)
    ),
  })
);

/**
 * TASK-571: async form-submissions export jobs.
 *
 * One row per export request. The submission payloads themselves never live
 * here — only status/rowCount/bytes plus a HMAC of the short-lived download
 * token (never the raw token) and the artifact key. Rows and artifact files
 * are pruned by the export scheduler's retention pass (see
 * `core/server/jobs/submissionExportScheduler.ts`).
 */
export const submissionExportJobs = pgTable(
  "submission_export_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    format: text("format").notNull(),
    status: text("status").notNull(),
    rowCount: integer("row_count"),
    bytes: bigint("bytes", { mode: "number" }),
    artifactKey: text("artifact_key"),
    tokenHash: text("token_hash"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    errorCode: text("error_code"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    formatCheck: check("submission_export_jobs_format_check", sql`${t.format} in ('csv', 'json')`),
    statusCheck: check(
      "submission_export_jobs_status_check",
      sql`${t.status} in ('queued', 'running', 'done', 'failed')`
    ),
    // Bounded list of a form's jobs (TASK-571): `(form_id, status)` plus
    // `created_at` for the bounded list/retention scans.
    formStatusIdx: index("submission_export_jobs_form_status_idx").on(t.formId, t.status),
    createdIdx: index("submission_export_jobs_created_idx").on(t.createdAt),
  })
);

export const formActionRuns = pgTable(
  "form_action_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "restrict" }),
    submissionId: uuid("submission_id").references(() => formSubmissions.id, {
      onDelete: "set null",
    }),
    actionId: uuid("action_id").references(() => formActions.id, {
      onDelete: "set null",
    }),
    actionType: text("action_type").notNull(),
    actionLabel: text("action_label").notNull(),
    status: text("status").notNull(),
    attempt: integer("attempt").notNull().default(1),
    trigger: text("trigger").notNull().default("submission"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    requestPayload: jsonb("request_payload"),
    responsePayload: jsonb("response_payload"),
    actionCondition: jsonb("action_condition").notNull(),
    actionConfig: jsonb("action_config").notNull(),
    submissionPayload: jsonb("submission_payload").notNull(),
    retryOfId: uuid("retry_of_id").references((): AnyPgColumn => formActionRuns.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    formIdx: index("form_action_runs_form_idx").on(t.formId),
    submissionIdx: index("form_action_runs_submission_idx").on(t.submissionId),
    actionIdx: index("form_action_runs_action_idx").on(t.actionId),
    statusIdx: index("form_action_runs_status_idx").on(t.status),
    createdIdx: index("form_action_runs_created_idx").on(t.createdAt),
  })
);
