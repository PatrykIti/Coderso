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
  emailHash: text("email_hash"),
  emailEncrypted: jsonb("email_encrypted"),
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

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    scopes: jsonb("scopes").notNull(),
    keyHash: text("key_hash").notNull(),
    prefix: text("prefix").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at"),
    revokedAt: timestamp("revoked_at"),
  },
  (t) => ({
    prefixIdx: index("api_keys_prefix_idx").on(t.prefix),
    nameIdx: index("api_keys_name_idx").on(t.name),
  })
);

export const webhooks = pgTable(
  "webhooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    events: jsonb("events").notNull(),
    secret: jsonb("secret"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    urlIdx: index("webhooks_url_idx").on(t.url),
    enabledIdx: index("webhooks_enabled_idx").on(t.enabled),
  })
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    webhookId: uuid("webhook_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    status: text("status").notNull().default("pending"),
    responseCode: integer("response_code"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deliveredAt: timestamp("delivered_at"),
  },
  (t) => ({
    webhookIdx: index("webhook_deliveries_webhook_idx").on(t.webhookId),
    createdAtIdx: index("webhook_deliveries_created_at_idx").on(t.createdAt),
  })
);

export const emailDeliveryLogs = pgTable(
  "email_delivery_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipient: text("recipient").notNull(),
    subject: text("subject").notNull(),
    status: text("status").notNull(),
    provider: text("provider").notNull().default("smtp"),
    messageId: text("message_id"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("email_delivery_logs_status_idx").on(t.status),
    createdAtIdx: index("email_delivery_logs_created_at_idx").on(t.createdAt),
  })
);

export const searchHistory = pgTable(
  "search_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    filters: jsonb("filters"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("search_history_user_idx").on(t.userId),
    createdAtIdx: index("search_history_created_at_idx").on(t.createdAt),
  })
);

export const integrations = pgTable(
  "integrations",
  {
    id: text("id").primaryKey(),
    config: jsonb("config").notNull(),
    status: text("status").notNull().default("disconnected"),
    healthStatus: text("health_status").notNull().default("unknown"),
    lastCheckedAt: timestamp("last_checked_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("integrations_status_idx").on(t.status),
    healthIdx: index("integrations_health_idx").on(t.healthStatus),
  })
);

export const integrationRequests = pgTable(
  "integration_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    website: text("website"),
    notes: text("notes"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index("integration_requests_status_idx").on(t.status),
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

export const widgetTemplates = pgTable(
  "widget_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    status: text("status").notNull().default("draft"),
    blocks: jsonb("blocks").notNull(),
    settings: jsonb("settings").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    nameIdx: index("widget_templates_name_idx").on(t.name),
    statusIdx: index("widget_templates_status_idx").on(t.status),
    categoryIdx: index("widget_templates_category_idx").on(t.category),
  })
);

export const listingTemplates = pgTable(
  "listing_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    layout: text("layout").notNull().default("grid"),
    config: jsonb("config").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex("listing_templates_slug_idx").on(t.slug),
    layoutIdx: index("listing_templates_layout_idx").on(t.layout),
    updatedAtIdx: index("listing_templates_updated_at_idx").on(t.updatedAt),
  })
);

export const listingQueries = pgTable(
  "listing_queries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    query: jsonb("query").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    nameIdx: index("listing_queries_name_idx").on(t.name),
    updatedAtIdx: index("listing_queries_updated_at_idx").on(t.updatedAt),
  })
);

export const widgetTemplateRevisions = pgTable(
  "widget_template_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => widgetTemplates.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    status: text("status").notNull(),
    blocks: jsonb("blocks").notNull(),
    settings: jsonb("settings").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => ({
    templateIdIdx: index("widget_template_revisions_template_id_idx").on(
      t.templateId
    ),
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

export const userSettings = pgTable(
  "user_settings",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.key] }),
    userIdIdx: index("user_settings_user_id_idx").on(t.userId),
  })
);

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
    chunkUniqueIdx: uniqueIndex("assistant_doc_chunks_doc_chunk_idx").on(
      t.docId,
      t.chunkIndex
    ),
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
    authorId: uuid("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("draft"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    data: jsonb("data").notNull(),
    publishedAt: timestamp("published_at"),
    scheduledAt: timestamp("scheduled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    typeSlugIdx: uniqueIndex("content_entries_type_slug_idx").on(
      t.typeId,
      t.slug
    ),
    authorIdx: index("content_entries_author_idx").on(t.authorId),
    statusIdx: index("content_entries_status_idx").on(t.status),
    titleIdx: index("content_entries_title_idx").on(t.title),
    scheduledAtIdx: index("content_entries_scheduled_at_idx").on(t.scheduledAt),
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

export const contentTaxonomies = pgTable(
  "content_taxonomies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    typeId: uuid("type_id")
      .notNull()
      .references(() => contentTypes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    typeIdx: index("content_taxonomies_type_id_idx").on(t.typeId),
    typeKindIdx: uniqueIndex("content_taxonomies_type_kind_idx").on(
      t.typeId,
      t.kind
    ),
    typeSlugIdx: uniqueIndex("content_taxonomies_type_slug_idx").on(
      t.typeId,
      t.slug
    ),
  })
);

