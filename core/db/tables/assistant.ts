/**
 * The admin assistant: its indexed documentation corpus (docs, chunks, ingest
 * runs) and the execution/undo ledger for actions it performs.
 *
 * Re-exported verbatim by `core/db/schema.ts`; import from there, not from here.
 */

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
} from "drizzle-orm/pg-core";
import { users } from "./identity";

export const assistantDocs = pgTable(
  "assistant_docs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourcePath: text("source_path").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    audience: text("audience").notNull(),
    productArea: text("product_area").notNull(),
    language: text("language").notNull().default("pl"),
    keywordsJson: jsonb("keywords_json").notNull().default([]),
    checksum: text("checksum").notNull(),
    sourceUpdatedAt: timestamp("source_updated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    sourcePathIdx: uniqueIndex("assistant_docs_source_path_idx").on(t.sourcePath),
    slugIdx: index("assistant_docs_slug_idx").on(t.slug),
    areaIdx: index("assistant_docs_product_area_idx").on(t.productArea),
    languageIdx: index("assistant_docs_language_idx").on(t.language),
  })
);

export const assistantDocChunks = pgTable(
  "assistant_doc_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    docId: uuid("doc_id")
      .notNull()
      .references(() => assistantDocs.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    headingPath: jsonb("heading_path").notNull().default([]),
    heading: text("heading").notNull(),
    lineStart: integer("line_start").notNull(),
    lineEnd: integer("line_end").notNull(),
    content: text("content").notNull(),
    normalizedText: text("normalized_text").notNull(),
    tokenCount: integer("token_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    docIdx: index("assistant_doc_chunks_doc_id_idx").on(t.docId),
    headingIdx: index("assistant_doc_chunks_heading_idx").on(t.heading),
    lineIdx: index("assistant_doc_chunks_line_idx").on(t.lineStart, t.lineEnd),
    chunkUniqueIdx: uniqueIndex("assistant_doc_chunks_doc_chunk_idx").on(t.docId, t.chunkIndex),
  })
);

export const assistantDocIngestRuns = pgTable(
  "assistant_doc_ingest_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    triggeredByUserId: uuid("triggered_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sourceRoot: text("source_root").notNull(),
    status: text("status").notNull().default("success"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
    filesScanned: integer("files_scanned").notNull().default(0),
    docsUpserted: integer("docs_upserted").notNull().default(0),
    chunksUpserted: integer("chunks_upserted").notNull().default(0),
    errorsCount: integer("errors_count").notNull().default(0),
    errorsJson: jsonb("errors_json").notNull().default([]),
  },
  (t) => ({
    startedIdx: index("assistant_doc_ingest_runs_started_at_idx").on(t.startedAt),
    statusIdx: index("assistant_doc_ingest_runs_status_idx").on(t.status),
    actorIdx: index("assistant_doc_ingest_runs_actor_idx").on(t.triggeredByUserId),
  })
);

export const assistantActionExecutions = pgTable(
  "assistant_action_executions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    idempotencyKey: text("idempotency_key").notNull(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    planId: text("plan_id").notNull(),
    planHash: text("plan_hash").notNull(),
    result: jsonb("result").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    keyIdx: uniqueIndex("assistant_action_executions_key_idx").on(t.idempotencyKey),
    actorIdx: index("assistant_action_executions_actor_idx").on(t.actorId),
    planIdx: index("assistant_action_executions_plan_idx").on(t.planId),
    createdIdx: index("assistant_action_executions_created_idx").on(t.createdAt),
  })
);

export const assistantActionUndoItems = pgTable(
  "assistant_action_undo_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    executionId: uuid("execution_id")
      .notNull()
      .references(() => assistantActionExecutions.id, { onDelete: "cascade" }),
    actionId: text("action_id").notNull(),
    actionType: text("action_type").notNull(),
    operation: text("operation").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    resourceKey: text("resource_key").notNull(),
    resourceLabel: text("resource_label"),
    createdByAssistant: boolean("created_by_assistant").notNull().default(false),
    undoStrategy: text("undo_strategy").notNull(),
    status: text("status").notNull().default("available"),
    dependencyKeys: jsonb("dependency_keys").notNull().default([]),
    publicImpact: jsonb("public_impact").notNull().default([]),
    beforeSnapshot: jsonb("before_snapshot"),
    afterSnapshot: jsonb("after_snapshot"),
    afterFingerprint: text("after_fingerprint"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    executionIdx: index("assistant_action_undo_items_execution_idx").on(t.executionId),
    resourceIdx: index("assistant_action_undo_items_resource_idx").on(t.resourceType, t.resourceId),
    statusIdx: index("assistant_action_undo_items_status_idx").on(t.status),
    executionActionResourceIdx: uniqueIndex(
      "assistant_action_undo_items_execution_action_resource_idx"
    ).on(t.executionId, t.actionId, t.resourceType, t.resourceKey),
  })
);
