/**
 * TASK-551-01-L02 deterministic database scale fixture (reviewed evidence).
 * Pure recipe: exact per-profile row counts, frozen distributions, literal
 * search-hit tables, frozen clocks, UUIDv5 identity, timezone-safe booking
 * math, retention buckets, and per-family row builders shared by the baseline
 * seeder and the query-baseline test. No production import, no DB, no env.
 *
 * Interpretive notes (deliberate): retention families use the global-ordinal
 * bucket rule (0..59 old, 60..79 boundary, 80..99 recent) on the frozen 2036
 * clock. Per-source / per-kit retention anchors are forced STATUS (success /
 * apply-success rollback relation) and kept by the anchor rule; "forced recent"
 * is read as retention-policy anchor semantics that keep each source's/kit's
 * newest successful run and its exact rollback relation regardless of age. That
 * is the only reading that keeps every pinned candidate count exactly integer.
 */
import { createHash, randomUUID } from "node:crypto";

export type ScaleProfile = "small" | "large";
export type SearchToken = "common" | "rare" | "unique" | "hidden" | "miss";
export const strictReadonly = <T>(value: T): T => value;

export const PROFILE_POOL_CAPACITY = strictReadonly({ small: 2, large: 10 });
export const MEASUREMENT = strictReadonly({
  repetitions: 3,
  warmups: 5,
  samples: 30,
  calibrationWarmups: 20,
  calibrationSamples: 100,
  maxP95VariancePercent: 20,
} as const);

export const TASK551_GENERAL_CLOCK_MS = Date.parse("2026-01-01T00:00:00.000Z");
export const TASK551_RETENTION_CLOCK_MS = Date.parse("2036-01-01T00:00:00.000Z");
export const TASK551_OPERATION_CLOCK_MS = Date.parse("2026-01-15T12:00:00.000Z");
export const TASK551_UUID_NAMESPACE = "55155-1551-4551-8551-55155155";

export const equalSortTs = (o: number): Date =>
  new Date(TASK551_GENERAL_CLOCK_MS + Math.floor(o / 10));
export const uniqueTs = (o: number): Date => new Date(TASK551_GENERAL_CLOCK_MS + o);
export const retentionTs = (o: number): Date => {
  const b = o % 100;
  if (b < 60) return new Date(TASK551_RETENTION_CLOCK_MS - 1);
  if (b < 80) return new Date(TASK551_RETENTION_CLOCK_MS);
  return new Date(TASK551_RETENTION_CLOCK_MS + 1);
};
export const scheduledTs = (o: number): Date =>
  new Date(Date.parse("2027-01-01T00:00:00.000Z") + Math.floor(o / 10));
export const fixtureSecret = (seed: string): string =>
  createHash("sha256").update(`task551-fixture-secret|${seed}`).digest("hex");

/** Deterministic per-scope tag so unique-constrained fixture values never collide across scopes. */
export const task551ScopeTag = (scope: string): string =>
  createHash("sha256").update(`task551-scope|${scope}`).digest("hex").slice(0, 8);

/** UUIDv5 from `(validatedRunScope, profile, family, ordinal)`. */
export const task551UuidV5 = (
  scope: string,
  profile: ScaleProfile,
  family: string,
  ordinal: number
): string => {
  const digest = createHash("sha1")
    .update(`${TASK551_UUID_NAMESPACE}${scope}|${profile}|${family}|${ordinal}`)
    .digest();
  digest[6] = (digest[6]! & 0x0f) | 0x50;
  digest[8] = (digest[8]! & 0x3f) | 0x80;
  const hex = digest.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};
export const createRunScope = (): string => `task551-${randomUUID()}`;

export const TASK551_SCALE_COUNTS = strictReadonly({
  users: { small: 100, large: 10_000 },
  roles: { small: 5, large: 5 },
  userRoles: { small: 110, large: 11_000 },
  pages: { small: 500, large: 100_000 },
  contentTypes: { small: 20, large: 200 },
  contentEntries: { small: 2_000, large: 100_000 },
  posts: { small: 1_000, large: 100_000 },
  mediaFolders: { small: 20, large: 1_000 },
  media: { small: 2_000, large: 100_000 },
  forms: { small: 20, large: 200 },
  formActions: { small: 60, large: 600 },
  formSubmissions: { small: 2_000, large: 100_000 },
  formActionRuns: { small: 6_000, large: 300_000 },
  bookingResources: { small: 20, large: 1_000 },
  bookingServices: { small: 20, large: 1_000 },
  bookingServiceResources: { small: 100, large: 5_000 },
  bookingSchedules: { small: 140, large: 7_000 },
  bookingBlackouts: { small: 500, large: 100_000 },
  bookings: { small: 2_000, large: 100_000 },
  searchHistory: { small: 5_000, large: 100_000 },
  accessLogs: { small: 5_000, large: 100_000 },
  auditLogs: { small: 5_000, large: 100_000 },
  emailDeliveryLogs: { small: 5_000, large: 100_000 },
  integrations: { small: 10, large: 200 },
  integrationRequests: { small: 5_000, large: 100_000 },
  webhooks: { small: 20, large: 200 },
  webhookDeliveries: { small: 5_000, large: 100_000 },
  sessions: { small: 5_000, large: 100_000 },
  passwordResets: { small: 5_000, large: 100_000 },
  previewTokens: { small: 2_500, large: 50_000 },
  postPreviewTokens: { small: 2_500, large: 50_000 },
  assistantDocIngestRuns: { small: 5_000, large: 100_000 },
  settings: { small: 50, large: 500 },
  redirects: { small: 500, large: 100_000 },
  assistantDocs: { small: 200, large: 10_000 },
  assistantDocChunks: { small: 2_000, large: 100_000 },
  assistantActionExecutions: { small: 1_000, large: 100_000 },
  assistantActionUndoItems: { small: 3_000, large: 300_000 },
  analyticsSessions: { small: 2_000, large: 20_000 },
  analyticsPageviews: { small: 10_000, large: 100_000 },
  solutionKitInstallRuns: { small: 1_000, large: 100_000 },
  solutionKitInstallItems: { small: 5_000, large: 500_000 },
  widgetTemplates: { small: 100, large: 1_000 },
  detailPageDocuments: { small: 100, large: 1_000 },
  pageRevisions: { small: 2_000, large: 100_000 },
  contentRevisions: { small: 2_000, large: 100_000 },
  postRevisions: { small: 2_000, large: 100_000 },
  widgetTemplateRevisions: { small: 2_000, large: 100_000 },
  detailPageRevisions: { small: 2_000, large: 100_000 },
} as const);
export type FixtureFamily = keyof typeof TASK551_SCALE_COUNTS;

export const TASK551_SCALE_DISTRIBUTIONS = strictReadonly({
  users: { active: 80, inactive: 10, pending: 10, roles: 5 },
  contentStatus: { published: 50, draft: 30, scheduled: 10, archived: 10 },
  entryVisibility: { public: 70, private: 20, password: 10 },
  formStatus: { published: 60, draft: 30, archived: 10 },
  submissionStatus: { new: 70, processed: 20, spam: 10 },
  userRoles: { primaryPerUser: 1, additionalEvery: 10, additionalPerMatch: 1 },
  postTags: { buckets: 10, extraTag: "task551-post-extra", extraEvery: 10 },
  mediaTags: { buckets: 10, pairTag: "task551-media-pair", pairEvery: 100 },
  equalSortGroupSize: 10,
  bookingStatuses: ["pending", "confirmed", "cancelled", "completed", "no_show"],
  webhookEvents: Array.from({ length: 10 }, (_, i) => `task551-event-${i}`),
  bookingTimezones: ["UTC", "America/New_York", "Asia/Tokyo"],
} as const);

export const TASK551_SEARCH_HIT_COUNTS = strictReadonly({
  users: { small: { common: 1, rare: 1 }, large: { common: 100, rare: 10 } },
  pages: { small: { common: 5, rare: 1 }, large: { common: 1_000, rare: 100 } },
  entries: { small: { common: 20, rare: 2 }, large: { common: 1_000, rare: 100 } },
  posts: { small: { common: 10, rare: 1 }, large: { common: 1_000, rare: 100 } },
  media: { small: { common: 20, rare: 2 }, large: { common: 1_000, rare: 100 } },
  assistantDocs: { small: { common: 2, rare: 1 }, large: { common: 100, rare: 10 } },
  assistantChunks: { small: { common: 20, rare: 2 }, large: { common: 1_000, rare: 100 } },
} as const);
export type SearchFamily = keyof typeof TASK551_SEARCH_HIT_COUNTS;

export const TASK551_SEARCH_TOKENS = strictReadonly({
  common: "task551-common",
  rare: "task551-rare",
  uniquePrefix: "task551-token-",
  hidden: "task551-hidden",
  miss: "task551-miss",
});

