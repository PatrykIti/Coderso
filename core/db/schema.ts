import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  primaryKey,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.roleId] }),
  })
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    csrfTokenHash: text("csrf_token_hash"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    revokedAt: timestamp("revoked_at"),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex("sessions_token_hash_idx").on(t.tokenHash),
    expiresAtIdx: index("sessions_expires_at_idx").on(t.expiresAt),
    csrfTokenHashIdx: index("sessions_csrf_token_hash_idx").on(
      t.csrfTokenHash
    ),
  })
);

export const passwordResets = pgTable(
  "password_resets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex("password_resets_token_hash_idx").on(
      t.tokenHash
    ),
    expiresAtIdx: index("password_resets_expires_at_idx").on(t.expiresAt),
  })
);

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    status: text("status").notNull().default("draft"),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    currentData: jsonb("current_data").notNull(),
    publishedData: jsonb("published_data"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    publishedAt: timestamp("published_at"),
  },
  (t) => ({
    statusIdx: index("pages_status_idx").on(t.status),
  })
);

export const pageRevisions = pgTable(
  "page_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => ({
    pageIdIdx: index("page_revisions_page_id_idx").on(t.pageId),
  })
);

export const previewTokens = pgTable(
  "preview_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex("preview_tokens_token_hash_idx").on(t.tokenHash),
    expiresAtIdx: index("preview_tokens_expires_at_idx").on(t.expiresAt),
  })
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const backups = pgTable(
  "backups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: text("status").notNull().default("queued"),
    kind: text("kind").notNull().default("manual"),
    storageDriver: text("storage_driver").notNull().default("local"),
    artifactPath: text("artifact_path"),
    sizeBytes: integer("size_bytes"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
  },
  (t) => ({
    statusIdx: index("backups_status_idx").on(t.status),
    createdAtIdx: index("backups_created_at_idx").on(t.createdAt),
  })
);

export const backupSchedules = pgTable(
  "backup_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enabled: boolean("enabled").notNull().default(true),
    frequency: text("frequency").notNull().default("daily"),
    retentionDays: integer("retention_days").notNull().default(30),
    storageDriver: text("storage_driver").notNull().default("local"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    frequencyIdx: index("backup_schedules_frequency_idx").on(t.frequency),
  })
);

export const plugins = pgTable(
  "plugins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    version: text("version").notNull(),
    apiVersion: text("api_version").notNull(),
    coreVersion: text("core_version").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    status: text("status").notNull().default("installed"),
    permissions: jsonb("permissions").notNull(),
    entry: jsonb("entry").notNull(),
    integrity: jsonb("integrity").notNull(),
    signature: text("signature"),
    installedAt: timestamp("installed_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastError: text("last_error"),
    errorCount: integer("error_count").notNull().default(0),
  },
  (t) => ({
    statusIdx: index("plugins_status_idx").on(t.status),
  })
);

export const pluginSettings = pgTable(
  "plugin_settings",
  {
    pluginName: text("plugin_name")
      .notNull()
      .references(() => plugins.name, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey(t.pluginName, t.key),
  })
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    metadata: jsonb("metadata").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    actorIdx: index("audit_logs_actor_id_idx").on(t.actorId),
    actionIdx: index("audit_logs_action_idx").on(t.action),
    targetIdx: index("audit_logs_target_idx").on(t.targetType, t.targetId),
    createdAtIdx: index("audit_logs_created_at_idx").on(t.createdAt),
  })
);

export const accessLogs = pgTable(
  "access_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    method: text("method").notNull(),
    path: text("path").notNull(),
    status: integer("status").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index("access_logs_created_at_idx").on(t.createdAt),
    statusIdx: index("access_logs_status_idx").on(t.status),
    pathIdx: index("access_logs_path_idx").on(t.path),
    userIdx: index("access_logs_user_id_idx").on(t.userId),
  })
);

export const ipAllowlist = pgTable(
  "ip_allowlist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cidr: text("cidr").notNull().unique(),
    label: text("label"),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index("ip_allowlist_created_at_idx").on(t.createdAt),
  })
);

export const contentTypes = pgTable("content_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  schema: jsonb("schema").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contentEntries = pgTable(
  "content_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    typeId: uuid("type_id")
      .notNull()
      .references(() => contentTypes.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("draft"),
    data: jsonb("data").notNull(),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    typeSlugIdx: uniqueIndex("content_entries_type_slug_idx").on(
      t.typeId,
      t.slug
    ),
    statusIdx: index("content_entries_status_idx").on(t.status),
    titleIdx: index("content_entries_title_idx").on(t.title),
  })
);

export const contentRevisions = pgTable(
  "content_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => contentEntries.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => ({
    entryIdIdx: index("content_revisions_entry_id_idx").on(t.entryId),
  })
);

export const seoDocuments = pgTable(
  "seo_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    slug: text("slug"),
    title: text("title"),
    description: text("description"),
    canonicalUrl: text("canonical_url"),
    robots: text("robots"),
    score: integer("score"),
    status: text("status").notNull().default("warning"),
    issues: jsonb("issues").notNull().default([]),
    lastAuditAt: timestamp("last_audit_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    targetIdx: uniqueIndex("seo_documents_target_idx").on(
      t.targetType,
      t.targetId
    ),
    scoreIdx: index("seo_documents_score_idx").on(t.score),
    updatedAtIdx: index("seo_documents_updated_at_idx").on(t.updatedAt),
  })
);

export const redirects = pgTable(
  "redirects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromPath: text("from_path").notNull(),
    toPath: text("to_path").notNull(),
    statusCode: integer("status_code").notNull().default(301),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    fromPathIdx: uniqueIndex("redirects_from_path_idx").on(t.fromPath),
    enabledIdx: index("redirects_enabled_idx").on(t.enabled),
  })
);

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
    profilePathIdx: uniqueIndex("theme_routes_profile_path_idx").on(
      t.profileId,
      t.path
    ),
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

export const media = pgTable("media", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  width: integer("width"),
  height: integer("height"),
  alt: text("alt"),
  title: text("title"),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id),
});

export const menus = pgTable(
  "menus",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    location: text("location"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
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
  },
  (t) => ({
    menuIdIdx: index("menu_items_menu_id_idx").on(t.menuId),
    parentIdIdx: index("menu_items_parent_id_idx").on(t.parentId),
    orderIdx: index("menu_items_order_idx").on(
      t.menuId,
      t.parentId,
      t.orderIndex
    ),
  })
);
