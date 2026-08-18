/**
 * Custom admin screens and the per-entry presentation overrides authored on them.
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
  bigint,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { contentEntries, contentTypes } from "./content";
import { users } from "./identity";

export const customScreens = pgTable(
  "custom_screens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    contentTypeId: uuid("content_type_id")
      .notNull()
      .references(() => contentTypes.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("draft"),
    collectionRole: text("collection_role"),
    compositionKey: text("composition_key"),
    showInSidebar: boolean("show_in_sidebar").notNull().default(false),
    sidebarLabel: text("sidebar_label"),
    schemaVersion: integer("schema_version").notNull().default(4),
    definition: jsonb("definition").notNull(),
    revision: bigint("revision", { mode: "number" }).notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    nameIdx: index("custom_screens_name_idx").on(t.name),
    contentTypeIdx: index("custom_screens_content_type_id_idx").on(t.contentTypeId),
    statusIdx: index("custom_screens_status_idx").on(t.status),
    collectionRoleIdx: index("custom_screens_collection_role_idx").on(
      t.contentTypeId,
      t.collectionRole
    ),
    compositionKeyIdx: index("custom_screens_composition_key_idx").on(t.compositionKey),
    sidebarIdx: index("custom_screens_sidebar_idx").on(t.showInSidebar),
    updatedAtIdx: index("custom_screens_updated_at_idx").on(t.updatedAt),
  })
);

export const customScreenEntryPresentationOverrides = pgTable(
  "custom_screen_entry_presentation_overrides",
  {
    screenId: uuid("screen_id")
      .notNull()
      .references(() => customScreens.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => contentEntries.id, { onDelete: "cascade" }),
    blockId: text("block_id").notNull(),
    propPath: text("prop_path").notNull(),
    value: jsonb("value").notNull(),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    scopeIdx: index("csepo_scope_idx").on(t.screenId, t.entryId),
    entryIdx: index("csepo_entry_idx").on(t.entryId),
    updatedByIdx: index("csepo_updated_by_idx").on(t.updatedBy),
    updatedAtIdx: index("csepo_updated_at_idx").on(t.updatedAt),
    targetUniqueIdx: uniqueIndex("csepo_target_unique_idx").on(
      t.screenId,
      t.entryId,
      t.blockId,
      t.propPath
    ),
  })
);