export const TASK551_SEARCH_ELIGIBILITY = strictReadonly({
  users: { column: "name", eligibleSql: "status = 'active'", hiddenOrdinal: 80 },
  pages: { column: "title", eligibleSql: "status = 'published'", hiddenOrdinal: 50 },
  entries: {
    column: "title",
    eligibleSql: "status = 'published' and visibility = 'public'",
    hiddenOrdinal: 70,
  },
  posts: { column: "title", eligibleSql: "status = 'published'", hiddenOrdinal: 50 },
  media: { column: "title", eligibleSql: "type = 'image'", hiddenOrdinal: 80 },
  assistantDocs: { column: "title", eligibleSql: "language = 'en'", hiddenOrdinal: 1 },
  assistantChunks: { column: "normalized_text", eligibleSql: "token_count > 0", hiddenOrdinal: 5 },
} as const);

export const searchTokenText = (
  family: SearchFamily,
  profile: ScaleProfile,
  ordinal: number,
  eligible: boolean,
  eligibleSeen: number
): string => {
  const hits = TASK551_SEARCH_HIT_COUNTS[family][profile];
  const cfg = TASK551_SEARCH_ELIGIBILITY[family];
  const parts: string[] = [];
  if (eligible && eligibleSeen < hits.common) parts.push(TASK551_SEARCH_TOKENS.common);
  if (eligible && eligibleSeen < hits.rare) parts.push(TASK551_SEARCH_TOKENS.rare);
  parts.push(`${TASK551_SEARCH_TOKENS.uniquePrefix}${ordinal}`);
  if (ordinal === cfg.hiddenOrdinal) parts.push(TASK551_SEARCH_TOKENS.hidden);
  return parts.join(" ");
};

export const expectedSearchHits = (
  family: SearchFamily,
  profile: ScaleProfile,
  token: SearchToken
): number => {
  if (token === "unique") return 1;
  if (token === "hidden" || token === "miss") return 0;
  return TASK551_SEARCH_HIT_COUNTS[family][profile][token];
};

export const zonedWallClockToUtc = (
  zone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0
): Date => {
  const targetLocal = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetAt = (instantMs: number): number => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(instantMs));
    const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 0);
    return (
      Date.UTC(
        get("year"),
        get("month") - 1,
        get("day"),
        get("hour") % 24,
        get("minute"),
        get("second")
      ) - instantMs
    );
  };
  const first = offsetAt(targetLocal);
  const utc = targetLocal - first;
  const corrected = offsetAt(utc);
  return new Date(corrected !== first ? targetLocal - corrected : utc);
};

export const zonedWallClockParts = (
  zone: string,
  instantMs: number
): { year: number; month: number; day: number; hour: number; minute: number } => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instantMs));
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
  };
};

export const bookingStartsAt = (ordinal: number): { startsAt: Date; timezone: string } => {
  const zone = TASK551_SCALE_DISTRIBUTIONS.bookingTimezones[ordinal % 3]!;
  const local = zonedWallClockParts(zone, TASK551_OPERATION_CLOCK_MS);
  const bucket = ordinal % 100;
  let startsAt: Date;
  if (bucket < 20) {
    const hours = (bucket < 10 ? -1 : 1) * (1 + (ordinal % 2));
    startsAt = zonedWallClockToUtc(
      zone,
      local.year,
      local.month,
      local.day,
      local.hour + hours,
      local.minute
    );
  } else {
    const target = new Date(
      Date.UTC(
        local.year,
        local.month - 1,
        local.day + (bucket < 60 ? 1 : -1) * (1 + (ordinal % 40))
      )
    );
    startsAt = zonedWallClockToUtc(
      zone,
      target.getUTCFullYear(),
      target.getUTCMonth() + 1,
      target.getUTCDate(),
      12,
      0
    );
  }
  return { startsAt, timezone: zone };
};

export const submissionCreatedAt = (ordinal: number): Date => {
  const asOf = TASK551_OPERATION_CLOCK_MS;
  const q = Math.floor(ordinal / 4);
  const days = ordinal % 4 === 0 ? 1 + (q % 6) : 8 + (q % 30);
  return new Date(asOf - days * 86_400_000);
};

export const contentStatus = (o: number): "published" | "draft" | "scheduled" | "archived" => {
  const m = o % 100;
  return m < 50 ? "published" : m < 80 ? "draft" : m < 90 ? "scheduled" : "archived";
};
export const entryVisibility = (o: number): "public" | "private" | "password" => {
  const m = o % 100;
  return m < 70 ? "public" : m < 90 ? "private" : "password";
};
export const publishedAtFor = (o: number): Date | null => {
  const s = contentStatus(o);
  if (s === "published") return equalSortTs(o);
  if (s === "scheduled") return scheduledTs(o);
  return null;
};

export type SeedContext = {
  scope: string;
  profile: ScaleProfile;
  userIds: readonly string[];
  roleIds: readonly string[];
  pageIds: readonly string[];
  typeIds: readonly string[];
  entryIds: readonly string[];
  postIds: readonly string[];
  folderIds: readonly string[];
  mediaIds: readonly string[];
  formIds: readonly string[];
  submissionIds: readonly string[];
  actionIds: readonly string[];
  resourceIds: readonly string[];
  serviceIds: readonly string[];
  integrationIds: readonly string[];
  webhookIds: readonly string[];
  sessionIds: readonly string[];
  docIds: readonly string[];
  executionIds: readonly string[];
  analyticsSessionIds: readonly string[];
  kitRunIds: readonly string[];
  widgetTemplateIds: readonly string[];
  detailPageIds: readonly string[];
};
export type SeedTable = {
  readonly table: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly unknown[])[];
};
export type FamilyBuilder = (ctx: SeedContext) => SeedTable;

const id = (ctx: SeedContext, family: string, o: number): string =>
  task551UuidV5(ctx.scope, ctx.profile, family, o);
const count = (family: FixtureFamily, p: ScaleProfile): number => TASK551_SCALE_COUNTS[family][p];
const table = (
  tableName: string,
  columns: readonly string[],
  rows: readonly (readonly unknown[])[]
): SeedTable => ({ table: tableName, columns, rows });

const buildUsers = (ctx: SeedContext): SeedTable => {
  const n = count("users", ctx.profile);
  const rows: (readonly unknown[])[] = [];
  let eligibleSeen = 0;
  for (let o = 0; o < n; o += 1) {
    const m = o % 100;
    const status = m < 80 ? "active" : m < 90 ? "inactive" : "pending";
    const eligible = status === "active";
    rows.push([
      id(ctx, "users", o),
      `task551-user-${task551ScopeTag(ctx.scope)}-${o}@test.example`,
      null,
      fixtureSecret(`user-${o}`),
      searchTokenText("users", ctx.profile, o, eligible, eligibleSeen),
      status,
      equalSortTs(o),
      equalSortTs(o),
      null,
    ]);
    if (eligible) eligibleSeen += 1;
  }
  return table(
    "users",
    [
      "id",
      "email",
      "email_hash",
      "password_hash",
      "name",
      "status",
      "created_at",
      "updated_at",
      "last_login_at",
    ],
    rows
  );
};
const buildRoles = (ctx: SeedContext): SeedTable =>
  table(
    "roles",
    ["id", "name", "description", "permissions", "created_at"],
    Array.from({ length: 5 }, (_, r) => [
      id(ctx, "roles", r),
      `task551-role-${task551ScopeTag(ctx.scope)}-${r}`,
      `role ${r}`,
      [],
      equalSortTs(r),
    ])
  );
const buildUserRoles = (ctx: SeedContext): SeedTable => {
  const n = count("users", ctx.profile);
  const rows: (readonly unknown[])[] = [];
  for (let o = 0; o < n; o += 1) {
    rows.push([ctx.userIds[o]!, ctx.roleIds[o % 5]!]);
    if (o % 10 === 0) rows.push([ctx.userIds[o]!, ctx.roleIds[(o + 1) % 5]!]);
  }
  return table("user_roles", ["user_id", "role_id"], rows);
};
const buildPages = (ctx: SeedContext): SeedTable => {
  const n = count("pages", ctx.profile);
  const rows: (readonly unknown[])[] = [];
  let eligibleSeen = 0;
  for (let o = 0; o < n; o += 1) {
    const s = contentStatus(o);
    const eligible = s === "published";
    rows.push([
      id(ctx, "pages", o),
      `task551-page-${task551ScopeTag(ctx.scope)}-${o}`,
      searchTokenText("pages", ctx.profile, o, eligible, eligibleSeen),
      s,
      ctx.userIds[o % ctx.userIds.length]!,
      {},
      null,
      equalSortTs(o),
      equalSortTs(o),
      publishedAtFor(o),
    ]);
    if (eligible) eligibleSeen += 1;
  }
  return table(
    "pages",
    [
      "id",
      "slug",
      "title",
      "status",
      "author_id",
      "current_data",
      "published_data",
      "created_at",
      "updated_at",
      "published_at",
    ],
    rows
  );
};
const buildContentTypes = (ctx: SeedContext): SeedTable =>
  table(
    "content_types",
    ["id", "name", "slug", "schema", "status", "config", "created_at", "updated_at"],
    Array.from({ length: count("contentTypes", ctx.profile) }, (_, o) => [
      id(ctx, "contentTypes", o),
      `task551-type-${o}`,
      `task551-type-${task551ScopeTag(ctx.scope)}-${o}`,
      {},
      "published",
      {},
      equalSortTs(o),
      equalSortTs(o),
    ])
  );