export const contentTerms = pgTable(
  "content_terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taxonomyId: uuid("taxonomy_id")
      .notNull()
      .references(() => contentTaxonomies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    taxonomyIdx: index("content_terms_taxonomy_id_idx").on(t.taxonomyId),
    taxonomySlugIdx: uniqueIndex("content_terms_taxonomy_slug_idx").on(
      t.taxonomyId,
      t.slug
    ),
  })
);

export const contentTermAssignments = pgTable(
  "content_term_assignments",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => contentEntries.id, { onDelete: "cascade" }),
    termId: uuid("term_id")
      .notNull()
      .references(() => contentTerms.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.entryId, t.termId] }),
    entryIdx: index("content_term_assignments_entry_id_idx").on(t.entryId),
    termIdx: index("content_term_assignments_term_id_idx").on(t.termId),
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
  originalName: text("original_name"),
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

export const bookingResources = pgTable(
  "booking_resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    type: text("type").notNull().default("staff"),
    status: text("status").notNull().default("active"),
    timezone: text("timezone").notNull().default("UTC"),
    capacity: integer("capacity").notNull().default(1),
    settings: jsonb("settings").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex("booking_resources_slug_idx").on(t.slug),
    typeIdx: index("booking_resources_type_idx").on(t.type),
    statusIdx: index("booking_resources_status_idx").on(t.status),
    updatedAtIdx: index("booking_resources_updated_at_idx").on(t.updatedAt),
  })
);

export const bookingServices = pgTable(
  "booking_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("active"),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    bufferBeforeMinutes: integer("buffer_before_minutes").notNull().default(0),
    bufferAfterMinutes: integer("buffer_after_minutes").notNull().default(0),
    priceCents: integer("price_cents"),
    currency: text("currency"),
    settings: jsonb("settings").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex("booking_services_slug_idx").on(t.slug),
    statusIdx: index("booking_services_status_idx").on(t.status),
    updatedAtIdx: index("booking_services_updated_at_idx").on(t.updatedAt),
  })
);

export const bookingServiceResources = pgTable(
  "booking_service_resources",
  {
    serviceId: uuid("service_id")
      .notNull()
      .references(() => bookingServices.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => bookingResources.id, { onDelete: "cascade" }),
    isRequired: boolean("is_required").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.serviceId, t.resourceId] }),
    serviceIdx: index("booking_service_resources_service_idx").on(t.serviceId),
    resourceIdx: index("booking_service_resources_resource_idx").on(t.resourceId),
  })
);

export const bookingSchedules = pgTable(
  "booking_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => bookingResources.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    isAvailable: boolean("is_available").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    resourceDayIdx: index("booking_schedules_resource_day_idx").on(t.resourceId, t.dayOfWeek),
    resourceTimeIdx: index("booking_schedules_resource_time_idx").on(
      t.resourceId,
      t.startMinute,
      t.endMinute
    ),
  })
);

export const bookingBlackouts = pgTable(
  "booking_blackouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id").references(() => bookingResources.id, {
      onDelete: "cascade",
    }),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    resourceTimeIdx: index("booking_blackouts_resource_time_idx").on(
      t.resourceId,
      t.startsAt,
      t.endsAt
    ),
    startsIdx: index("booking_blackouts_starts_idx").on(t.startsAt),
  })
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => bookingServices.id, { onDelete: "restrict" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => bookingResources.id, { onDelete: "restrict" }),
    formSubmissionId: uuid("form_submission_id").references(() => formSubmissions.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("pending"),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone"),
    notes: text("notes"),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    serviceIdx: index("bookings_service_idx").on(t.serviceId),
    resourceIdx: index("bookings_resource_idx").on(t.resourceId),
    statusIdx: index("bookings_status_idx").on(t.status),
    startsIdx: index("bookings_starts_idx").on(t.startsAt),
    resourceWindowIdx: index("bookings_resource_window_idx").on(
      t.resourceId,
      t.startsAt,
      t.endsAt
    ),
  })
);
