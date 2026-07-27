/**
 * Theming: front-end theme profiles and their route bindings, plus the admin
 * theme templates and the profiles instantiated from them.
 *
 * Re-exported verbatim by `core/db/schema.ts`; import from there, not from here.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { pages } from "./pages";

export const themeProfiles = pgTable(
  "theme_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    themeName: text("theme_name").notNull(),
    tokens: jsonb("tokens").notNull().default({}),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    nameIdx: index("theme_profiles_name_idx").on(t.name),
    activeIdx: index("theme_profiles_active_idx").on(t.isActive),
  })
);

export const themeRoutes = pgTable(
  "theme_routes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => themeProfiles.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    pageId: uuid("page_id").references(() => pages.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    profilePathIdx: uniqueIndex("theme_routes_profile_path_idx").on(t.profileId, t.path),
    profileIdx: index("theme_routes_profile_idx").on(t.profileId),
  })
);

export const adminThemeTemplates = pgTable(
  "admin_theme_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    tokens: jsonb("tokens").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    nameIdx: uniqueIndex("admin_theme_templates_name_idx").on(t.name),
  })
);

export const adminThemeProfiles = pgTable(
  "admin_theme_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    templateId: uuid("template_id")
      .notNull()
      .references(() => adminThemeTemplates.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    nameIdx: index("admin_theme_profiles_name_idx").on(t.name),
    activeIdx: index("admin_theme_profiles_active_idx").on(t.isActive),
    templateIdx: index("admin_theme_profiles_template_idx").on(t.templateId),
  })
);