const buildContentEntries = (ctx: SeedContext): SeedTable => {
  const n = count("contentEntries", ctx.profile);
  const rows: (readonly unknown[])[] = [];
  let eligibleSeen = 0;
  for (let o = 0; o < n; o += 1) {
    const author = o % ctx.userIds.length;
    const occurrence = Math.floor(o / ctx.userIds.length);
    const typeOrdinal = (author + occurrence) % ctx.typeIds.length;
    const s = contentStatus(o);
    const v = entryVisibility(o);
    const eligible = s === "published" && v === "public";
    rows.push([
      id(ctx, "contentEntries", o),
      ctx.typeIds[typeOrdinal]!,
      ctx.userIds[author]!,
      `task551-entry-${task551ScopeTag(ctx.scope)}-${o}`,
      searchTokenText("entries", ctx.profile, o, eligible, eligibleSeen),
      s,
      v,
      v === "password" ? fixtureSecret(`entry-${o}`) : null,
      [],
      { ordinal: o },
      publishedAtFor(o),
      null,
      equalSortTs(o),
      equalSortTs(o),
    ]);
    if (eligible) eligibleSeen += 1;
  }
  return table(
    "content_entries",
    [
      "id",
      "type_id",
      "author_id",
      "slug",
      "title",
      "status",
      "visibility",
      "access_password",
      "tags",
      "data",
      "published_at",
      "scheduled_at",
      "created_at",
      "updated_at",
    ],
    rows
  );
};
const buildPosts = (ctx: SeedContext): SeedTable => {
  const n = count("posts", ctx.profile);
  const rows: (readonly unknown[])[] = [];
  let eligibleSeen = 0;
  for (let o = 0; o < n; o += 1) {
    const s = contentStatus(o);
    const tags = [`task551-post-tag-${o % 10}`];
    if (o % 10 === 0) tags.push("task551-post-extra");
    const eligible = s === "published";
    rows.push([
      id(ctx, "posts", o),
      ctx.userIds[o % ctx.userIds.length]!,
      null,
      `task551-post-${task551ScopeTag(ctx.scope)}-${o}`,
      searchTokenText("posts", ctx.profile, o, eligible, eligibleSeen),
      s,
      `excerpt ${o}`,
      tags,
      {},
      {},
      {},
      publishedAtFor(o),
      null,
      equalSortTs(o),
      equalSortTs(o),
    ]);
    if (eligible) eligibleSeen += 1;
  }
  return table(
    "posts",
    [
      "id",
      "author_id",
      "featured_media_id",
      "slug",
      "title",
      "status",
      "excerpt",
      "tags",
      "data",
      "metadata",
      "seo",
      "published_at",
      "scheduled_at",
      "created_at",
      "updated_at",
    ],
    rows
  );
};
const buildMediaFolders = (ctx: SeedContext): SeedTable =>
  table(
    "media_folders",
    ["id", "name", "slug", "parent_id", "order_index", "created_at", "created_by"],
    Array.from({ length: count("mediaFolders", ctx.profile) }, (_, o) => [
      id(ctx, "mediaFolders", o),
      `task551-folder-${o}`,
      `task551-folder-${task551ScopeTag(ctx.scope)}-${o}`,
      null,
      0,
      equalSortTs(o),
      ctx.userIds[o % ctx.userIds.length]!,
    ])
  );
const buildMedia = (ctx: SeedContext): SeedTable => {
  const n = count("media", ctx.profile);
  const rows: (readonly unknown[])[] = [];
  let eligibleSeen = 0;
  for (let o = 0; o < n; o += 1) {
    const isImage = o % 100 < 80;
    const tags = [`task551-media-tag-${o % 10}`];
    if (o % 100 === 0) tags.push("task551-media-pair");
    rows.push([
      id(ctx, "media", o),
      `task551-media-${o}.bin`,
      `https://fixture.test/task551-media-${o}.bin`,
      searchTokenText("media", ctx.profile, o, isImage, eligibleSeen),
      isImage ? "image" : "file",
      `task551-mime-${o % 10}`,
      1_000 + o,
      o % 10,
      o % 10,
      null,
      searchTokenText("media", ctx.profile, o, isImage, eligibleSeen),
      null,
      o % 10 === 0 ? null : ctx.folderIds[o % ctx.folderIds.length]!,
      tags,
      null,
      null,
      null,
      null,
      equalSortTs(o),
      ctx.userIds[o % ctx.userIds.length]!,
    ]);
    if (isImage) eligibleSeen += 1;
  }
  return table(
    "media",
    [
      "id",
      "key",
      "url",
      "original_name",
      "type",
      "mime_type",
      "size",
      "width",
      "height",
      "alt",
      "title",
      "caption",
      "folder_id",
      "tags",
      "focal_x",
      "focal_y",
      "description",
      "credit",
      "created_at",
      "created_by",
    ],
    rows
  );
};
const buildForms = (ctx: SeedContext): SeedTable => {
  const n = count("forms", ctx.profile);
  const rows: (readonly unknown[])[] = [];
  for (let o = 0; o < n; o += 1) {
    const m = o % 100;
    rows.push([
      id(ctx, "forms", o),
      `task551-form-${o}`,
      `task551-form-${task551ScopeTag(ctx.scope)}-${o}`,
      m < 60 ? "published" : m < 90 ? "draft" : "archived",
      null,
      "ok",
      null,
      "public",
      {},
      equalSortTs(o),
      equalSortTs(o),
    ]);
  }
  return table(
    "forms",
    [
      "id",
      "name",
      "slug",
      "status",
      "description",
      "success_message",
      "success_redirect_url",
      "submission_access",
      "settings",
      "created_at",
      "updated_at",
    ],
    rows
  );
};
const buildFormActions = (ctx: SeedContext): SeedTable =>
  table(
    "form_actions",
    [
      "id",
      "form_id",
      "type",
      "label",
      "enabled",
      "continue_on_error",
      "condition",
      "config",
      "order_index",
      "created_at",
      "updated_at",
    ],
    Array.from({ length: count("formActions", ctx.profile) }, (_, o) => {
      const f = Math.floor(o / 3);
      return [
        id(ctx, "formActions", o),
        ctx.formIds[f]!,
        `task551-action-${o}`,
        `action ${o}`,
        true,
        true,
        {},
        {},
        o % 3,
        equalSortTs(o),
        equalSortTs(o),
      ];
    })
  );
const buildFormSubmissions = (ctx: SeedContext): SeedTable => {
  const n = count("formSubmissions", ctx.profile);
  const rows: (readonly unknown[])[] = [];
  for (let o = 0; o < n; o += 1) {
    const m = o % 100;
    rows.push([
      id(ctx, "formSubmissions", o),
      ctx.formIds[o % ctx.formIds.length]!,
      { ordinal: o },
      m < 70 ? "new" : m < 90 ? "processed" : "spam",
      null,
      null,
      submissionCreatedAt(o),
    ]);
  }
  return table(
    "form_submissions",
    ["id", "form_id", "payload", "status", "ip", "user_agent", "created_at"],
    rows
  );
};
const buildFormActionRuns = (ctx: SeedContext): SeedTable => {
  const n = count("formActionRuns", ctx.profile);
  const rows: (readonly unknown[])[] = [];
  for (let o = 0; o < n; o += 1) {
    const s = Math.floor(o / 3);
    const formIndex = s % ctx.formIds.length;
    const actionId = ctx.actionIds[(formIndex * 3 + (o % 3)) % ctx.actionIds.length]!;
    rows.push([
      id(ctx, "formActionRuns", o),
      ctx.formIds[formIndex]!,
      ctx.submissionIds[s % ctx.submissionIds.length]!,
      actionId,
      `task551-action-type-${o % 3}`,
      `action ${formIndex * 3 + (o % 3)}`,
      "success",
      1,
      "submission",
      null,
      null,
      null,
      null,
      {},
      {},
      { ordinal: o },
      null,
      retentionTs(s),
    ]);
  }
  return table(
    "form_action_runs",
    [
      "id",
      "form_id",
      "submission_id",
      "action_id",
      "action_type",
      "action_label",
      "status",
      "attempt",
      "trigger",
      "error_code",
      "error_message",
      "request_payload",
      "response_payload",
      "action_condition",
      "action_config",
      "submission_payload",
      "retry_of_id",
      "created_at",
    ],
    rows
  );
};
const buildBookingResources = (ctx: SeedContext): SeedTable =>
  table(
    "booking_resources",
    [
      "id",
      "name",
      "slug",
      "type",
      "status",
      "timezone",
      "capacity",
      "settings",
      "created_at",
      "updated_at",
    ],
    Array.from({ length: count("bookingResources", ctx.profile) }, (_, o) => [
      id(ctx, "bookingResources", o),
      `task551-resource-${o}`,
      `task551-resource-${task551ScopeTag(ctx.scope)}-${o}`,
      "staff",
      "active",
      TASK551_SCALE_DISTRIBUTIONS.bookingTimezones[o % 3]!,
      1,
      {},
      equalSortTs(o),
      equalSortTs(o),
    ])
  );
