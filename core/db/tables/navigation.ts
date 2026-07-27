/**
 * Front-end navigation: menus and their nested items.
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
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { pages } from "./pages";

export const menus = pgTable(
  "menus",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    location: text("location"),
    status: text("status").notNull().default("draft"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    // Nullable appearance envelope (TASK-458-02); null = legacy shell look.
    settings: jsonb("settings"),
  },
  (t) => ({
    nameIdx: uniqueIndex("menus_name_idx").on(t.name),
    locationIdx: uniqueIndex("menus_location_idx").on(t.location),
  })
);

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    menuId: uuid("menu_id")
      .notNull()
      .references(() => menus.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    href: text("href"),
    pageId: uuid("page_id").references(() => pages.id, { onDelete: "set null" }),
    orderIndex: integer("order_index").notNull().default(0),
    parentId: uuid("parent_id").references((): AnyPgColumn => menuItems.id, {
      onDelete: "cascade",
    }),
    settings: jsonb("settings").notNull().default({}),
  },
  (t) => ({
    menuIdIdx: index("menu_items_menu_id_idx").on(t.menuId),
    parentIdIdx: index("menu_items_parent_id_idx").on(t.parentId),
    orderIdx: index("menu_items_order_idx").on(t.menuId, t.parentId, t.orderIndex),
  })
);