const buildBookingServices = (ctx: SeedContext): SeedTable =>
  table(
    "booking_services",
    [
      "id",
      "name",
      "slug",
      "status",
      "description",
      "duration_minutes",
      "buffer_before_minutes",
      "buffer_after_minutes",
      "price_cents",
      "currency",
      "settings",
      "created_at",
      "updated_at",
    ],
    Array.from({ length: count("bookingServices", ctx.profile) }, (_, o) => [
      id(ctx, "bookingServices", o),
      `task551-service-${o}`,
      `task551-service-${task551ScopeTag(ctx.scope)}-${o}`,
      "active",
      null,
      60,
      0,
      0,
      1000 + o,
      "USD",
      {},
      equalSortTs(o),
      equalSortTs(o),
    ])
  );
const buildBookingServiceResources = (ctx: SeedContext): SeedTable => {
  const rows: (readonly unknown[])[] = [];
  let o = 0;
  for (let s = 0; s < ctx.serviceIds.length; s += 1) {
    // Distinct (service, resource) pairs: resource offset k within the ring so
    // the composite PK never collides even when serviceCount == resourceCount.
    for (let k = 0; k < 5; k += 1)
      rows.push([
        ctx.serviceIds[s]!,
        ctx.resourceIds[(s + k) % ctx.resourceIds.length]!,
        true,
        equalSortTs(o++),
      ]);
  }
  return table(
    "booking_service_resources",
    ["service_id", "resource_id", "is_required", "created_at"],
    rows
  );
};
const buildBookingSchedules = (ctx: SeedContext): SeedTable => {
  const rows: (readonly unknown[])[] = [];
  let o = 0;
  for (let r = 0; r < ctx.resourceIds.length; r += 1) {
    for (let d = 0; d < 7; d += 1)
      rows.push([
        id(ctx, "bookingSchedules", o),
        ctx.resourceIds[r]!,
        d,
        d * 60,
        d * 60 + 60,
        "UTC",
        true,
        equalSortTs(o),
        equalSortTs(o++),
      ]);
  }
  return table(
    "booking_schedules",
    [
      "id",
      "resource_id",
      "day_of_week",
      "start_minute",
      "end_minute",
      "timezone",
      "is_available",
      "created_at",
      "updated_at",
    ],
    rows
  );
};
const buildBookingBlackouts = (ctx: SeedContext): SeedTable => {
  const n = count("bookingBlackouts", ctx.profile);
  const rows: (readonly unknown[])[] = [];
  for (let o = 0; o < n; o += 1) {
    const starts = equalSortTs(o);
    rows.push([
      id(ctx, "bookingBlackouts", o),
      o % 10 === 0 ? null : ctx.resourceIds[o % ctx.resourceIds.length]!,
      starts,
      new Date(starts.getTime() + 3_600_000),
      `reason ${o}`,
      equalSortTs(o),
    ]);
  }
  return table(
    "booking_blackouts",
    ["id", "resource_id", "starts_at", "ends_at", "reason", "created_at"],
    rows
  );
};
const buildBookings = (ctx: SeedContext): SeedTable => {
  const n = count("bookings", ctx.profile);
  const rows: (readonly unknown[])[] = [];
  const statuses = TASK551_SCALE_DISTRIBUTIONS.bookingStatuses;
  for (let o = 0; o < n; o += 1) {
    const r100 = o % 100;
    const resourceIndex =
      r100 === 0
        ? 0
        : r100 <= 10
          ? 1
          : r100 <= 60
            ? 2
            : 3 + ((r100 - 61) % Math.max(1, ctx.resourceIds.length - 3));
    const serviceIndex =
      r100 === 0
        ? 0
        : r100 <= 10
          ? 1
          : r100 <= 60
            ? 2
            : 3 + ((r100 - 61) % Math.max(1, ctx.serviceIds.length - 3));
    const { startsAt, timezone } = bookingStartsAt(o);
    rows.push([
      id(ctx, "bookings", o),
      ctx.serviceIds[serviceIndex % ctx.serviceIds.length]!,
      ctx.resourceIds[resourceIndex % ctx.resourceIds.length]!,
      null,
      statuses[Math.floor(r100 / 20)]!,
      `customer ${o}`,
      `customer-${o}@test.example`,
      null,
      null,
      startsAt,
      new Date(startsAt.getTime() + 3_600_000),
      timezone,
      {},
      equalSortTs(o),
      equalSortTs(o),
    ]);
  }
  return table(
    "bookings",
    [
      "id",
      "service_id",
      "resource_id",
      "form_submission_id",
      "status",
      "customer_name",
      "customer_email",
      "customer_phone",
      "notes",
      "starts_at",
      "ends_at",
      "timezone",
      "metadata",
      "created_at",
      "updated_at",
    ],
    rows
  );
};
const buildSearchHistory = (ctx: SeedContext): SeedTable =>
  table(
    "search_history",
    ["id", "user_id", "query", "filters", "created_at"],
    Array.from({ length: count("searchHistory", ctx.profile) }, (_, o) => [
      id(ctx, "searchHistory", o),
      ctx.userIds[o % ctx.userIds.length]!,
      `task551-query-${o}`,
      null,
      equalSortTs(o),
    ])
  );
const buildAccessLogs = (ctx: SeedContext): SeedTable => {
  const n = count("accessLogs", ctx.profile);
  const methods = ["GET", "POST", "PATCH", "DELETE"];
  const statuses = [200, 201, 400, 403, 404, 429, 500];
  const rows: (readonly unknown[])[] = [];
  for (let o = 0; o < n; o += 1)
    rows.push([
      id(ctx, "accessLogs", o),
      methods[o % 4]!,
      `/task551/${o}`,
      statuses[o % 7]!,
      "203.0.113.1",
      `ua-${o}`,
      ctx.userIds[o % ctx.userIds.length]!,
      ctx.sessionIds[o % ctx.sessionIds.length]!,
      o % 100,
      uniqueTs(o),
    ]);
  return table(
    "access_logs",
    [
      "id",
      "method",
      "path",
      "status",
      "ip",
      "user_agent",
      "user_id",
      "session_id",
      "duration_ms",
      "created_at",
    ],
    rows
  );
};
const buildAuditLogs = (ctx: SeedContext): SeedTable => {
  const n = count("auditLogs", ctx.profile);
  const actions = ["create", "update", "publish", "delete"];
  const rows: (readonly unknown[])[] = [];
  for (let o = 0; o < n; o += 1)
    rows.push([
      id(ctx, "auditLogs", o),
      o % 10 === 0 ? null : ctx.userIds[o % ctx.userIds.length]!,
      actions[o % 4]!,
      "page",
      `target-${o}`,
      {},
      uniqueTs(o),
    ]);
  return table(
    "audit_logs",
    ["id", "actor_id", "action", "target_type", "target_id", "metadata", "created_at"],
    rows
  );
};
const buildEmailDeliveryLogs = (ctx: SeedContext): SeedTable =>
  table(
    "email_delivery_logs",
    ["id", "recipient", "subject", "status", "provider", "message_id", "error", "created_at"],
    Array.from({ length: count("emailDeliveryLogs", ctx.profile) }, (_, o) => [
      id(ctx, "emailDeliveryLogs", o),
      `task551-recipient-${o}@test.example`,
      `task551-subject-${o}`,
      ["queued", "sent", "failed"][o % 3]!,
      ["smtp", "mock"][o % 2]!,
      `msg-${o}`,
      null,
      uniqueTs(o),
    ])
  );
const buildIntegrations = (ctx: SeedContext): SeedTable =>
  table(
    "integrations",
    [
      "id",
      "config",
      "status",
      "health_status",
      "last_checked_at",
      "last_error",
      "created_at",
      "updated_at",
    ],
    Array.from({ length: count("integrations", ctx.profile) }, (_, o) => [
      id(ctx, "integrations", o),
      {},
      "connected",
      "healthy",
      null,
      null,
      equalSortTs(o),
      equalSortTs(o),
    ])
  );
const buildIntegrationRequests = (ctx: SeedContext): SeedTable =>
  table(
    "integration_requests",
    ["id", "name", "website", "notes", "status", "created_at"],
    Array.from({ length: count("integrationRequests", ctx.profile) }, (_, o) => [
      id(ctx, "integrationRequests", o),
      `task551-request-${o}`,
      null,
      null,
      ["pending", "success", "failed"][o % 3]!,
      uniqueTs(o),
    ])
  );
const buildWebhooks = (ctx: SeedContext): SeedTable => {
  const n = count("webhooks", ctx.profile);
  const events = TASK551_SCALE_DISTRIBUTIONS.webhookEvents;
  const rows: (readonly unknown[])[] = [];
  for (let o = 0; o < n; o += 1)
    rows.push([
      id(ctx, "webhooks", o),
      `task551-webhook-${o}`,
      `https://fixture.test/hook-${o}`,
      [events[o % 10 === 0 ? 0 : o % 10]!],
      null,
      true,
      equalSortTs(o),
      equalSortTs(o),
    ]);
  return table(
    "webhooks",
    ["id", "name", "url", "events", "secret", "enabled", "created_at", "updated_at"],
    rows
  );
};
const buildWebhookDeliveries = (ctx: SeedContext): SeedTable => {
  const n = count("webhookDeliveries", ctx.profile);
  const events = TASK551_SCALE_DISTRIBUTIONS.webhookEvents;
  const rows: (readonly unknown[])[] = [];
  for (let o = 0; o < n; o += 1) {
    const status = ["pending", "success", "failed"][o % 3]!;
    const event = events[o % 10 === 0 ? 0 : o % 10]!;
    rows.push([
      id(ctx, "webhookDeliveries", o),
      ctx.webhookIds[o % ctx.webhookIds.length]!,
      event,
      status,
      status === "success" ? 200 : null,
      o % 4,
      null,
      equalSortTs(o),
      status === "success" ? equalSortTs(o) : null,
    ]);
  }
  return table(
    "webhook_deliveries",
    [
      "id",
      "webhook_id",
      "event",
      "status",
      "response_code",
      "attempts",
      "last_error",
      "created_at",
      "delivered_at",
    ],
    rows
  );
};
const buildSessions = (ctx: SeedContext): SeedTable => {
  const n = count("sessions", ctx.profile);
  const rows: (readonly unknown[])[] = [];
  for (let o = 0; o < n; o += 1) {
    const m = o % 100;
    const revoked = m < 20;
    const expired = m >= 20 && m < 40;
    const created = equalSortTs(o);
    rows.push([
      id(ctx, "sessions", o),
      ctx.userIds[o % ctx.userIds.length]!,
      fixtureSecret(`session-${o}`),
      null,
      null,
      null,
      new Date(created.getTime() + (expired ? -86_400_000 : 30 * 86_400_000)),
      created,
      revoked ? created : null,
    ]);
  }
  return table(
    "sessions",
    [
      "id",
      "user_id",
      "token_hash",
      "csrf_token_hash",
      "ip",
      "user_agent",
      "expires_at",
      "created_at",
      "revoked_at",
    ],
    rows
  );
};
const buildPasswordResets = (ctx: SeedContext): SeedTable =>
  table(
    "password_resets",
    ["id", "user_id", "token_hash", "expires_at", "used_at", "created_at", "updated_at"],
    Array.from({ length: count("passwordResets", ctx.profile) }, (_, o) => [
      id(ctx, "passwordResets", o),
      ctx.userIds[o % ctx.userIds.length]!,
      fixtureSecret(`reset-${o}`),
      retentionTs(o),
      null,
      uniqueTs(o),
      uniqueTs(o),
    ])
  );
const buildPreviewTokens = (ctx: SeedContext): SeedTable =>
  table(
    "preview_tokens",
    ["id", "target_type", "target_id", "token_hash", "context", "expires_at", "created_at"],
    Array.from({ length: count("previewTokens", ctx.profile) }, (_, o) => [
      id(ctx, "previewTokens", o),
      "page",
      ctx.pageIds[o % ctx.pageIds.length]!,
      fixtureSecret(`preview-${o}`),
      null,
      retentionTs(o),
      uniqueTs(o),
    ])
  );
const buildPostPreviewTokens = (ctx: SeedContext): SeedTable =>
  table(
    "post_preview_tokens",
    ["id", "post_id", "token_hash", "expires_at", "created_at"],
    Array.from({ length: count("postPreviewTokens", ctx.profile) }, (_, o) => [
      id(ctx, "postPreviewTokens", o),
      ctx.postIds[o % ctx.postIds.length]!,
      fixtureSecret(`pp-${o}`),
      retentionTs(o),
      uniqueTs(o),
    ])
  );
const buildAssistantDocIngestRuns = (ctx: SeedContext): SeedTable => {
  const n = count("assistantDocIngestRuns", ctx.profile);
  const sourceCount = ctx.profile === "small" ? 100 : 1_000;
  const runsPerSource = ctx.profile === "small" ? 50 : 100;
  const rows: (readonly unknown[])[] = [];
  for (let o = 0; o < n; o += 1) {
    const isAnchor = o % runsPerSource === runsPerSource - 1;
    const status = isAnchor ? "success" : ["success", "failed", "running"][o % 3]!;
    const started = retentionTs(o);
    rows.push([
      id(ctx, "assistantDocIngestRuns", o),
      ctx.userIds[o % ctx.userIds.length]!,
      `task551-source-${Math.floor(o / runsPerSource) % sourceCount}`,
      status,
      started,
      status === "running" ? null : started,
      o % 100,
      o % 50,
      o % 500,
      o % 7,
      [],
    ]);
  }
  return table(
    "assistant_doc_ingest_runs",
    [
      "id",
      "triggered_by_user_id",
      "source_root",
      "status",
      "started_at",
      "finished_at",
      "files_scanned",
      "docs_upserted",
      "chunks_upserted",
      "errors_count",
      "errors_json",
    ],
    rows
  );
};
const buildSettings = (ctx: SeedContext): SeedTable =>
  table(
    "settings",
    ["key", "value", "updated_at"],
    Array.from({ length: count("settings", ctx.profile) }, (_, o) => [
      `task551-settings-${task551ScopeTag(ctx.scope)}-${o}`,
      o % 3 === 0 ? o : o % 3 === 1 ? { ordinal: o } : [`v-${o}`],
      equalSortTs(o),
    ])
  );
const buildRedirects = (ctx: SeedContext): SeedTable =>
  table(
    "redirects",
    ["id", "from_path", "to_path", "status_code", "enabled", "created_at", "updated_at"],
    Array.from({ length: count("redirects", ctx.profile) }, (_, o) => [
      id(ctx, "redirects", o),
      `/task551-from-${task551ScopeTag(ctx.scope)}-${o}`,
      `/task551-to-${o}`,
      [301, 302, 307, 308][o % 4]!,
      o % 100 < 90,
      equalSortTs(o),
      equalSortTs(o),
    ])
  );
const buildAssistantDocs = (ctx: SeedContext): SeedTable => {
  const n = count("assistantDocs", ctx.profile);
  const rows: (readonly unknown[])[] = [];
  let eligibleSeen = 0;
  for (let o = 0; o < n; o += 1) {
    const hidden = o === TASK551_SEARCH_ELIGIBILITY.assistantDocs.hiddenOrdinal;
    const eligible = !hidden;
    rows.push([
      id(ctx, "assistantDocs", o),
      `task551-doc-${task551ScopeTag(ctx.scope)}-${o}.md`,
      `task551-doc-${o}`,
      searchTokenText("assistantDocs", ctx.profile, o, eligible, eligibleSeen),
      "developers",
      `task551-area-${o % 10}`,
      hidden ? "pl" : "en",
      [`kw-${o}`],
      fixtureSecret(`doc-${o}`),
      null,
      equalSortTs(o),
      equalSortTs(o),
    ]);
    if (eligible) eligibleSeen += 1;
  }
  return table(
    "assistant_docs",
    [
      "id",
      "source_path",
      "slug",
      "title",
      "audience",
      "product_area",
      "language",
      "keywords_json",
      "checksum",
      "source_updated_at",
      "created_at",
      "updated_at",
    ],
    rows
  );
};
const buildAssistantDocChunks = (ctx: SeedContext): SeedTable => {
  const n = count("assistantDocChunks", ctx.profile);
  const rows: (readonly unknown[])[] = [];
  let eligibleSeen = 0;
  for (let o = 0; o < n; o += 1) {
    const hidden = o === TASK551_SEARCH_ELIGIBILITY.assistantChunks.hiddenOrdinal;
    const eligible = !hidden;
    rows.push([
      id(ctx, "assistantDocChunks", o),
      ctx.docIds[Math.floor(o / 10) % ctx.docIds.length]!,
      o % 10,
      [],
      `heading ${o}`,
      o * 10,
      o * 10 + 10,
      `content ${o}`,
      searchTokenText("assistantChunks", ctx.profile, o, eligible, eligibleSeen),
      hidden ? 0 : 1 + (o % 50),
      uniqueTs(o),
      uniqueTs(o),
    ]);
    if (eligible) eligibleSeen += 1;
  }
  return table(
    "assistant_doc_chunks",
    [
      "id",
      "doc_id",
      "chunk_index",
      "heading_path",
      "heading",
      "line_start",
      "line_end",
      "content",
      "normalized_text",
      "token_count",
      "created_at",
      "updated_at",
    ],
    rows
  );
};
const buildAssistantActionExecutions = (ctx: SeedContext): SeedTable =>
  table(
    "assistant_action_executions",
    [
      "id",
      "idempotency_key",
      "actor_id",
      "plan_id",
      "plan_hash",
      "result",
      "created_at",
      "updated_at",
    ],
    Array.from({ length: count("assistantActionExecutions", ctx.profile) }, (_, o) => [
      id(ctx, "assistantActionExecutions", o),
      `task551-idem-${task551ScopeTag(ctx.scope)}-${o}`,
      ctx.userIds[o % ctx.userIds.length]!,
      `plan-${o}`,
      fixtureSecret(`plan-${o}`),
      { ok: true },
      equalSortTs(o),
      equalSortTs(o),
    ])
  );
const buildAssistantActionUndoItems = (ctx: SeedContext): SeedTable => {
  const n = count("assistantActionUndoItems", ctx.profile);
  const rows: (readonly unknown[])[] = [];
  for (let o = 0; o < n; o += 1)
    rows.push([
      id(ctx, "assistantActionUndoItems", o),
      ctx.executionIds[Math.floor(o / 3) % ctx.executionIds.length]!,
      `action-${o % 3}`,
      `type-${o % 3}`,
      "update",
      "page",
      `res-${o}`,
      `key-${o}`,
      `label ${o}`,
      false,
      "restore",
      "available",
      [],
      [],
      null,
      null,
      null,
      {},
      uniqueTs(o),
      uniqueTs(o),
    ]);
  return table(
    "assistant_action_undo_items",
    [
      "id",
      "execution_id",
      "action_id",
      "action_type",
      "operation",
      "resource_type",
      "resource_id",
      "resource_key",
      "resource_label",
      "created_by_assistant",
      "undo_strategy",
      "status",
      "dependency_keys",
      "public_impact",
      "before_snapshot",
      "after_snapshot",
      "after_fingerprint",
      "metadata",
      "created_at",
      "updated_at",
    ],
    rows
  );
};
const buildAnalyticsSessions = (ctx: SeedContext): SeedTable => {
  const n = count("analyticsSessions", ctx.profile);
  const rows: (readonly unknown[])[] = [];
  for (let o = 0; o < n; o += 1) {
    const started = equalSortTs(o);
    rows.push([
      id(ctx, "analyticsSessions", o),
      `task551-visitor-${o}`,
      "direct",
      "fixture.test",
      "desktop",
      "en",
      `/entry-${o}`,
      `/exit-${o}`,
      5,
      started,
      new Date(started.getTime() + 60_000),
    ]);
  }
  return table(
    "analytics_sessions",
    [
      "id",
      "visitor_hash",
      "source_kind",
      "referrer_host",
      "device_class",
      "lang",
      "entry_path",
      "exit_path",
      "pageview_count",
      "started_at",
      "last_seen_at",
    ],
    rows
  );
};
const buildAnalyticsPageviews = (ctx: SeedContext): SeedTable =>
  table(
    "analytics_pageviews",
    ["id", "session_id", "path", "referrer_host", "source_kind", "device_class", "created_at"],
    Array.from({ length: count("analyticsPageviews", ctx.profile) }, (_, o) => [
      id(ctx, "analyticsPageviews", o),
      ctx.analyticsSessionIds[Math.floor(o / 5) % ctx.analyticsSessionIds.length]!,
      `/path-${o}`,
      "fixture.test",
      "direct",
      "desktop",
      uniqueTs(o),
    ])
  );
const buildWidgetTemplates = (ctx: SeedContext): SeedTable =>
  table(
    "widget_templates",
    [
      "id",
      "name",
      "description",
      "category",
      "status",
      "blocks",
      "settings",
      "created_at",
      "updated_at",
    ],
    Array.from({ length: count("widgetTemplates", ctx.profile) }, (_, o) => [
      id(ctx, "widgetTemplates", o),
      `task551-widget-${o}`,
      null,
      "block",
      "published",
      {},
      {},
      equalSortTs(o),
      equalSortTs(o),
    ])
  );
const buildDetailPageDocuments = (ctx: SeedContext): SeedTable =>
  table(
    "detail_page_documents",
    [
      "id",
      "name",
      "content_type_id",
      "status",
      "current_document",
      "published_document",
      "created_at",
      "updated_at",
      "published_at",
    ],
    Array.from({ length: count("detailPageDocuments", ctx.profile) }, (_, o) => [
      id(ctx, "detailPageDocuments", o),
      `task551-detail-${o}`,
      ctx.typeIds[o % ctx.typeIds.length]!,
      "published",
      {},
      null,
      equalSortTs(o),
      equalSortTs(o),
      equalSortTs(o),
    ])
  );
const buildSolutionKitInstallRuns = (ctx: SeedContext): SeedTable => {
  const n = count("solutionKitInstallRuns", ctx.profile);
  const kitCount = ctx.profile === "small" ? 20 : 200;
  const runsPerKit = n / kitCount;
  const rows: (readonly unknown[])[] = [];
  for (let o = 0; o < n; o += 1) {
    const mode = o % 4 === 1 ? "rollback" : "apply";
    const status = ["success", "success", "failed", "running"][o % 4]!;
    const finished = status === "running" ? null : retentionTs(o);
    rows.push([
      id(ctx, "solutionKitInstallRuns", o),
      `task551-kit-${Math.floor(o / runsPerKit)}`,
      mode,
      status,
      ctx.userIds[o % ctx.userIds.length]!,
      o % 4 === 1 ? (ctx.kitRunIds[o - 1] ?? ctx.kitRunIds[0]!) : null,
      {},
      {},
      null,
      retentionTs(o),
      retentionTs(o),
      finished,
    ]);
  }
  return table(
    "solution_kit_install_runs",
    [
      "id",
      "kit_id",
      "mode",
      "status",
      "actor_id",
      "rollback_of_run_id",
      "options",
      "summary",
      "error",
      "created_at",
      "updated_at",
      "finished_at",
    ],
    rows
  );
};
const buildSolutionKitInstallItems = (ctx: SeedContext): SeedTable => {
  const n = count("solutionKitInstallItems", ctx.profile);
  const rows: (readonly unknown[])[] = [];
  for (let o = 0; o < n; o += 1)
    rows.push([
      id(ctx, "solutionKitInstallItems", o),
      ctx.kitRunIds[Math.floor(o / 5) % ctx.kitRunIds.length]!,
      o % 5,
      `resource-${o % 8}`,
      `key-${o}`,
      ["create", "update", "noop", "delete", "restore"][o % 5]!,
      "success",
      null,
      { id: `res-id-${o}` },
      null,
      null,
      uniqueTs(o),
      uniqueTs(o),
    ]);
  return table(
    "solution_kit_install_items",
    [
      "id",
      "run_id",
      "position",
      "resource_type",
      "resource_key",
      "operation",
      "status",
      "before_snapshot",
      "after_snapshot",
      "rollback_action",
      "error",
      "created_at",
      "updated_at",
    ],
    rows
  );
};
const revisionBuilder =
  (
    tableName: string,
    family: FixtureFamily,
    parentColumn: string,
    dataColumn: string,
    parentIds: readonly string[],
    parentCap: number,
    withKind = true
  ) =>
  (ctx: SeedContext): SeedTable => {
    const n = count(family, ctx.profile);
    const versionsPerParent = ctx.profile === "small" ? 20 : 100;
    const rows: (readonly unknown[])[] = [];
    for (let o = 0; o < n; o += 1)
      rows.push([
        id(ctx, family, o),
        parentIds[Math.floor(o / versionsPerParent) % parentCap]!,
        (o % versionsPerParent) + 1,
        ...(withKind ? ["publish" as const] : []),
        { ordinal: o },
        uniqueTs(o),
        ctx.userIds[o % ctx.userIds.length]!,
      ]);
    return table(
      tableName,
      [
        "id",
        parentColumn,
        "version",
        ...(withKind ? ["kind" as const] : []),
        dataColumn,
        "created_at",
        "created_by",
      ],
      rows
    );
  };
const buildPageRevisions = (ctx: SeedContext): SeedTable =>
  revisionBuilder("page_revisions", "pageRevisions", "page_id", "data", ctx.pageIds, 100)(ctx);
const buildContentRevisions = (ctx: SeedContext): SeedTable =>
  revisionBuilder(
    "content_revisions",
    "contentRevisions",
    "entry_id",
    "data",
    ctx.entryIds,
    100,
    false
  )(ctx);
const buildPostRevisions = (ctx: SeedContext): SeedTable =>
  revisionBuilder(
    "post_revisions",
    "postRevisions",
    "post_id",
    "data",
    ctx.postIds,
    100,
    false
  )(ctx);
const buildWidgetTemplateRevisions = (ctx: SeedContext): SeedTable => {
  const n = count("widgetTemplateRevisions", ctx.profile);
  const versionsPerParent = ctx.profile === "small" ? 20 : 100;
  const rows: (readonly unknown[])[] = [];
  for (let o = 0; o < n; o += 1)
    rows.push([
      id(ctx, "widgetTemplateRevisions", o),
      ctx.widgetTemplateIds[Math.floor(o / versionsPerParent) % ctx.widgetTemplateIds.length]!,
      (o % versionsPerParent) + 1,
      `widget ${o}`,
      null,
      "block",
      "published",
      {},
      uniqueTs(o),
      ctx.userIds[o % ctx.userIds.length]!,
      {},
    ]);
  return table(
    "widget_template_revisions",
    [
      "id",
      "template_id",
      "version",
      "name",
      "description",
      "category",
      "status",
      "blocks",
      "created_at",
      "created_by",
      "settings",
    ],
    rows
  );
};
const buildDetailPageRevisions = (ctx: SeedContext): SeedTable =>
  revisionBuilder(
    "detail_page_revisions",
    "detailPageRevisions",
    "detail_page_id",
    "document",
    ctx.detailPageIds,
    100
  )(ctx);

export const TASK551_FAMILY_BUILDERS: Readonly<Record<string, FamilyBuilder>> = strictReadonly({
  users: buildUsers,
  roles: buildRoles,
  userRoles: buildUserRoles,
  pages: buildPages,
  contentTypes: buildContentTypes,
  contentEntries: buildContentEntries,
  posts: buildPosts,
  mediaFolders: buildMediaFolders,
  media: buildMedia,
  forms: buildForms,
  formActions: buildFormActions,
  formSubmissions: buildFormSubmissions,
  formActionRuns: buildFormActionRuns,
  bookingResources: buildBookingResources,
  bookingServices: buildBookingServices,
  bookingServiceResources: buildBookingServiceResources,
  bookingSchedules: buildBookingSchedules,
  bookingBlackouts: buildBookingBlackouts,
  bookings: buildBookings,
  searchHistory: buildSearchHistory,
  accessLogs: buildAccessLogs,
  auditLogs: buildAuditLogs,
  emailDeliveryLogs: buildEmailDeliveryLogs,
  integrations: buildIntegrations,
  integrationRequests: buildIntegrationRequests,
  webhooks: buildWebhooks,
  webhookDeliveries: buildWebhookDeliveries,
  sessions: buildSessions,
  passwordResets: buildPasswordResets,
  previewTokens: buildPreviewTokens,
  postPreviewTokens: buildPostPreviewTokens,
  assistantDocIngestRuns: buildAssistantDocIngestRuns,
  settings: buildSettings,
  redirects: buildRedirects,
  assistantDocs: buildAssistantDocs,
  assistantDocChunks: buildAssistantDocChunks,
  assistantActionExecutions: buildAssistantActionExecutions,
  assistantActionUndoItems: buildAssistantActionUndoItems,
  analyticsSessions: buildAnalyticsSessions,
  analyticsPageviews: buildAnalyticsPageviews,
  widgetTemplates: buildWidgetTemplates,
  detailPageDocuments: buildDetailPageDocuments,
  solutionKitInstallRuns: buildSolutionKitInstallRuns,
  solutionKitInstallItems: buildSolutionKitInstallItems,
  pageRevisions: buildPageRevisions,
  contentRevisions: buildContentRevisions,
  postRevisions: buildPostRevisions,
  widgetTemplateRevisions: buildWidgetTemplateRevisions,
  detailPageRevisions: buildDetailPageRevisions,
});

export const TASK551_EQUAL_SORT_FAMILIES: readonly string[] = [
  "users",
  "pages",
  "contentEntries",
  "posts",
  "media",
  "forms",
  "bookings",
  "bookingBlackouts",
  "bookingResources",
  "bookingServices",
  "bookingSchedules",
  "bookingServiceResources",
  "searchHistory",
  "webhooks",
  "webhookDeliveries",
  "sessions",
  "settings",
  "redirects",
  "assistantDocs",
  "assistantActionExecutions",
  "analyticsSessions",
  "widgetTemplates",
  "detailPageDocuments",
];

export const TASK551_RETENTION_SCENARIOS = strictReadonly({
  passwordResetsExpired: {
    family: "passwordResets",
    eligible: { small: 3_000, large: 60_000 },
    boundary: { small: 1_000, large: 20_000 },
    recent: { small: 1_000, large: 20_000 },
    timestampColumn: "expires_at",
  },
  previewTokensExpired: {
    pageFamily: "previewTokens",
    postFamily: "postPreviewTokens",
    eligiblePerTable: { small: 1_500, large: 30_000 },
    boundaryPerTable: { small: 500, large: 10_000 },
    recentPerTable: { small: 500, large: 10_000 },
    timestampColumn: "expires_at",
  },
  assistantIngestOld: {
    family: "assistantDocIngestRuns",
    eligible: { small: 3_000, large: 60_000 },
    boundary: { small: 1_000, large: 20_000 },
    recent: { small: 1_000, large: 20_000 },
    anchors: { small: 100, large: 1_000 },
    sources: { small: 100, large: 1_000 },
    timestampColumn: "started_at",
  },
  formRunsChildFirst: {
    parentFamily: "formSubmissions",
    childFamily: "formActionRuns",
    parentEligible: { small: 1_200, large: 60_000 },
    childEligible: { small: 3_600, large: 180_000 },
    runsPerSubmission: 3,
    disabledByDefault: true,
  },
  solutionKitChildFirst: {
    runFamily: "solutionKitInstallRuns",
    itemFamily: "solutionKitInstallItems",
    runEligible: { small: 600, large: 60_000 },
    itemEligible: { small: 3_000, large: 300_000 },
    runBoundary: { small: 200, large: 20_000 },
    runRecent: { small: 200, large: 20_000 },
    anchorsPerKit: 2,
    itemsPerRun: 5,
    disabledByDefault: true,
  },
} as const);

export const TASK551_RETENTION_BATCH_PINS = strictReadonly({
  defaultBatch: 500,
  maxBatch: 2_000,
  edges: [499, 500, 501, 2_000, 2_001],
} as const);

export const TASK551_BUDGET_CASES = strictReadonly({
  point: "single-row point read by id",
  "filter-1pct": "booking resource R1 filter selects exactly 1%",
  "filter-10pct": "booking service S2 filter selects exactly 10%",
  "filter-50pct": "booking time-window (upcoming) filter selects exactly 50%",
  "search-common": "common search token literal count",
  "search-rare": "rare search token literal count",
  "search-miss": "miss token returns zero",
  "search-hidden": "hidden token returns zero on eligible rows",
  "equal-sort-page": "bounded first page of an equal-sort list family (LIMIT 101)",
  "pages-author": "page author 0 returns exactly 5/10",
  "users-role-30pct": "role 1 returns exactly 30/3,000 users",
  "entries-author": "entry author 0 returns exactly 20/10",
  "entries-type-author": "entry (type 0, author 0) returns exactly 1/1",
  "posts-author": "post author 0 returns exactly 10/10",
  "posts-tag-10pct": "one-element post tag containment returns 100/10,000",
  "media-tags-and-1pct": "sorted unique media AND array returns 20/1,000",
  "webhooks-event-10pct": "webhook event 0 matches exactly 2/20 hooks",
  "webhook-deliveries-parent": "one parent's deliveries are exactly 250/500",
  "page-latest-autosave": "latest page autosave projects exactly one row",
  "public-html-dependencies-128": "128-tuple public-HTML dependency aggregate",
} as const);
export type BudgetCaseName = keyof typeof TASK551_BUDGET_CASES;

export const TASK551_PUBLIC_HTML_128 = strictReadonly({
  pageTuples: 43,
  postTuples: 43,
  entryTuples: 42,
  totalTuples: 128,
  rootCandidates: 101,
  eligibleRoots: 100,
  canonicalBytesMax: 16_384,
  fingerprintKey: "public_html_dependency_validation",
} as const);

export const TASK551_EVIDENCE_PINS = strictReadonly({
  pageAuthorZero: { small: 5, large: 10 },
  entryAuthorZero: { small: 20, large: 10 },
  entryTypeAuthorZero: { small: 1, large: 1 },
  postAuthorZero: { small: 10, large: 10 },
  roleOneUsers: { small: 30, large: 3_000 },
  postTagContainment: { small: 100, large: 10_000 },
  mediaTagsAnd: { small: 20, large: 1_000 },
  webhookList: { small: 20, large: 200 },
  webhookEventZero: { small: 2, large: 20 },
  webhookParentDeliveries: { small: 250, large: 500 },
  rollingSevenDays: { small: 500, large: 25_000 },
  bookingToday: { small: 400, large: 20_000 },
  bookingUpcoming: { small: 1_000, large: 50_000 },
  bookingPastOrCurrent: { small: 1_000, large: 50_000 },
} as const);

export const TASK551_FIXTURE_REVIEW_VERSION = 1;

import type { Task551DigestScenario } from "../../../scripts/task551DatabaseBaseline/digestContract";
import {
  TASK551_ADMIN_READ_PLANNED_IDS,
  TASK551_ADMIN_READ_STATEMENT_SHAPES,
  type Task551AdminReadShape,
} from "./task551AdminReadStatementShapes";

export const TASK551_SCENARIO_MANIFEST_VERSION = "task551-database-baseline-scenarios@v1" as const;
export const TASK551_PRESERVED_SENTINEL_TABLE = "public.task551_fixture_sentinel" as const;

// The admin-shape profile row count is a derivation from the declared shape
// recipe, never from the scenario ID or a copied all-family matrix: a
// fixed-summary shape materializes exactly its aggregate row, a UNION ALL facet
// batch shape reads its declared bound as two per-profile batches, and every
// other shape reads exactly its declared per-profile output bound.
const profileRowsForShape = (
  shape: Pick<Task551AdminReadShape, "statementRole" | "limitExpression" | "expectedOutputBound">
): Readonly<Record<ScaleProfile, number>> => {
  const rows =
    shape.statementRole === "fixed-summary"
      ? 1
      : shape.limitExpression.startsWith("UNION ALL facet batches")
        ? shape.expectedOutputBound / 2
        : shape.expectedOutputBound;
  if (!Number.isSafeInteger(rows) || rows < 1) throw new Error("database_baseline_invalid");
  return { small: rows, large: rows };
};

const scenarioCounts = (id: string): Readonly<Record<ScaleProfile, number>> => {
  const shape = TASK551_ADMIN_READ_STATEMENT_SHAPES[id];
  if (shape === undefined) throw new Error("database_baseline_invalid");
  return profileRowsForShape(shape);
};

const adminScenario = (id: string): Task551DigestScenario => {
  const shape = TASK551_ADMIN_READ_STATEMENT_SHAPES[id];
  if (shape === undefined) throw new Error("database_baseline_invalid");
  return {
    id,
    kind: "admin-shape",
    targetStatementOrFamily: shape.fingerprintKey,
    minimumClosure: [id.split("-")[1] ?? "admin"],
    supportTables: ["users"],
    expectedTableCounts: {
      profileRows: scenarioCounts(id),
      outputBound: shape.expectedOutputBound,
    },
    ownedKeyPredicate: {
      kind: "uuid-v5",
      scope: "validated-run-scope",
      profile: "selected-profile",
      scenario: id,
      ordinal: "family-ordinal",
    },
    equalityParticipation: "admin-32",
    statementShapeId: id,
  };
};

const supplementalScenario = (
  id: string,
  targetStatementOrFamily: string,
  minimumClosure: readonly string[],
  supportTables: readonly string[],
  expectedTableCounts: JsonLike
): Task551DigestScenario => ({
  id,
  kind: "supplemental",
  targetStatementOrFamily,
  minimumClosure,
  supportTables,
  expectedTableCounts,
  ownedKeyPredicate: {
    kind: "uuid-v5",
    scope: "validated-run-scope",
    profile: "selected-profile",
    scenario: id,
    ordinal: "family-ordinal",
  },
  equalityParticipation: "supplemental",
});

type JsonLike =
  null | boolean | number | string | readonly JsonLike[] | { readonly [key: string]: JsonLike };

export const TASK551_SCENARIOS: readonly Task551DigestScenario[] = Object.freeze([
  ...TASK551_ADMIN_READ_PLANNED_IDS.map(adminScenario),
  supplementalScenario(
    "public-html-dependencies-128",
    "public_html_dependency_validation",
    ["pages", "posts", "content_entries"],
    ["users"],
    { profileRows: { small: 128, large: 128 }, rootCandidates: { small: 101, large: 101 } }
  ),
  supplementalScenario(
    "password-resets-expired",
    "password_resets",
    ["password_resets", "users"],
    [],
    { eligibleRows: { small: 3000, large: 60000 } }
  ),
  supplementalScenario(
    "preview-tokens-expired",
    "preview_tokens",
    ["preview_tokens", "post_preview_tokens"],
    ["pages", "posts"],
    { eligibleRows: { small: 3000, large: 60000 } }
  ),
  supplementalScenario(
    "assistant-ingest-old",
    "assistant_doc_ingest_runs",
    ["assistant_doc_ingest_runs"],
    [],
    { eligibleRows: { small: 3000, large: 60000 } }
  ),
  supplementalScenario(
    "form-runs-child-first",
    "form_action_runs",
    ["form_action_runs", "form_submissions"],
    ["form_actions", "forms"],
    { eligibleRows: { small: 4800, large: 240000 } }
  ),
  supplementalScenario(
    "solution-kit-child-first",
    "solution_kit_install_runs",
    ["solution_kit_install_items", "solution_kit_install_runs"],
    [],
    { eligibleRows: { small: 3600, large: 360000 } }
  ),
  {
    id: "task489-predecessor",
    kind: "task489-predecessor",
    targetStatementOrFamily: "solution_kit_install_runs_normalized",
    minimumClosure: ["solution_kit_install_runs"],
    supportTables: ["solution_kit_install_items"],
    expectedTableCounts: {
      bulkHistoryRuns: { small: 10000, large: 1000000 },
      boundedSupportRuns: 109890,
    },
    ownedKeyPredicate: {
      kind: "uuid-v5",
      scope: "validated-run-scope",
      profile: "selected-profile",
      scenario: "task489-predecessor",
      ordinal: "family-ordinal",
    },
    equalityParticipation: "deferred",
  },
]);

export function assertTask551ScenarioManifest(
  scenarios: readonly Task551DigestScenario[] = TASK551_SCENARIOS
): void {
  if (!Array.isArray(scenarios) || scenarios.length !== 39)
    throw new Error("database_baseline_invalid");
  const ids = new Set<string>();
  const familyAliases: Readonly<Record<string, string>> = {
    booking: "bookings",
    entries: "contentEntries",
    form: "forms",
  };
  const resolveFamilyToken = (token: unknown): void => {
    if (
      typeof token !== "string" ||
      token.length === 0 ||
      token.includes("task551_fixture_sentinel")
    )
      throw new Error("database_baseline_invalid");
    const camel = token.replace(/_([a-z])/gu, (_match, character: string) =>
      character.toUpperCase()
    );
    const resolved = familyAliases[token] ?? camel;
    if (
      !Object.prototype.hasOwnProperty.call(TASK551_FAMILY_BUILDERS, token) &&
      !Object.prototype.hasOwnProperty.call(TASK551_FAMILY_BUILDERS, resolved)
    )
      throw new Error("database_baseline_invalid");
  };
  for (const scenario of scenarios) {
    if (
      typeof scenario.id !== "string" ||
      scenario.id.length === 0 ||
      ids.has(scenario.id) ||
      typeof scenario.targetStatementOrFamily !== "string" ||
      scenario.targetStatementOrFamily.length === 0
    )
      throw new Error("database_baseline_invalid");
    if (
      !Array.isArray(scenario.minimumClosure) ||
      scenario.minimumClosure.length === 0 ||
      !Array.isArray(scenario.supportTables)
    )
      throw new Error("database_baseline_invalid");
    for (const token of scenario.minimumClosure) resolveFamilyToken(token);
    for (const token of scenario.supportTables) resolveFamilyToken(token);
    if (
      new Set(scenario.minimumClosure).size !== scenario.minimumClosure.length ||
      new Set(scenario.supportTables).size !== scenario.supportTables.length
    )
      throw new Error("database_baseline_invalid");
    if (
      scenario.minimumClosure.includes(TASK551_PRESERVED_SENTINEL_TABLE) ||
      scenario.supportTables.includes(TASK551_PRESERVED_SENTINEL_TABLE) ||
      JSON.stringify(scenario.expectedTableCounts).includes(TASK551_PRESERVED_SENTINEL_TABLE) ||
      JSON.stringify(scenario.ownedKeyPredicate).includes(TASK551_PRESERVED_SENTINEL_TABLE)
    )
      throw new Error("database_baseline_invalid");
    ids.add(scenario.id);
    if (scenario.kind === "admin-shape" && scenario.equalityParticipation !== "admin-32")
      throw new Error("database_baseline_invalid");
    if (scenario.kind === "supplemental" && scenario.equalityParticipation !== "supplemental")
      throw new Error("database_baseline_invalid");
    if (scenario.kind === "task489-predecessor" && scenario.equalityParticipation !== "deferred")
      throw new Error("database_baseline_invalid");
  }
  const adminIds = scenarios
    .filter((scenario) => scenario.kind === "admin-shape")
    .map((scenario) => scenario.id);
  if (
    adminIds.length !== 32 ||
    JSON.stringify(adminIds) !== JSON.stringify(TASK551_ADMIN_READ_PLANNED_IDS)
  )
    throw new Error("database_baseline_invalid");
}

assertTask551ScenarioManifest();
